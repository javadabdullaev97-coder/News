#!/usr/bin/env node
// Тянет RSS-ленты из config/news-sources.json, дедупит по URL, дописывает
// свежие items в content/inbox/YYYY-MM-DD.jsonl.
//
// CLI:
//   node scripts/pull-news-inbox.mjs                 — все RSS без Playwright
//   node scripts/pull-news-inbox.mjs --priority=P0   — только приоритет P0
//   node scripts/pull-news-inbox.mjs --type=signal   — только signal
//   node scripts/pull-news-inbox.mjs --id=kun-uz     — конкретный источник
//
// Формат строки inbox:
//   {sourceId, sourceName, sourceType, sourcePriority, title, link,
//    pubDate, snippet, fetchedAt}

import Parser from "rss-parser";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(HERE);
const CONFIG_PATH = join(ROOT, "config/news-sources.json");
const INBOX_DIR = join(ROOT, "content/inbox");
const SEEN_PATH = join(INBOX_DIR, "seen.json");

const CONCURRENCY = 8;
// 20с не хватало медленным площадкам: cabar.asia стабильно упирался в таймаут,
// хотя фид живой. 35с — компромисс между полнотой и временем прогона.
const FETCH_TIMEOUT_MS = 35_000;
const MAX_SEEN = 20_000; // храним последние N URL, чтобы файл не рос вечно
const SNIPPET_MAX = 500;

const argv = process.argv.slice(2);
const filters = {
  priority: findArg("--priority"),
  type: findArg("--type"),
  id: findArg("--id"),
};

function findArg(flag) {
  const p = argv.find((a) => a.startsWith(`${flag}=`));
  return p ? p.slice(flag.length + 1).split(",") : null;
}

function matches(src) {
  if (filters.priority && !filters.priority.includes(src.priority)) return false;
  if (filters.type && !filters.type.includes(src.type)) return false;
  if (filters.id && !filters.id.includes(src.id)) return false;
  return true;
}

const config = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
// disabled — источники с мёртвыми фидами. Запись в конфиге сохранена вместе
// с разбором в notes, чтобы не искать заново, но в фетч они не идут.
const sources = config.rss.filter(
  (s) => !s.requiresPlaywright && !s.disabled && matches(s),
);

if (!sources.length) {
  console.error("No sources matched filters — nothing to do.");
  process.exit(0);
}

mkdirSync(INBOX_DIR, { recursive: true });
const seen = existsSync(SEEN_PATH)
  ? new Set(JSON.parse(readFileSync(SEEN_PATH, "utf8")))
  : new Set();

const parser = new Parser({
  timeout: FETCH_TIMEOUT_MS,
  headers: {
    // Браузерный UA — вынужденно. На "LEAP-News-Aggregator/1.0" gazeta.uz рвёт
    // HTTP/2-соединение (PROTOCOL_ERROR, curl 92), а часть площадок отдаёт 403.
    // Проверено 01.08.2026: с этим UA gazeta.uz возвращает 200 и 20 items.
    "User-Agent":
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    Accept: "application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.5",
  },
  customFields: {
    item: ["media:content", "content:encoded", "dc:creator"],
  },
});

function cleanText(s) {
  if (!s) return "";
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchOne(src) {
  try {
    const feed = await parser.parseURL(src.url);
    const items = (feed.items || []).map((item) => {
      const snippet = cleanText(
        item.contentSnippet || item.content || item.summary || item.title || "",
      ).slice(0, SNIPPET_MAX);
      return {
        sourceId: src.id,
        sourceName: src.name,
        sourceType: src.type,
        sourcePriority: src.priority,
        sourceKind: "rss",
        title: cleanText(item.title),
        link: item.link,
        pubDate: item.isoDate || item.pubDate || null,
        snippet,
        fetchedAt: new Date().toISOString(),
      };
    });
    return { ok: true, src, items };
  } catch (err) {
    return { ok: false, src, error: err.message || String(err) };
  }
}

async function runLimited(items, limit, fn) {
  const results = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (true) {
      const i = idx++;
      if (i >= items.length) return;
      results[i] = await fn(items[i]);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}

console.error(`[news-inbox] ${sources.length} sources, concurrency ${CONCURRENCY}`);
const results = await runLimited(sources, CONCURRENCY, fetchOne);

const failed = results.filter((r) => !r.ok);
const ok = results.filter((r) => r.ok);

const allItems = ok.flatMap((r) => r.items);

// ─── Фильтр релевантности для международных лент ───
//
// Замер на инбоксе за 01.08.2026: из 1 608 items типа `context` про Узбекистан
// и Центральную Азию было 18 — это 1,1%. При этом международный слой давал 77%
// всего объёма инбокса. То есть планёрка каждый раз просеивала полторы тысячи
// заголовков про американские выборы и европейский футбол, чтобы найти
// полтора десятка полезных.
//
// Поэтому у `context`-лент общего профиля берём только то, что упоминает регион.
// Ленты, целиком посвящённые Центральной Азии (`regionDedicated: true`),
// проходят без фильтра — там релевантно всё по определению.
//
// На `source` и `signal` фильтр не распространяется: госорганы и узбекские СМИ
// пишут про Узбекистан по определению, а отсечь по ключевым словам пост
// Минюста о поправке в НК — прямой путь потерять первоисточник.

const REGION_TERMS = [
  "узбек", "uzbek", "o‘zbek", "oʻzbek", "ozbek", "o'zbek",
  "ташкент", "tashkent", "toshkent",
  "мирзиёев", "мирзиеев", "mirziyo",
  "самарканд", "samarkand", "samarqand",
  "бухар", "bukhara", "buxoro",
  "ферган", "fergana", "farg",
  "каракалпак", "karakalpak", "qoraqalpog",
  "хорезм", "khorezm", "xorazm",
  "андижан", "andijan", "andijon",
  "наманган", "namangan",
  "сурхандар", "surkhandarya",
  "кашкадар", "kashkadarya", "qashqadaryo",
  "джизак", "jizzakh", "jizzax",
  "навои", "navoi", "navoiy",
  "сырдар", "syrdarya", "sirdaryo",
  "центральной азии", "центральная азия", "central asia", "markaziy osiyo",
  // «арал» без уточнения ловит «паралимпийский» и «парализовать» —
  // проверено на реальном инбоксе, оба ложных срабатывания.
  "аральск", "аральско", "приаралье", "aral sea",
  "ташкентск",
];

const relevantById = new Map(sources.map((s) => [s.id, s]));

function isRelevant(item) {
  const src = relevantById.get(item.sourceId);
  if (!src) return true;
  if (src.type !== "context") return true;      // source и signal — без фильтра
  if (src.regionDedicated) return true;          // лента целиком про регион
  const blob = `${item.title || ""} ${item.snippet || ""}`.toLowerCase();
  return REGION_TERMS.some((term) => blob.includes(term));
}

const relevant = allItems.filter(isRelevant);
const droppedIrrelevant = allItems.length - relevant.length;

const fresh = relevant.filter((it) => it.link && !seen.has(it.link));

// Ссылки отсеянных тоже помечаем виденными: иначе каждый следующий прогон
// будет заново тянуть и заново отбрасывать те же полторы тысячи заголовков.
for (const it of allItems) {
  if (it.link && !relevant.includes(it)) seen.add(it.link);
}

// Ротация файла по дню Ташкента (UTC+5), чтобы сутки соответствовали редакции.
const nowTashkent = new Date(Date.now() + 5 * 3600 * 1000);
const today = nowTashkent.toISOString().slice(0, 10);
const dayFile = join(INBOX_DIR, `${today}.jsonl`);

if (fresh.length) {
  const lines = fresh.map((x) => JSON.stringify(x)).join("\n") + "\n";
  appendFileSync(dayFile, lines);

  for (const it of fresh) seen.add(it.link);
  const trimmed = [...seen].slice(-MAX_SEEN);
  writeFileSync(SEEN_PATH, JSON.stringify(trimmed));
}

// Отчёт
console.error(
  `[news-inbox] fetched ${allItems.length}, ` +
    `отсеяно как нерелевантное ${droppedIrrelevant}, fresh ${fresh.length}, ` +
    `failed ${failed.length}/${sources.length}, day=${today}`,
);

if (fresh.length) {
  const byId = new Map();
  for (const it of fresh) byId.set(it.sourceId, (byId.get(it.sourceId) || 0) + 1);
  for (const [id, cnt] of [...byId.entries()].sort((a, b) => b[1] - a[1])) {
    console.error(`  +${String(cnt).padStart(3)}  ${id}`);
  }
}

if (failed.length) {
  console.error("[news-inbox] failed sources:");
  for (const f of failed) console.error(`  ✗  ${f.src.id}: ${f.error}`);
}

// Exit code: 0 если хоть кто-то отдал что-то или все просто пусты; 1 если все упали.
if (failed.length === sources.length) process.exit(1);
