#!/usr/bin/env node
// Инвентарь правил: снимок всего нормативного, что есть в редполитике
// и инструкциях агентов.
//
// ЗАЧЕМ. 20.08.2026 владелец поручил уплотнить редполитику и инструкции —
// без вычитки с его стороны. Уплотнение текста, который управляет всей
// редакцией, опасно ровно одним: правило исчезает молча, а замечают это
// через неделю по статьям. Глазами такое не ловится: файлов семь,
// нормативных строк под тысячу.
//
// Поэтому порядок такой: снять инвентарь ДО правки, переписать, сверить
// инвентарь ПОСЛЕ. Строка правила, пропавшая при уплотнении, всплывает
// сразу и по имени.
//
// ЧТО СЧИТАЕТСЯ ПРАВИЛОМ:
//   1. строка с модальностью — «не пишем», «обязан», «нельзя», «всегда»,
//      «никогда», «запрещено», «только если», «должен»;
//   2. пример «Плохо / Хорошо / Было / Стало / ❌ / ✅» — он и есть правило,
//      выраженное показом;
//   3. упоминание файла конфига, скрипта или поля frontmatter — это связь
//      с кодом, потерять её значит порвать механику.
//
// Предложения-обоснования («по замеру», «раньше было», «инцидент такой-то»)
// в инвентарь НЕ попадают: их и требуется убирать.
//
//   node scripts/rules-inventory.mjs --save    — снять снимок
//   node scripts/rules-inventory.mjs           — сверить с снимком
//   node scripts/rules-inventory.mjs --json    — выдать инвентарь

import { existsSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SNAPSHOT = join(ROOT, "content/state/rules-inventory.json");
const argv = process.argv.slice(2);

const SOURCES = [
  ".claude/skills/leap-editorial-style/references/policy.md",
  ".claude/skills/leap-editorial-style/SKILL.md",
  ".claude/skills/leap-editorial-style/CORE.md",
  ...readdirSync(join(ROOT, ".claude/agents"))
    .filter((f) => f.endsWith(".md"))
    .map((f) => `.claude/agents/${f}`),
  "docs/routine-prompts/planyorka.md",
  "docs/routine-prompts/planyorka-run.md",
  // Условные шаги планёрки и тематические части глоссария: вынесены,
  // чтобы не читаться каждый раз, но правила в них те же — инвентарь
  // обязан их видеть, иначе вынос выглядел бы как пропажа.
  ...readdirSync(join(ROOT, "docs/routine-prompts/steps"))
    .filter((f) => f.endsWith(".md"))
    .map((f) => `docs/routine-prompts/steps/${f}`),
  "docs/terminology-glossary.md",
  ...readdirSync(join(ROOT, "docs/terminology"))
    .filter((f) => f.endsWith(".md"))
    .map((f) => `docs/terminology/${f}`),
];

const MODAL = /\b(не пишем|не публикуем|не ставим|не берём|не даём|нельзя|запрещено|обязан|обязана|обязано|обязательн|всегда|никогда|только если|только когда|должен|должна|должно|не должен|не может|недопустим)\b/i;
const EXAMPLE = /^\s*[-*]?\s*(\*\*)?(Плохо|Хорошо|Было|Стало|❌|✅|Правильно|Неправильно)\b/i;
const CODEREF = /`[^`]*(?:\.mjs|\.py|\.json|\.md|\.mdx|\.yml)`|frontmatter\.\w+|scripts\/[a-z0-9-]+|config\/[a-z0-9-]+/i;

/** Нормализация: пробелы и регистр не считаем содержанием. */
const norm = (s) =>
  s
    .replace(/\s+/g, " ")
    .replace(/[«»"'`*_]/g, "")
    .trim()
    .toLowerCase();

/**
 * Единица инвентаря — ПУНКТ, а не строка.
 *
 * Правила здесь пишут многострочными пунктами списка, и модальное слово
 * часто оказывается на второй строке: построчный разбор давал 18 правил
 * на 44 тысячи знаков политики, то есть почти ничего не видел.
 * Пункт склеивается целиком, до следующего маркера списка или заголовка.
 */
function items(text) {
  const out = [];
  let cur = null;
  for (const raw of text.split("\n")) {
    const line = raw.replace(/\s+$/, "");
    const starts = /^\s*([-*]|\d+\.)\s+\S/.test(line);
    const heading = /^#{1,6}\s/.test(line);
    if (starts || heading || !line.trim()) {
      if (cur) out.push(cur);
      cur = starts || heading ? line.trim() : null;
      continue;
    }
    if (cur) cur += " " + line.trim();
    else cur = line.trim();
  }
  if (cur) out.push(cur);
  return out.filter((x) => x && x.length >= 12);
}

/**
 * В инвентарь идут ВСЕ пункты и заголовки, а не только «явно нормативные».
 *
 * Первая версия отбирала по модальным словам и собрала 14 правил с 44 тысяч
 * знаков политики. Причина простая: модальность там живёт в ЗАГОЛОВКЕ —
 * под «### Нельзя (жёстко)» идут пункты вида «Оценочные прилагательные без
 * источника: важный, крупный», где запрета в самой строке нет.
 *
 * Раз классификация ненадёжна, инвентарь её не делает. Он фиксирует всё
 * и на сверке показывает, ЧТО именно исчезло. Решение «это было пояснение,
 * его и убирали» принимает человек, глядя на список, — но принимает его
 * осознанно, а не по умолчанию. Метка nature нужна только чтобы в отчёте
 * нормативное было видно первым.
 */
function extract(rel) {
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) return [];
  return items(readFileSync(abs, "utf8")).map((item) => ({
    file: rel,
    normative: EXAMPLE.test(item) || MODAL.test(item) || CODEREF.test(item),
    text: norm(item).slice(0, 160),
  }));
}

const inventory = SOURCES.flatMap(extract);
const byFile = inventory.reduce((a, r) => ((a[r.file] = (a[r.file] ?? 0) + 1), a), {});

if (argv.includes("--json")) {
  console.log(JSON.stringify(inventory, null, 2));
  process.exit(0);
}

if (argv.includes("--save")) {
  writeFileSync(
    SNAPSHOT,
    `${JSON.stringify(
      {
        $comment: [
          "Снимок нормативных строк редполитики и инструкций агентов.",
          "Снят перед уплотнением текстов, чтобы правило не пропало молча.",
          "Сверка: node scripts/rules-inventory.mjs",
          "",
          "Строка попала сюда, если несёт модальность (нельзя, обязан, всегда),",
          "или это пример «Плохо/Хорошо», или упоминание файла конфига и скрипта.",
        ],
        takenAt: new Date().toISOString(),
        counts: byFile,
        rules: inventory.map((r) => r.text),
        normative: inventory.filter((r) => r.normative).map((r) => r.text),
      },
      null,
      2,
    )}\n`,
  );
  console.error(`[rules] снимок сохранён: ${inventory.length} строк`);
  for (const [f, n] of Object.entries(byFile)) console.error(`  ${String(n).padStart(4)}  ${f}`);
  process.exit(0);
}

// ─── Сверка ───
if (!existsSync(SNAPSHOT)) {
  console.error("[rules] снимка нет — сначала node scripts/rules-inventory.mjs --save");
  process.exit(0);
}
const snap = JSON.parse(readFileSync(SNAPSHOT, "utf8"));
const now = new Set(inventory.map((r) => r.text));
const wasNormative = new Set(snap.normative ?? []);
const lostAll = (snap.rules ?? []).filter((r) => !now.has(r));
// Нормативное — вперёд: именно его пропажа опасна.
const lost = [
  ...lostAll.filter((r) => wasNormative.has(r)),
  ...lostAll.filter((r) => !wasNormative.has(r)),
];
const lostNormative = lostAll.filter((r) => wasNormative.has(r)).length;

console.error(`[rules] было ${snap.rules?.length ?? 0}, стало ${inventory.length}`);
if (!lost.length) {
  console.error("[rules] ни одно правило не потеряно");
  process.exit(0);
}
console.error(`[rules] ✗ ПРОПАЛО ${lost.length} пунктов, из них нормативных ${lostNormative}:`);
for (const r of lost.slice(0, 40)) console.error(`   ${r.slice(0, 120)}`);
if (lost.length > 40) console.error(`   … и ещё ${lost.length - 40}`);
console.error(
  "\n[rules] Строка могла быть переформулирована — тогда верни формулировку " +
    "или пересними снимок осознанно (--save). Молча расходиться им нельзя.",
);
process.exit(1);
