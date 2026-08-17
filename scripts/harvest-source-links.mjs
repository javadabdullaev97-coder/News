#!/usr/bin/env node
// Разбор статей конкурентов: на кого они ссылаются.
//
// ЗАЧЕМ. Запрос владельца 17.08.2026: собрать источники по Узбекистану,
// подглядывая, на кого ссылаются конкуренты. Ведомство, чей сайт мы не знаем,
// в статье Gazeta.uz стоит гиперссылкой — и это готовая наводка, за которую
// уже заплатил кто-то другой.
//
// ПОЧЕМУ ОТДЕЛЬНЫЙ СКРИПТ, А НЕ ЧАСТЬ ФЕТЧЕРА. В инбоксе от статьи остаются
// заголовок и 500 знаков сниппета, причём с вырезанными тегами — href'ов там
// нет физически. Значит страницу надо открыть, а это единственное место во
// всей редакции, где мы ходим за конкурентом отдельным запросом. Поэтому
// бюджет жёсткий: горстка статей за прогон, каждая ровно один раз за всё
// время (отметка fetched в журнале). «Постепенно» из запроса владельца — это
// и есть режим работы.
//
// ЧТО РАЗБИРАЕМ. Только конкурентов — ленты с type: signal в
// config/news-sources.json. Международные ленты (context) не трогаем: их
// источники нам не нужны, а объём там втрое больше.
//
// CLI:
//   node scripts/harvest-source-links.mjs             — до 8 статей
//   node scripts/harvest-source-links.mjs --limit=20  — другой потолок
//   node scripts/harvest-source-links.mjs --dry-run   — показать, не записывать

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "node-html-parser";
import { ROOT, readInbox, dedupeByLink, itemAgeHours } from "../lib/inbox-core.mjs";
import {
  collectSourceCandidates,
  domainOf,
  harvestedLinks,
  isNoiseDomain,
  knownDomains,
  markHarvested,
} from "../lib/source-candidates.mjs";

const opt = (n, d) => {
  const p = process.argv.find((a) => a.startsWith(`--${n}=`));
  return p ? p.slice(n.length + 3) : d;
};
const limit = Number(opt("limit", 8));
const dryRun = process.argv.includes("--dry-run");

// Возраст статьи. Сутки назад ссылки в тексте те же, что и сейчас, а вот
// страница трёхдневной давности уже могла уехать в архив или под пейвол.
const MAX_AGE_HOURS = Number(opt("max-age", 48));

const CONCURRENCY = 3;
const TIMEOUT_MS = 20_000;
const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const config = JSON.parse(readFileSync(join(ROOT, "config/news-sources.json"), "utf8"));
// Конкуренты — и ленты, и скрейперы: у daryo.uz с repost.uz живой вход именно
// через htmlScrape, и статьи оттуда ничем не хуже.
const competitorIds = new Set(
  [...(config.rss ?? []), ...(config.htmlScrape ?? [])]
    .filter((s) => s.type === "signal")
    .map((s) => s.id),
);

const at = Date.now();
const items = dedupeByLink(readInbox(ROOT, { at }).items)
  .filter((it) => competitorIds.has(it.sourceId))
  .filter((it) => it.sourceKind !== "telegram") // посты каналов разбирает сам фетчер
  .filter((it) => it.link?.startsWith("http"))
  .filter((it) => {
    const age = itemAgeHours(it, at);
    return age === null || age <= MAX_AGE_HOURS;
  })
  .sort((a, b) => Date.parse(b.fetchedAt ?? 0) - Date.parse(a.fetchedAt ?? 0));

const done = harvestedLinks(ROOT);
const queue = items.filter((it) => !done.has(it.link)).slice(0, limit);

if (!queue.length) {
  console.error(
    `[harvest] нечего разбирать: конкурентских статей ${items.length}, ` +
      `все уже разобраны или старше ${MAX_AGE_HOURS}ч`,
  );
  process.exit(0);
}

// Тело статьи, а не вся страница. Навигация и подвал дают десятки ссылок на
// соцсети и партнёров — это шум, который потом руками разбирает планёрка.
// Контейнер ищем по типовым признакам, и если не нашли — берём страницу
// целиком: лучше немного шума, чем потерянная наводка.
const BODY_SELECTORS = [
  "article", "main", "[itemprop=articleBody]", ".article-content", ".article__content",
  ".article-body", ".post-content", ".entry-content", ".content-body", "#content",
];

function articleRoot(doc) {
  for (const sel of BODY_SELECTORS) {
    const el = doc.querySelector(sel);
    if (el && el.text.trim().length > 400) return el;
  }
  return doc;
}

function extract(html, item) {
  const doc = parse(html);
  for (const el of doc.querySelectorAll("nav, header, footer, aside, script, style")) {
    el.remove();
  }
  const body = articleRoot(doc);
  const sourceDomain = domainOf(item.link);
  const out = [];
  for (const a of body.querySelectorAll("a[href]")) {
    const href = a.getAttribute("href");
    if (!href || href.startsWith("#")) continue;
    let abs;
    try {
      abs = new URL(href, item.link).toString();
    } catch {
      continue;
    }
    const anchor = a.text.replace(/\s+/g, " ").trim();
    // Контекст — предложение вокруг ссылки: по нему планёрка понимает, кем
    // конкурент считает источник («по данным Узгидромета», «сообщает Минфин»).
    const around = (a.parentNode?.text ?? anchor).replace(/\s+/g, " ").trim();
    out.push({
      url: abs,
      foundIn: item.link,
      sourceId: item.sourceId,
      sourceDomain,
      context: around.slice(0, 280) || anchor,
    });
  }
  return out;
}

async function fetchOne(item) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(item.link, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
    });
    if (!res.ok) return { item, status: String(res.status), sightings: [] };
    const html = await res.text();
    return { item, status: "200", sightings: extract(html, item) };
  } catch (err) {
    return { item, status: err.name === "AbortError" ? "timeout" : "error", sightings: [] };
  } finally {
    clearTimeout(timer);
  }
}

const results = [];
let idx = 0;
async function worker() {
  while (idx < queue.length) results.push(await fetchOne(queue[idx++]));
}
await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));

const all = results.flatMap((r) => r.sightings);

if (dryRun) {
  // Показываем ровно то, что записалось бы: с отсечкой известных, шумных и
  // самоссылок. Иначе «сухой прогон» врал бы в сорок раз — навигация сайта
  // даёт десятки ссылок, из которых в журнал не идёт ни одна.
  const known = knownDomains(ROOT);
  const kept = new Map();
  const dropped = new Map();
  for (const s of all) {
    const d = domainOf(s.url);
    if (!d) continue;
    const why = isNoiseDomain(d)
      ? "шум"
      : known.has(d)
        ? "уже есть"
        : d === s.sourceDomain
          ? "самоссылка"
          : null;
    const bucket = why ? dropped : kept;
    const key = why ? `${d} (${why})` : d;
    const cur = bucket.get(key) ?? { count: 0, context: s.context };
    cur.count++;
    bucket.set(key, cur);
  }
  console.log(
    JSON.stringify(
      {
        articles: results.map((r) => ({ link: r.item.link, status: r.status, links: r.sightings.length })),
        новые: [...kept.entries()]
          .sort((a, b) => b[1].count - a[1].count)
          .map(([d, v]) => ({ domain: d, sightings: v.count, context: v.context?.slice(0, 120) })),
        отброшено: [...dropped.entries()].sort((a, b) => b[1].count - a[1].count).map(([d, v]) => `${d} ×${v.count}`),
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const { appended, domains } = collectSourceCandidates(ROOT, all);
for (const r of results) markHarvested(ROOT, r.item.link, r.status, r.sightings.length);

const failed = results.filter((r) => r.status !== "200");
console.error(
  `[harvest] разобрано статей ${results.length}` +
    (failed.length ? ` (не открылось ${failed.length})` : "") +
    `, ссылок в текстах ${all.length}, новых источников ${appended}` +
    (domains.length ? `: ${domains.slice(0, 12).join(", ")}` : ""),
);
