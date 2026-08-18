#!/usr/bin/env node
// Одна и та же фотография у нескольких материалов подряд.
//
// ЗАЧЕМ. 18.08.2026 владелец заметил, что под двумя новостями про Nvidia
// стоит один снимок. Сверка показала шире: один файл был поставлен трём
// материалам одного дня — про финансирование ИИ-инфраструктуры, про 500 млрд
// Nvidia на Уолл-стрит и про 3 млрд в SB Energy. Лента от этого выглядит
// как повтор одной новости, даже когда новости разные.
//
// Причина простая: бильд не помнит, что ставил час назад. Он тянет снимок
// у первоисточника и сохраняет под именем материала, поэтому один и тот же
// кадр ложится под разными именами, и заметить это нечем. Файловое имя
// не помогает — сравнивать надо байты.
//
//   node scripts/photo-dupes.mjs                  — сверка за окно (2 дня)
//   node scripts/photo-dupes.mjs --days 7
//   node scripts/photo-dupes.mjs --check <файл>   — проверить кадр ДО публикации
//
// Режим --check — для бильда: он спрашивает про скачанный файл, ещё не
// прописав его во frontmatter, и получает ответ «свободен» или «стоит там-то».
//
// Код возврата 1, если найдены повторы.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const POSTS = join(ROOT, "content/posts");
const argv = process.argv.slice(2);
const flag = (n) => (argv.includes(`--${n}`) ? argv[argv.indexOf(`--${n}`) + 1] : null);
const days = Number(flag("days") ?? 2);
const checkFile = flag("check");

const hashOf = (p) => createHash("md5").update(readFileSync(p)).digest("hex");

// Фототека редакции из сверки исключена намеренно. Её кадры и созданы
// для повторного использования — там, где официального снимка не бывает
// в природе (курс, ставка, инфляция). Ротацию внутри неё держит
// scripts/pick-stock.mjs: отдаёт тот кадр, что дольше всех не выходил.
// Требовать от семи снимков полного отсутствия повторов за двое суток —
// значит требовать невозможного, а не качества.
const isStock = (url) => url.startsWith("/images/stock/");

function collect(sinceDay) {
  const used = new Map(); // хеш → [{slug, day, url}]
  if (!existsSync(POSTS)) return used;
  for (const day of readdirSync(POSTS).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))) {
    if (day < sinceDay) continue;
    for (const f of readdirSync(join(POSTS, day))) {
      // Переводы несут тот же снимок, что и оригинал: это одна публикация,
      // а не три, и считать их повтором нельзя.
      if (!f.endsWith(".mdx") || /\.(uz|en)\.mdx$/.test(f)) continue;
      const head = readFileSync(join(POSTS, day, f), "utf8").split(/\n---/, 1)[0];
      const url = (head.match(/^\s+url:\s*"(\/images\/[^"]+)"/m) ?? [])[1];
      if (!url || isStock(url)) continue;
      const abs = join(ROOT, "public", url.replace(/^\//, ""));
      if (!existsSync(abs)) continue;
      const h = hashOf(abs);
      used.set(h, [...(used.get(h) ?? []), { slug: f.replace(/\.mdx$/, ""), day, url }]);
    }
  }
  return used;
}

const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);

// ─── Режим проверки одного кадра ───
if (checkFile) {
  if (!existsSync(checkFile)) {
    console.error(`[photo] файла нет: ${checkFile}`);
    process.exit(0);
  }
  const h = hashOf(checkFile);
  const hit = collect(since).get(h);
  if (!hit?.length) {
    console.error(`[photo] ${basename(checkFile)}: свободен, за ${days} дн. этот кадр не выходил`);
    process.exit(0);
  }
  console.error(`[photo] ${basename(checkFile)}: ЭТОТ ЖЕ КАДР УЖЕ СТОИТ:`);
  for (const u of hit) console.error(`   ${u.day}  ${u.slug}`);
  console.error("[photo] возьми другой кадр — соседний в галерее источника или иной ракурс");
  process.exit(1);
}

// ─── Сверка окна ───
const dupes = [...collect(since).entries()].filter(([, v]) => v.length > 1);
if (!dupes.length) {
  console.error(`[photo] за ${days} дн. повторов нет`);
  process.exit(0);
}
console.error(`[photo] повторов за ${days} дн.: ${dupes.length}`);
for (const [, v] of dupes) {
  console.error(`  ✗ один файл у ${v.length} материалов (${v[0].url}):`);
  for (const u of v) console.error(`     ${u.day}  ${u.slug}`);
}
process.exit(1);
