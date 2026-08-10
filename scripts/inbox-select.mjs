#!/usr/bin/env node
// Отбор кандидатов из инбокса для планёрки.
//
// Зачем. Планёрка читала сырые JSONL целиком: 3 августа это 27 КБ местного
// потока плюс 324 КБ мирового, из которых 43% — повторы одного и того же
// link, а больше половины уже обработаны и лежат в журнале тем. Плюс сам
// журнал — 88 КБ хешей, которые модель «читала», чтобы сравнить строки.
//
// Сравнение строк, отсечка по возрасту и схлопывание повторов — работа для
// скрипта. Модели остаётся то, чего скрипт не умеет: кластеризация по
// смыслу (кросс-языковая) и оценка по редакционной шкале.
//
// Внешних зависимостей нет — работает в свежем клоне до npm install.
//
// Использование:
//   node scripts/inbox-select.mjs                    — местный поток
//   node scripts/inbox-select.mjs --world            — мировой поток
//   node scripts/inbox-select.mjs --both             — оба, в одном объекте
//   node scripts/inbox-select.mjs --jsonl            — по item'у на строку
//   node scripts/inbox-select.mjs --pretty           — с отступами, для человека
//   node scripts/inbox-select.mjs --both --titles    — фаза 1: только заголовки и блоки
//   node scripts/inbox-select.mjs --both --expand=world:12,world:45
//                                                   — фаза 2: полные записи по индексам
//   node scripts/inbox-select.mjs --max-age=48       — окно свежести местного, часов
//   node scripts/inbox-select.mjs --max-age-world=24 — окно свежести мирового
//   node scripts/inbox-select.mjs --limit=200        — потолок числа кандидатов
//   node scripts/inbox-select.mjs --full-snippet     — не подрезать сниппеты
//   node scripts/inbox-select.mjs --all-candidates   — показать и то, что
//                                                     уже смотрели и не взяли
//
// ВЫВОД БЕЗ ОТСТУПОВ ПО УМОЛЧАНИЮ. Первый вариант печатал JSON.stringify с
// отступом 2 — и на живых данных выдал 806 КБ там, где сырьё занимало 440 КБ.
// Отступы и переводы строк в структуре из тысячи однотипных объектов стоят
// больше, чем всё, что удалось сэкономить фильтрацией. --pretty оставлен
// для чтения глазами.

import {
  ROOT,
  loadJournal,
  readInbox,
  selectFresh,
  tashkentDay,
} from "../lib/inbox-core.mjs";

function flag(name) {
  return process.argv.includes(`--${name}`);
}
function opt(name, fallback) {
  const p = process.argv.find((a) => a.startsWith(`--${name}=`));
  return p ? p.slice(name.length + 3) : fallback;
}

const at = Date.now();
const maxAgeHours = Number(opt("max-age", 24));
// Окно мирового потока — такое же 24-часовое, как у местного.
//
// Здесь была попытка сократить его до 12 часов: мировой поток даёт около
// тысячи кандидатов в сутки, и подавляющее большинство планёрка уже
// рассматривала и не взяла (в журнал тем они не попадают — туда идут только
// items из обработанных тем, — поэтому возвращаются на каждом прогоне).
//
// Проверка на живых материалах эту идею отменила. Возраст самой свежей
// ссылки на момент публикации: «Сеута, число погибших» — 25,6 часа,
// «Трамп останавливает удары по Ирану» — 15,3 часа. Обе вышли бы в никуда.
// Мировой сюжет вызревает: сначала сообщение одного агентства, подтверждение
// вторым блоком приходит спустя часы, а барьер требует именно нескольких
// независимых блоков. Короткое окно режет как раз то, ради чего барьер и
// поставлен.
//
// Экономию берём не окном, а двухфазным выводом (--titles / --expand).
const maxAgeWorldHours = Number(opt("max-age-world", 24));
const limit = Number(opt("limit", 0)) || Infinity;
const asJsonl = flag("jsonl");
const pretty = flag("pretty");
const fullSnippet = flag("full-snippet");
const both = flag("both");
const showReviewed = flag("all-candidates");
const worldOnly = flag("world") && !both;

// Сниппет — единственное, что говорит о содержании помимо заголовка: по нему
// идёт кластеризация и половина оценки. Режем по верхней границе, а не по
// медиане: медиана местного потока 229 символов, p90 — 796, то есть 600
// оставляет почти все тексты нетронутыми и подрезает только хвост.
// У мирового потока распределение вдвое короче (медиана 90, p90 328) —
// там и порог ниже.
const SNIPPET_LIMIT = 600;
const SNIPPET_LIMIT_WORLD = 320;

function compact(item) {
  const out = {
    sourceId: item.sourceId,
    sourceName: item.sourceName,
    sourceType: item.sourceType,
    sourcePriority: item.sourcePriority,
    sourceKind: item.sourceKind,
    title: item.title,
    link: item.link,
    pubDate: item.pubDate,
    fetchedAt: item.fetchedAt,
  };
  const snippet = item.snippet ?? "";
  const cap = item.bloc ? SNIPPET_LIMIT_WORLD : SNIPPET_LIMIT;
  out.snippet =
    fullSnippet || snippet.length <= cap
      ? snippet
      : snippet.slice(0, cap - 1).replace(/\s+\S*$/, "") + "…";
  if (item.bloc) out.bloc = item.bloc;
  if (Number.isFinite(item.views)) out.views = item.views;
  if (item.seenTimes > 1) out.seenTimes = item.seenTimes;
  return out;
}

const journal = loadJournal(ROOT, at);

function build(world) {
  const raw = readInbox(ROOT, { world, at });
  const sel = selectFresh(raw.items, {
    seen: journal.blocked,
    claimed: journal.claimed,
    // Скрываем то, что оркестратор уже смотрел и не взял. Отметку ставит
    // он сам в конце прогона (topic-journal review), живёт сутки.
    // Флаг --all-candidates её игнорирует — для разбора «почему тема
    // не всплыла».
    reviewed: showReviewed ? null : journal.reviewed,
    at,
    maxAgeHours: world ? maxAgeWorldHours : maxAgeHours,
  });
  // Свежее сверху: если сработал потолок, отрезается самое старое.
  const sorted = sel.fresh.sort(
    (a, b) => Date.parse(b.fetchedAt ?? 0) - Date.parse(a.fetchedAt ?? 0),
  );
  const kept = sorted.slice(0, limit);
  return {
    files: raw.files,
    maxAgeHours: world ? maxAgeWorldHours : maxAgeHours,
    stats: {
      ...sel.stats,
      returned: kept.length,
      truncated: sorted.length - kept.length,
    },
    items: kept.map(compact),
  };
}

// Двухфазный вывод — главный рычаг экономии на мировом потоке.
//
// Мировая тема проходит два разных решения, и им нужны разные данные.
// Сначала кластеризация: сгруппировать сюжет по смыслу и посчитать, из
// скольких независимых блоков он подтверждён. Для этого хватает заголовка
// и блока — ни ссылка, ни сниппет, ни метаданные источника в группировке
// не участвуют. И только потом, для трёх-пяти уцелевших кластеров, нужны
// полные записи.
//
// Разница на живых данных: тысяча кандидатов в полном виде — сотни
// килобайт, они же строкой «id | bloc | источник | заголовок» — втрое
// меньше, а решение по ним принимается ровно то же самое.
//
// Индекс (id) стабилен внутри одного вызова пары --titles / --expand:
// оба режима строят список одинаково и сортируют одинаково. Между
// вызовами с разным окном или в разное время он, разумеется, поедет —
// поэтому expand делается сразу после titles, в том же шаге.
function titleLines(part, stream) {
  return part.items
    .map((it, i) =>
      [`${stream}:${i}`, it.bloc ?? "-", it.sourceId ?? "-", (it.title ?? "").replace(/\s+/g, " ")].join(" | "),
    )
    .join("\n");
}

const expandSpec = opt("expand", null);

const result = {
  tashkentDay: tashkentDay(at),
  generatedAt: new Date(at).toISOString(),
  journal: {
    done: journal.done.size,
    claimedByOthers: journal.claimed.size,
    ok: journal.ok,
  },
};
if (!journal.ok) result.warning = journal.note;

if (both) {
  result.local = build(false);
  result.world = build(true);
} else if (worldOnly) {
  result.world = build(true);
} else {
  result.local = build(false);
}

if (expandSpec !== null) {
  // --expand=world:12,world:45,local:3 — вернуть полные записи по индексам
  // из вывода --titles. Неизвестный или вышедший за границы индекс —
  // ошибка, а не тихий пропуск: молча вернуть меньше, чем просили, значит
  // выкинуть источник из сюжета и не сказать об этом.
  const fail = (msg) => {
    console.error(`[inbox-select] ${msg}`);
    process.exit(2);
  };
  const want = expandSpec.split(",").map((s) => s.trim()).filter(Boolean);
  const out = [];
  for (const ref of want) {
    const [stream, idxRaw] = ref.includes(":") ? ref.split(":") : ["local", ref];
    const part = result[stream];
    const idx = Number(idxRaw);
    if (!part) {
      fail(`--expand=${ref}: поток "${stream}" не запрошен — добавь --${stream} или --both`);
    }
    if (!Number.isInteger(idx) || idx < 0 || idx >= part.items.length) {
      fail(
        `--expand=${ref}: индекс вне диапазона 0..${part.items.length - 1}. ` +
          "Индексы действительны только внутри одного захода — перезапусти --titles и возьми свежие.",
      );
    }
    out.push({ ref, stream, ...part.items[idx] });
  }
  process.stdout.write(JSON.stringify(out, null, pretty ? 2 : 0) + "\n");
} else if (flag("titles")) {
  for (const key of ["local", "world"]) {
    if (!result[key]) continue;
    process.stdout.write(`# ${key}: ${result[key].items.length} кандидат(ов)\n`);
    const lines = titleLines(result[key], key);
    if (lines) process.stdout.write(lines + "\n");
  }
} else if (asJsonl) {
  for (const key of ["local", "world"]) {
    for (const item of result[key]?.items ?? []) {
      process.stdout.write(JSON.stringify({ stream: key, ...item }) + "\n");
    }
  }
} else {
  process.stdout.write(JSON.stringify(result, null, pretty ? 2 : 0) + "\n");
}

for (const key of ["local", "world"]) {
  const part = result[key];
  if (!part) continue;
  const s = part.stats;
  console.error(
    `[inbox-select:${key}] ${s.returned} кандидат(ов) из ${s.raw} сырых · ` +
      `повторов ${s.duplicates} · уже обработано ${s.alreadySeen}` +
      (s.claimedByOther ? ` · занято соседом ${s.claimedByOther}` : "") +
      // Скрытое обязано быть видно числом. Молчаливый отсев — это отсев,
      // о котором узнают через неделю по ненаписанной новости.
      (s.reviewedEarlier ? ` · смотрел и не взял ранее ${s.reviewedEarlier}` : "") +
      ` · старше ${part.maxAgeHours}ч ${s.stale}` +
      (s.ageUnknown ? ` · без даты ${s.ageUnknown} (взяты)` : "") +
      (s.truncated ? ` · срезано потолком ${s.truncated}` : ""),
  );
}
