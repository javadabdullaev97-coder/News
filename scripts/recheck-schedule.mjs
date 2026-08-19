#!/usr/bin/env node
// Срок следующей перепроверки карточки needs-verification — по лестнице,
// а не «завтра в полдень».
//
// ЗАЧЕМ. 20.08.2026 два агента перепроверки съели 45,3k и 58,8k токенов,
// 19 и 38 обращений к инструментам, две и четыре минуты. Обе вернули
// «ничего не изменилось». Одна из карточек при этом сама написала в выводе:
// законопроект внесут «не раньше конца 2026 года» — и тут же назначила
// себе перепроверку на следующий день. То есть проверка на 45 тысяч токенов
// была бы повторена ещё сто раз подряд с заранее известным ответом.
//
// Карточка `lolazor-playground-criminal-case` пережила шесть таких кругов
// за две недели.
//
// МЕХАНИКА. Срок больше не назначается на глаз:
//
//   перепроверка №1 → +4 часа      (событие свежее, документ может выйти)
//   №2              → +1 день
//   №3              → +3 дня
//   №4              → +7 дней
//   №5              → +14 дней
//   №6 и дальше     → +30 дней
//
// Плюс `notBefore` во frontmatter: если корреспондент выяснил, что раньше
// такого-то числа источника быть не может, лестница не может назначить
// раньше. Семь пустых кругов — карточка помечается `exhausted: true`,
// и планёрка закрывает её как неподтверждённую.
//
//   node scripts/recheck-schedule.mjs <карточка> --nothing   — ничего не нашли
//   node scripts/recheck-schedule.mjs <карточка> --nothing --not-before=2026-11-01
//   node scripts/recheck-schedule.mjs --due                  — что созрело и почём

import { existsSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DIR = join(ROOT, "content/needs-verification");
const argv = process.argv.slice(2);

// Шаги лестницы в часах. Индекс — номер уже состоявшейся перепроверки.
const LADDER = [4, 24, 72, 168, 336, 720];
const EXHAUSTED_AFTER = 7;

const opt = (name) => {
  const p = argv.find((a) => a.startsWith(`--${name}=`));
  return p ? p.slice(name.length + 3) : null;
};

/** Сколько раз карточку уже перепроверяли: по заголовкам «## Перепроверка». */
const countRechecks = (text) => (text.match(/^##+\s+Перепроверка/gmu) ?? []).length;

const fm = (text) => {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  return m ? m[1] : null;
};

const fmValue = (text, key) => {
  const block = fm(text);
  if (!block) return null;
  const m = block.match(new RegExp(`^${key}:\\s*"?([^"\n]+)"?\\s*$`, "m"));
  return m ? m[1].trim() : null;
};

/** Поставить или заменить поле во frontmatter, сохранив остальное. */
function setFm(text, key, value) {
  const block = fm(text);
  if (block === null) {
    return `---\n${key}: "${value}"\n---\n\n${text}`;
  }
  const line = `${key}: "${value}"`;
  const re = new RegExp(`^${key}:.*$`, "m");
  const next = re.test(block) ? block.replace(re, line) : `${block}\n${line}`;
  return text.replace(/^---\n[\s\S]*?\n---/, `---\n${next}\n---`);
}

const iso = (d) => `${d.toISOString().slice(0, 19)}+00:00`;

// ─── Что созрело и во сколько обходится ───
if (argv.includes("--due")) {
  const now = Date.now();
  const rows = [];
  for (const f of existsSync(DIR) ? readdirSync(DIR) : []) {
    if (!f.endsWith(".md")) continue;
    const text = readFileSync(join(DIR, f), "utf8");
    const at = fmValue(text, "recheckAt");
    const n = countRechecks(text);
    rows.push({
      file: f,
      at,
      n,
      due: at ? Date.parse(at) <= now : true,
      exhausted: fmValue(text, "exhausted") === "true" || n >= EXHAUSTED_AFTER,
      notBefore: fmValue(text, "notBefore"),
    });
  }
  rows.sort((a, b) => (a.at ?? "").localeCompare(b.at ?? ""));
  for (const r of rows) {
    console.error(
      `${r.due ? "▶" : " "} ${String(r.n).padStart(2)} кругов  ${(r.at ?? "без срока").slice(0, 16).padEnd(17)}` +
        `${r.exhausted ? "ИСЧЕРПАНА " : "          "}${r.notBefore ? `не раньше ${r.notBefore} ` : ""}${r.file}`,
    );
  }
  const due = rows.filter((r) => r.due && !r.exhausted).length;
  console.error(
    `\n[recheck] созрело ${due} из ${rows.length}. Каждая перепроверка — это вызов ` +
      "корреспондента: 40–60k токенов и 2–4 минуты. Столько же стоит новая статья.",
  );
  process.exit(0);
}

// ─── Назначение следующего срока ───
const file = argv.find((a) => !a.startsWith("--"));
if (!file) {
  console.error("[recheck] нужен путь к карточке или --due");
  process.exit(2);
}
const abs = file.startsWith("/") ? file : join(ROOT, file);
if (!existsSync(abs)) {
  console.error(`[recheck] нет файла ${file}`);
  process.exit(2);
}

let text = readFileSync(abs, "utf8");
const done = countRechecks(text);
const step = LADDER[Math.min(done, LADDER.length - 1)];

// Карточка исчерпана: дальше её держат не «на всякий случай», а по решению.
if (done + 1 >= EXHAUSTED_AFTER) {
  text = setFm(text, "exhausted", "true");
  writeFileSync(abs, text);
  console.error(
    `[recheck] ${done} кругов без подтверждения — карточка помечена exhausted.\n` +
      "  Закрывай её в content/rejected/ с причиной «первоисточник так и не появился»,\n" +
      "  либо, если тема того стоит, сними пометку руками и назначь срок осознанно.",
  );
  process.exit(0);
}

const notBefore = opt("not-before") ?? fmValue(text, "notBefore");
let when = new Date(Date.now() + step * 3600 * 1000);
if (notBefore) {
  const nb = new Date(`${notBefore}T09:00:00+05:00`);
  // Раньше даты, названной самим корреспондентом, проверять нечего:
  // источника физически ещё не существует.
  if (Number.isFinite(nb.getTime()) && nb > when) when = nb;
  text = setFm(text, "notBefore", notBefore);
}

text = setFm(text, "recheckAt", iso(when));
text = setFm(text, "rechecks", String(done));
writeFileSync(abs, text);

console.error(
  `[recheck] круг ${done} → следующая проверка через ${step} ч: ${iso(when).slice(0, 16)}` +
    (notBefore ? ` (не раньше ${notBefore})` : ""),
);
