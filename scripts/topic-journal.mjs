#!/usr/bin/env node
// Журнал тем: бронь при отборе, отметка при завершении.
//
// ЗАЧЕМ. Планёрок теперь несколько в час, и они пересекаются во времени.
// Планёрка, стартовавшая в :20, видит журнал без тем, которые планёрка :00
// уже взяла, но ещё не дописала, — и берёт их второй раз. Час производства
// впустую, а при неудачном раскладе — вторая статья про то же самое на сайте.
//
// Лечится бронью: тема отмечается в момент ОТБОРА, до производства. Бронь
// живёт 45 минут и протухает сама — прогон может умереть, и вечная бронь
// похоронила бы тему навсегда.
//
// ПОЧЕМУ НЕ ДОПИСЫВАЕМ В seen-topics.json. Общий JSON, в который пишут
// несколько прогонов, даёт конфликт при rebase, а git-push-with-rebase.sh
// на конфликте прерывается с кодом 2 — журнал проигравшего теряется молча.
// Проверено на модели двух клонов. Здесь у каждого прогона свой файл
// content/state/seen/<день>-<runId>.jsonl: разные файлы не конфликтуют.
//
// Использование:
//   node scripts/topic-journal.mjs claim   --slug=<slug> --links=<url,url,...>
//   node scripts/topic-journal.mjs done    --slug=<slug> --links=<url,url,...>
//   node scripts/topic-journal.mjs release --slug=<slug> --links=<url,url,...>
//   node scripts/topic-journal.mjs status
//   node scripts/topic-journal.mjs compact [--older-than-days=3]
//
// Ссылки можно передать файлом: --links-file=path (по одной на строку).
// Идентификатор прогона: --run=<id> или переменная LEAP_RUN_ID. Если не задан —
// генерируется из времени старта; тогда КАЖДЫЙ вызов пишет в свой файл, что
// работает, но плодит мелкие файлы. Задавай один id на всю сессию.

import {
  existsSync,
  readFileSync,
  writeFileSync,
  appendFileSync,
  mkdirSync,
  readdirSync,
  unlinkSync,
} from "node:fs";
import { join } from "node:path";
import { ROOT, hashLink, loadJournal, CLAIM_TTL_MINUTES } from "../lib/inbox-core.mjs";

const SEEN_DIR = join(ROOT, "content/state/seen");
const LEGACY = join(ROOT, "content/state/seen-topics.json");

const mode = process.argv[2];
const MODES = ["claim", "done", "release", "status", "compact"];
if (!MODES.includes(mode)) {
  console.error(`Использование: topic-journal.mjs ${MODES.join("|")} [опции]`);
  process.exit(1);
}

function opt(name, fallback = null) {
  const p = process.argv.find((a) => a.startsWith(`--${name}=`));
  return p ? p.slice(name.length + 3) : fallback;
}

const runId =
  opt("run") ||
  process.env.LEAP_RUN_ID ||
  `run${new Date().toISOString().replace(/[-:T.]/g, "").slice(8, 14)}`;

function tashkentDay() {
  return new Date(Date.now() + 5 * 3600 * 1000).toISOString().slice(0, 10);
}

function collectLinks() {
  const out = [];
  const inline = opt("links");
  if (inline) out.push(...inline.split(",").map((s) => s.trim()).filter(Boolean));
  const file = opt("links-file");
  if (file) {
    const abs = file.startsWith("/") ? file : join(ROOT, file);
    if (!existsSync(abs)) {
      console.error(`[journal] нет файла со ссылками: ${file}`);
      process.exit(2);
    }
    out.push(
      ...readFileSync(abs, "utf8")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    );
  }
  return [...new Set(out)];
}

function append(records) {
  mkdirSync(SEEN_DIR, { recursive: true });
  const path = join(SEEN_DIR, `${tashkentDay()}-${runId}.jsonl`);
  appendFileSync(path, records.map((r) => JSON.stringify(r)).join("\n") + "\n");
  return path.replace(ROOT + "/", "");
}

// ─── claim / done / release ───

if (mode === "claim" || mode === "done" || mode === "release") {
  const slug = opt("slug");
  if (!slug) {
    console.error("[journal] --slug обязателен");
    process.exit(2);
  }
  const links = collectLinks();
  if (!links.length) {
    console.error("[journal] не передано ни одной ссылки (--links или --links-file)");
    process.exit(2);
  }

  const now = new Date();
  const ttl = Number(opt("ttl-minutes", CLAIM_TTL_MINUTES));
  // Имя команды и имя состояния — разные вещи, и путать их нельзя.
  // Первая версия писала в файл `st: mode`, то есть "claim" и "release",
  // тогда как читатель ждёт "claimed" и "released". Совпадало только "done",
  // поэтому броня не работала ВООБЩЕ: записи ложились в файл, читались,
  // молча не подходили ни под одну ветку и отбрасывались. Внешне всё
  // выглядело исправным — скрипт рапортовал об успешной брони.
  const STATE = { claim: "claimed", done: "done", release: "released" };
  const records = links.map((link) => {
    const rec = { h: hashLink(link), s: slug, st: STATE[mode], at: now.toISOString() };
    if (mode === "claim") {
      rec.exp = new Date(now.getTime() + ttl * 60000).toISOString();
    }
    return rec;
  });

  // Предупреждаем, если тема уже занята кем-то другим. Не блокируем: решение
  // за планёркой, а слепая блокировка на гонке двух claim'ов остановила бы
  // обе. Но в лог это обязано попасть — иначе двойное производство
  // выяснится только по двум одинаковым статьям на сайте.
  if (mode === "claim") {
    const j = loadJournal(ROOT);
    const busy = records.filter((r) => j.blocked.has(r.h));
    if (busy.length) {
      const who = [...new Set(busy.map((r) => j.claimed.get(r.h)?.slug ?? "уже done"))];
      console.error(
        `[journal] ВНИМАНИЕ: ${busy.length} из ${records.length} ссылок темы «${slug}» ` +
          `уже заняты (${who.join(", ")}). Похоже, соседняя планёрка взяла эту тему — ` +
          `проверь, прежде чем производить.`,
      );
    }
  }

  const path = append(records);
  console.error(
    `[journal] ${mode}: ${slug} — ${records.length} ссыл(ок) → ${path}` +
      (mode === "claim" ? ` (бронь до ${records[0].exp})` : ""),
  );
}

// ─── status ───

if (mode === "status") {
  const j = loadJournal(ROOT);
  const byslug = new Map();
  for (const [, v] of j.claimed) {
    byslug.set(v.slug, (byslug.get(v.slug) ?? 0) + 1);
  }
  console.log(
    JSON.stringify(
      {
        done: j.done.size,
        legacy: j.legacyCount,
        claimedHashes: j.claimed.size,
        claimedTopics: [...byslug].map(([slug, links]) => ({ slug, links })),
        runFiles: j.files.length,
        badLines: j.badLines,
        journalOk: j.ok,
      },
      null,
      2,
    ),
  );
}

// ─── compact ───
//
// Сворачивает старые пофайловые записи в seen-topics.json и удаляет их.
// Без этого каталог растёт на несколько файлов в час, и чтение журнала
// постепенно дорожает. Свежие файлы не трогаем: в них живые брони.

if (mode === "compact") {
  const olderThanDays = Number(opt("older-than-days", 3));
  const cutoff = Date.now() - olderThanDays * 24 * 3600 * 1000;

  if (!existsSync(SEEN_DIR)) {
    console.error("[journal] каталог content/state/seen/ пуст — сворачивать нечего");
    process.exit(0);
  }

  const legacy = existsSync(LEGACY)
    ? JSON.parse(readFileSync(LEGACY, "utf8"))
    : { hashes: [], maxSize: 5000 };
  const hashes = new Set(Array.isArray(legacy.hashes) ? legacy.hashes : []);
  const before = hashes.size;

  let foldedFiles = 0;
  let foldedRecords = 0;
  for (const name of readdirSync(SEEN_DIR).filter((n) => n.endsWith(".jsonl"))) {
    const day = Date.parse(name.slice(0, 10));
    if (!Number.isFinite(day) || day >= cutoff) continue;
    for (const line of readFileSync(join(SEEN_DIR, name), "utf8").split("\n")) {
      const s = line.trim();
      if (!s) continue;
      try {
        const rec = JSON.parse(s);
        // Только done. Протухшую бронь сворачивать нельзя: тема не была
        // обработана, и запирать её навсегда — значит потерять.
        if (rec?.h && rec.st === "done") {
          hashes.add(rec.h);
          foldedRecords++;
        }
      } catch {
        /* битую строку пропускаем — она уже была пропущена и при чтении */
      }
    }
    unlinkSync(join(SEEN_DIR, name));
    foldedFiles++;
  }

  const maxSize = Number(legacy.maxSize) || 5000;
  let list = [...hashes];
  if (list.length > maxSize) list = list.slice(list.length - maxSize);

  writeFileSync(
    LEGACY,
    JSON.stringify({ hashes: list, maxSize, updatedAt: new Date().toISOString() }, null, 2) + "\n",
  );
  console.error(
    `[journal] свёрнуто файлов: ${foldedFiles}, записей done: ${foldedRecords}, ` +
      `хешей в seen-topics.json: ${before} → ${list.length}`,
  );
}
