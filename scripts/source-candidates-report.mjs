#!/usr/bin/env node
// Отчёт по кандидатам-сайтам — для разбора планёркой.
//
// Печатает домены, на которые ссылаются конкуренты и читаемые нами каналы,
// но которых нет ни в одном нашем конфиге. По контекстам планёрка судит, что
// это за источник: ведомство, агентство, компания или мусорная перепечатка.
// Правила решения — planyorka-run.md, §6б.
//
// Пара к channel-candidates-report.mjs: тот про Telegram-каналы, этот про сайты.
//
//   node scripts/source-candidates-report.mjs            — открытые (JSON)
//   node scripts/source-candidates-report.mjs --all      — включая решённые
//   node scripts/source-candidates-report.mjs --min=2    — от двух наблюдений

import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { foldSourceCandidates } from "../lib/source-candidates.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const all = process.argv.includes("--all");
const minArg = process.argv.find((a) => a.startsWith("--min="));
const min = minArg ? Number(minArg.split("=")[1]) : 1;

const folded = [...foldSourceCandidates(ROOT).values()]
  .filter((c) => all || c.status === "open")
  .filter((c) => c.sightings >= min)
  .sort((a, b) => b.sightings - a.sightings || b.sources.length - a.sources.length);

console.log(
  JSON.stringify(
    {
      open: folded.filter((c) => c.status === "open").length,
      candidates: folded.map((c) => ({
        domain: c.domain,
        sightings: c.sightings,
        distinctSources: c.sources.length,
        sources: c.sources,
        firstAt: c.firstAt,
        lastAt: c.lastAt,
        status: c.status,
        // Примеры адресов — по ним видно, что это за раздел: пресс-релизы,
        // статистика, реестр актов.
        urls: c.urls.slice(-4),
        // Контексты — формулировка, с которой конкурент на источник ссылается.
        contexts: c.contexts.slice(-3),
      })),
    },
    null,
    2,
  ),
);
