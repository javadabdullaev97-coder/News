#!/usr/bin/env node
// Нужен ли бильд-агент этому материалу — или хватит кадра из фототеки.
//
// ЗАЧЕМ. Бильд вызывается всегда, и правильно: материал без картинки
// выглядит недоделанным, а в Telegram теряет превью. Но у части материалов
// картинки не бывает в природе — ставка ЦБ, курс сума, инфляция. Там агент
// на 25 КБ инструкций делает то же, что делает скрипт за миллисекунды:
// берёт кадр из фототеки редакции.
//
// ГДЕ ГРАНИЦА. Первичный путь бильда — фотография у первоисточника, и она
// лучше любого стока: снимок с пресс-конференции сильнее банкнот на столе.
// Поэтому гейт срабатывает только там, где такого снимка заведомо нет,
// и проверяет это тремя условиями сразу:
//
//   1. репортёр сам написал в notes, что явного визуального субъекта нет;
//   2. тема статьи попадает в фототеку по config/stock-photos.json;
//   3. в материале не упомянут никто из config/named-actors — человек
//      в кадре важнее пачки купюр.
//
// Любое условие не выполнено — зовём бильда. Отказ здесь дешёвый: лишний
// вызов агента против невнятной картинки в ленте.
//
//   node scripts/bild-gate.mjs content/drafts/2026-08-17/<slug>.mdx
//   node scripts/bild-gate.mjs <файл> --json
//   node scripts/bild-gate.mjs <файл> --notes <путь>   # notes не по умолчанию
//
// Код возврата всегда 0 — это справка, решение в поле skip.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { parseFrontmatter, stripFrontmatter } from "../lib/frontmatter.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const argv = process.argv.slice(2);
const asJson = argv.includes("--json");
const file = argv.find((a) => !a.startsWith("--") && a.endsWith(".mdx"));

function answer(skip, reason, photo = null) {
  if (asJson) console.log(JSON.stringify({ skip, reason, photo }, null, 2));
  else console.error(`[bild-gate] ${skip ? "кадр из фототеки" : "зовём бильда"}: ${reason}`);
  process.exit(0);
}

if (!file || !existsSync(file)) answer(false, "файла нет");

const manifest = JSON.parse(readFileSync(join(ROOT, "config/stock-photos.json"), "utf8"));
const raw = readFileSync(file, "utf8");
const fm = parseFrontmatter(raw);
const slug = basename(file).replace(/\.mdx$/, "");

// ─── 1. Что сказал репортёр про визуальный субъект ───
//
// Строка «Main visual subject» в его notes — единственное место, где кто-то
// уже подумал, что должно быть на картинке. Нет notes — нет и основания
// решать за бильда.
const notesFlag = argv[argv.indexOf("--notes") + 1];
const notesPath = argv.includes("--notes")
  ? notesFlag
  : join(ROOT, ".review", `reporter-notes-${slug}.md`);
if (!existsSync(notesPath)) answer(false, "нет notes репортёра — визуальный субъект неизвестен");

const notes = readFileSync(notesPath, "utf8");
const subjectBlock = notes.match(/##\s*Main visual subject\s*\n([\s\S]*?)(?:\n##|$)/i)?.[1] ?? "";
const subject = subjectBlock.replace(/^[-*\s]+/gm, " ").trim().toLowerCase();
if (!subject) answer(false, "в notes нет строки Main visual subject");
if (!/нет явного субъекта|no clear subject/.test(subject)) {
  answer(false, `репортёр назвал субъект: «${subjectBlock.trim().slice(0, 80)}» — это снимает бильд`);
}

// ─── 2. Попадает ли тема в фототеку ───
const haystack = `${fm.title ?? ""} ${(fm.tags ?? []).join(" ")}`.toLowerCase();
// Тем может совпасть несколько: у материала про курс доллара в тегах и «ЦБ
// РУз», и «валютный рынок». Берём ту, по которой совпадений больше, — она
// ближе к предмету статьи, а не к её обстоятельствам.
const topics = Object.entries(manifest.topicKeywords ?? {})
  .map(([topic, keys]) => [topic, keys.filter((k) => haystack.includes(String(k).toLowerCase())).length])
  .filter(([, hits]) => hits > 0)
  .sort((a, b) => b[1] - a[1])
  .map(([topic]) => topic);
if (!topics.length) answer(false, "тема не покрывается фототекой");

// ─── 3. Не назван ли человек ───
//
// Сначала местные должности: списки named-actors про ГЛОБАЛЬНУЮ узнаваемость
// и чиновников Узбекистана не содержат намеренно — президенту незачем бонус
// к рассылке в узбекском издании. Для картинки же он главный: под указ идёт
// снимок с совещания, а не пачка купюр. Найдено регрессией 17.08.2026.
const officialHit = (manifest.neverStockMarkers ?? []).find((m) => haystack.includes(String(m).toLowerCase()));
if (officialHit) answer(false, `в материале есть «${officialHit}» — у темы будет официальное фото`);

// Дальше — глобальные имена. Тот же обход, что в scripts/tg-score.mjs:
// списки вложенные, а совпадение ищется по границам слова — иначе «Интер»
// находится в «интервью».
const body = stripFrontmatter(raw).toLowerCase();
const full = `${haystack} ${body}`;
function* namesOf(node) {
  if (Array.isArray(node)) {
    for (const v of node) if (typeof v === "string") yield v;
    return;
  }
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      if (!k.startsWith("$")) yield* namesOf(v);
    }
  }
}
const actorFiles = ["global", ...(fm.category === "sport" || fm.category === "tech" ? [fm.category] : [])];
for (const name of actorFiles) {
  const p = join(ROOT, "config/named-actors", `${name}.json`);
  if (!existsSync(p)) continue;
  for (const candidate of namesOf(JSON.parse(readFileSync(p, "utf8")))) {
    const esc = candidate.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`(?<![\\p{L}\\p{N}])${esc}(?![\\p{L}\\p{N}])`, "u").test(full)) {
      answer(false, `в материале назван «${candidate}» — человек в кадре важнее стока`);
    }
  }
}

// ─── Кадр ───
for (const topic of topics) {
  try {
    const out = execFileSync("node", [join(ROOT, "scripts/pick-stock.mjs"), "--topic", topic], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const photo = JSON.parse(out);
    if (photo?.url) {
      answer(true, `тема «${topic}», кадр не использовался дольше прочих`, photo);
    }
  } catch {
    // Нет пригодных кадров по этой теме — пробуем следующую.
  }
}
answer(false, `темы ${topics.join(", ")} в фототеке есть, но пригодных по размеру кадров нет`);
