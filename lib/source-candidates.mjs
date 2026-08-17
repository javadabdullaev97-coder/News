// Кандидаты в источники: сайты, на которые ссылаются конкуренты в статьях.
//
// ЗАЧЕМ. Запрос владельца 17.08.2026: «планёрка, когда читает конкурентов по
// Узбекистану, должна смотреть на их источники по ссылкам, которые они
// вставляют в свои статьи — тогда мы бы постепенно собрали все источники
// информации по Узбекистану».
//
// Это второй этаж механизма, заведённого 04.08.2026 для Telegram-каналов
// (lib/channel-candidates.mjs). Тот собирает handle'ы, этот — домены. Логика
// одна и та же: конкурент, ссылаясь на ведомство, показывает нам источник,
// о котором мы не знали, и делает это бесплатно.
//
// РАЗНИЦА С КАНАЛАМИ — В ЦЕНЕ. Handle'ы лежат прямо в тексте, который у нас
// уже есть, поэтому собираются на каждом фетче даром. Ссылки внутри статьи
// живут в HTML самой статьи, а в инбоксе от неё только заголовок и сниппет
// в 500 знаков — фетчер режет теги, и href пропадает вместе с ними. Значит
// страницу надо открыть отдельно, а это уже расход. Отсюда два входа:
//
//   1. Telegram-посты — бесплатно. Фетчер каналов достаёт href ДО того, как
//      стрипнет теги, и отдаёт их сюда. Ноль дополнительных запросов;
//   2. Статьи на сайтах — с бюджетом. scripts/harvest-source-links.mjs берёт
//      несколько свежих статей конкурентов за прогон, открывает и разбирает.
//      Потолок жёсткий: «постепенно» из запроса владельца — это и есть режим
//      работы, а не оговорка.
//
// ЖУРНАЛ. content/state/source-candidates.jsonl, append-only, merge=union —
// как и всё состояние редакции:
//
//   {ev:"seen",    domain, at, url, foundIn, sourceId, context}  — замечен
//   {ev:"fetched", at, link, status, found}                      — статья разобрана
//   {ev:"resolve", domain, at, addedAs}                          — заведён в конфиг
//   {ev:"dismiss", domain, at, reason}                           — решили не брать
//
// Разбор накопленного — работа планёрки (planyorka-run.md, §6б).

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { appendLog, readLog } from "./state-log.mjs";

export const SOURCE_CANDIDATES_LOG = "content/state/source-candidates.jsonl";

const SOURCES_CONFIG = "config/news-sources.json";
const CONTEXT_RADIUS = 140;
const MAX_EVENTS_PER_CALL = 50;

// Наш собственный сайт и его языковые версии.
const OWN = ["leap.uz"];

// Домены, которые ссылкой на источник не являются никогда. Список закрытый и
// сознательно широкий: каждый пропущенный сюда домен — это строка, которую
// планёрка будет разбирать руками, а разбирать «facebook.com» тысячу раз
// дороже, чем один раз его сюда вписать.
const NOISE = [
  // соцсети и мессенджеры. t.me отдельно: его разбирает channel-candidates
  "facebook.com", "fb.com", "fb.me", "instagram.com", "twitter.com", "x.com",
  "youtube.com", "youtu.be", "tiktok.com", "linkedin.com", "vk.com", "ok.ru",
  "whatsapp.com", "wa.me", "t.me", "telegram.me", "telegram.org", "threads.net",
  "pinterest.com", "reddit.com", "tumblr.com", "snapchat.com",
  // магазины приложений и платформы
  "apps.apple.com", "play.google.com", "apple.com", "microsoft.com",
  // сокращатели и одноразовые публикаторы. Источником быть не могут по
  // устройству: за bit.ly стоит чужой адрес, который мы всё равно не видим,
  // а telegra.ph — блокнот Telegram, у которого нет ни ленты, ни редакции.
  // Проверено на живом улове 17.08.2026: первые же четыре госканала дали
  // и то и другое.
  "bit.ly", "goo.gl", "t.co", "tinyurl.com", "is.gd", "cutt.ly", "clck.ru",
  "ow.ly", "buff.ly", "rb.gy", "telegra.ph", "graph.org",
  // инфраструктура, шрифты, аналитика, стандарты
  "googleapis.com", "gstatic.com", "google.com", "googletagmanager.com",
  "google-analytics.com", "doubleclick.net", "cloudflare.com", "jsdelivr.net",
  "unpkg.com", "bootstrapcdn.com", "fontawesome.com", "w3.org", "schema.org",
  "creativecommons.org", "gravatar.com", "wp.com", "wordpress.org",
  "jquery.com", "cdnjs.com", "amazonaws.com", "gettyimages.com",
  // запрещены редполитикой как источник — заводить их нельзя в принципе
  "wikipedia.org", "wikimedia.org", "ozodlik.org", "currenttime.tv",
  "rferl.org", "azon.uz", "inosmi.ru", "newsru.com",
];

const norm = (d) => String(d || "").toLowerCase().replace(/^www\./, "");

// Составные суффиксы, где регистрируемое имя — три уровня, а не два.
// Полный public suffix list сюда тащить незачем: нужен он ровно для тех зон,
// которые реально встречаются в наших источниках.
const MULTI_SUFFIX = new Set([
  "co.uk", "org.uk", "gov.uk", "ac.uk", "com.tr", "com.au", "co.jp", "com.br",
  "com.ua", "com.cn", "co.kr", "com.mx", "co.in", "com.sa", "com.pk", "org.au",
]);

/**
 * Регистрируемое имя домена: rss.dw.com → dw.com, my.sud.uz → sud.uz.
 *
 * Сравнивать по полному хосту нельзя. Первый же прогон 17.08.2026 предложил
 * завести dw.com как новый источник — при том, что DW у нас читается двумя
 * лентами, просто живут они на rss.dw.com. Поддомен от домена мы всё равно
 * не отличаем по существу: заводя источник, мы заводим издание, а не хост.
 */
export function registrableDomain(host) {
  const parts = norm(host).split(".").filter(Boolean);
  if (parts.length < 2) return null;
  const last2 = parts.slice(-2).join(".");
  if (parts.length >= 3 && MULTI_SUFFIX.has(last2)) return parts.slice(-3).join(".");
  return last2;
}

/** Домен из URL. Возвращает null на мусоре и на не-http схемах. */
export function domainOf(url) {
  try {
    const u = new URL(String(url).trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return registrableDomain(u.hostname);
  } catch {
    return null;
  }
}

export function isNoiseDomain(host) {
  const d = registrableDomain(host);
  return NOISE.some((n) => d === registrableDomain(n));
}

/**
 * Домены, которые у нас уже есть: все ленты и скрейперы конфига источников,
 * исключённые, разрешённые к ссылке без забора, отвергнутые адреса из
 * doNotAdd и уже решённые кандидаты.
 *
 * Считаем по ХОСТУ, а не по точному адресу: лента у kun.uz одна, а ссылаться
 * конкурент будет на любую страницу того же домена, и заводить kun.uz заново
 * из-за другого пути смысла нет.
 */
export function knownDomains(root) {
  const known = new Set(OWN.map(registrableDomain));
  const add = (u) => {
    const d = domainOf(u);
    if (d) known.add(d);
  };

  const cfgPath = join(root, SOURCES_CONFIG);
  if (existsSync(cfgPath)) {
    try {
      const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
      for (const s of cfg.rss ?? []) add(s.url);
      for (const s of cfg.api ?? []) add(s.url ?? s.apiUrl);
      for (const s of cfg.scrape ?? []) add(s.listUrl ?? s.url);
      for (const s of cfg.htmlScrape ?? []) add(s.listUrl ?? s.apiUrl ?? s.url);
      for (const s of cfg.doNotAdd ?? []) add(s.url);
      for (const e of cfg.citableReference?.entries ?? []) add(e.url);
      for (const e of cfg.excluded ?? []) {
        const d = registrableDomain(e.domain);
        if (d) known.add(d);
      }
    } catch {
      // Битый конфиг не должен ронять сбор — просто накопится чуть больше шума.
    }
  }

  for (const e of readLog(join(root, SOURCE_CANDIDATES_LOG)).events) {
    if (e.ev === "resolve" || e.ev === "dismiss") {
      const d = registrableDomain(e.domain);
      if (d) known.add(d);
    }
  }
  return known;
}

/** Уже разобранные статьи — чтобы не открывать одну и ту же дважды. */
export function harvestedLinks(root) {
  const out = new Set();
  for (const e of readLog(join(root, SOURCE_CANDIDATES_LOG)).events) {
    if (e.ev === "fetched" && e.link) out.add(e.link);
  }
  return out;
}

/**
 * Пассивный сбор. На вход — наблюдения вида
 * {url, foundIn, sourceId, context}; на выход — сколько записано.
 *
 * Дедуп по паре (домен, статья): один и тот же материал, разобранный дважды,
 * ничего не плодит, а тот же домен в другой статье — это второе наблюдение,
 * и оно ценно: по числу наблюдений планёрка судит, насколько источник ходовой.
 */
export function collectSourceCandidates(root, sightings) {
  const known = knownDomains(root);
  const seenPairs = new Set(
    readLog(join(root, SOURCE_CANDIDATES_LOG))
      .events.filter((e) => e.ev === "seen")
      .map((e) => `${norm(e.domain)} ${e.foundIn ?? ""}`),
  );

  const at = new Date().toISOString();
  const appended = [];
  for (const s of sightings ?? []) {
    if (appended.length >= MAX_EVENTS_PER_CALL) break;
    const domain = domainOf(s?.url);
    if (!domain) continue;
    if (isNoiseDomain(domain)) continue;
    if (known.has(domain)) continue;
    // Ссылка конкурента на самого себя — не источник, а перелинковка.
    if (s?.sourceDomain && domain === registrableDomain(s.sourceDomain)) continue;
    const pair = `${domain} ${s?.foundIn ?? ""}`;
    if (seenPairs.has(pair)) continue;
    seenPairs.add(pair);
    appendLog(join(root, SOURCE_CANDIDATES_LOG), {
      ev: "seen",
      domain,
      at,
      url: s?.url ?? null,
      foundIn: s?.foundIn ?? null,
      sourceId: s?.sourceId ?? null,
      context: (s?.context ?? "").slice(0, CONTEXT_RADIUS * 2) || null,
    });
    appended.push(domain);
  }
  return { appended: appended.length, domains: [...new Set(appended)] };
}

/** Отметка, что статья разобрана — даже если ничего не нашлось. */
export function markHarvested(root, link, status, found = 0) {
  appendLog(join(root, SOURCE_CANDIDATES_LOG), {
    ev: "fetched",
    at: new Date().toISOString(),
    link,
    status,
    found,
  });
}

/** Свёртка журнала для разбора: домен → наблюдения и статус. */
export function foldSourceCandidates(root) {
  const byDomain = new Map();
  for (const e of readLog(join(root, SOURCE_CANDIDATES_LOG)).events) {
    if (e.ev === "fetched") continue;
    const d = norm(e.domain);
    if (!d) continue;
    const cur =
      byDomain.get(d) ??
      {
        domain: d, sightings: 0, sources: new Set(), urls: [], contexts: [],
        firstAt: null, lastAt: null, status: "open",
      };
    if (e.ev === "seen") {
      cur.sightings++;
      if (e.sourceId) cur.sources.add(e.sourceId);
      if (e.url) cur.urls.push(e.url);
      if (e.context) cur.contexts.push(e.context);
      cur.firstAt = cur.firstAt ?? e.at;
      cur.lastAt = e.at;
    } else if (e.ev === "resolve") {
      cur.status = `resolved:${e.addedAs ?? "?"}`;
    } else if (e.ev === "dismiss") {
      cur.status = "dismissed";
    }
    byDomain.set(d, cur);
  }
  for (const c of byDomain.values()) c.sources = [...c.sources];
  return byDomain;
}

/** Планёрка зовёт после того, как завела источник в конфиг или отказалась. */
export function markSourceCandidate(root, domain, decision, extra = {}) {
  const at = new Date().toISOString();
  const ev =
    decision === "resolve"
      ? { ev: "resolve", domain: norm(domain), at, addedAs: extra.addedAs ?? null }
      : { ev: "dismiss", domain: norm(domain), at, reason: extra.reason ?? null };
  appendLog(join(root, SOURCE_CANDIDATES_LOG), ev);
}
