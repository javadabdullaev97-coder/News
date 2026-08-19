#!/usr/bin/env node
// Срез редполитики под роль. Печатает нужные подразделы SKILL.md, не весь файл.
//
// Единица среза — подраздел (`###`), а не раздел (`## N.`). Разделы редполитики
// неоднородны: в §4 «Тон и стиль» 11,8k знаков, из них 4,3k — «Нельзя (жёстко)»
// и 2,3k — ремесло заголовка. Фактчекеру нужны оттуда три подраздела про
// атрибуцию и не нужны остальные четыре; на уровне разделов такое не
// выражается — либо всё, либо ничего, и до этой версии фактчекер не получал
// §4 вовсе, то есть работал без правил атрибуции, которые проверяет.
//
// ПОЧЕМУ СРЕЗ, А НЕ ОТДЕЛЬНЫЕ ФАЙЛЫ. Разложить редполитику по ролям — значит
// завести пять копий одних и тех же правил. Они разойдутся: правку внесут
// в один файл, а проверять будут по другому. Здесь источник истины один,
// SKILL.md, а срез собирается из него в момент чтения.
//
// КТО ЭТО ЗАПУСКАЕТ. Оркестратор планёрки, один раз за прогон, режимом --all.
// Сами субагенты запустить скрипт не могут: у seo, fact-checker и translator
// в `tools:` нет Bash, поэтому им остаётся прочитать готовый файл
// из config/generated/. Заодно это дешевле: срезы собираются один раз,
// а не по разу на агента.
//
// ЧТО ЗДЕСЬ ЛОМАЕТСЯ ГРОМКО. LAYOUT ниже — список подразделов SKILL.md
// с их заголовками. Переименовали заголовок, добавили подраздел, поменяли
// порядок — скрипт падает и требует поправить карту ролей. Молча отдать
// агенту меньше правил, чем ему нужно, нельзя: он не заметит, а редакция
// узнает через неделю по статьям.
//
// Использование:
//   node scripts/policy-slice.mjs --all               — собрать все срезы в файлы
//   node scripts/policy-slice.mjs --for=seo           — вывести один в stdout
//   node scripts/policy-slice.mjs --units=4.3,5.1     — произвольный набор
//   node scripts/policy-slice.mjs --list              — карта подразделов с размерами
//   node scripts/policy-slice.mjs --coverage          — кто что получает

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "../lib/inbox-core.mjs";

const SKILL = join(ROOT, ".claude/skills/leap-editorial-style/SKILL.md");

// ─── Карта подразделов ───
//
// id — «раздел.подраздел»; `.0` — вступление раздела до первого `###`.
// title — начало заголовка в SKILL.md, по нему идёт сверка.
// kind:
//   "ride" — ненумерованный `##` внутри раздела (в §7 это «## Первый
//            подзаголовок H2» из образца MDX). Едет вместе с предыдущей
//            единицей: вырезать его отдельно — сломать пример.
//   "tail" — хвост файла, едет во все срезы (перекрёстные ссылки на
//            остальные документы редполитики: без них агент не знает,
//            где искать то, чего в срезе нет).
const LAYOUT = [
  { id: "1.0", title: "1. Базовые принципы" },
  { id: "2.0", title: "2. Источники: белый и чёрный списки" },
  { id: "2.1", title: "Белый список" },
  { id: "2.2", title: "Чёрный список" },
  { id: "2.3", title: "Каналы с неподтверждённой принадлежностью" },
  { id: "3.0", title: "3. Правила цитирования и ссылок" },
  { id: "4.0", title: "4. Тон и стиль" },
  { id: "4.1", title: "Можно и нужно" },
  { id: "4.2", title: "Нельзя (жёстко)" },
  { id: "4.3", title: "Заголовок" },
  { id: "4.4", title: "Лид (первое предложение)" },
  { id: "4.5", title: "Атрибуция: «X сделал»" },
  { id: "4.6", title: "Глагол атрибуции не добавляет оценку" },
  { id: "4.7", title: "Telegram-каналы официальных лиц" },
  { id: "5.0", title: "5. Терминология и написание" },
  { id: "5.1", title: "Названия" },
  { id: "5.2", title: "Номера актов" },
  { id: "5.3", title: "Глоссарий локальных названий" },
  { id: "5.4", title: "Полные официальные имена" },
  { id: "5.5", title: "Числа, даты, валюта" },
  { id: "5.6", title: "Технический термин: раскрывать" },
  { id: "6.0", title: "6. Что не публикуем вообще" },
  { id: "6.1", title: "Анонимный источник" },
  { id: "6.2", title: "Реклама и джинса" },
  { id: "7.0", title: "7. Формат MDX-файлов" },
  { id: "7.0+", title: "Первый подзаголовок H2", kind: "ride" },
  { id: "7.1", title: "Архитектура текста выбирается по жанру" },
  { id: "7.2", title: "Концовка тоже выбирается по жанру" },
  { id: "8.0", title: "8. Работа с чувствительными темами" },
  { id: "8.1", title: "Самоубийства: правила ВОЗ" },
  { id: "8.2", title: "Национальность, религия, гражданство, здоровье" },
  { id: "8.3", title: "Исправления и право на ответ" },
  { id: "9.0", title: "9. Проверочный чек-лист перед публикацией" },
  { id: "10.0", title: "10. Что делать при неопределённости" },
  { id: "10.1", title: "Первоисточник существует, но недоступен нам" },
  { id: "tail", title: "Ссылки на другие материалы этой редполитики", kind: "tail" },
];

// ─── Роль → подразделы ───
//
// Правило отбора одно: подраздел даётся роли, если роль может им ошибиться.
// Не «пригодится для общего понимания» — редполитика не для понимания,
// а для решений. Зато и обратное строго: если роль принимает решение,
// которое подраздел регулирует, подраздел даётся, даже когда решение
// потом перепроверит другой агент.
const ROLES = {
  // Пишет первый драфт целиком: тему, текст, ссылки, рабочий заголовок.
  // Нет §9 (чек-лист перед публикацией — работа editor'а) и §8.3
  // (исправления и право на ответ — процедура редакции после публикации,
  // корреспондент её не запускает).
  reporter: [
    "1.0",
    "2.0", "2.1", "2.2", "2.3",
    "3.0",
    "4.0", "4.1", "4.2", "4.3", "4.4", "4.5", "4.6", "4.7",
    "5.0", "5.1", "5.2", "5.3", "5.4", "5.5", "5.6",
    "6.0", "6.1", "6.2",
    "7.0", "7.1", "7.2",
    "8.0", "8.1", "8.2",
    "10.0", "10.1",
  ],

  // Проверяет фактуру, ссылки и соответствие редполитике; стиль не правит.
  // §4 берёт только атрибуцией: «X сделал» vs «Y сообщил», оценочный глагол,
  // Telegram официальных лиц — это фактология, а не вкус. Ремесло заголовка,
  // лид и «Нельзя (жёстко)» остаются редактору.
  "fact-checker": [
    "1.0",
    "2.0", "2.1", "2.2", "2.3",
    "3.0",
    "4.5", "4.6", "4.7",
    "5.2", "5.4",
    "6.0", "6.1", "6.2",
    "8.0", "8.1", "8.2", "8.3",
    "9.0",
    "10.0", "10.1",
  ],

  // Финальное go/no-go и вся упаковка. Нет §2: белый и чёрный списки
  // применяют reporter и fact-checker, до editor'а материал доходит
  // с уже отобранными ссылками.
  editor: [
    "1.0",
    "3.0",
    "4.0", "4.1", "4.2", "4.3", "4.4", "4.5", "4.6", "4.7",
    "5.0", "5.1", "5.2", "5.3", "5.4", "5.5", "5.6",
    "6.0", "6.1", "6.2",
    "7.0", "7.1", "7.2",
    "8.0", "8.1", "8.2", "8.3",
    "9.0",
    "10.0", "10.1",
  ],

  // Переносит готовый текст в узбекский и английский. Структуру и факты
  // не трогает, поэтому §2, §3, §6–§10 не нужны. Зато нужны все правила
  // формулировок: заголовок и лид он переписывает на другом языке заново,
  // а атрибуция при переводе ломается чаще всего (падеж, «написал(а)»).
  translator: [
    "1.0",
    "4.0", "4.1", "4.2", "4.3", "4.4", "4.5", "4.6", "4.7",
    "5.0", "5.1", "5.2", "5.3", "5.4", "5.5", "5.6",
  ],

  // Вне основной цепочки: точечно чинит метаданные архивных материалов.
  // Тело статьи не пишет — 7.1 «архитектура текста» и 7.2 «концовка»
  // ему не нужны, формат frontmatter (7.0) нужен.
  seo: [
    "4.3", "4.4",
    "5.0", "5.1", "5.2", "5.3", "5.4", "5.5", "5.6",
    "7.0",
  ],
};

function opt(name, fallback) {
  const p = process.argv.find((a) => a.startsWith(`--${name}=`));
  return p ? p.slice(name.length + 3) : fallback;
}

// ─── Разбор SKILL.md на единицы ───

const text = readFileSync(SKILL, "utf8");
const lines = text.split("\n");

const SECTION = /^##\s+(\d+)\.\s/;
const SUB = /^###\s+/;
const AUX = /^##\s+(?!\d+\.\s)/;

const units = [];
const head = [];
let cur = null;
let section = null;
let subIndex = 0;

const push = () => {
  if (cur) units.push(cur);
};

for (const line of lines) {
  if (SECTION.test(line)) {
    push();
    section = Number(line.match(SECTION)[1]);
    subIndex = 0;
    cur = { id: `${section}.0`, title: line.replace(/^#+\s+/, ""), lines: [line] };
    continue;
  }
  if (section !== null && SUB.test(line)) {
    push();
    subIndex += 1;
    cur = {
      id: `${section}.${subIndex}`,
      title: line.replace(/^#+\s+/, ""),
      lines: [line],
    };
    continue;
  }
  if (AUX.test(line)) {
    push();
    cur = {
      id: section === null ? "tail" : `${section}.${subIndex}+`,
      title: line.replace(/^#+\s+/, ""),
      lines: [line],
      aux: true,
    };
    continue;
  }
  if (cur) cur.lines.push(line);
  else head.push(line);
}
push();

// Хвост файла — ненумерованный `##` после последнего раздела. Он идёт
// последним и не относится ни к какому разделу; помечаем его явно,
// чтобы он ехал во все срезы.
const lastNumbered = units.map((u) => !u.aux).lastIndexOf(true);
for (let i = lastNumbered + 1; i < units.length; i += 1) units[i].id = "tail";

// ─── Сверка с картой ───
//
// Расхождение — это структурная правка SKILL.md, при которой карта ролей
// осталась старой. Продолжать нельзя: часть правил уедет не тому агенту
// или не уедет никому.
{
  const norm = (s) => s.replace(/\s+/g, " ").trim().toLowerCase();
  const problems = [];
  if (units.length !== LAYOUT.length) {
    problems.push(`подразделов в SKILL.md ${units.length}, в карте ${LAYOUT.length}`);
  }
  const n = Math.min(units.length, LAYOUT.length);
  for (let i = 0; i < n; i += 1) {
    const want = LAYOUT[i];
    const got = units[i];
    if (!norm(got.title).startsWith(norm(want.title))) {
      problems.push(`#${i + 1}: ожидался «${want.title}», в файле «${got.title}»`);
    } else if (got.id !== want.id) {
      problems.push(`#${i + 1} «${want.title}»: id ${got.id} вместо ${want.id}`);
    }
  }
  for (let i = n; i < units.length; i += 1) problems.push(`лишний подраздел «${units[i].title}»`);
  for (let i = n; i < LAYOUT.length; i += 1) problems.push(`пропал подраздел «${LAYOUT[i].title}»`);
  if (problems.length) {
    console.error("[policy-slice] структура SKILL.md разошлась с картой подразделов:");
    for (const p of problems) console.error(`  · ${p}`);
    console.error(
      "\n  Поправь LAYOUT и ROLES в scripts/policy-slice.mjs. Новый подраздел\n" +
        "  обязан попасть хотя бы к одной роли — иначе правило написано,\n" +
        "  но никто его не читает.",
    );
    process.exit(2);
  }
}

const byId = new Map(units.map((u) => [u.id, u]));
const KIND = new Map(LAYOUT.map((l) => [l.id, l.kind ?? "unit"]));
const RIDES = LAYOUT.filter((l) => l.kind === "ride");

/**
 * Раскрыть набор подразделов до того, что реально уедет агенту.
 *
 * Подраздел без заголовка своего раздела читается как продолжение
 * предыдущего: «### Атрибуция» сразу после «## 3. Правила цитирования»
 * выглядит частью §3. Вступление раздела дешёвое (у §5 это 31 знак)
 * и добавляется само — забыть его в карте ролей нельзя.
 */
function expand(want) {
  const out = new Set(want);
  for (const id of want) {
    const [sec, sub] = id.split(".");
    if (sub && sub !== "0" && byId.has(`${sec}.0`)) out.add(`${sec}.0`);
  }
  return [...out];
}
const TAIL = units.filter((u) => u.id === "tail");
const sizeOf = (u) => u.lines.join("\n").length;

// ─── Режимы отчёта ───

if (process.argv.includes("--list")) {
  for (const u of units) {
    const kind = KIND.get(u.id);
    const mark = kind === "unit" ? "  " : kind === "ride" ? "↳ " : "≡ ";
    console.log(`${mark}${u.id.padEnd(6)} ${String(sizeOf(u)).padStart(6)}  ${u.title}`);
  }
  console.log(`\n   всего ${units.length} единиц, ${units.reduce((a, u) => a + sizeOf(u), 0)} знаков`);
  process.exit(0);
}

if (process.argv.includes("--coverage")) {
  const names = Object.keys(ROLES);
  console.log(`подраздел  ${names.map((n) => n.slice(0, 4).padEnd(5)).join("")} знаков  заголовок`);
  const orphans = [];
  for (const u of units) {
    if (KIND.get(u.id) !== "unit") continue;
    const has = names.map((n) => (ROLES[n].includes(u.id) ? "  ●  " : "  ·  "));
    if (!names.some((n) => ROLES[n].includes(u.id))) orphans.push(u);
    console.log(`${u.id.padEnd(10)} ${has.join("")} ${String(sizeOf(u)).padStart(6)}  ${u.title.slice(0, 46)}`);
  }
  console.log("");
  for (const n of names) {
    const chars = expand(ROLES[n]).reduce((a, id) => a + sizeOf(byId.get(id)), 0);
    const full = units.reduce((a, u) => a + sizeOf(u), 0);
    console.log(`${n.padEnd(13)} ${String(chars).padStart(6)} знаков — ${Math.round((chars / full) * 100)}% редполитики`);
  }
  if (orphans.length) {
    console.error(`\n[policy-slice] ✗ подразделы, которых не получает никто (${orphans.length}):`);
    for (const u of orphans) console.error(`   ${u.id}  ${u.title}`);
    console.error("  Правило, написанное в редполитике и не доставленное ни одной роли,");
    console.error("  не действует. Либо добавь его роли, либо удали подраздел осознанно.");
    process.exit(1);
  }
  console.error("\n[policy-slice] каждый подраздел доставлен хотя бы одной роли");
  process.exit(0);
}

// ─── Сборка среза ───

function slice(want, forRole) {
  const missing = want.filter((id) => !byId.has(id));
  if (missing.length) {
    console.error(
      `[policy-slice] в SKILL.md нет подразделов ${missing.join(", ")} — ` +
        "структура редполитики изменилась, поправь набор ролей в этом скрипте",
    );
    process.exit(2);
  }
  const need = expand(want);

  const chosen = [];
  for (const id of need) {
    chosen.push(byId.get(id));
    // Ненумерованный `##` едет вместе с единицей, к которой прицеплен:
    // это продолжение примера, отдельно от него оно бессмысленно.
    for (const r of RIDES) {
      if (r.id === `${id}+`) chosen.push(byId.get(r.id));
    }
  }
  const order = new Map(units.map((u, i) => [u.id, i]));
  chosen.sort((a, b) => order.get(a.id) - order.get(b.id));

  return (
    [
      head.join("\n").trim(),
      "",
      `<!-- Срез редполитики${forRole ? ` для роли ${forRole}` : ""}: ${want.length} подразделов из ${
        units.filter((u) => KIND.get(u.id) === "unit").length
      }.`,
      "     ПРОИЗВОДНЫЙ ФАЙЛ, не редактируй. Источник истины —",
      "     .claude/skills/leap-editorial-style/SKILL.md. Нужно правило, которого",
      "     здесь нет, — открой SKILL.md, не додумывай. -->",
      "",
      ...chosen.map((u) => u.lines.join("\n").trim()),
      ...TAIL.map((u) => u.lines.join("\n").trim()),
    ].join("\n\n") + "\n"
  );
}

const role = opt("for", null);
const explicit = opt("units", opt("sections", null));

if (process.argv.includes("--all")) {
  const dir = join(ROOT, "config/generated");
  mkdirSync(dir, { recursive: true });
  const report = [];
  for (const [name, want] of Object.entries(ROLES)) {
    const body = slice(want, name);
    writeFileSync(join(dir, `policy-${name}.md`), body);
    report.push(`${name} ${body.length}`);
  }
  const orphans = units.filter(
    (u) => KIND.get(u.id) === "unit" && !Object.values(ROLES).some((w) => w.includes(u.id)),
  );
  if (orphans.length) {
    // Не падаем на прогоне планёрки из-за карты ролей, но и молчать нельзя:
    // подраздел без адресата — правило, которое никто не прочитает.
    console.error(
      `[policy-slice] ⚠ ${orphans.length} подразделов не получает никто: ` +
        orphans.map((u) => u.id).join(", ") +
        " — проверь node scripts/policy-slice.mjs --coverage",
    );
  }
  console.error(`[policy-slice] собрано в config/generated/: ${report.join(", ")} знаков`);
  process.exit(0);
}

let want;
if (explicit) {
  want = explicit.split(",").map((s) => s.trim()).filter(Boolean);
} else if (role) {
  want = ROLES[role];
  if (!want) {
    console.error(
      `[policy-slice] роль "${role}" не описана. Есть: ${Object.keys(ROLES).join(", ")}. ` +
        "Если роли нужен свой набор — заведи его здесь, а не читай SKILL.md целиком наугад.",
    );
    process.exit(2);
  }
} else {
  console.error("[policy-slice] нужен --all, --for=<роль> или --units=4.3,5.1 (или --list, --coverage)");
  process.exit(2);
}

process.stdout.write(slice(want, role));
