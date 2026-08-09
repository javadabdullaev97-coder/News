#!/usr/bin/env node
// Срез редполитики под роль. Печатает нужные разделы SKILL.md, не весь файл.
//
// Зачем. SKILL.md — 10,6k токенов, и его целиком читал каждый субагент на
// каждом материале. Между тем разделы нужны им разные:
//
//   seo         правит четыре поля frontmatter — ему нужны §5 (терминология)
//               и §7 (формат MDX). Остальные 8,7k токенов он читал впустую.
//   translator  переносит готовый текст в другой язык — §4 (тон) и §5.
//               Вызывается дважды на материал, по разу на язык.
//   fact-checker проверяет фактуру и ссылки — §2, §3, §6, §8, §9, §10.
//               §4 «Тон и стиль» (3,3k токенов) к его работе не относится:
//               стилем занимается editor.
//
// reporter и editor читают SKILL.md целиком — им действительно нужно почти
// всё, и срез сэкономил бы им сотни токенов ценой риска не увидеть правило.
//
// ПОЧЕМУ СРЕЗ, А НЕ ОТДЕЛЬНЫЕ ФАЙЛЫ. Разложить редполитику по ролям —
// значит завести пять копий одних и тех же правил. Они разойдутся: правку
// внесут в один файл, а проверять будут по другому. Здесь источник истины
// один, SKILL.md, а срез собирается из него в момент чтения. Плюс
// check-doc-digest.mjs сторожит расхождение SKILL.md с выжимкой CORE.md —
// добавь третью сущность, и сторожить придётся её тоже.
//
// КТО ЭТО ЗАПУСКАЕТ. Оркестратор планёрки, один раз за прогон, режимом
// --all. Сами субагенты запустить скрипт не могут: у seo, fact-checker
// и translator в `tools:` нет Bash (только Read/Grep/Glob и Edit/Write),
// поэтому им остаётся прочитать готовый файл из config/generated/.
// Заодно это дешевле: срезы собираются один раз, а не по разу на агента.
//
// Использование:
//   node scripts/policy-slice.mjs --all               — собрать все срезы в файлы
//   node scripts/policy-slice.mjs --for=seo           — вывести один в stdout
//   node scripts/policy-slice.mjs --sections=4,5      — произвольный набор
//   node scripts/policy-slice.mjs --list              — какие разделы есть

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "../lib/inbox-core.mjs";

const SKILL = join(ROOT, ".claude/skills/leap-editorial-style/SKILL.md");

// Роль → номера разделов. Меняешь редполитику структурно — правь здесь же.
const ROLES = {
  seo: [5, 7],
  translator: [4, 5],
  "fact-checker": [2, 3, 6, 8, 9, 10],
};

function opt(name, fallback) {
  const p = process.argv.find((a) => a.startsWith(`--${name}=`));
  return p ? p.slice(name.length + 3) : fallback;
}

const text = readFileSync(SKILL, "utf8");
const lines = text.split("\n");

// Разделы размечены заголовками вида `## 4. Тон и стиль`. Ненумерованные
// `##` внутри — часть примера (в §7 это «## Первый подзаголовок H2» из
// образца MDX) и обязаны ехать вместе со своим разделом, иначе пример
// развалится.
const NUMBERED = /^##\s+(\d+)\.\s/;

const blocks = [];
let head = [];
let cur = null;
for (const line of lines) {
  const m = line.match(NUMBERED);
  if (m) {
    if (cur) blocks.push(cur);
    cur = { n: Number(m[1]), title: line, lines: [line] };
    continue;
  }
  if (cur) cur.lines.push(line);
  else head.push(line);
}
if (cur) blocks.push(cur);

if (process.argv.includes("--list")) {
  for (const b of blocks) console.log(`${String(b.n).padStart(2)}  ${b.title.replace(/^##\s+/, "")}`);
  process.exit(0);
}

const role = opt("for", null);
const explicit = opt("sections", null);
const all = process.argv.includes("--all");

/** Собрать срез по номерам разделов. Отсутствующий раздел — ошибка, не пропуск. */
function slice(want, forRole) {
  const missing = want.filter((n) => !blocks.some((b) => b.n === n));
  if (missing.length) {
    // Молча отдать меньше, чем просили, — значит убрать у агента правило
    // и не сказать об этом. Такое падает.
    console.error(
      `[policy-slice] в SKILL.md нет разделов ${missing.join(", ")} — ` +
        "структура редполитики изменилась, поправь набор ролей в этом скрипте"
    );
    process.exit(2);
  }
  // Шапка файла (назначение редполитики и её статус) едет всегда: без неё
  // срез читается как набор правил без указания, чей он и что главнее.
  return (
    [
      head.join("\n").trim(),
      "",
      `<!-- Срез редполитики${forRole ? ` для роли ${forRole}` : ""}: разделы ${want.join(", ")} из ${blocks.length}.`,
      "     ПРОИЗВОДНЫЙ ФАЙЛ, не редактируй. Источник истины —",
      "     .claude/skills/leap-editorial-style/SKILL.md. Нужен раздел, которого",
      "     здесь нет, — открой SKILL.md, не додумывай. -->",
      "",
      ...want
        .map((n) => blocks.find((b) => b.n === n))
        .sort((a, b) => a.n - b.n)
        .map((b) => b.lines.join("\n").trim()),
    ].join("\n\n") + "\n"
  );
}

if (all) {
  const dir = join(ROOT, "config/generated");
  mkdirSync(dir, { recursive: true });
  const written = [];
  for (const [name, want] of Object.entries(ROLES)) {
    const file = join(dir, `policy-${name}.md`);
    writeFileSync(file, slice(want, name));
    written.push(`policy-${name}.md`);
  }
  console.error(`[policy-slice] собрано: ${written.join(", ")} в config/generated/`);
  process.exit(0);
}

let want;
if (explicit) {
  want = explicit.split(",").map((s) => Number(s.trim())).filter(Number.isFinite);
} else if (role) {
  want = ROLES[role];
  if (!want) {
    console.error(
      `[policy-slice] роль "${role}" не описана. Есть: ${Object.keys(ROLES).join(", ")}. ` +
        "Если роли нужен свой набор — заведи его здесь, а не читай SKILL.md целиком наугад."
    );
    process.exit(2);
  }
} else {
  console.error("[policy-slice] нужен --all, --for=<роль> или --sections=1,2,3 (или --list)");
  process.exit(2);
}

process.stdout.write(slice(want, role));
