#!/usr/bin/env node
// Сопоставляет языковые версии одного материала у изданий, которые их не
// объявляют: Kun, Daryo, Repost.
//
// Почему нельзя проще. Ожидаемо сильный признак — URL картинки — оказался
// мёртвым: у 281 эталонной пары Gazeta картинка не совпала ни разу, CDN
// отдаёт каждой языковой версии собственный файл. Slug тоже не спасает: он
// совпадает у Gazeta (81%) и Spot (60%), но у Kun он транслитерируется с
// заголовка, и русский слаг с узбекским не имеют общих слов вовсе.
//
// Что осталось и что работает:
//
//   Числа. У медианной эталонной пары наборы чисел совпадают полностью.
//   Суммы, проценты, даты и количества переживают перевод без изменений, и
//   конкретное число вроде «27000» редко встречается дважды за сутки.
//
//   Время. Половина пар выходит в пределах 53 минут друг от друга, девять из
//   десяти — в пределах 9 часов. Окно ±24 часа покрывает практически всё и
//   отсекает большую часть кандидатов.
//
//   Имена. Кириллица и латиница сравниваются после приведения к общей
//   форме — «Мирзиёев» и «Mirziyoyev» после огрубления сходятся достаточно,
//   чтобы работать как дополнительный голос.
//
// Качество меряется на Gazeta и Spot, где верные пары известны из hreflang, а
// применяется к трём изданиям, где их нет. Режим --eval печатает точность и
// полноту, ничего не записывая.
//
// CLI:
//   node research/match-translations.mjs --eval
//   node research/match-translations.mjs --outlet=kun,daryo,repost
//
// Выход: research/data/translation-pairs-<outlet>.json

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = join(HERE, "raw");
const DATA_DIR = join(HERE, "data");

const argv = process.argv.slice(2);
const arg = (flag, fallback) => {
  const hit = argv.find((a) => a.startsWith(`${flag}=`));
  return hit ? hit.slice(flag.length + 1) : fallback;
};
const evalMode = argv.includes("--eval");
const outletsArg = arg("--outlet", "kun,daryo,repost").split(",");

const WINDOW_HOURS = 24;
const ACCEPT_SCORE = +arg("--threshold", "0.15");
// Во сколько раз лучший кандидат должен опережать второго, чтобы совпадение
// считалось однозначным.
const MARGIN_RATIO = +arg("--margin", "1.15");

// ── приведение текста к сравнимому виду ────────────────────────────────────

// Огрубление кириллицы под латиницу. Цель не корректная транслитерация, а
// общая форма, в которой «Ташкент» и «Toshkent» окажутся достаточно близко:
// шипящие сводятся к одной букве, гласные к базовым, мягкие знаки убираются.
const CYR_MAP = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "j", з: "z",
  и: "i", й: "i", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "s", ч: "c", ш: "s", щ: "s",
  ъ: "", ы: "i", ь: "", э: "e", ю: "u", я: "a",
  ў: "o", қ: "k", ғ: "g", ҳ: "h",
};

function roughen(text) {
  const lower = (text ?? "").toLowerCase();
  let out = "";
  for (const ch of lower) {
    if (CYR_MAP[ch] !== undefined) out += CYR_MAP[ch];
    else if (/[a-z0-9]/.test(ch)) out += ch;
    else out += " ";
  }
  // Латиница узбекского тоже огрубляется: sh/ch/o'/g' сводятся к тем же
  // базовым буквам, что и кириллические соответствия.
  return out
    .replace(/sh/g, "s")
    .replace(/ch/g, "c")
    .replace(/ya/g, "a")
    .replace(/yu/g, "u")
    .replace(/yo/g, "o")
    .replace(/kh/g, "h")
    .replace(/ts/g, "s")
    .replace(/([a-z])\1+/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

// Числа берём как есть, без разделителей: «1 900 000» и «1900000» это одно.
function numbers(text) {
  const out = new Set();
  for (const m of (text ?? "").matchAll(/\d[\d\s.,]*/g)) {
    const clean = m[0].replace(/[\s.,]+$/, "").replace(/[\s]/g, "");
    // Однозначные числа шумят: «2 человека» встречается в каждой третьей
    // заметке и никого ни с кем не различает.
    if (clean.replace(/[.,]/g, "").length >= 2) out.add(clean);
  }
  return out;
}

function tokens(text) {
  return new Set(
    roughen(text)
      .split(" ")
      .filter((w) => w.length >= 4),
  );
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const x of a) if (b.has(x)) shared += 1;
  return shared / (a.size + b.size - shared);
}

// ── признаки пары ──────────────────────────────────────────────────────────

function score(a, b, idf) {
  const hours = Math.abs(new Date(a.publishedAt) - new Date(b.publishedAt)) / 3.6e6;
  if (!Number.isFinite(hours) || hours > WINDOW_HOURS) return null;

  const textA = `${a.title ?? ""} ${a.description ?? ""}`;
  const textB = `${b.title ?? ""} ${b.description ?? ""}`;

  const numA = numbers(textA);
  const numB = numbers(textB);
  // Редкие числа весят больше частых: «2026» встречается везде и ничего не
  // доказывает, а «19,9» за сутки встречается один раз.
  let numWeight = 0;
  let numTotal = 0;
  for (const n of numA) numTotal += idf.get(n) ?? 1;
  for (const n of numB) numTotal += idf.get(n) ?? 1;
  for (const n of numA) if (numB.has(n)) numWeight += 2 * (idf.get(n) ?? 1);
  const numScore = numTotal ? numWeight / numTotal : 0;

  const tokScore = jaccard(tokens(textA), tokens(textB));
  const slugScore = a.slug === b.slug ? 1 : jaccard(tokens(a.slug), tokens(b.slug));
  const timeScore = Math.max(0, 1 - hours / WINDOW_HOURS);

  return {
    total: 0.45 * numScore + 0.3 * tokScore + 0.15 * slugScore + 0.1 * timeScore,
    numScore,
    tokScore,
    slugScore,
    hours,
  };
}

// Обратная частота чисел по всей выборке издания.
function buildIdf(rows) {
  const freq = new Map();
  for (const row of rows) {
    for (const n of numbers(`${row.title ?? ""} ${row.description ?? ""}`)) {
      freq.set(n, (freq.get(n) ?? 0) + 1);
    }
  }
  const idf = new Map();
  const total = rows.length || 1;
  for (const [n, f] of freq) idf.set(n, Math.log(1 + total / f));
  return idf;
}

// ── сопоставление ──────────────────────────────────────────────────────────

// Жадное назначение: считаем все допустимые пары, сортируем по убыванию
// оценки и разбираем сверху, занимая обе стороны. Материал переводится не
// более одного раза на язык, поэтому назначение взаимно однозначное.
function matchPair(rowsA, rowsB, idf) {
  const candidates = [];
  // Проверка на однозначность. Материал, у которого лучший кандидат едва
  // опережает второго, почти всегда сопоставлен неверно: так выглядят
  // однотипные заметки одного дня — курс валют, сводка ДТП, погода. Требуем
  // отрыва: без него лента Spot, где половина материалов вообще не имеет
  // пары, набивается выдуманными совпадениями.
  for (const a of rowsA) {
    const scored = [];
    for (const b of rowsB) {
      const s = score(a, b, idf);
      if (s && s.total >= ACCEPT_SCORE) scored.push({ a, b, ...s });
    }
    if (!scored.length) continue;
    scored.sort((x, y) => y.total - x.total);
    const best = scored[0];
    const runnerUp = scored[1]?.total ?? 0;
    if (runnerUp && best.total < runnerUp * MARGIN_RATIO) continue;
    candidates.push(best);
  }
  candidates.sort((x, y) => y.total - x.total);

  const usedA = new Set();
  const usedB = new Set();
  const pairs = [];
  for (const c of candidates) {
    if (usedA.has(c.a.url) || usedB.has(c.b.url)) continue;
    usedA.add(c.a.url);
    usedB.add(c.b.url);
    pairs.push(c);
  }
  return pairs;
}

function load(outlet) {
  const path = join(RAW_DIR, `articles-${outlet}.jsonl`);
  if (!existsSync(path)) return null;
  return readFileSync(path, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l))
    .filter((r) => r.publishedAt && ["uz", "ru", "en"].includes(r.lang));
}

// ── проверка на эталоне ────────────────────────────────────────────────────

if (evalMode) {
  console.log(`Порог ${ACCEPT_SCORE}, окно ±${WINDOW_HOURS} ч\n`);
  console.log("издание  пара    эталон  найдено  верных  точность  полнота");

  for (const outlet of ["gazeta", "spot"]) {
    const rows = load(outlet);
    if (!rows) continue;
    const idf = buildIdf(rows);
    const byUrl = new Map(rows.map((r) => [r.url, r]));

    for (const [langA, langB] of [["ru", "uz"]]) {
      const A = rows.filter((r) => r.lang === langA);
      const B = rows.filter((r) => r.lang === langB);

      const truth = new Map();
      for (const a of A) {
        const href = a.alternates?.[langB];
        if (href && byUrl.has(href)) truth.set(a.url, href);
      }
      if (!truth.size) continue;

      const found = matchPair(A, B, idf);
      let correct = 0;
      for (const p of found) if (truth.get(p.a.url) === p.b.url) correct += 1;

      const precision = found.length ? (correct / found.length) * 100 : 0;
      const recall = (correct / truth.size) * 100;
      console.log(
        outlet.padEnd(8) +
          `${langA}↔${langB}`.padEnd(8) +
          String(truth.size).padStart(6) +
          String(found.length).padStart(9) +
          String(correct).padStart(8) +
          `${precision.toFixed(1)}%`.padStart(10) +
          `${recall.toFixed(1)}%`.padStart(9),
      );
    }
  }
  process.exit(0);
}

// ── боевой прогон ──────────────────────────────────────────────────────────

mkdirSync(DATA_DIR, { recursive: true });

for (const outlet of outletsArg) {
  const rows = load(outlet);
  if (!rows) {
    console.log(`${outlet}: нет выгрузки статей`);
    continue;
  }
  const idf = buildIdf(rows);
  const langs = [...new Set(rows.map((r) => r.lang))];
  const result = { outlet, threshold: ACCEPT_SCORE, windowHours: WINDOW_HOURS, pairs: [] };

  console.log(`\n${outlet}: материалов ${rows.length}, языки ${langs.join(", ")}`);

  for (let i = 0; i < langs.length; i += 1) {
    for (let j = i + 1; j < langs.length; j += 1) {
      const A = rows.filter((r) => r.lang === langs[i]);
      const B = rows.filter((r) => r.lang === langs[j]);
      if (!A.length || !B.length) continue;
      const found = matchPair(A, B, idf);
      console.log(
        `  ${langs[i]}↔${langs[j]}: ${found.length} пар ` +
          `(из ${A.length} и ${B.length}) — ` +
          `${((found.length / Math.min(A.length, B.length)) * 100).toFixed(0)}% меньшей стороны`,
      );
      for (const p of found) {
        result.pairs.push({
          langA: langs[i],
          langB: langs[j],
          urlA: p.a.url,
          urlB: p.b.url,
          titleA: p.a.title,
          titleB: p.b.title,
          score: +p.total.toFixed(3),
          hours: +p.hours.toFixed(2),
        });
      }
    }
  }

  const out = join(DATA_DIR, `translation-pairs-${outlet}.json`);
  writeFileSync(out, JSON.stringify(result, null, 2));
  console.log(`  → ${out}`);
}
