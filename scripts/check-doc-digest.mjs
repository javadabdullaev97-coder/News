#!/usr/bin/env node
// Проверяет, что выжимки документов не отстали от своих источников.
//
// ЗАЧЕМ. Стартовая накладка планёрки — фиксированный налог на каждый прогон:
// 04.08.2026 до первой брони темы проходило ~26 минут, из них заметная часть —
// чтение ~200 КБ инструкций, которые между прогонами не менялись. Решение
// владельца: стабильное ядро читается выжимкой, полный документ — только
// когда он изменился.
//
// МЕХАНИЗМ. Выжимка объявляет в шапке, из чего она сделана:
//
//   <!-- digest-of: путь/к/источнику
//        sha256: <хеш источника на момент выжимки> -->
//
// Скрипт сверяет объявленный хеш с фактическим. Совпал — выжимка свежая,
// полный документ можно не открывать. Не совпал — источник правили после
// выжимки: читать нужно полный документ, а выжимку — обновить.
//
// Это страховка, а не замок: устаревшая выжимка не ломает прогон, планёрка
// просто читает полный документ (медленнее, но правильно) и пишет в отчёт,
// что выжимку пора обновить.
//
//   node scripts/check-doc-digest.mjs            — JSON {fresh, files}
//   node scripts/check-doc-digest.mjs --strict   — exit 1, если что-то устарело
//   node scripts/check-doc-digest.mjs --update   — переписать хеши по факту
//                                                  (после осознанной правки выжимки)
//
// Новую выжимку регистрируй в DIGESTS.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

const DIGESTS = [".claude/skills/leap-editorial-style/CORE.md"];

const strict = process.argv.includes("--strict");
const update = process.argv.includes("--update");

const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");

const files = [];
let allFresh = true;

for (const rel of DIGESTS) {
  const digestPath = join(ROOT, rel);
  if (!existsSync(digestPath)) {
    files.push({ digest: rel, error: "выжимка не найдена" });
    allFresh = false;
    continue;
  }
  let text = readFileSync(digestPath, "utf8");
  const source = text.match(/digest-of:\s*(\S+)/)?.[1];
  const declared = text.match(/sha256:\s*(\S+)/)?.[1];
  if (!source || !declared) {
    files.push({ digest: rel, error: "в шапке нет digest-of/sha256" });
    allFresh = false;
    continue;
  }
  const sourcePath = join(ROOT, source);
  if (!existsSync(sourcePath)) {
    files.push({ digest: rel, source, error: "источник не найден" });
    allFresh = false;
    continue;
  }
  const actual = sha256(sourcePath);
  const fresh = actual === declared;
  if (!fresh && update) {
    text = text.replace(/(sha256:\s*)\S+/, `$1${actual}`);
    writeFileSync(digestPath, text);
    console.error(`[digest] ${rel}: хеш обновлён (${actual.slice(0, 12)}…)`);
    files.push({ digest: rel, source, fresh: true, updated: true });
    continue;
  }
  if (!fresh) allFresh = false;
  files.push({ digest: rel, source, fresh });
}

console.log(JSON.stringify({ fresh: allFresh, files }, null, 2));
if (strict && !allFresh) process.exit(1);
