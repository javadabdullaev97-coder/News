#!/usr/bin/env node
// Самотест ядра отбора (lib/inbox-core.mjs).
//
// Зачем отдельный файл, а не «проверил руками и забыл». Этот код решает,
// какие темы редакция вообще увидит. Ошибка здесь не падает с трейсбеком —
// она выглядит как тихий день: планёрка отчитывается «новых тем нет», и
// понять, что тема была, можно только постфактум и случайно. Ровно так
// 3 августа потерялись тарифы на отопление и проезд.
//
// Поэтому каждое правило, ценой которого была потерянная новость,
// закреплено проверкой. Запуск: node scripts/selftest-inbox.mjs
//
// Зависимостей нет — как и у самого ядра.

import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ROOT as REPO_ROOT,
  hashLink,
  loadSeenHashes,
  readInbox,
  selectFresh,
  dedupeByLink,
  itemAgeHours,
  listMaturedCards,
  listRework,
  tashkentDay,
  tashkentYesterday,
} from "../lib/inbox-core.mjs";

let passed = 0;
const failures = [];

function check(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failures.push({ name, message: err.message });
    console.log(`  FAIL ${name}\n       ${err.message}`);
  }
}

function eq(actual, expected, what = "") {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${what || "значение"}: ожидалось ${e}, получено ${a}`);
}

// ─── песочница ───

const box = mkdtempSync(join(tmpdir(), "leap-selftest-"));
function fixture(files) {
  const root = mkdtempSync(join(box, "root-"));
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(root, rel);
    mkdirSync(join(abs, ".."), { recursive: true });
    writeFileSync(abs, content);
  }
  return root;
}
function jsonl(items) {
  return items.map((i) => JSON.stringify(i)).join("\n") + "\n";
}

const HOUR = 3600 * 1000;
// Полдень Ташкента, чтобы «сегодня» и «вчера» считались однозначно.
const NOON = Date.parse("2026-08-03T07:00:00Z");
const TODAY = tashkentDay(NOON);
const YESTERDAY = tashkentYesterday(NOON);

console.log(`\nсимулируемая дата: ${TODAY} (вчера ${YESTERDAY})\n`);

// ─── 1. Отсечки по lastRunAt нет и быть не должно ───
// Инцидент 3 августа: фетчер забрал тарифы в 01:56, закоммитил в 02:22,
// планёрка 02:35 сравнила fetchedAt с lastRunAt=02:11 и сочла несвежими.
// Две темы «затрагивает всех» выпали без следа. Здесь это закреплено:
// item, забранный ДО прошлого запуска, обязан попасть в отбор.

check("item, забранный до прошлого запуска, отбирается (инцидент с тарифами)", () => {
  const root = fixture({
    [`content/inbox/${TODAY}.jsonl`]: jsonl([
      {
        link: "https://gazeta.uz/tariff",
        title: "Тариф на отопление предложили повысить",
        fetchedAt: new Date(NOON - 5 * HOUR).toISOString(),
      },
    ]),
  });
  const { items } = readInbox(root, { at: NOON });
  const { fresh } = selectFresh(items, { seen: new Set(), at: NOON });
  eq(fresh.length, 1, "отобрано тем");
});

check("ядро не принимает lastRunAt как параметр отбора", () => {
  // Защита от возврата отсечки: selectFresh обязана игнорировать любой
  // посторонний ключ, а не начать по нему фильтровать.
  const items = [
    { link: "a", fetchedAt: new Date(NOON - 5 * HOUR).toISOString() },
  ];
  const withArg = selectFresh(items, {
    seen: new Set(),
    at: NOON,
    lastRunAt: new Date(NOON - 1 * HOUR).toISOString(),
  });
  eq(withArg.fresh.length, 1, "отобрано при переданном lastRunAt");
});

// ─── 2. Граница суток по Ташкенту ───

check("item из вчерашнего файла в 23:50 виден в 00:05 следующих суток", () => {
  const justAfterMidnight = Date.parse("2026-08-03T19:05:00Z"); // 00:05 Ташкента 4-го
  const day = tashkentDay(justAfterMidnight);
  const prev = tashkentYesterday(justAfterMidnight);
  const root = fixture({
    [`content/inbox/${prev}.jsonl`]: jsonl([
      {
        link: "https://uza.uz/late",
        title: "Вечернее постановление",
        fetchedAt: new Date(justAfterMidnight - 15 * 60 * 1000).toISOString(),
      },
    ]),
    [`content/inbox/${day}.jsonl`]: jsonl([]),
  });
  const { items } = readInbox(root, { at: justAfterMidnight });
  const { fresh } = selectFresh(items, { seen: new Set(), at: justAfterMidnight });
  eq(fresh.length, 1, "тем найдено за полночь");
});

// ─── 3. Битый журнал не должен останавливать редакцию ───

check("битый seen-topics.json → журнал пустой, работа продолжается", () => {
  const root = fixture({ "content/state/seen-topics.json": "{ это не json" });
  const seen = loadSeenHashes(root);
  eq(seen.hashes.size, 0, "размер журнала");
  eq(seen.ok, false, "флаг исправности");
  if (!seen.note) throw new Error("нет пояснения в note");
});

check("seen-topics.json без массива hashes → тоже fail-open", () => {
  const root = fixture({ "content/state/seen-topics.json": '{"maxSize":5000}' });
  const seen = loadSeenHashes(root);
  eq(seen.hashes.size, 0, "размер журнала");
  eq(seen.ok, false, "флаг исправности");
});

check("отсутствующий seen-topics.json — штатный первый запуск", () => {
  const seen = loadSeenHashes(fixture({}));
  eq(seen.hashes.size, 0, "размер журнала");
  eq(seen.ok, true, "первый запуск не считается поломкой");
});

// ─── 4. Дедуп повторов ───

check("повторы одного link схлопываются, fetchedAt берётся самый ранний", () => {
  const early = new Date(NOON - 6 * HOUR).toISOString();
  const late = new Date(NOON - 1 * HOUR).toISOString();
  const out = dedupeByLink([
    { link: "x", fetchedAt: late, views: 10 },
    { link: "x", fetchedAt: early, views: 50 },
    { link: "x", fetchedAt: late, views: 30 },
    { link: "y", fetchedAt: late },
  ]);
  eq(out.length, 2, "уникальных items");
  const x = out.find((i) => i.link === "x");
  eq(x.fetchedAt, early, "fetchedAt после схлопывания");
  eq(x.seenTimes, 3, "счётчик повторов");
  eq(x.views, 50, "views берётся максимальный");
});

// ─── 5. Окно свежести ───

check("item старше окна отсекается, свежий остаётся", () => {
  const items = [
    { link: "old", fetchedAt: new Date(NOON - 30 * HOUR).toISOString() },
    { link: "new", fetchedAt: new Date(NOON - 2 * HOUR).toISOString() },
  ];
  const { fresh, stats } = selectFresh(items, { seen: new Set(), at: NOON, maxAgeHours: 24 });
  eq(fresh.map((i) => i.link), ["new"], "отобранные");
  eq(stats.stale, 1, "отсечено по возрасту");
});

check("item без дат берётся в работу, а не выбрасывается", () => {
  const { fresh, stats } = selectFresh([{ link: "nodate", title: "без дат" }], {
    seen: new Set(),
    at: NOON,
  });
  eq(fresh.length, 1, "отобрано");
  eq(stats.ageUnknown, 1, "помечено как без даты");
});

check("при отсутствии fetchedAt возраст считается по pubDate", () => {
  const age = itemAgeHours(
    { link: "p", pubDate: new Date(NOON - 3 * HOUR).toISOString() },
    NOON,
  );
  if (Math.abs(age - 3) > 0.01) throw new Error(`возраст ${age}, ожидалось ~3`);
});

// ─── 6. Журнал тем действительно отсекает ───

check("item с хешем в журнале не попадает в отбор", () => {
  const link = "https://uza.uz/seen";
  const { fresh, stats } = selectFresh(
    [{ link, fetchedAt: new Date(NOON - HOUR).toISOString() }],
    { seen: new Set([hashLink(link)]), at: NOON },
  );
  eq(fresh.length, 0, "отобрано");
  eq(stats.alreadySeen, 1, "учтено как виденное");
});

check("хеш совпадает с форматом живого seen-topics.json репозитория", () => {
  // Ловушка на случай «улучшения» нормализацией (lowercase, обрезка utm,
  // снятие слеша). Любая такая правка обнулит накопленный журнал разом,
  // и все уже обработанные темы вернутся в пул как новые.
  //
  // Проверяем не выдуманной константой, а фактом: берём реальные ссылки
  // из инбоксов репозитория и убеждаемся, что заметная их часть хешируется
  // в записи, которые в журнале действительно есть.
  const h = hashLink("https://example.com/a");
  if (!/^sha256:[0-9a-f]{64}$/.test(h)) throw new Error(`формат хеша: ${h}`);

  const live = loadSeenHashes(REPO_ROOT);
  if (!live.hashes.size) {
    console.log("       (журнал репозитория пуст — сверка с живыми данными пропущена)");
    return;
  }
  const items = [
    ...readInbox(REPO_ROOT, { at: Date.now() }).items,
    ...readInbox(REPO_ROOT, { world: true, at: Date.now() }).items,
  ];
  if (!items.length) {
    console.log("       (инбоксов за сегодня и вчера нет — сверка пропущена)");
    return;
  }
  const hits = items.filter((i) => live.hashes.has(hashLink(i.link))).length;
  if (hits === 0) {
    throw new Error(
      `ни одна из ${items.length} ссылок инбокса не нашлась в журнале — ` +
        "схема хеширования разошлась с тем, что пишет планёрка",
    );
  }
});

// ─── 7. Битые строки JSONL не роняют файл ───

check("битая строка пропускается, остальные читаются", () => {
  const root = fixture({
    [`content/inbox/${TODAY}.jsonl`]:
      JSON.stringify({ link: "a", fetchedAt: new Date(NOON).toISOString() }) +
      "\n{ оборванная строка\n" +
      JSON.stringify({ link: "b", fetchedAt: new Date(NOON).toISOString() }) +
      "\n",
  });
  const res = readInbox(root, { at: NOON });
  eq(res.items.length, 2, "прочитано items");
  eq(res.badLines, 1, "битых строк");
});

check("item без link игнорируется — по нему нельзя ни дедуп, ни цитату", () => {
  const root = fixture({
    [`content/inbox/${TODAY}.jsonl`]: jsonl([{ title: "без ссылки" }]),
  });
  eq(readInbox(root, { at: NOON }).items.length, 0, "прочитано items");
});

// ─── 8. Граница .md и .mdx в needs-verification ───
// Спецификация помечает её как «не чинить»: .mdx ждёт человека и им
// занимается editor-queue, .md ждёт первоисточника и это работа планёрки.

check("созревшими считаются только .md, .mdx не трогаем", () => {
  const root = fixture({
    "content/needs-verification/card.md": `---\nrecheckAt: "2026-08-01T00:00:00+05:00"\n---\n\nтело\n`,
    "content/needs-verification/article.mdx": `---\nawaitingEditor: true\n---\n\nтело\n`,
  });
  const { matured } = listMaturedCards(root, NOON);
  eq(matured.map((c) => c.slug), ["card"], "созревшие");
});

check("карточка с наступившим сроком созрела, с будущим — ждёт", () => {
  const root = fixture({
    "content/needs-verification/past.md": `---\nrecheckAt: "${new Date(NOON - 5 * HOUR).toISOString()}"\n---\n`,
    "content/needs-verification/future.md": `---\nrecheckAt: "${new Date(NOON + 5 * HOUR).toISOString()}"\n---\n`,
  });
  const { matured, waiting } = listMaturedCards(root, NOON);
  eq(matured.map((c) => c.slug), ["past"], "созревшие");
  eq(waiting.map((c) => c.slug), ["future"], "ждущие");
});

check("карточка без машиночитаемого recheckAt считается созревшей", () => {
  // Именно «когда-нибудь потом» держало папку на записи двое суток:
  // «через 4 часа» в теле — от какой даты, из текста не следует.
  const root = fixture({
    "content/needs-verification/prose.md":
      "---\nstatus: needs-verification\n---\n\n**Перепроверить:** через 4 часа\n",
  });
  const { matured } = listMaturedCards(root, NOON);
  eq(matured.length, 1, "созревших");
  if (!matured[0].reason) throw new Error("нет пояснения, почему созрела");
});

check("recheckAt в кавычках и без кавычек читается одинаково", () => {
  const iso = new Date(NOON - HOUR).toISOString();
  const root = fixture({
    "content/needs-verification/quoted.md": `---\nrecheckAt: "${iso}"\n---\n`,
    "content/needs-verification/bare.md": `---\nrecheckAt: ${iso}\n---\n`,
  });
  eq(listMaturedCards(root, NOON).matured.length, 2, "созревших");
});

// ─── 9. Rework ───

check("rework видит .mdx и не видит .gitkeep", () => {
  const root = fixture({
    "content/rework/a.mdx": "---\n---\n",
    "content/rework/.gitkeep": "",
  });
  eq(listRework(root), ["content/rework/a.mdx"], "материалы на переделке");
});

check("отсутствующие каталоги не роняют отбор", () => {
  const root = fixture({});
  eq(listRework(root), [], "rework");
  eq(listMaturedCards(root, NOON).matured, [], "карточки");
  eq(readInbox(root, { at: NOON }).items, [], "инбокс");
});

// ─── 10. Мировой поток ───

check("bloc сохраняется — по нему считается независимость источников", () => {
  const root = fixture({
    [`content/inbox/world-${TODAY}.jsonl`]: jsonl([
      { link: "w1", bloc: "anglo", fetchedAt: new Date(NOON).toISOString() },
    ]),
  });
  const { items } = readInbox(root, { world: true, at: NOON });
  eq(items[0].bloc, "anglo", "поле bloc");
});

check("местный и мировой потоки не смешиваются", () => {
  const root = fixture({
    [`content/inbox/${TODAY}.jsonl`]: jsonl([{ link: "local", fetchedAt: new Date(NOON).toISOString() }]),
    [`content/inbox/world-${TODAY}.jsonl`]: jsonl([{ link: "world", fetchedAt: new Date(NOON).toISOString() }]),
  });
  eq(readInbox(root, { at: NOON }).items.map((i) => i.link), ["local"], "местный");
  eq(readInbox(root, { world: true, at: NOON }).items.map((i) => i.link), ["world"], "мировой");
});

// ─── итог ───

rmSync(box, { recursive: true, force: true });

console.log(`\nпройдено ${passed}, провалено ${failures.length}`);
if (failures.length) {
  for (const f of failures) console.log(`  ✗ ${f.name}: ${f.message}`);
  process.exit(1);
}
