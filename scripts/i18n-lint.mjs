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

// Русский: узбекских префиксов актов быть не должно. Номер один и тот же,
// меняется только буква вида документа (lex.uz: УП-140 = PF-140-son).
// Правило существовало с 04.08.2026, но с лазейкой «если русской публикации
// ещё нет — оставь узбекский номер», и через неё ПФ, ЎРҚ и УРК разошлись
// по двум десяткам материалов (06.08.2026). Лазейка закрыта, проверка здесь.
const RU_RULES = [
  {
    name: "закон — ЗРУ, не ЎРҚ/УРК/O'RQ",
    re: /\b(?:ЎРҚ|УРК|O'RQ|ORQ)[-–]?(\d+)(?:-сон)?/g,
    to: (m, n) => `ЗРУ-${n}`,
  },
  {
    name: "указ — УП, не ПФ/PF",
    re: /\b(?:ПФ|PF)[-–]?(\d+)(?:-сон)?/g,
    to: (m, n) => `УП-${n}`,
  },
  {
    name: "постановление — ПП, не ПҚ/PQ",
    re: /\b(?:ПҚ|ПК|PQ)[-–]?(\d+)(?:-сон)?/g,
    to: (m, n) => `ПП-${n}`,
  },
];

// Английский берёт русскую нумерацию: читатель идёт за документом
// на русскую страницу lex.uz, узбекской он там не найдёт.
const EN_ACT_RULES = [
  { name: "закон — ZRU, не O'RQ", re: /\b(?:O'RQ|ORQ)[-–]?(\d+)/g, to: (m, n) => `ZRU-${n}` },
  { name: "указ — UP, не PF", re: /\bPF[-–]?(\d+)/g, to: (m, n) => `UP-${n}` },
  { name: "постановление — PP, не PQ", re: /\bPQ[-–]?(\d+)/g, to: (m, n) => `PP-${n}` },
];

const RULES_BY_LANG = { ru: RU_RULES, uz: UZ_RULES, en: [...EN_RULES, ...EN_ACT_RULES] };

// Хвосты служебной разметки агентов. Проверяются во ВСЕХ языках, включая
// русский, и не чинятся автоматически: обрывок tool-call'а в тексте обычно
// значит, что агент дописал файл не до конца, — это нужно смотреть глазами,
// а не молча вырезать.
//
// Случай не единичный: 01.08.2026 материал о плотности предпринимательства
// вышел на сайт с литеральным «</content></invoke>» в последнем абзаце,
// 05.08.2026 то же самое просочилось в две статьи через переводчика.
// build-posts.mjs про это предупреждает, но сборку не роняет — предупреждение
// легко пролистать. Здесь это ошибка.
const LEAK_MARKERS = [
  "</content>",
  "</invoke>",
  "<invoke",
  "<function_calls>",
  "</function_calls>",
  "antml:",
  "<parameter",
  "STATUS: translated",
  "IMAGE_PATH:",
];

const files = [];
const dayRe = /^\d{4}-\d{2}-\d{2}$/;
for (const day of (existsSync(POSTS) ? readdirSync(POSTS) : []).filter((d) => dayRe.test(d))) {
  for (const f of readdirSync(join(POSTS, day))) {
    if (!f.endsWith(".mdx")) continue;
    const m = f.match(/\.(uz|en)\.mdx$/);
    files.push({ path: join(POSTS, day, f), lang: m ? m[1] : "ru" });
  }
}

let touched = 0;
const findings = [];
const leaks = [];
for (const { path: file, lang } of files) {
  const text = readFileSync(file, "utf8");
  const found = LEAK_MARKERS.filter((sig) => text.includes(sig));
  if (found.length) leaks.push({ file: file.replace(ROOT + "/", ""), markers: found });
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
// Карточки needs-verification обязаны нести машиночитаемый срок возврата.
//
// Без recheckAt карточку не разморозит никто: §Шаг 1б спецификации отбирает
// созревшие именно по этому полю, а прозаическое «через 4 часа» в теле
// от какой даты считать — не следует. Так папка два дня работала на запись
// (03.08.2026), и так же 06.08.2026 в ней нашлись карточки без срока.
//
// Проверяются только .md и .mdx БЕЗ языкового суффикса: перевод — не карточка,
// своего срока у него нет, он уезжает вместе с оригиналом.
const NV_DIR = join(ROOT, "content/needs-verification");
const cards = [];
const overdue = [];
if (existsSync(NV_DIR)) {
  for (const f of readdirSync(NV_DIR)) {
    if (!/\.mdx?$/.test(f) || /\.(uz|en)\.mdx$/.test(f)) continue;
    const text = readFileSync(join(NV_DIR, f), "utf8");
    // Материал, ждущий владельца, живёт по другому правилу: у него срок —
    // ответ человека, а не календарь. Его подгоняет editor-queue remind.
    if (/^awaitingEditor:\s*(true|"true")/m.test(text)) continue;
    const m = text.match(/^recheckAt:\s*"?([0-9T:+\-.]+)"?/m);
    if (!m) { cards.push(f); continue; }
    // Просрочка — не дефект файла, а редакционный долг: карточку не разморозили
    // вовремя. Не роняем прогон, но показываем, иначе она тихо стареет
    // (06.08.2026 одна ждала 55 часов).
    const due = Date.parse(m[1].length <= 10 ? `${m[1]}T00:00:00+05:00` : m[1]);
    if (Number.isFinite(due) && Date.now() - due > 24 * 3600 * 1000) {
      overdue.push({ file: f, hours: Math.round((Date.now() - due) / 3600000) });
    }
  }
}
for (const o of overdue) {
  console.error(`… content/needs-verification/${o.file}: срок перепроверки прошёл ${o.hours} ч назад`);
}
for (const c of cards) {
  console.error(`✗ content/needs-verification/${c}: нет recheckAt — карточку некому разморозить`);
}

for (const l of leaks) {
  console.error(`✗ ${l.file}: служебная разметка агента в тексте (${l.markers.join(", ")}) — вычистить руками`);
}
console.error(
  fix
    ? `[i18n-lint] проверено ${files.length}, исправлено ${touched}, утечек разметки ${leaks.length}, карточек без срока ${cards.length}, просроченных ${overdue.length}`
    : `[i18n-lint] проверено ${files.length}, с нарушениями ${findings.length}, утечек разметки ${leaks.length}, карточек без срока ${cards.length}, просроченных ${overdue.length}`,
);
// Утечка разметки — ошибка всегда, даже в режиме --fix: чинить её
// автоматически нельзя, а выпускать материал с ней нельзя тем более.
process.exit(leaks.length || cards.length || (!fix && findings.length) ? 1 : 0);
