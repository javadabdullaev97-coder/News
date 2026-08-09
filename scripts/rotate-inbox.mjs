#!/usr/bin/env node
// Ротация инбокса. Файлы старше окна чтения удаляются из рабочего дерева.
//
// Зачем. content/inbox рос без границы: замер 09.08.2026 — 26 МБ в двадцати
// файлах, из них world-2026-08-05.jsonl один весит 2,8 МБ. Растёт примерно
// на 3 МБ в сутки и не перестаёт.
//
// При этом читается из него ровно два файла на поток — сегодняшний и
// вчерашний (readInbox в lib/inbox-core.mjs), а отсечку по возрасту делает
// selectFresh с окном 24 часа. Всё, что старше, не читает никто и никогда.
//
// Цена этого веса не в диске, а во времени: планёрка работает в свежем клоне
// и тянет репозиторий на каждом заходе, а заходов трое в час.
//
// Дедуп-кэш (seen.jsonl, легаси seen.json) не трогаем ни при каких --keep:
// он не датирован, и его потеря вернула бы в инбокс двадцать тысяч уже
// виденных ссылок.
//
// История в git остаётся: удалённый файл достаётся `git show <коммит>:<путь>`,
// если когда-нибудь понадобится разбор старого прогона.
//
// Использование:
//   node scripts/rotate-inbox.mjs             — показать, что удалилось бы
//   node scripts/rotate-inbox.mjs --apply     — удалить
//   node scripts/rotate-inbox.mjs --keep=7 --apply

import { readdirSync, statSync, rmSync } from "node:fs";
import { join } from "node:path";
import { ROOT, tashkentDay } from "../lib/inbox-core.mjs";

function opt(name, fallback) {
  const p = process.argv.find((a) => a.startsWith(`--${name}=`));
  return p ? p.slice(name.length + 3) : fallback;
}

const apply = process.argv.includes("--apply");
// Три дня при окне чтения в два — запас на случай, когда фетчер отстал,
// а планёрка смотрит вчерашний файл на границе суток.
const keep = Math.max(2, Number(opt("keep", 3)));

const DIR = join(ROOT, "content/inbox");
const DATED = /^(?:world-)?(\d{4}-\d{2}-\d{2})\.jsonl$/;

const horizon = tashkentDay(Date.now() - keep * 24 * 3600 * 1000);

const doomed = [];
let keptBytes = 0;

for (const name of readdirSync(DIR)) {
  const m = name.match(DATED);
  if (!m) continue; // seen.jsonl, seen.json и всё недатированное — мимо
  const size = statSync(join(DIR, name)).size;
  if (m[1] < horizon) doomed.push({ name, day: m[1], size });
  else keptBytes += size;
}

doomed.sort((a, b) => a.name.localeCompare(b.name));
const freed = doomed.reduce((s, f) => s + f.size, 0);
const mb = (b) => (b / 1048576).toFixed(1);

for (const f of doomed) {
  console.error(`  ${apply ? "удалён" : "удалился бы"}  ${f.name}  ${mb(f.size)} МБ`);
  if (apply) rmSync(join(DIR, f.name));
}

console.error(
  `[rotate-inbox] окно ${keep} сут (с ${horizon}): ` +
    `${doomed.length} файлов, ${mb(freed)} МБ ${apply ? "освобождено" : "к удалению"}; ` +
    `остаётся ${mb(keptBytes)} МБ` +
    (apply ? "" : "   — запусти с --apply, чтобы удалить")
);
