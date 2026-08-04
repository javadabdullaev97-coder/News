#!/usr/bin/env node
// Правила письма на языках издания, которые переводчики нарушают
// систематически.
//
// ЗАЧЕМ. 05.08.2026 при переводе архива семь агентов дали семь вариантов
// одного и того же: одни писали `44%i`, другие `44 foiz`; одни ставили
// модификатор `ʻ`, другие прямой апостроф; номера актов шли то узбекской
// формой (`PQ-391`), то транслитерацией русской (`PP-391`). Каждое из
// расхождений само по себе мелочь, вместе — издание, которое выглядит
// собранным из кусков. Инструкцию агенты читают, но детали такого рода
// проще проверить механически, чем надеяться на внимательность.
//
// То же с английским: 05.08.2026 владелец забраковал форму «Energy Ministry» —
// у министерств официальное английское имя строится как «Ministry of Energy»,
// и газетная инверсия в заголовке издания выглядит калькой.
//
// Правила — из docs/terminology-glossary.md, там же обоснования.
//
//   node scripts/i18n-lint.mjs           — проверить, ничего не менять (exit 1 при находках)
//   node scripts/i18n-lint.mjs --fix     — исправить на месте
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
const UZ_RULES = [
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

// Английский: инверсия «X Ministry» → официальное «Ministry of X».
//
// Комитеты и агентства сюда НЕ входят: у них официальное английское имя
// как раз с инверсией — «State Tax Committee», «National Statistics
// Committee», «Cadastre Agency». Переставлять их значит выдумывать
// название, которого у ведомства нет.
// Только УЗБЕКСКИЕ ведомства. Министерства других стран правило не трогает:
// «Iranian Foreign Ministry» — идиоматичная английская форма, и растягивать
// её до «Iranian Ministry of Foreign Affairs» владелец счёл лишним
// (05.08.2026). Поэтому в списке нет `Foreign`: по одному слову
// не отличить МИД Узбекистана от чужого, а ошибиться в сторону
// иностранных ведомств здесь дороже.
const MINISTRIES = {
  Energy: "Energy",
  Transport: "Transport",
  Justice: "Justice",
  Health: "Health",
  Economy: "Economy and Finance",
};

const EN_RULES = Object.entries(MINISTRIES).map(([word, full]) => ({
  name: `«${word} Ministry» → «Ministry of ${full}»`,
  re: new RegExp(`\\b${word} Ministry\\b`, "g"),
  to: () => `Ministry of ${full}`,
}));

const RULES_BY_LANG = { uz: UZ_RULES, en: EN_RULES };

const files = [];
const dayRe = /^\d{4}-\d{2}-\d{2}$/;
for (const day of (existsSync(POSTS) ? readdirSync(POSTS) : []).filter((d) => dayRe.test(d))) {
  for (const f of readdirSync(join(POSTS, day))) {
    const m = f.match(/\.(uz|en)\.mdx$/);
    if (m) files.push({ path: join(POSTS, day, f), lang: m[1] });
  }
}

let touched = 0;
const findings = [];
for (const { path: file, lang } of files) {
  const text = readFileSync(file, "utf8");
  let next = text;
  const hits = [];
  for (const rule of RULES_BY_LANG[lang] ?? []) {
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
    ? `[i18n-lint] проверено ${files.length}, исправлено ${touched}`
    : `[i18n-lint] проверено ${files.length}, с нарушениями ${findings.length}`,
);
process.exit(!fix && findings.length ? 1 : 0);
