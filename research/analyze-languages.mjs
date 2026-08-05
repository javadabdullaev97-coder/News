#!/usr/bin/env node
// Фаза 2: языковой анализ.
//
// Два уровня, потому что данные разной полноты:
//
//   Агрегатный — по всему кварталу из sitemap-выгрузок. Отвечает на вопрос
//   «сколько материалов на каком языке и как это менялось». Дёшево и полно.
//
//   Парный — по выборочным неделям из articles-выгрузок. Отвечает на вопрос
//   «какие именно материалы переводят, а какие нет». Требует страниц статей.
//
// Кириллица из обоих уровней исключается. У Kun, Gazeta и Daryo число
// латинских и кириллических материалов совпадает с точностью до единиц на
// квартальном окне — это транслитерация скриптом, а не редакционное решение,
// и считать её отдельной языковой версией значит удваивать узбекскую колонку
// на ровном месте.
//
// CLI:
//   node research/analyze-languages.mjs
//   node research/analyze-languages.mjs --outlet=gazeta
//
// Выход: research/data/languages.json + таблицы в stdout

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { OUTLETS } from "./lib/outlets.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = join(HERE, "raw");
const DATA_DIR = join(HERE, "data");

const argv = process.argv.slice(2);
const only = argv
  .find((a) => a.startsWith("--outlet="))
  ?.slice("--outlet=".length)
  .split(",");

const REAL_LANGS = ["uz", "ru", "en"];

function readJsonl(path) {
  if (!existsSync(path)) return null;
  const body = readFileSync(path, "utf8").trim();
  if (!body) return [];
  return body.split("\n").filter(Boolean).map((l) => JSON.parse(l));
}

function pct(part, whole) {
  return whole ? +((part / whole) * 100).toFixed(1) : null;
}

// ── агрегатный уровень ─────────────────────────────────────────────────────

function aggregate(outlet) {
  const rows = readJsonl(join(RAW_DIR, `sitemap-${outlet.id}.jsonl`));
  if (!rows) return null;
  const dated = rows.filter((r) => r.date && REAL_LANGS.includes(r.lang));
  if (!dated.length) return null;

  const byLang = {};
  const byMonthLang = {};
  const daysSeen = new Set();

  for (const row of dated) {
    byLang[row.lang] = (byLang[row.lang] ?? 0) + 1;
    const month = row.date.slice(0, 7);
    byMonthLang[month] ??= {};
    byMonthLang[month][row.lang] = (byMonthLang[month][row.lang] ?? 0) + 1;
    daysSeen.add(row.date);
  }

  const days = daysSeen.size;
  const perDay = {};
  for (const [lang, n] of Object.entries(byLang)) {
    perDay[lang] = +(n / days).toFixed(1);
  }

  // Опорным языком считаем самый объёмный: у Daryo и Kun это узбекский, у
  // Repost русский. Доли остальных считаем от него — иначе «85%» у Gazeta и
  // «791%» у Repost нельзя поставить в один ряд.
  const primary = Object.entries(byLang).sort((a, b) => b[1] - a[1])[0][0];
  const shareOfPrimary = {};
  for (const [lang, n] of Object.entries(byLang)) {
    shareOfPrimary[lang] = pct(n, byLang[primary]);
  }

  return {
    outlet: outlet.id,
    name: outlet.name,
    days,
    total: dated.length,
    byLang,
    perDay,
    primary,
    shareOfPrimary,
    byMonthLang,
  };
}

// ── парный уровень ─────────────────────────────────────────────────────────

// Для изданий с hreflang пара берётся прямо из объявления. Для остальных
// остаётся сопоставление, и здесь считается только то, что можно посчитать
// честно: доля материалов, у которых объявлен хоть один перевод.
function pairs(outlet) {
  const rows = readJsonl(join(RAW_DIR, `articles-${outlet.id}.jsonl`));
  if (!rows || !rows.length) return null;

  const real = rows.filter((r) => REAL_LANGS.includes(r.lang));
  const declaring = real.filter((r) => r.alternates);
  if (!declaring.length) {
    return {
      outlet: outlet.id,
      sampled: real.length,
      hreflang: false,
      note: "издание не объявляет языковые версии — пара ищется сопоставлением",
    };
  }

  const byLang = {};
  for (const row of declaring) {
    const alt = Object.keys(row.alternates).filter(
      (l) => REAL_LANGS.includes(l) && l !== row.lang,
    );
    byLang[row.lang] ??= { total: 0, translated: 0, targets: {} };
    byLang[row.lang].total += 1;
    if (alt.length) {
      byLang[row.lang].translated += 1;
      for (const l of alt) {
        byLang[row.lang].targets[l] = (byLang[row.lang].targets[l] ?? 0) + 1;
      }
    }
  }

  // Асимметрия по рубрикам: какие темы переводят охотнее прочих. Считаем
  // только там, где издание отдаёт article:section.
  const bySection = {};
  for (const row of declaring) {
    if (!row.section) continue;
    const key = `${row.lang}|${row.section}`;
    bySection[key] ??= { lang: row.lang, section: row.section, total: 0, translated: 0 };
    bySection[key].total += 1;
    const alt = Object.keys(row.alternates).filter(
      (l) => REAL_LANGS.includes(l) && l !== row.lang,
    );
    if (alt.length) bySection[key].translated += 1;
  }

  for (const stat of Object.values(byLang)) {
    stat.translatedShare = pct(stat.translated, stat.total);
  }
  const sections = Object.values(bySection)
    .filter((s) => s.total >= 5)
    .map((s) => ({ ...s, share: pct(s.translated, s.total) }))
    .sort((a, b) => b.share - a.share);

  return {
    outlet: outlet.id,
    sampled: real.length,
    hreflang: true,
    byLang,
    sections,
  };
}

// ── вывод ──────────────────────────────────────────────────────────────────

const outlets = OUTLETS.filter((o) => !only || only.includes(o.id));
const report = { generatedAt: new Date().toISOString(), aggregate: [], pairs: [] };

console.log("АГРЕГАТЫ ПО КВАРТАЛУ (кириллица исключена)\n");
console.log(
  "издание      дней  всего   uz/д   ru/д   en/д   опорный  доли от опорного",
);
for (const outlet of outlets) {
  const agg = aggregate(outlet);
  if (!agg) continue;
  report.aggregate.push(agg);
  const shares = REAL_LANGS.filter((l) => agg.byLang[l])
    .map((l) => `${l} ${agg.shareOfPrimary[l]}%`)
    .join(", ");
  console.log(
    agg.name.padEnd(12) +
      String(agg.days).padStart(5) +
      String(agg.total).padStart(7) +
      String(agg.perDay.uz ?? "—").padStart(7) +
      String(agg.perDay.ru ?? "—").padStart(7) +
      String(agg.perDay.en ?? "—").padStart(7) +
      "   " +
      agg.primary.padEnd(8) +
      " " +
      shares,
  );
}

console.log("\n\nДОЛЯ ПЕРЕВЕДЁННЫХ (выборочные недели, по объявлению hreflang)\n");
for (const outlet of outlets) {
  const p = pairs(outlet);
  if (!p) continue;
  report.pairs.push(p);
  if (!p.hreflang) {
    console.log(`${outlet.name}: ${p.note} (в выборке ${p.sampled})`);
    continue;
  }
  console.log(`${outlet.name} (в выборке ${p.sampled}):`);
  for (const [lang, stat] of Object.entries(p.byLang)) {
    const targets = Object.entries(stat.targets)
      .map(([l, n]) => `${l}:${n}`)
      .join(" ");
    console.log(
      `  ${lang.padEnd(3)} ${String(stat.translated).padStart(4)}/${String(stat.total).padEnd(4)} = ${String(stat.translatedShare).padStart(5)}%  → ${targets}`,
    );
  }
  if (p.sections.length) {
    const top = p.sections.slice(0, 3).map((s) => `${s.section} ${s.share}%`);
    const bottom = p.sections.slice(-3).map((s) => `${s.section} ${s.share}%`);
    console.log(`  чаще переводят: ${top.join(", ")}`);
    console.log(`  реже переводят: ${bottom.join(", ")}`);
  }
}

mkdirSync(DATA_DIR, { recursive: true });
const out = join(DATA_DIR, "languages.json");
writeFileSync(out, JSON.stringify(report, null, 2));
console.log(`\n→ ${out}`);
