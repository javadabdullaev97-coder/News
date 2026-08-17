#!/usr/bin/env node
// Оставляет в материале не больше одной атрибуции информагентству.
//
// CORE.md §6 (17.08.2026): в мировых новостях факты берутся из нескольких
// агентств и излагаются своими словами, без «как передаёт такое-то». Если
// новость важная, а источник по ней один — одна атрибуция на материал
// допустима. Материалы, написанные раньше, набирали их по 9 штук:
// «сообщает Al Jazeera», «пишет Al Jazeera», «передаёт Al Jazeera» — текст
// читается как пересказ чужой ленты, о чём владелец и написал.
//
// Скрипт снимает повторы, а не все атрибуции: первая в материале остаётся
// всегда, даже если она и есть та самая допустимая.
//
// Что снимается — только хвостовая оговорка перед точкой:
//
//   было:  Она назвала это признаками наращивания, пишет Al Jazeera.
//   стало: Она назвала это признаками наращивания.
//
// Атрибуция в начале предложения («По данным BBC Sport, УЕФА рассматривает…»)
// не трогается: её снятие требует переписать фразу, а не вырезать хвост.
//
// Атрибуция, на имени агентства которой стоит ссылка, тоже не трогается —
// это единственное упоминание источника в теле, и его снятие оставило бы
// frontmatter.sources без подтверждения (check-policy-drift назовёт балластом).
//
// Названия агентств берутся из списка. Без него шаблон «Имя + сказал»
// поймал бы прямую речь: «, Дональд Трамп заявил.» — это не атрибуция
// изданию, а атрибуция человеку, и она обязана остаться.
//
// CLI:
//   node scripts/thin-agency-attributions.mjs           — показать
//   node scripts/thin-agency-attributions.mjs --apply   — записать

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const POSTS_DIR = join(ROOT, "content/posts");
const apply = process.argv.includes("--apply");

const OUTLETS = [
  "Al Jazeera", "Bloomberg", "Reuters", "BBC Sport", "BBC News", "BBC",
  "CBS News", "CBS", "PBS NewsHour", "PBS", "Nikkei Asia", "Nikkei",
  "Sky Sports", "Sky News", "Le Monde", "Financial Times", "The Guardian",
  "Guardian", "Variety", "The Hollywood Reporter", "Hollywood Reporter",
  "Euronews", "SCMP", "Associated Press", "AP", "DW", "CNN", "AFP",
  "Interfax", "Kommersant", "Vedomosti", "RBC", "TASS", "Fergana",
  "«Интерфакс»", "«Коммерсантъ»", "«Ведомости»", "«Фергана»", "РБК", "ТАСС",
  "издание", "nashr",
];

// Длинные названия раньше коротких: иначе «BBC» съест «BBC Sport» и оговорка
// обрежется до половины.
const NAME = OUTLETS.sort((a, b) => b.length - a.length)
  .map((o) => o.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|");

const RU_VERB = "сообщает|сообщило|сообщила|сообщают|передаёт|передает|передают|пишет|пишут|уточняет|отмечает|добавляет";
const EN_VERB = "reports|reported|writes|wrote|notes|noted|adds|added";
const UZ_VERB = "yozadi|xabar beradi|ta['’]kidlaydi|qo['’]shimcha qiladi|ma['’]lum qiladi";

// Вводная часть оговорки. Запятая и тире забираются вместе: в «…в Калифорнии,
// — передаёт PBS NewsHour.» съесть только тире значит оставить «…в Калифорнии,.»
const LEAD = "\\s*(?:,\\s*[—–]\\s*|,\\s*|\\s[—–]\\s*)";

const TRAIL = [
  new RegExp(`${LEAD}(?:${RU_VERB})\\s+(?:${NAME})(?=\\.)`, "g"),
  new RegExp(`${LEAD}(?:${NAME})\\s+(?:${EN_VERB})(?=\\.)`, "g"),
  new RegExp(`${LEAD}(?:—\\s*)?deb\\s+(?:${UZ_VERB})\\s+(?:${NAME})(?=\\.)`, "g"),
  // Вставка в середине фразы («Склад стал, по данным DW, 18-м по счёту»)
  // намеренно не трогается. Она обрамлена запятыми с обеих сторон, и какая
  // из них принадлежит вставке, а какая самой фразе — зависит от фразы:
  // в «Склад стал, по данным DW, 18-м» лишними становятся обе, а в «Несмотря
  // на критику вокруг реформы, по данным Bloomberg, опрос показал» первая
  // обязана остаться. Регуляркой это не различить, а поставить запятую не
  // туда хуже, чем оставить вставку.
  //
  // Вводная в начале предложения: «По данным BBC Sport, УЕФА рассматривает…»
  // → «УЕФА рассматривает…». Срезаем только там, где следом идёт заглавная,
  // цифра или ссылка: иначе фраза начнётся со строчной буквы, а поправить
  // регистр — уже правка слова, а не удаление вставки.
  new RegExp(
    `(?<=^|\\n|\\.\\s|»\\s)(?:По данным|According to)\\s+(?:${NAME}),\\s+(?=[А-ЯA-Z0-9«\\[])`,
    "g",
  ),
  new RegExp(
    `(?<=^|\\n|\\.\\s|»\\s)(?:${NAME})\\s+(?:ma['’]lumotlariga|xabariga)\\s+ko['’]ra,\\s+(?=[А-ЯA-Z0-9«\\[])`,
    "g",
  ),
];

// Любое упоминание агентства рядом с глаголом речи — включая то, на котором
// стоит ссылка, и то, что стоит в начале предложения. Нужно, чтобы понять,
// какая атрибуция в материале первая: снимать надо всё после неё, а не всё
// после первой снимаемой.
const ANY = new RegExp(
  `(?:${RU_VERB}|по данным)\\s+(?:\\[[^\\]]+\\]\\(|«|)(?:${NAME})` +
    `|(?:\\[|)(?:${NAME})(?:\\]\\([^)\\s]+\\)|)\\s+(?:${EN_VERB})` +
    `|deb\\s+(?:${UZ_VERB})\\s+(?:\\[|)(?:${NAME})`,
  "g",
);

function collect(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...collect(p));
    else if (e.isFile() && e.name.endsWith(".mdx")) out.push(p);
  }
  return out;
}

let touched = 0;
let dropped = 0;
const samples = [];

for (const file of collect(POSTS_DIR)) {
  const raw = readFileSync(file, "utf8");
  const m = raw.match(/^(---\n[\s\S]*?\n---\n?)([\s\S]*)$/);
  if (!m) continue;
  const [, frontmatter, body] = m;

  const first = ANY.exec(body);
  ANY.lastIndex = 0;
  if (!first) continue;
  // Первую атрибуцию оставляем: рубеж — конец её совпадения.
  const keepUntil = first.index + first[0].length;

  const cuts = [];
  for (const re of TRAIL) {
    for (const t of body.matchAll(re)) {
      if (t.index < keepUntil) continue;
      // Ссылка внутри оговорки означает, что это единственное упоминание
      // источника в теле — такую не режем.
      if (t[0].includes("](")) continue;
      cuts.push([t.index, t.index + t[0].length, t[0]]);
    }
  }
  if (!cuts.length) continue;

  cuts.sort((a, b) => a[0] - b[0]);
  let next = "";
  let at = 0;
  for (const [s, e, text] of cuts) {
    if (s < at) continue; // перекрытие шаблонов — второй пропускаем
    next += body.slice(at, s);
    at = e;
    dropped += 1;
    if (samples.length < 8) samples.push({ file: file.replace(ROOT + "/", ""), text: text.trim() });
  }
  next += body.slice(at);

  touched += 1;
  if (apply) writeFileSync(file, frontmatter + next);
}

console.log(
  `${apply ? "Снято" : "Будет снято"}: ${dropped} повторных атрибуций в ${touched} файлах` +
    (apply ? "" : "  (запуск с --apply запишет)"),
);
for (const s of samples) console.log(`  ${s.file}\n     «…${s.text}.» → «….»`);
