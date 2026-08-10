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
  inboxFreshnessMinutes,
  loadSeenHashes,
  loadJournal,
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

  // Сверяемся с ПОЛНЫМ журналом, а не с одним seen-topics.json.
  //
  // Прежняя версия брала loadSeenHashes — то есть только исторический
  // seen-topics.json. Он по устройству отстаёт: свежие темы пишутся в
  // пофайловые content/state/seen/<день>-<runId>.jsonl, а в общий файл
  // переезжают только при `topic-journal compact`. К этому моменту их
  // ссылки старше суток и из инбокса уже вышли. Поэтому проверка падала
  // всегда, кроме узкого окна сразу после уплотнения, и выглядела как
  // «схема хеширования разошлась», хотя ничего не расходилось.
  //
  // Замер 09.08.2026 на живых данных: seen-topics.json 1115 хешей, 0
  // совпадений с инбоксом; полный журнал 3732 хеша, 301 совпадение.
  //
  // Производство читает именно loadJournal (inbox-select, preflight) —
  // его и проверяем.
  const live = { hashes: loadJournal(REPO_ROOT, Date.now()).blocked };
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

// ─── 6б. reviewed — «смотрел и не взял» ───
//
// Окно отбора сутки, заходы ежечасные: 96% пула повторяется от часа к часу
// (замер 09.08.2026 — местный поток прирастает на ~20 при пуле ~480,
// мировой на ~98 при пуле ~2350). Отметка прячет уже отвергнутое, но
// обязана соблюдать три свойства, иначе тихо потеряет темы.

check("reviewed прячет item из отбора и считается отдельной строкой", () => {
  const link = "https://uza.uz/seen-but-not-taken";
  const { fresh, stats } = selectFresh(
    [{ link, fetchedAt: new Date(NOON - HOUR).toISOString() }],
    { seen: new Set(), reviewed: new Set([hashLink(link)]), at: NOON },
  );
  eq(fresh.length, 0, "отобрано");
  eq(stats.reviewedEarlier, 1, "учтено как просмотренное");
});

check("reviewed НЕ мешает взять тему: это не блокировка, а скрытие", () => {
  // Прямая проверка контракта: скрытый item виден при reviewed=null.
  const link = "https://uza.uz/hidden";
  const item = { link, fetchedAt: new Date(NOON - HOUR).toISOString() };
  const hidden = selectFresh([item], {
    seen: new Set(),
    reviewed: new Set([hashLink(link)]),
    at: NOON,
  });
  const shown = selectFresh([item], { seen: new Set(), reviewed: null, at: NOON });
  eq(hidden.fresh.length, 0, "скрыт при активной отметке");
  eq(shown.fresh.length, 1, "показан без отметки (флаг --all-candidates)");
});

check("развитие сюжета всплывает само: новая ссылка — новый хеш", () => {
  // Главная защита от потери тем. Отметка ставится по хешу КОНКРЕТНОЙ
  // ссылки, поэтому сюжет, получивший новую публикацию, возвращается
  // в пул без всякого таймера.
  const old = "https://uza.uz/story";
  const fresh2 = "https://uza.uz/story-update";
  const { fresh } = selectFresh(
    [
      { link: old, fetchedAt: new Date(NOON - HOUR).toISOString() },
      { link: fresh2, fetchedAt: new Date(NOON - HOUR).toISOString() },
    ],
    { seen: new Set(), reviewed: new Set([hashLink(old)]), at: NOON },
  );
  eq(fresh.length, 1, "отобрано");
  eq(fresh[0].link, fresh2, "всплыла именно новая ссылка сюжета");
});

check("отметка протухает — тема возвращается в пул", () => {
  const link = "https://uza.uz/expired-review";
  const root = fixture({
    "content/state/seen/2026-08-09-run1.jsonl":
      JSON.stringify({
        h: hashLink(link),
        s: "below-threshold",
        st: "reviewed",
        at: new Date(NOON - 30 * HOUR).toISOString(),
        exp: new Date(NOON - 6 * HOUR).toISOString(),
      }) + "\n",
  });
  const j = loadJournal(root, NOON);
  eq(j.reviewed.size, 0, "просроченных отметок в журнале");
  eq(j.blocked.size, 0, "reviewed не попадает в blocked ни при каких условиях");
});

check("done вычищает reviewed: решённое не притворяется просмотренным", () => {
  const link = "https://uza.uz/reviewed-then-done";
  const h = hashLink(link);
  const root = fixture({
    "content/state/seen/2026-08-09-run1.jsonl":
      JSON.stringify({
        h,
        s: "t",
        st: "reviewed",
        at: new Date(NOON - HOUR).toISOString(),
        exp: new Date(NOON + 20 * HOUR).toISOString(),
      }) +
      "\n" +
      JSON.stringify({ h, s: "t", st: "done", at: new Date(NOON).toISOString() }) +
      "\n",
  });
  const j = loadJournal(root, NOON);
  eq(j.done.has(h), true, "тема в done");
  eq(j.reviewed.has(h), false, "и убрана из reviewed");
  eq(j.blocked.has(h), true, "и заблокирована по-настоящему");
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

// ─── 11. Журнал тем и бронь ───
// Блок появился вместе с параллельными планёрками. Проверено на модели двух
// клонов: две планёрки, дописавшие по хешу в общий seen-topics.json, дают
// конфликт при rebase, а git-push-with-rebase.sh на конфликте прерывается —
// журнал проигравшего теряется молча, и его темы возвращаются как новые.

function journalFixture(records, extra = {}) {
  const files = { ...extra };
  files[`content/state/seen/${TODAY}-testrun.jsonl`] =
    records.map((r) => JSON.stringify(r)).join("\n") + "\n";
  return fixture(files);
}

check("живая бронь блокирует тему для соседней планёрки", () => {
  const link = "https://uza.uz/claimed";
  const root = journalFixture([
    {
      h: hashLink(link),
      s: "тема-в-работе",
      st: "claimed",
      at: new Date(NOON - 5 * 60000).toISOString(),
      exp: new Date(NOON + 40 * 60000).toISOString(),
    },
  ]);
  const j = loadJournal(root, NOON);
  eq(j.claimed.size, 1, "живых броней");
  const { fresh, stats } = selectFresh(
    [{ link, fetchedAt: new Date(NOON - HOUR).toISOString() }],
    { seen: j.blocked, claimed: j.claimed, at: NOON },
  );
  eq(fresh.length, 0, "отобрано");
  eq(stats.claimedByOther, 1, "учтено как занятое соседом");
});

check("протухшая бронь возвращает тему в пул", () => {
  // Прогон может умереть на середине. Вечная бронь похоронила бы тему
  // навсегда, и это было бы неотличимо от «темы просто нет».
  const link = "https://uza.uz/abandoned";
  const root = journalFixture([
    {
      h: hashLink(link),
      s: "брошенная",
      st: "claimed",
      at: new Date(NOON - 2 * HOUR).toISOString(),
      exp: new Date(NOON - HOUR).toISOString(),
    },
  ]);
  const j = loadJournal(root, NOON);
  eq(j.claimed.size, 0, "живых броней");
  const { fresh } = selectFresh(
    [{ link, fetchedAt: new Date(NOON - 30 * 60000).toISOString() }],
    { seen: j.blocked, claimed: j.claimed, at: NOON },
  );
  eq(fresh.length, 1, "тема вернулась в пул");
});

check("done блокирует навсегда, независимо от брони", () => {
  const link = "https://uza.uz/published";
  const root = journalFixture([
    { h: hashLink(link), s: "вышла", st: "claimed", at: "2026-08-03T00:00:00Z", exp: "2026-08-03T00:45:00Z" },
    { h: hashLink(link), s: "вышла", st: "done", at: "2026-08-03T00:20:00Z" },
  ]);
  const j = loadJournal(root, NOON);
  eq(j.done.has(hashLink(link)), true, "в обработанных");
  eq(j.claimed.size, 0, "бронь снята");
});

check("release возвращает тему до истечения брони", () => {
  const link = "https://uza.uz/given-back";
  const root = journalFixture([
    { h: hashLink(link), s: "отдана", st: "claimed", at: "2026-08-03T00:00:00Z", exp: "2035-01-01T00:00:00Z" },
    { h: hashLink(link), s: "отдана", st: "released", at: "2026-08-03T00:10:00Z" },
  ]);
  const j = loadJournal(root, NOON);
  eq(j.claimed.size, 0, "живых броней");
  eq(j.blocked.has(hashLink(link)), false, "тема свободна");
});

check("исторический seen-topics.json продолжает работать вместе с журналом", () => {
  const oldLink = "https://uza.uz/legacy";
  const newLink = "https://uza.uz/fresh";
  const root = journalFixture(
    [{ h: hashLink(newLink), s: "новая", st: "done", at: "2026-08-03T00:00:00Z" }],
    { "content/state/seen-topics.json": JSON.stringify({ hashes: [hashLink(oldLink)] }) },
  );
  const j = loadJournal(root, NOON);
  eq(j.done.has(hashLink(oldLink)), true, "старый хеш из seen-topics.json");
  eq(j.done.has(hashLink(newLink)), true, "новый хеш из пофайлового журнала");
  eq(j.legacyCount, 1, "счётчик исторических");
});

check("файлы разных прогонов объединяются, а не перетирают друг друга", () => {
  // Ровно то, ради чего пофайловая схема и сделана: две планёрки пишут
  // одновременно, и обе записи должны уцелеть.
  const a = "https://uza.uz/by-a";
  const b = "https://uza.uz/by-b";
  const root = fixture({
    [`content/state/seen/${TODAY}-A.jsonl`]:
      JSON.stringify({ h: hashLink(a), s: "тема-A", st: "done", at: "2026-08-03T00:00:00Z" }) + "\n",
    [`content/state/seen/${TODAY}-B.jsonl`]:
      JSON.stringify({ h: hashLink(b), s: "тема-B", st: "done", at: "2026-08-03T00:01:00Z" }) + "\n",
  });
  const j = loadJournal(root, NOON);
  eq(j.done.size, 2, "обе записи уцелели");
});

check("битая строка журнала не роняет чтение", () => {
  const root = fixture({
    [`content/state/seen/${TODAY}-x.jsonl`]:
      JSON.stringify({ h: "sha256:ok", st: "done", at: "2026-08-03T00:00:00Z" }) +
      "\n{ оборванная\n" +
      JSON.stringify({ st: "done", at: "2026-08-03T00:00:00Z" }) + // без h
      "\n",
  });
  const j = loadJournal(root, NOON);
  eq(j.done.size, 1, "прочитано записей");
  eq(j.badLines, 2, "битых строк");
});

check("бронь без срока не считается живой", () => {
  // Запись без exp — либо старый формат, либо сбой писателя. Считать её
  // вечной броней нельзя: одна такая строка выключила бы тему навсегда.
  const link = "https://uza.uz/no-exp";
  const root = journalFixture([
    { h: hashLink(link), s: "без срока", st: "claimed", at: "2026-08-03T00:00:00Z" },
  ]);
  const j = loadJournal(root, NOON);
  eq(j.claimed.size, 0, "живых броней");
  eq(j.blocked.has(hashLink(link)), false, "тема свободна");
});

// ─── 11б. Карточки с завершённым статусом ───

check("карточка с завершённым статусом не считается созревшей", () => {
  // Тема уже разошлась по своей дороге, карточка осталась надгробием.
  // Срок у таких обычно `recheckAt: null`, а нечитаемый срок мы намеренно
  // трактуем как «пора» — иначе карточка без срока лежала бы вечно.
  // Два правила столкнулись и дали вечный двигатель: планёрка каждые
  // двадцать минут поднимала Opus, чтобы выяснить, что делать нечего.
  for (const st of ["superseded", "resolved", "published", "rejected"]) {
    const root = fixture({
      [`content/needs-verification/dead-${st}.md`]: `---\nrecheckAt: null\nstatus: ${st}\n---\n`,
    });
    const r = listMaturedCards(root, NOON);
    eq(r.matured.length, 0, `созревших при status: ${st}`);
    eq(r.waiting.length, 0, `ждущих при status: ${st}`);
  }
});

check("живая карточка без срока по-прежнему созревает", () => {
  // Fail-open здесь обязателен: карточка без машиночитаемого срока — это
  // та самая, что два дня лежала незамеченной. Правило про закрытые статусы
  // не должно её задеть.
  const root = fixture({
    "content/needs-verification/open.md": "---\nstatus: needs-verification\n---\n",
  });
  eq(listMaturedCards(root, NOON).matured.length, 1, "созревших");
});

check("recheckAt: null у живой карточки читается как «пора»", () => {
  const root = fixture({
    "content/needs-verification/nulldate.md": "---\nrecheckAt: null\nstatus: needs-verification\n---\n",
  });
  eq(listMaturedCards(root, NOON).matured.length, 1, "созревших");
});

// ─── 12. Свежесть инбокса и даты из будущего ───

check("дата из будущего не выдаётся за свежесть", () => {
  // Источник с уехавшими часами давал возраст −60 минут. Проверка свежести
  // устроена как «возраст больше порога», и отрицательное значение проходит
  // её всегда: сутки не обновлявшийся инбокс выглядел бы свежим из-за одной
  // кривой записи, а сторож молчания фетчера молчал бы вместе с ним.
  const future = { link: "f", fetchedAt: new Date(NOON + 60 * 60000).toISOString() };
  const stale = { link: "s", fetchedAt: new Date(NOON - 24 * HOUR).toISOString() };
  eq(inboxFreshnessMinutes([future], NOON), null, "только запись из будущего");
  eq(inboxFreshnessMinutes([future, stale], NOON), 1440, "будущее не перебивает старое");
});

check("свежесть считается по самому свежему item'у", () => {
  const items = [
    { link: "a", fetchedAt: new Date(NOON - 90 * 60000).toISOString() },
    { link: "b", fetchedAt: new Date(NOON - 5 * 60000).toISOString() },
  ];
  eq(inboxFreshnessMinutes(items, NOON), 5, "минут");
});

check("мелкое расхождение часов не отбрасывает item", () => {
  // Допуск в две минуты — на расхождение часов между машинами, а не на
  // ошибку в часовом поясе. Запись «на минуту из будущего» законна.
  const items = [{ link: "a", fetchedAt: new Date(NOON + 60000).toISOString() }];
  eq(inboxFreshnessMinutes(items, NOON), 0, "минут");
});

check("пустой инбокс — свежести нет, а не ноль", () => {
  // null и 0 значат противоположное: «данных нет» против «только что обновилось».
  eq(inboxFreshnessMinutes([], NOON), null, "свежесть");
});

// ─── итог ───

rmSync(box, { recursive: true, force: true });

console.log(`\nпройдено ${passed}, провалено ${failures.length}`);
if (failures.length) {
  for (const f of failures) console.log(`  ✗ ${f.name}: ${f.message}`);
  process.exit(1);
}
