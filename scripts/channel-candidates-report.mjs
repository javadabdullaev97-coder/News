#!/usr/bin/env node
// Отчёт по кандидатам в источники — для разбора планёркой.
//
// Печатает открытые (не решённые) handle с числом наблюдений, числом разных
// источников и контекстами упоминаний. По контекстам планёрка судит, как
// конкуренты относятся к каналу: «официальный канал ведомства» → type source,
// «связывают с…» / «близкий к…» → type attributed. Правила решения —
// docs/routine-prompts/planyorka.md, «Разбор кандидатов в источники».
//
//   node scripts/channel-candidates-report.mjs           — открытые кандидаты (JSON)
//   node scripts/channel-candidates-report.mjs --all     — включая решённые

import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { foldCandidates } from "../lib/channel-candidates.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const all = process.argv.includes("--all");

const folded = [...foldCandidates(ROOT).values()]
  .filter((c) => all || c.status === "open")
  .sort((a, b) => b.sightings - a.sightings || b.sources.length - a.sources.length);

console.log(
  JSON.stringify(
    {
      open: folded.filter((c) => c.status === "open").length,
      candidates: folded.map((c) => ({
        handle: `@${c.handle}`,
        sightings: c.sightings,
        distinctSources: c.sources.length,
        sources: c.sources,
        firstAt: c.firstAt,
        lastAt: c.lastAt,
        status: c.status,
        // Не больше пяти контекстов — по ним видно формулировку атрибуции.
        contexts: c.contexts.slice(-5),
      })),
    },
    null,
    2,
  ),
);
