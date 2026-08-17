#!/usr/bin/env node
// Переносит гиперссылку с названия акта на его идентификатор.
//
// CORE.md (раздел «Номера актов», 17.08.2026): ссылка стоит на ЗРУ-123,
// ПКМ-456, УП-140 или на одно слово вида документа, но никогда на полном
// названии. Материалы, написанные до этого правила, затягивали в ссылку всю
// формулировку — вплоть до 163 знаков с перечислением поголовья скота.
//
// Правка чисто разметочная: слова остаются на месте и в том же порядке,
// меняются только границы ссылки.
//
//   было:  [постановлением Кабинета министров №376](url) от 3 июля
//   стало: постановлением Кабинета министров [№376](url) от 3 июля
//
// Трогаем только те подписи, внутри которых идентификатор действительно
// найден. Подписи вроде «Единый портал интерактивных государственных услуг
// my.gov.uz» — это имя собственное, а не название акта, и их скрипт не
// касается: сокращать их надо руками или не сокращать вовсе.
//
// CLI:
//   node scripts/shorten-act-link-anchors.mjs           — показать
//   node scripts/shorten-act-link-anchors.mjs --apply   — записать

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const POSTS_DIR = join(ROOT, "content/posts");
const apply = process.argv.includes("--apply");

const LINK = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
const MIN_ANCHOR = 40;

// Идентификатор внутри подписи. Порядок важен: сначала формы с буквенным
// префиксом (ПП-145, ЗРУ-1079), потом голый номер с решёткой (№376) — иначе
// «№» подхватится раньше, чем префикс, и ссылка сядет на кусок идентификатора.
const ID_PATTERNS = [
  /(?:№\s*)?(?:ЗРУ|ПП|ПКМ|УП|ПФ|ЎРҚ|ZRU|PP|PKM|PQ|PF|UP)\s*-?\s*№?\s*\d+(?:-son)?/i,
  /рег\.?\s*№\s*\d+/i,
  /№\s*\d+/,
];

function findId(text) {
  for (const re of ID_PATTERNS) {
    const m = text.match(re);
    if (m) return { value: m[0], index: m.index, length: m[0].length };
  }
  return null;
}

function collect(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...collect(p));
    else if (e.isFile() && e.name.endsWith(".mdx")) out.push(p);
  }
  return out;
}

let touched = 0;
let changed = 0;
const samples = [];

for (const file of collect(POSTS_DIR)) {
  const raw = readFileSync(file, "utf8");
  const m = raw.match(/^(---\n[\s\S]*?\n---\n?)([\s\S]*)$/);
  if (!m) continue;
  const [, frontmatter, body] = m;

  let count = 0;
  const next = body.replace(LINK, (whole, text, url) => {
    if (text.length <= MIN_ANCHOR) return whole;
    const id = findId(text);
    if (!id) return whole;
    // Если идентификатор и есть вся подпись — сокращать нечего.
    if (id.length === text.length) return whole;

    const before = text.slice(0, id.index);
    const after = text.slice(id.index + id.length);
    count += 1;
    if (samples.length < 5) {
      samples.push({ file: file.replace(ROOT + "/", ""), text, id: id.value });
    }
    return `${before}[${id.value}](${url})${after}`;
  });

  if (!count) continue;
  touched += 1;
  changed += count;
  if (apply) writeFileSync(file, frontmatter + next);
}

console.log(
  `${apply ? "Сокращено" : "Будет сокращено"}: ${changed} подписей в ${touched} файлах` +
    (apply ? "" : "  (запуск с --apply запишет)"),
);
for (const s of samples) {
  console.log(`\n  ${s.file}`);
  console.log(`     было:  [${s.text}]`);
  console.log(`     стало: ссылка только на «${s.id}»`);
}
