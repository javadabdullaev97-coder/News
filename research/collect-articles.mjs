#!/usr/bin/env node
// Фаза 1c: скачивает страницы статей и вытаскивает то, чего нет в sitemap —
// картинку, рубрику, точное время публикации, объём текста и, где издание их
// отдаёт, ссылки на языковые версии.
//
// Зачем заход в страницу, если карты уже дали список материалов:
//
//  1. Связывание переводов. Gazeta, Spot и Repost объявляют альтернативные
//     языковые версии через <link rel="alternate" hreflang>, и для них пара
//     находится точно, без всякой эвристики. Kun и Daryo не объявляют ничего —
//     там пару придётся искать по совпадению картинки, чисел и латиницы, а всё
//     это лежит на странице.
//  2. Признаки для восстановления правил отбора в Telegram (Фаза 3): рубрика,
//     длина, наличие фото.
//  3. Время публикации с точностью до минуты — из карт видна только дата, а
//     лаг «сайт → канал» без времени не посчитать.
//
// Сплошную выкачку за три месяца тут делать незачем: это сотни тысяч страниц.
// По умолчанию берём выборочные недели, окно задаётся флагами.
//
// CLI:
//   node research/collect-articles.mjs --weeks=2026-05-11,2026-06-15,2026-07-13
//   node research/collect-articles.mjs --outlet=gazeta --from=2026-07-13 --to=2026-07-19
//
// Выход: research/raw/articles-<outlet>.jsonl

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { OUTLETS, USER_AGENT } from "./lib/outlets.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = join(HERE, "raw");

// Три недели в разных месяцах — чтобы сезонность одной недели не выдала себя
// за политику издания.
const DEFAULT_WEEKS = ["2026-05-11", "2026-06-15", "2026-07-13"];

const CONCURRENCY = 5;
const DELAY_MS = 120;
const TIMEOUT_MS = 30_000;
const RETRIES = 2;

const argv = process.argv.slice(2);
const arg = (flag, fallback) => {
  const hit = argv.find((a) => a.startsWith(`${flag}=`));
  return hit ? hit.slice(flag.length + 1) : fallback;
};

const only = arg("--outlet", null)?.split(",");
const from = arg("--from", null);
const to = arg("--to", null);
const weeks = arg("--weeks", null)?.split(",") ?? DEFAULT_WEEKS;

function wantedDays() {
  if (from && to) {
    const out = [];
    const d = new Date(`${from}T00:00:00Z`);
    const end = new Date(`${to}T00:00:00Z`);
    while (d <= end) {
      out.push(d.toISOString().slice(0, 10));
      d.setUTCDate(d.getUTCDate() + 1);
    }
    return new Set(out);
  }
  const out = [];
  for (const monday of weeks) {
    const d = new Date(`${monday}T00:00:00Z`);
    for (let i = 0; i < 7; i += 1) {
      out.push(d.toISOString().slice(0, 10));
      d.setUTCDate(d.getUTCDate() + 1);
    }
  }
  return new Set(out);
}

const days = wantedDays();
const outlets = OUTLETS.filter((o) => !only || only.includes(o.id));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchHtml(url) {
  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      });
      if (!res.ok) return { status: res.status, html: null };
      return { status: res.status, html: await res.text() };
    } catch (err) {
      if (attempt === RETRIES) return { status: 0, html: null, error: err.message };
      await sleep(1000 * attempt);
    } finally {
      clearTimeout(timer);
    }
  }
  return { status: 0, html: null };
}

// ── извлечение ─────────────────────────────────────────────────────────────

// Порядок атрибутов в <meta> у разных движков разный, поэтому ищем в обе
// стороны, а не по одному шаблону.
function meta(html, prop) {
  const a = html.match(
    new RegExp(`<meta[^>]+(?:property|name)="${prop}"[^>]+content="([^"]*)"`, "i"),
  );
  if (a) return a[1];
  const b = html.match(
    new RegExp(`<meta[^>]+content="([^"]*)"[^>]+(?:property|name)="${prop}"`, "i"),
  );
  return b ? b[1] : null;
}

function alternates(html) {
  const out = {};
  for (const [, tag] of html.matchAll(/<link([^>]*rel="alternate"[^>]*)>/gi)) {
    const lang = tag.match(/hreflang="([^"]+)"/i)?.[1];
    const href = tag.match(/href="([^"]+)"/i)?.[1];
    if (!lang || !href) continue;
    if (lang === "x-default") continue;
    // Приводим к внутренним меткам: uz-Latn → uz, uz-Cyrl → uz-cyr.
    const norm =
      lang === "uz-Latn" ? "uz" : lang === "uz-Cyrl" ? "uz-cyr" : lang.toLowerCase();
    out[norm] = href;
  }
  return out;
}

// Тело статьи у всех семи размечено по-разному, и вытаскивать его точно —
// отдельная работа на каждое издание. Для наших задач хватает грубой оценки
// объёма: сравниваем длину языковых версий между собой, а не с эталоном.
function roughWordCount(html) {
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
  return body.split(" ").filter((w) => w.length > 1).length;
}

function extract(html) {
  const alt = alternates(html);
  return {
    title: meta(html, "og:title"),
    image: meta(html, "og:image"),
    section: meta(html, "article:section"),
    publishedAt:
      meta(html, "article:published_time") ??
      html.match(/"datePublished":"([^"]+)"/)?.[1] ??
      null,
    modifiedAt: meta(html, "article:modified_time") ?? null,
    description: meta(html, "og:description"),
    alternates: Object.keys(alt).length ? alt : null,
    words: roughWordCount(html),
  };
}

// ── прогон ─────────────────────────────────────────────────────────────────

mkdirSync(RAW_DIR, { recursive: true });

const summary = [];

for (const outlet of outlets) {
  const src = join(RAW_DIR, `sitemap-${outlet.id}.jsonl`);
  if (!existsSync(src)) {
    console.log(`${outlet.name}: нет ${src}, сначала прогоните collect-sitemaps.mjs`);
    continue;
  }

  const rows = readFileSync(src, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l))
    .filter((r) => r.date && days.has(r.date));

  if (!rows.length) {
    console.log(`${outlet.name}: в выбранные дни материалов нет`);
    continue;
  }

  console.log(`\n${outlet.name}: страниц к загрузке ${rows.length}`);

  const results = [];
  let done = 0;
  let failed = 0;
  let cursor = 0;

  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (cursor < rows.length) {
        const row = rows[cursor];
        cursor += 1;
        const { status, html } = await fetchHtml(row.url);
        done += 1;
        if (done % 25 === 0 || done === rows.length) {
          process.stdout.write(`  ${done}/${rows.length}\r`);
        }
        if (!html) {
          failed += 1;
          continue;
        }
        results.push({ ...row, httpStatus: status, ...extract(html) });
        await sleep(DELAY_MS);
      }
    }),
  );

  const out = join(RAW_DIR, `articles-${outlet.id}.jsonl`);
  writeFileSync(out, results.map((r) => JSON.stringify(r)).join("\n") + "\n");

  const withAlt = results.filter((r) => r.alternates).length;
  const withImage = results.filter((r) => r.image).length;
  const withSection = results.filter((r) => r.section).length;
  console.log(
    `  загружено ${results.length}, сбоев ${failed}\n` +
      `  с картинкой ${withImage}, с рубрикой ${withSection}, ` +
      `с языковыми альтернативами ${withAlt} (${((withAlt / (results.length || 1)) * 100).toFixed(0)}%)\n` +
      `  → ${out}`,
  );

  summary.push({
    outlet: outlet.id,
    requested: rows.length,
    loaded: results.length,
    failed,
    withImage,
    withSection,
    withAlternates: withAlt,
  });
}

writeFileSync(
  join(RAW_DIR, "articles-summary.json"),
  JSON.stringify(
    { days: [...days].sort(), collectedAt: new Date().toISOString(), outlets: summary },
    null,
    2,
  ),
);
console.log(`\nСводка: ${join(RAW_DIR, "articles-summary.json")}`);
