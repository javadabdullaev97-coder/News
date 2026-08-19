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

for (const r of rows) {
  const mark = r.status === "ок" ? "  " : "✗ ";
  const num = r.chars === null ? "     —" : String(r.chars).padStart(6);
  console.error(`${mark}${num} / ${String(r.limit).padStart(6)}  ${r.file}`);
}

// Сумма по файлам ничего не значит: ни один агент не читает их все.
// Значит стоимость ОДНОГО ВЫЗОВА — инструкция роли плюс её срез редполитики.
// Это и есть число, которое умножается на количество материалов.
// Роль → что она читает ВСЕГДА, помимо своей инструкции и среза редполитики.
// Условное (приложения редполитики, тематические части глоссария, условные
// шаги планёрки) сюда не входит намеренно: оно и не читается, пока признак
// не сработал.
const CHAIN = {
  reporter: [],
  "fact-checker": [],
  editor: [],
  bild: [],
  translator: ["docs/terminology-glossary.md"],
};
const sizeOrNull = (rel) => {
  const abs = join(ROOT, rel);
  return existsSync(abs) ? readFileSync(abs, "utf8").length : null;
};

console.error("\n   Стоимость одного вызова — инструкция + срез редполитики:");
let perArticle = 0;
let unknown = false;
for (const [role, extras] of Object.entries(CHAIN)) {
  const agent = sizeOrNull(`.claude/agents/${role}.md`) ?? 0;
  const policy = sizeOrNull(`config/generated/policy-${role}.md`);
  const extra = extras.reduce((a, rel) => a + (sizeOrNull(rel) ?? 0), 0);
  if (policy === null) {
    unknown = true;
    console.error(`   ${role.padEnd(13)} ${String(agent).padStart(6)} + срез не собран`);
    continue;
  }
  perArticle += agent + policy + extra;
  console.error(
    `   ${role.padEnd(13)} ${String(agent).padStart(6)} + ${String(policy).padStart(6)}` +
      (extra ? ` + ${String(extra).padStart(5)}` : "        ") +
      ` = ${String(agent + policy + extra).padStart(6)}`,
  );
}
console.error(
  `   ${"на материал".padEnd(13)} ${String(perArticle).padStart(15)} знаков` +
    (unknown ? " (без несобранных срезов — node scripts/policy-slice.mjs --all)" : ""),
);

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
