#!/usr/bin/env node
// Проверяет таблицу цитат репортёра против драфта.
//
// ЗАЧЕМ. Таблица (.review/claims-<slug>.md) существует, чтобы фактчекер
// не открывал заново источники, которые репортёр уже прочитал. Но это
// работает ровно до тех пор, пока таблица честная: если в ней нет половины
// цифр статьи, экономия получается за счёт непроверенных утверждений —
// то есть за счёт того, ради чего фактчекер и нужен.
//
// Скрипт ловит три вещи, которые видно машинно:
//   1. ссылку в таблице, которой нет в frontmatter.sources — цитата
//      неизвестно откуда;
//   2. источник, на который не сослалась ни одна строка — либо ссылка
//      лишняя, либо утверждение потеряно;
//   3. число из текста статьи, которого нет ни в одной цитате, — а число
//      это то, что опровергают.
//
// Что НЕ ловит: подходит ли цитата к утверждению. Это смысловая работа,
// и она остаётся за фактчекером — скрипт готовит ему список мест,
// куда смотреть.
//
//   node scripts/claims-lint.mjs content/drafts/2026-08-17/<slug>.mdx
//   node scripts/claims-lint.mjs <draft> --claims .review/claims-<slug>.md
//   node scripts/claims-lint.mjs <draft> --json
//
// Код возврата 1 — таблица требует доработки. Нет таблицы вовсе — 0
// и предупреждение: старые материалы и rework без неё законны.

import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { parseFrontmatter, stripFrontmatter } from "../lib/frontmatter.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const argv = process.argv.slice(2);
const asJson = argv.includes("--json");
const flag = (n) => {
  const i = argv.indexOf(`--${n}`);
  return i === -1 ? null : argv[i + 1];
};
const draftPath = argv.find((a) => !a.startsWith("--") && a.endsWith(".mdx"));

if (!draftPath || !existsSync(draftPath)) {
  console.error("Использование: node scripts/claims-lint.mjs <draft.mdx> [--claims <файл>] [--json]");
  process.exit(0);
}

const slug = basename(draftPath).replace(/\.(uz|en)?\.?mdx$/, "").replace(/\.mdx$/, "");
const claimsPath = flag("claims") ?? join(ROOT, ".review", `claims-${slug}.md`);

const raw = readFileSync(draftPath, "utf8");
const fm = parseFrontmatter(raw);
const body = stripFrontmatter(raw);

if (!existsSync(claimsPath)) {
  console.error(`[claims-lint] таблицы нет: ${relative(ROOT, claimsPath)} — фактчекер пойдёт по источникам сам`);
  if (asJson) console.log(JSON.stringify({ slug, table: false, problems: [] }));
  process.exit(0);
}

const table = readFileSync(claimsPath, "utf8");
const rows = table
  .split("\n")
  .filter((l) => l.trim().startsWith("|"))
  .map((l) => l.split("|").slice(1, -1).map((c) => c.trim()))
  .filter((cells) => cells.length >= 4 && !/^-+$/.test(cells[0]) && !/^#$/.test(cells[0]));

const sourceUrls = new Set(
  (Array.isArray(fm.sources) ? fm.sources : []).map((s) => String(s?.url ?? "").trim()).filter(Boolean),
);

const problems = [];

// 1. Ссылки из таблицы обязаны быть среди источников статьи.
const usedUrls = new Set();
for (const cells of rows) {
  const url = (cells[2].match(/https?:\/\/\S+/) ?? [])[0]?.replace(/[)\]]+$/, "");
  if (!url) continue;
  usedUrls.add(url);
  if (!sourceUrls.has(url)) {
    problems.push({
      kind: "чужая-ссылка",
      detail: `в таблице ${url}, но во frontmatter.sources её нет`,
    });
  }
}

// 2. Источники, на которые не сослалась ни одна строка.
for (const url of sourceUrls) {
  if (!usedUrls.has(url)) {
    problems.push({
      kind: "источник-без-строки",
      detail: `${url} — ни одно утверждение на него не опирается`,
    });
  }
}

// 3. Числа статьи, которых нет ни в одной цитате.
//
// Считаем только значимые: годы, суммы, проценты, количества. Одиночные
// цифры внутри слов и номера в ссылках не в счёт. Нормализуем пробелы
// внутри числа (11 857 и 11857 — одно и то же) и запятую в дробях.
function numbersOf(text) {
  const cleaned = text
    .replace(/\[[^\]]*\]\([^)]*\)/g, " ") // markdown-ссылки целиком
    .replace(/https?:\/\/\S+/g, " ");
  const out = new Set();
  for (const m of cleaned.matchAll(/\d[\d   ]*(?:[.,]\d+)?/g)) {
    const norm = m[0].replace(/[   ]/g, "").replace(",", ".").replace(/\.$/, "");
    if (norm.length >= 2) out.add(norm);
  }
  return out;
}

const quoted = numbersOf(rows.map((c) => `${c[1]} ${c[3]}`).join(" "));
const missing = [...numbersOf(body)].filter((n) => !quoted.has(n));
for (const n of missing) {
  problems.push({ kind: "число-без-цитаты", detail: `${n} — нет ни в одной цитате таблицы` });
}

if (asJson) {
  console.log(JSON.stringify({ slug, table: true, rows: rows.length, problems }, null, 2));
} else {
  console.error(`[claims-lint] ${slug}: строк ${rows.length}, источников ${sourceUrls.size}`);
  for (const p of problems) console.error(`  ✗ ${p.kind}: ${p.detail}`);
  console.error(
    problems.length
      ? `→ ${problems.length} мест требуют доработки таблицы`
      : "→ таблица покрывает статью",
  );
}
process.exit(problems.length ? 1 : 0);
