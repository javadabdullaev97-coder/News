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
import { loadSeenLinks, saveSeenLinks } from "../lib/inbox-core.mjs";
import { collectChannelCandidates } from "../lib/channel-candidates.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(HERE);
const CONFIG_PATH = join(ROOT, "config/news-sources.json");
const INBOX_DIR = join(ROOT, "content/inbox");

const CONCURRENCY = 8;
// 20с не хватало медленным площадкам: cabar.asia стабильно упирался в таймаут,
// хотя фид живой. 35с — компромисс между полнотой и временем прогона.
const FETCH_TIMEOUT_MS = 35_000;
const SNIPPET_MAX = 500;

// Потолок возраста записи на входе. Отсекает архивные ленты — те, что отдают
// не последние новости, а всё, что было опубликовано за годы.
//
// Зачем. Возраст item'а считается по fetchedAt, а не по pubDate
// (lib/inbox-core.mjs → itemAgeHours: дата забора первична, потому что у
// половины лент pubDate либо кривой, либо отсутствует). Значит запись,
// впервые увиденная сегодня, для планёрки свежая — даже если написана в
// 2023 году. Пока ленты отдавали по 10-50 последних записей, это никого не
// задевало. С технологическим слоем задело сразу: openai.com/news/rss.xml
// отдаёт 1129 записей, huggingface.co/blog/feed.xml — 842. Без отсечки
// первый же прогон вывалил бы в инбокс два десятка тысяч старых новостей,
// и tech-планёрка начала бы работу с разбора релизов трёхлетней давности.
//
// Отсекаем ТОЛЬКО при разобранном pubDate. Нет даты или дата не парсится —
// запись проходит: молча выбрасывать ленту с плохими датами нельзя, для
// этого случая в selectFresh уже есть отдельный счётчик ageUnknown.
const MAX_ITEM_AGE_DAYS = 7;
const MAX_ITEM_AGE_MS = MAX_ITEM_AGE_DAYS * 24 * 3600 * 1000;

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
const seen = loadSeenLinks(ROOT);

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

// Запись старше потолка? Только при разобранной дате — см. MAX_ITEM_AGE_DAYS.
function tooOld(item, now = Date.now()) {
  const t = Date.parse(item.isoDate || item.pubDate || "");
  return Number.isFinite(t) && now - t > MAX_ITEM_AGE_MS;
}

async function fetchOne(src) {
  try {
    const feed = await parser.parseURL(src.url);
    const raw = feed.items || [];
    const recent = raw.filter((item) => !tooOld(item));
    const items = recent.map((item) => {
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
    return { ok: true, src, items, archived: raw.length - recent.length };
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
  // Лента с полем stream живёт в своём потоке, и фильтр региона работает для
  // неё независимо от типа. Иначе корпоративные ньюсрумы (Apple, OpenAI,
  // Nvidia — это type:source) целиком уехали бы в местный инбокс: пресс-релиз
  // Apple действительно первоисточник, но первоисточник про Apple, а не про
  // Узбекистан. У спортивных лент вопрос не возникал — там все ленты
  // context'ы, и разводка держалась на этом по случайности.
  if (src.type !== "context" && !src.stream) return true;
  if (src.regionDedicated) return true;          // лента целиком про регион
  const blob = `${item.title || ""} ${item.snippet || ""}`.toLowerCase();
  return REGION_TERMS.some((term) => blob.includes(term));
}

const relevantSet = new Set(allItems.filter(isRelevant));
const relevant = [...relevantSet];

// ─── Вторая линия: важные мировые новости сами по себе ───
//
// Всё, что не прошло фильтр региона, не выбрасывается, а уходит в отдельный
// файл world-YYYY-MM-DD.jsonl. Основной инбокс остаётся чистым, а планёрка
// может отдельно посмотреть, не случилось ли в мире чего-то настолько
// крупного, что это стоит опубликовать без узбекской привязки.
//
// Порог «очень важного» планёрка считает не по числу лент, а по числу
// НЕЗАВИСИМЫХ БЛОКОВ (поле bloc в конфиге). Причина в замере от 01.08.2026:
// при подсчёте по лентам топ «мировых» сюжетов состоял из беспилотника над
// Тамбовом и пожара в Нижнекамске — просто потому, что о них синхронно писали
// ТАСС, РИА, Интерфакс, Коммерсантъ и РБК. Пять лент, но одна юрисдикция и
// одна редакционная позиция. Правило блоков это отсекает.

const offRegion = allItems
  .filter((it) => !relevantSet.has(it))
  .map((it) => {
    const src = relevantById.get(it.sourceId);
    return { ...it, bloc: src?.bloc || "unknown" };
  })
  .filter((it) => it.bloc !== "unknown" && it.link && !seen.has(it.link));

// ─── Профильные линии: спорт и технологии ───
//
// Спортивных лент в конфиге 47 против шести до 17.08.2026, и дают они около
// семисот записей за полный опрос. В общей мировой линии этот объём
// перекрывал бы собой войну, экономику и выборы: планёрка просеивала бы
// трансферные слухи, чтобы найти мировой сюжет. У спорта отдельный
// телеграм-канал и своя витрина, поэтому и файл отдельный.
//
// Технологических лент в тот же день стало 76 против трёх, и рассуждение
// повторяется дословно: ИИ, финтех, космос и корпоративные ньюсрумы дают
// сопоставимый объём, у направления свой канал и своя витрина.
//
// Поток задаётся полем stream у ленты — новую линию заводит конфиг, а не
// правка этого файла. Хардкода списка потоков здесь нет намеренно.
//
// ВАЖНО: разводка касается только записей, НЕ прошедших фильтр региона.
// Спортивная новость с упоминанием Узбекистана — Хусанов в АПЛ, узбекский
// боец в UFC — идёт в основной инбокс, как и раньше. Иначе правило
// specialRules.uzbekAthleteAnywhere («узбекский спортсмен на международной
// арене публикуется всегда») потеряло бы половину поводов. Ровно так же
// вложения Nvidia в узбекский дата-центр остаются местной темой.
const streamOf = (it) => relevantById.get(it.sourceId)?.stream || null;
const byStream = new Map();
const worldCandidates = [];
for (const it of offRegion) {
  const stream = streamOf(it);
  if (!stream) {
    worldCandidates.push(it);
    continue;
  }
  if (!byStream.has(stream)) byStream.set(stream, []);
  byStream.get(stream).push(it);
}

const fresh = relevant.filter((it) => it.link && !seen.has(it.link));
const droppedIrrelevant = allItems.length - relevant.length;

// Ссылки отсеянных помечаем виденными только ПОСЛЕ того, как отложили их
// в мировую линию — иначе второй прогон уже не увидит мировой сюжет.
for (const it of allItems) {
  if (!relevantSet.has(it) && it.link) seen.add(it.link);
}

// Ротация файла по дню Ташкента (UTC+5), чтобы сутки соответствовали редакции.
const nowTashkent = new Date(Date.now() + 5 * 3600 * 1000);
const today = nowTashkent.toISOString().slice(0, 10);
const dayFile = join(INBOX_DIR, `${today}.jsonl`);

// Мировая линия — свой файл, чтобы объём не мешал основному инбоксу.
if (worldCandidates.length) {
  const worldFile = join(INBOX_DIR, `world-${today}.jsonl`);
  appendFileSync(
    worldFile,
    worldCandidates.map((x) => JSON.stringify(x)).join("\n") + "\n",
  );
}

// Профильные линии — по той же причине, что и мировая, только этажом ниже.
for (const [stream, items] of byStream) {
  if (!items.length) continue;
  appendFileSync(
    join(INBOX_DIR, `${stream}-${today}.jsonl`),
    items.map((x) => JSON.stringify(x)).join("\n") + "\n",
  );
}

if (fresh.length) {
  const lines = fresh.map((x) => JSON.stringify(x)).join("\n") + "\n";
  appendFileSync(dayFile, lines);

  for (const it of fresh) seen.add(it.link);
  saveSeenLinks(seen, ROOT);

  // Пассивный сбор кандидатов в источники: ТГ-каналы, на которые ссылаются
  // конкуренты, копятся с контекстом упоминания (правило владельца
  // 04.08.2026). Разбор накопленного — у планёрки.
  const cand = collectChannelCandidates(ROOT, fresh);
  if (cand.appended) {
    console.error(`[inbox] кандидаты в источники: +${cand.appended} (${cand.handles.join(", ")})`);
  }
}

// Отчёт
const archivedTotal = ok.reduce((s, r) => s + (r.archived || 0), 0);
const streamReport = [...byStream.entries()]
  .map(([stream, items]) => `${stream} ${items.length}`)
  .join(", ");
console.error(
  `[news-inbox] fetched ${allItems.length}, ` +
    (archivedTotal ? `старше ${MAX_ITEM_AGE_DAYS} дней отброшено ${archivedTotal}, ` : "") +
    `вне региона ${droppedIrrelevant} ` +
    `(в мировую линию ${worldCandidates.length}` +
    (streamReport ? `, по профильным: ${streamReport}` : "") +
    `), ` +
    `fresh ${fresh.length}, ` +
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

// Выходим явно, не дожидаясь, пока Node сам закроет событийный цикл.
//
// ЗАЧЕМ. Сбор занимает около 40 секунд, а шаг воркфлоу — 10,7 минуты.
// Разница не в источниках: боевой прогон 04.08.2026 напечатал итог
// «fetched 2566, failed 2/57» в 03:26:09 и завершился только в 03:35:33.
// Девять с половиной минут процесс просто висел.
//
// Причина — открытые сокеты. Лента, упавшая по таймауту (cabar, 35 000 мс),
// оставляет соединение в пуле, а keep-alive держит его минутами. Node не
// выходит, пока жив хоть один хендл, и ждёт вместе с ним.
//
// Это стоило дороже всего в редакции: 95% минут GitHub Actions уходило
// на ожидание уже сделанной работы. Никакой чистки источников для этого
// не требуется — данные к моменту зависания уже собраны и записаны на диск.
const code = failed.length === sources.length ? 1 : 0;
process.exit(code);
