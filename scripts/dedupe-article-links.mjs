#!/usr/bin/env node
// Снимает повторные гиперссылки на один и тот же URL внутри материала.
//
// С 17.08.2026 действует CORE.md §1: ссылка одна на источник в материале, а не
// на каждое утверждение. Существующие материалы писались по прежнему правилу,
// и в них накопилось 453 повтора одного и того же адреса — до 14 штук в одном
// тексте.
//
// Правка механическая и обратимая по смыслу: [подпись](url) превращается в
// «подпись», текст остаётся слово в слово, исчезает только разметка ссылки.
// Первое вхождение каждого URL сохраняется — материал остаётся связанным с
// источником, а frontmatter.sources не трогается вовсе.
//
// Чего скрипт НЕ делает:
//
//   Не трогает разные URL на одном домене. Два документа на president.uz —
//   это два источника, и по §1 каждый имеет право на свою ссылку. Таких
//   случаев 263, и решать по ним должен человек, а не регулярка.
//
//   Не сокращает длинные подписи. Перенести ссылку с названия акта на его
//   номер — это переписывание фразы, механически безопасно не делается.
//
//   Не переписывает атрибуции в мировых новостях. Убрать «сообщает PBS
//   NewsHour» — правка текста, а не разметки.
//
// Переводы обрабатываются вместе с оригиналом: у них те же ссылки, и
// расходиться версии не должны.
//
// CLI:
//   node scripts/dedupe-article-links.mjs            — показать, что будет
//   node scripts/dedupe-article-links.mjs --apply    — записать

import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const POSTS_DIR = join(ROOT, "content/posts");
const apply = process.argv.includes("--apply");

const LINK = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;

// Идентификатор акта в подписи: ЗРУ-1079, №ПП-285, ПКМ-289, УП-140, рег. №3854
// и латинские соответствия. Такая подпись всегда предпочтительнее глагола.
// Латинские формы обязательны: переводы пишут «Resolution No. PP-285» и
// «Law No. ZRU-1079», и без них правка оставляла ссылку на глаголе в en/uz
// версиях, хотя в русской вставала правильно.
const ACT_ID =
  /(ЗРУ|ПП|ПКМ|УП|ПФ|ЎРҚ|ZRU|PP|PKM|PQ|PF|UP|O.RQ|рег\.?\s*№|reg\.?\s*(No|№))\s*-?\s*(№|No\.?)?\s*\d/i;

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
let removed = 0;
const samples = [];

for (const file of collect(POSTS_DIR)) {
  const raw = readFileSync(file, "utf8");
  const m = raw.match(/^(---\n[\s\S]*?\n---\n?)([\s\S]*)$/);
  if (!m) continue;
  const [, frontmatter, body] = m;

  // Какое из вхождений оставить ссылкой — не всё равно. По CORE.md ссылка
  // должна стоять на идентификаторе акта, а не на глаголе. В материале про
  // идентификацию животных один и тот же адрес был подписан «создан»,
  // «постановлению №ПП-285» и «направлено»: оставить первое значило бы
  // повесить ссылку на глагол и выбросить правильную подпись.
  //
  // Поэтому сначала ищем среди подписей идентификатор, и только если его нет
  // — оставляем первое вхождение.
  const occurrences = new Map();
  for (const m of body.matchAll(LINK)) {
    const [, text, url] = m;
    if (!occurrences.has(url)) occurrences.set(url, []);
    occurrences.get(url).push(text);
  }

  const keepIndex = new Map();
  for (const [url, texts] of occurrences) {
    const better = texts.findIndex((t) => ACT_ID.test(t));
    keepIndex.set(url, better >= 0 ? better : 0);
  }

  const seenCount = new Map();
  let count = 0;
  const next = body.replace(LINK, (whole, text, url) => {
    const i = seenCount.get(url) ?? 0;
    seenCount.set(url, i + 1);
    if (i === keepIndex.get(url)) return whole;
    count += 1;
    if (samples.length < 6) {
      samples.push({ file: file.replace(ROOT + "/", ""), text, url });
    }
    return text;
  });

  if (!count) continue;
  touched += 1;
  removed += count;
  if (apply) writeFileSync(file, frontmatter + next);
}

console.log(
  `${apply ? "Снято" : "Будет снято"}: ${removed} повторных ссылок в ${touched} файлах` +
    (apply ? "" : "  (запуск с --apply запишет)"),
);
if (samples.length) {
  console.log("\nпримеры:");
  for (const s of samples) {
    console.log(`  ${s.file}`);
    console.log(`     [${s.text.slice(0, 60)}](${s.url.slice(0, 50)}) → ${s.text.slice(0, 60)}`);
  }
}
