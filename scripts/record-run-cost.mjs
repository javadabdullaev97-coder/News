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
//
// Вызовы накапливаются в рамках одного прогона: ключ прогона — RUN_ID
// (из окружения) либо метка времени старта, переданная --run.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { appendLog, readLog } from "../lib/state-log.mjs";

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

if (Object.keys(rec).length === 1) {
  console.error(
    "[cost] нечего записывать. Пример: --stage fact-checker --calls 3 --fetches 9 --minutes 4",
  );
  process.exit(0);
}

appendLog(LOG, rec);
console.error(`[cost] записано: ${JSON.stringify(rec)}`);
