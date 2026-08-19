#!/usr/bin/env node
// Бюджет размера для файлов, которые агенты читают на каждом материале.
//
// ЗАЧЕМ. Редполитика и инструкции агентов растут от инцидентов: случилось —
// дописали абзац. Абзац стоит токенов на КАЖДОЙ статье и на каждом прогоне,
// а замечает это только счёт в конце месяца. 20.08.2026 из этих файлов
// вынесли историю решений в docs/rationale/ — но без бюджета она вернётся
// туда же в течение месяца, по абзацу за инцидент.
//
// ПРАВИЛО, КОТОРОЕ ЭТОТ СКРИПТ СТОРОЖИТ:
//   новый инцидент → ОДНА строка в правило («не делай X»), полный разбор —
//   в docs/rationale/<файл>.md. Разбор агенту читать не нужно: ему нужно
//   знать, что делать, а не почему так решили.
//
// Бюджет живёт в config/prompt-budget.json. Поднять его можно — это
// осознанное решение в отдельном коммите, а не побочный эффект правки.
// Именно это и требуется: не «нельзя дописывать», а «дописал — объясни».
//
//   node scripts/prompt-budget.mjs            — отчёт, код 1 при превышении
//   node scripts/prompt-budget.mjs --json     — машинный вывод
//   node scripts/prompt-budget.mjs --update   — переписать бюджет по факту

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const BUDGET = join(ROOT, "config/prompt-budget.json");
const argv = process.argv.slice(2);

if (!existsSync(BUDGET)) {
  console.error(`[budget] нет ${BUDGET} — создай его или запусти --update`);
  process.exit(2);
}

const config = JSON.parse(readFileSync(BUDGET, "utf8"));
const rows = [];
let over = 0;
let missing = 0;

for (const [rel, limit] of Object.entries(config.limits)) {
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) {
    // Файл переименовали или удалили, а бюджет остался. Молча пропустить —
    // значит перестать сторожить и не сказать об этом.
    rows.push({ file: rel, chars: null, limit, status: "нет файла" });
    missing += 1;
    continue;
  }
  const chars = readFileSync(abs, "utf8").length;
  const status = chars > limit ? "превышен" : "ок";
  if (status === "превышен") over += 1;
  rows.push({ file: rel, chars, limit, status });
}

if (argv.includes("--update")) {
  const limits = {};
  for (const r of rows) {
    if (r.chars === null) continue;
    // Потолок = факт + запас: правило можно уточнить, не переоткрывая бюджет.
    limits[r.file] = Math.round((r.chars * (1 + (config.headroom ?? 0.05))) / 100) * 100;
  }
  writeFileSync(
    BUDGET,
    `${JSON.stringify({ ...config, limits, updatedAt: new Date().toISOString().slice(0, 10) }, null, 2)}\n`,
  );
  console.error(`[budget] бюджет пересчитан по факту: ${Object.keys(limits).length} файлов`);
  process.exit(0);
}

if (argv.includes("--json")) {
  console.log(JSON.stringify({ ok: over === 0 && missing === 0, rows }, null, 2));
  process.exit(over || missing ? 1 : 0);
}

const total = rows.reduce((a, r) => a + (r.chars ?? 0), 0);
const cap = rows.reduce((a, r) => a + r.limit, 0);
for (const r of rows) {
  const mark = r.status === "ок" ? "  " : "✗ ";
  const num = r.chars === null ? "     —" : String(r.chars).padStart(6);
  console.error(`${mark}${num} / ${String(r.limit).padStart(6)}  ${r.file}`);
}
console.error(`\n   ИТОГО ${total} / ${cap} знаков в файлах, читаемых на каждом материале`);

if (missing) console.error(`[budget] ✗ файлов из бюджета нет на диске: ${missing}`);
if (over) {
  console.error(
    `[budget] ✗ превышен бюджет у ${over} файлов.\n` +
      "  Новый инцидент — это ОДНА строка правила здесь и полный разбор\n" +
      "  в docs/rationale/. Если текст действительно должен вырасти —\n" +
      "  node scripts/prompt-budget.mjs --update отдельным коммитом,\n" +
      "  чтобы рост был виден в истории, а не растворился в правке.",
  );
}
process.exit(over || missing ? 1 : 0);
