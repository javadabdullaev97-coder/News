#!/usr/bin/env node
// Фаза 1a конкурентного рисёрча: собирает из sitemap-архивов список всех
// материалов за окно, с языком и датой публикации.
//
// Заходов в сами статьи здесь нет — только карты. Этого хватает, чтобы
// посчитать объёмы публикаций по языкам и дням, то есть ответить на первую
// половину вопроса «чем различаются языковые версии». Связывание переводов
// между языками — отдельная задача (Фаза 2), карты для неё ключа не дают.
//
// CLI:
//   node research/collect-sitemaps.mjs
//   node research/collect-sitemaps.mjs --from=2026-05-01 --to=2026-07-31
//   node research/collect-sitemaps.mjs --outlet=kun,gazeta
//
// Выход: research/raw/sitemap-<outlet>.jsonl
//   {outlet, lang, date, slug, key, url, lastmod}

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { OUTLETS, USER_AGENT } from "./lib/outlets.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = join(HERE, "raw");

const DEFAULT_FROM = "2026-05-01";
const DEFAULT_TO = "2026-07-31";

const CONCURRENCY = 6;
const TIMEOUT_MS = 45_000;
const RETRIES = 3;

const argv = process.argv.slice(2);

function arg(flag, fallback) {
  const hit = argv.find((a) => a.startsWith(`${flag}=`));
  return hit ? hit.slice(flag.length + 1) : fallback;
}

const from = arg("--from", DEFAULT_FROM);
const to = arg("--to", DEFAULT_TO);
const only = arg("--outlet", null)?.split(",");

const window = { from, to };
const outlets = OUTLETS.filter((o) => !only || only.includes(o.id));

if (!outlets.length) {
  console.error(`Ни одно издание не подошло под --outlet=${only?.join(",")}`);
  process.exit(1);
}

// ── сеть ───────────────────────────────────────────────────────────────────

async function fetchText(url) {
  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { "User-Agent": USER_AGENT, Accept: "application/xml,*/*" },
      });
      if (res.status === 404) return { status: 404, body: null };
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { status: res.status, body: await res.text() };
    } catch (err) {
      if (attempt === RETRIES) return { status: 0, body: null, error: err };
      await new Promise((r) => setTimeout(r, 1500 * 2 ** (attempt - 1)));
    } finally {
      clearTimeout(timer);
    }
  }
  return { status: 0, body: null };
}

async function pool(items, worker) {
  const results = [];
  let cursor = 0;
  const runners = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

// ── разбор ─────────────────────────────────────────────────────────────────

// Карты у всех семи изданий — плоский <urlset> без вложенности, поэтому
// хватает регулярки: XML-парсер на 17 МБ карте Qalampir обошёлся бы дороже.
const URL_BLOCK = /<url>([\s\S]*?)<\/url>/g;
const LOC = /<loc>([^<]+)<\/loc>/;
const LASTMOD = /<lastmod>([^<]+)<\/lastmod>/;

function* entries(xml) {
  for (const [, block] of xml.matchAll(URL_BLOCK)) {
    const loc = block.match(LOC)?.[1]?.trim();
    if (!loc) continue;
    yield { loc, lastmod: block.match(LASTMOD)?.[1]?.trim() ?? null };
  }
}

function inWindow(date) {
  return date >= from && date <= to;
}

// ── прогон ─────────────────────────────────────────────────────────────────

mkdirSync(RAW_DIR, { recursive: true });

const summary = [];

for (const outlet of outlets) {
  const maps = await outlet.listMaps(window);
  process.stdout.write(`\n${outlet.name}: карт к загрузке ${maps.length}\n`);

  const rows = [];
  const stats = {
    maps: maps.length,
    ok: 0,
    missing: 0,
    failed: 0,
    seenUrls: 0,
    parsed: 0,
  };

  let done = 0;
  await pool(maps, async (mapUrl) => {
    const { status, body } = await fetchText(mapUrl);
    done += 1;
    if (done % 20 === 0 || done === maps.length) {
      process.stdout.write(`  ${done}/${maps.length} карт\r`);
    }
    if (status === 404) {
      stats.missing += 1;
      return;
    }
    if (!body) {
      stats.failed += 1;
      return;
    }
    stats.ok += 1;

    for (const entry of entries(body)) {
      stats.seenUrls += 1;
      const parsed = outlet.parseEntry(entry);
      if (!parsed) continue;
      stats.parsed += 1;

      // Издания с dateSource "url" фильтруем по окну прямо здесь — иначе в
      // выгрузку Daryo попадёт весь архив с 2018 года. Там, где даты нет,
      // сохраняем всё: окно проставим в Фазе 1c по странице статьи.
      if (parsed.date && !inWindow(parsed.date)) continue;

      rows.push({
        outlet: outlet.id,
        lang: parsed.lang,
        date: parsed.date,
        slug: parsed.slug,
        section: parsed.section ?? null,
        key: parsed.key,
        url: entry.loc,
        lastmod: entry.lastmod,
      });
    }
  });

  // Один и тот же материал попадается в нескольких картах (у Repost архивные
  // карты пересекаются с основной). Дедупим по URL.
  const seen = new Set();
  const unique = rows.filter((r) => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });
  stats.duplicates = rows.length - unique.length;

  // Разрезы считаем только после дедупликации: у Repost основная карта и
  // архивные пересекаются полностью, и подсчёт по ходу разбора удваивал все
  // цифры.
  stats.kept = unique.length;
  stats.undated = unique.filter((r) => !r.date).length;
  stats.byLang = {};
  stats.byMonth = {};
  for (const row of unique) {
    const lang = row.lang ?? "?";
    stats.byLang[lang] = (stats.byLang[lang] ?? 0) + 1;
    if (row.date) {
      const month = row.date.slice(0, 7);
      stats.byMonth[month] = (stats.byMonth[month] ?? 0) + 1;
    }
  }

  const out = join(RAW_DIR, `sitemap-${outlet.id}.jsonl`);
  writeFileSync(out, unique.map((r) => JSON.stringify(r)).join("\n") + "\n");

  process.stdout.write(
    `  карт: ${stats.ok} ок / ${stats.missing} нет / ${stats.failed} сбой\n` +
      `  материалов: ${unique.length}` +
      (stats.duplicates ? ` (дублей снято ${stats.duplicates})` : "") +
      (stats.undated ? `, без даты ${stats.undated}` : "") +
      `\n  по языкам: ${JSON.stringify(stats.byLang)}\n` +
      `  по месяцам: ${JSON.stringify(stats.byMonth)}\n` +
      `  → ${out}\n`,
  );

  summary.push({ outlet: outlet.id, name: outlet.name, dateSource: outlet.dateSource, ...stats, unique: unique.length });
}

writeFileSync(
  join(RAW_DIR, "sitemap-summary.json"),
  JSON.stringify({ window, collectedAt: new Date().toISOString(), outlets: summary }, null, 2),
);

process.stdout.write(`\nСводка: ${join(RAW_DIR, "sitemap-summary.json")}\n`);
