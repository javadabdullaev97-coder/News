#!/usr/bin/env node
// Компактный индекс источников для оркестратора планёрки.
//
// Зачем. config/news-sources.json (35 КБ) и config/telegram-channels.json
// (30 КБ) описывают источники для всех сразу: фетчеру нужны url и
// requiresPlaywright, корреспонденту — focus и notes, проверяльщику
// источников — расписание опроса. Оркестратору из этих 65 КБ нужны четыре
// поля на источник: приоритет, тип, можно ли ссылаться, не исключён ли.
// Остальное он читал и не использовал.
//
// Индекс НЕ КОММИТИТСЯ. Производный файл, лежащий в репозитории рядом с
// исходником, рано или поздно расходится с ним — и расходится молча, потому
// что смотрят обычно в исходник. Здесь этого не может случиться по
// построению: файл собирается заново перед каждым использованием, а сборка
// занимает миллисекунды.
//
// Полные конфиги остаются источником истины и по-прежнему читаются теми,
// кому нужны остальные поля: reporter, fact-checker, фетчеры, source-health.
//
// Использование:
//   node scripts/build-source-index.mjs             — записать config/generated/source-index.json
//   node scripts/build-source-index.mjs --stdout    — вывести, ничего не записывая
//   node scripts/build-source-index.mjs --used-only — только источники, реально
//                                                     встречающиеся в текущем инбоксе

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readInbox } from "../lib/inbox-core.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT = join(ROOT, "config/generated/source-index.json");

function readJSON(rel) {
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) throw new Error(`нет файла ${rel}`);
  return JSON.parse(readFileSync(abs, "utf8"));
}

const news = readJSON("config/news-sources.json");
const tg = readJSON("config/telegram-channels.json");

// Одна запись индекса — ровно то, чем оркестратор пользуется при отборе:
//   type      — source (госорган) / signal (СМИ) / attributed (неподтверждённая
//               принадлежность) / context. Решает, годится ли как первоисточник
//               и не запрещена ли прямая публикация.
//   priority  — P0..P3, вес в scoring.
//   citable   — можно ли ставить ссылку в статье. У Telegram-каналов поля нет:
//               там citable определяется типом, а не отдельным флагом.
//   disabled / requiresPlaywright — источник может молчать не по своей вине.
function entry(src, extra = {}) {
  const out = { id: src.id, name: src.name, type: src.type, priority: src.priority };
  if (typeof src.citable === "boolean") out.citable = src.citable;
  if (src.disabled) out.disabled = true;
  if (src.requiresPlaywright) out.requiresPlaywright = true;
  return { ...out, ...extra };
}

const sources = [
  ...(news.rss ?? []).map((s) => entry(s, { kind: "rss" })),
  ...(news.api ?? []).map((s) => entry(s, { kind: "api" })),
  ...(news.scrape ?? []).map((s) => entry(s, { kind: "scrape" })),
  ...(tg.channels ?? []).map((s) => entry(s, { kind: "telegram", handle: s.handle })),
  // Сайты без работающего RSS — их разбирает pull-scrape-inbox.mjs.
  // Без этой строки планёрка встречала бы в инбоксе sourceId, которого нет
  // в индексе, и не могла бы понять ни приоритет источника, ни можно ли
  // на него ссылаться.
  ...(news.htmlScrape ?? []).map((s) => entry(s, { kind: "scrape" })),
];

// Отсев по факту присутствия в инбоксе.
//
// Оркестратору индекс нужен ровно затем, чтобы понять про КАЖДЫЙ item в
// инбоксе: годится ли источник как первоисточник, можно ли на него
// ссылаться, какой у него приоритет. Источник, которого в инбоксе нет,
// в этом решении не участвует — а места занимает столько же.
// Замер 09.08.2026: в индексе 172 источника, в инбоксе за сутки
// встречается 83.
//
// Отсев безопасен по построению: множество оставленных задаётся самим
// инбоксом, поэтому item со «своим» sourceId без записи в индексе
// появиться не может. Ровно этот дефект в прошлом уже ловили с
// htmlScrape — там источники в индекс не попадали, и оркестратор
// встречал незнакомый sourceId.
//
// excluded, legend и blocs остаются целиком всегда: excluded нужен, чтобы
// проверить ЛЮБУЮ ссылку, а не только пришедшую из инбокса.
const usedOnly = process.argv.includes("--used-only");
let kept = sources;
let omitted = 0;
if (usedOnly) {
  const at = Date.now();
  const seenIds = new Set();
  for (const world of [false, true]) {
    for (const it of readInbox(ROOT, { world, at }).items) {
      if (it.sourceId) seenIds.add(it.sourceId);
    }
  }
  // Пустой инбокс — не повод отдать пустой индекс: это не «источников нет»,
  // а «нечего фильтровать». Отдаём полный.
  if (seenIds.size) {
    kept = sources.filter((s) => seenIds.has(s.id));
    omitted = sources.length - kept.length;
  }
}

const index = {
  $comment:
    "ПРОИЗВОДНЫЙ ФАЙЛ, не редактируй. Собирается scripts/build-source-index.mjs из " +
    "config/news-sources.json и config/telegram-channels.json. Правки вносить в них.",
  generatedAt: new Date().toISOString(),
  counts: {
    total: sources.length,
    returned: kept.length,
    byKind: kept.reduce((a, s) => ((a[s.kind] = (a[s.kind] ?? 0) + 1), a), {}),
  },
  ...(omitted
    ? {
        $omitted:
          `${omitted} источник(ов) не показаны — их нет в текущем инбоксе, ` +
          "и в отборе они не участвуют. Нужен полный список: " +
          "node scripts/build-source-index.mjs (без --used-only).",
      }
    : {}),
  // Никогда не публиковать и никогда не ссылаться — редакционное решение.
  excluded: {
    domains: (news.excluded ?? []).map((e) => e.domain).filter(Boolean),
    handles: (tg.excluded ?? []).map((e) => e.handle).filter(Boolean),
  },
  legend: {
    types: { ...(news.types ?? {}), ...(tg.types ?? {}) },
    citable: news.citableLegend ?? null,
  },
  // Независимые блоки — по ним считается, подтверждён ли мировой сюжет
  // несколькими сторонами, а не одной юрисдикцией.
  blocs: news.blocs ?? null,
  sources: kept,
};

// Без отступов: файл читает модель, а не человек, и на структуре из полутора
// сотен однотипных записей отступы стоят дороже, чем весит половина полезных
// данных. Для чтения глазами — --pretty.
const text = JSON.stringify(index, null, process.argv.includes("--pretty") ? 2 : 0) + "\n";

if (process.argv.includes("--stdout")) {
  process.stdout.write(text);
} else {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, text);
  console.error(
    `[source-index] ${kept.length} из ${sources.length} источников` +
      (omitted ? ` (скрыто ${omitted} — нет в инбоксе)` : "") +
      ` → config/generated/source-index.json ` +
      `(${text.length} байт против ${
        readFileSync(join(ROOT, "config/news-sources.json")).length +
        readFileSync(join(ROOT, "config/telegram-channels.json")).length
      } в исходниках)`,
  );
}
