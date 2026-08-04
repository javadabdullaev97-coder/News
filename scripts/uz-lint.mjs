#!/usr/bin/env node
// Правила узбекского письма, которые переводчики нарушают систематически.
//
// ЗАЧЕМ. 05.08.2026 при переводе архива семь агентов дали семь вариантов
// одного и того же: одни писали `44%i`, другие `44 foiz`; одни ставили
// модификатор `ʻ`, другие прямой апостроф; номера актов шли то узбекской
// формой (`PQ-391`), то транслитерацией русской (`PP-391`). Каждое из
// расхождений само по себе мелочь, вместе — издание, которое выглядит
// собранным из кусков. Инструкцию агенты читают, но детали такого рода
// проще проверить механически, чем надеяться на внимательность.
//
// Правила — из docs/terminology-glossary.md, там же обоснования.
//
//   node scripts/uz-lint.mjs           — проверить, ничего не менять (exit 1 при находках)
//   node scripts/uz-lint.mjs --fix     — исправить на месте
//
// Планёрка запускает с --fix после перевода, до коммита (см. planyorka.md).

import { readFileSync, writeFileSync } from "node:fs";
import { readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const POSTS = join(ROOT, "content/posts");
const fix = process.argv.includes("--fix");

/** Каждое правило: что ищем, чем заменяем, как объяснить в отчёте. */
const RULES = [
  {
    name: "проценты словом foiz",
    re: /(\d[\d\s,. ]*?)%(?:&nbsp;)?([a-zA-Z']*)/g,
    to: (m, num, suffix) => `${num.trimEnd()} foiz${suffix}`,
  },
  {
    name: "прямой апостроф вместо модификаторов",
    re: /[ʻʼ‘’]/g,
    to: () => "'",
  },
  {
    name: "закон — O'RQ, не транслитерация ZRU",
    re: /\bZRU-(\d+)/g,
    to: (m, n) => `O'RQ-${n}`,
  },
  {
    name: "постановление — PQ, не транслитерация PP",
    re: /\bPP-(\d+)/g,
    to: (m, n) => `PQ-${n}`,
  },
  {
    name: "указ — PF, не транслитерация UP",
    re: /\bUP-(\d+)/g,
    to: (m, n) => `PF-${n}`,
  },
];

const files = [];
const dayRe = /^\d{4}-\d{2}-\d{2}$/;
for (const day of (existsSync(POSTS) ? readdirSync(POSTS) : []).filter((d) => dayRe.test(d))) {
  for (const f of readdirSync(join(POSTS, day))) {
    if (f.endsWith(".uz.mdx")) files.push(join(POSTS, day, f));
  }
}

let touched = 0;
const findings = [];
for (const file of files) {
  const text = readFileSync(file, "utf8");
  let next = text;
  const hits = [];
  for (const rule of RULES) {
    const before = next;
    next = next.replace(rule.re, rule.to);
    if (next !== before) hits.push(rule.name);
  }
  if (next !== text) {
    findings.push({ file: file.replace(ROOT + "/", ""), rules: hits });
    if (fix) {
      writeFileSync(file, next);
      touched++;
    }
  }
}

for (const f of findings) {
  console.error(`${fix ? "✓" : "✗"} ${f.file}: ${f.rules.join("; ")}`);
}
console.error(
  fix
    ? `[uz-lint] проверено ${files.length}, исправлено ${touched}`
    : `[uz-lint] проверено ${files.length}, с нарушениями ${findings.length}`,
);
process.exit(!fix && findings.length ? 1 : 0);
