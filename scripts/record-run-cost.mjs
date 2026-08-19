#!/usr/bin/env node
// Расход прогона планёрки: сколько вызовов агентов, сколько походов в сеть,
// сколько минут.
//
// ЗАЧЕМ. 17.08.2026 владелец попросил сократить цепочку — фактчекер открывал
// по 10–15 ссылок там, где хватало двух-трёх. Правки сделаны, но проверить
// их было нечем: в отчёте планёрки стояла строка «Subagent calls: A × reporter,
// B × fact-checker, C × editor», и та не сохранялась никуда. Оптимизация,
// эффект которой не измеряется, — это вера, а не инженерия.
//
// Журнальный формат (content/state/run-cost.jsonl), как у остальных состояний:
// дописывается строкой, сливается merge=union, потеряться при параллельном
// пуше не может.
//
//   node scripts/record-run-cost.mjs --stage reporter --calls 4 --fetches 22 --minutes 6
//   node scripts/record-run-cost.mjs --published 3 --topics 6 --skipped-factcheck 2
//   node scripts/record-run-cost.mjs --summary          # сводка по прогонам
//   node scripts/record-run-cost.mjs --summary --last 10
//   node scripts/record-run-cost.mjs --compare          # до/после правок
//
// СРАВНЕНИЕ «ДО И ПОСЛЕ». Каждая итоговая запись прогона несёт `readCost` —
// сколько постоянного текста читает редакция на один материал при той версии
// инструкций, при которой прогон работал (считает lib/read-cost.mjs). Правки
// инструкций меняют это число, и `--compare` группирует прогоны по нему:
// видно, стало ли меньше минут, вызовов и фетчей на материал, или только
// текста. Дат помнить не нужно — версия штампуется сама.
//
// Вызовы накапливаются в рамках одного прогона: ключ прогона — RUN_ID
// (из окружения) либо метка времени старта, переданная --run.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { appendLog, readLog } from "../lib/state-log.mjs";
import { readCostPerArticle } from "../lib/read-cost.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const LOG = join(ROOT, "content/state/run-cost.jsonl");

const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? null : argv[i + 1] ?? "";
};
const has = (name) => argv.includes(`--${name}`);
const num = (name) => {
  const v = flag(name);
  return v === null || v === "" ? null : Number(v);
};

// ─── Сводка ───
if (has("summary")) {
  if (!existsSync(LOG)) {
    console.error("[cost] замеров пока нет");
    process.exit(0);
  }
  const { events } = readLog(LOG);
  const byRun = new Map();
  for (const e of events) {
    const r = byRun.get(e.run) ?? { run: e.run, stages: {}, topics: null, published: null, skipped: 0 };
    if (e.stage) {
      const s = r.stages[e.stage] ?? { calls: 0, fetches: 0, minutes: 0 };
      s.calls += e.calls ?? 0;
      s.fetches += e.fetches ?? 0;
      s.minutes += e.minutes ?? 0;
      r.stages[e.stage] = s;
    }
    if (e.topics != null) r.topics = e.topics;
    if (e.published != null) r.published = e.published;
    if (e.skippedFactcheck != null) r.skipped = e.skippedFactcheck;
    if (e.skippedBild != null) r.skippedBild = e.skippedBild;
    if (e.readCost != null) r.readCost = e.readCost;
    byRun.set(e.run, r);
  }

  const runs = [...byRun.values()].slice(-(num("last") ?? 15));
  const pad = (s, n) => String(s).padEnd(n);
  console.error(
    `${pad("прогон", 22)}${pad("тем", 5)}${pad("вышло", 7)}${pad("вызовов", 9)}${pad("фетчей", 8)}${pad("минут", 7)}на статью`,
  );
  for (const r of runs) {
    const calls = Object.values(r.stages).reduce((a, s) => a + s.calls, 0);
    const fetches = Object.values(r.stages).reduce((a, s) => a + s.fetches, 0);
    const minutes = Object.values(r.stages).reduce((a, s) => a + s.minutes, 0);
    const per = r.published ? (calls / r.published).toFixed(1) : "—";
    console.error(
      `${pad(r.run, 22)}${pad(r.topics ?? "—", 5)}${pad(r.published ?? "—", 7)}${pad(calls, 9)}${pad(fetches, 8)}${pad(minutes, 7)}${per} вызова`,
    );
  }

  // Разбивка по стадиям на последнем прогоне — по ней видно, куда ушло время.
  const last = runs.at(-1);
  if (last) {
    console.error(`\nпоследний прогон по стадиям:`);
    for (const [stage, s] of Object.entries(last.stages)) {
      console.error(
        `  ${pad(stage, 14)} вызовов ${pad(s.calls, 4)} фетчей ${pad(s.fetches, 5)} минут ${s.minutes}`,
      );
    }
    if (last.skipped) console.error(`  фактчек пропущен гейтом: ${last.skipped}`);
  }
  process.exit(0);
}

// ─── Сравнение версий ───
//
// Группируем прогоны по штампу readCost: одна группа — одна версия
// инструкций. Внутри группы считаем то, что действительно интересно, —
// не суммы, а НА МАТЕРИАЛ: минуты, вызовы, походы в сеть.
if (has("compare")) {
  if (!existsSync(LOG)) {
    console.error("[cost] замеров пока нет");
    process.exit(0);
  }
  const { events } = readLog(LOG);
  const byRun = new Map();
  for (const e of events) {
    const r = byRun.get(e.run) ?? { run: e.run, calls: 0, fetches: 0, minutes: 0, published: 0, skipped: 0 };
    if (e.stage) {
      r.calls += e.calls ?? 0;
      r.fetches += e.fetches ?? 0;
      r.minutes += e.minutes ?? 0;
    }
    if (e.published != null) r.published = e.published;
    if (e.skippedFactcheck != null) r.skipped += e.skippedFactcheck;
    if (e.readCost != null) r.readCost = e.readCost;
    byRun.set(e.run, r);
  }

  // Прогоны без штампа — те, что были до введения замера. Они не «нулевая
  // версия», про них просто ничего не известно, и в сравнение они идут
  // отдельной строкой, а не подмешиваются к первой группе.
  const groups = new Map();
  for (const r of byRun.values()) {
    const key = r.readCost == null ? "без штампа" : `${Math.round(r.readCost / 1000)}k знаков/материал`;
    const g = groups.get(key) ?? { key, runs: 0, published: 0, calls: 0, fetches: 0, minutes: 0, skipped: 0, first: r.run, last: r.run };
    g.runs += 1;
    g.published += r.published;
    g.calls += r.calls;
    g.fetches += r.fetches;
    g.minutes += r.minutes;
    g.skipped += r.skipped;
    if (r.run < g.first) g.first = r.run;
    if (r.run > g.last) g.last = r.run;
    groups.set(key, g);
  }

  const rows = [...groups.values()].sort((a, b) => (a.first < b.first ? -1 : 1));
  const per = (v, n) => (n ? (v / n).toFixed(1) : "—");
  console.error("версия инструкций       прогонов  статей  минут/ст  вызовов/ст  фетчей/ст  период");
  for (const g of rows) {
    console.error(
      `${g.key.padEnd(24)}${String(g.runs).padEnd(10)}${String(g.published).padEnd(8)}` +
        `${per(g.minutes, g.published).padEnd(10)}${per(g.calls, g.published).padEnd(12)}` +
        `${per(g.fetches, g.published).padEnd(11)}${g.first.slice(0, 10)} → ${g.last.slice(0, 10)}`,
    );
  }
  console.error(
    "\nМеньше знаков на материал и столько же минут — сэкономлены токены, но не время.\n" +
      "Меньше минут и фетчей — сэкономлено и время: значит агенты стали меньше\n" +
      "ходить в сеть и меньше переспрашивать, а не просто читать более короткий текст.",
  );
  process.exit(0);
}

// ─── Запись ───
const run = flag("run") ?? process.env.RUN_ID ?? new Date().toISOString().slice(0, 16);
const stage = flag("stage");
const rec = { run };
if (stage) {
  rec.stage = stage;
  rec.calls = num("calls") ?? 1;
  rec.fetches = num("fetches") ?? 0;
  rec.minutes = num("minutes") ?? 0;
}
for (const [flagName, field] of [
  ["topics", "topics"],
  ["published", "published"],
  ["skipped-factcheck", "skippedFactcheck"],
  ["skipped-bild", "skippedBild"],
]) {
  const v = num(flagName);
  if (v !== null) rec[field] = v;
}

// Итоговая запись прогона (темы/выпущено) несёт штамп версии инструкций:
// по нему `--compare` отличает прогоны до правок от прогонов после, не
// полагаясь на даты. На стадийных записях штамп не нужен — он один на прогон.
if (!stage && rec.topics != null) {
  const cost = readCostPerArticle(ROOT);
  if (cost.complete) rec.readCost = cost.total;
}

if (Object.keys(rec).length === 1) {
  console.error(
    "[cost] нечего записывать. Пример: --stage fact-checker --calls 3 --fetches 9 --minutes 4",
  );
  process.exit(0);
}

appendLog(LOG, rec);
console.error(`[cost] записано: ${JSON.stringify(rec)}`);
