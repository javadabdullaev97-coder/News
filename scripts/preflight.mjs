#!/usr/bin/env node
// Preflight планёрки: есть ли вообще работа?
//
// Зачем. При заходах каждые 20 минут большинство прогонов пустые: инбокс
// не рос, rework пуст, карточки не созрели. Раньше это выяснялось уже ПОСЛЕ
// того, как модель прочитала спецификацию, редполитику, четыре конфига и
// журнал тем — около 200 КБ на вопрос, ответ на который «работы нет».
//
// Теперь на вопрос отвечает скрипт: три числа, доли секунды, ноль токенов.
// Планёрка читает инструкции только если работа есть.
//
// Выход — JSON в stdout. Код возврата ВСЕГДА 0, даже когда работы нет:
// «нечего делать» — это штатный ответ, а не сбой, и путать их нельзя.
// Решение принимается по полю hasWork.
//
// Запускается в свежем клоне до npm install — внешних зависимостей нет.
//
// Использование:
//   node scripts/preflight.mjs            — JSON
//   node scripts/preflight.mjs --human    — то же плюс человекочитаемая сводка в stderr

import {
  ROOT,
  itemAgeHours,
  loadJournal,
  readInbox,
  selectFresh,
  listRework,
  listMaturedCards,
  tashkentDay,
} from "../lib/inbox-core.mjs";

const human = process.argv.includes("--human");
const at = Date.now();

const journal = loadJournal(ROOT, at);
const local = readInbox(ROOT, { world: false, at });
const world = readInbox(ROOT, { world: true, at });
const localSel = selectFresh(local.items, { seen: journal.blocked, claimed: journal.claimed, at });
const worldSel = selectFresh(world.items, { seen: journal.blocked, claimed: journal.claimed, at });
const rework = listRework(ROOT);
const cards = listMaturedCards(ROOT, at);

// Мировые темы сами по себе поводом будить Opus не считаются: у них
// собственный высокий барьер (три независимых блока плюс признак
// значимости), и прогон ради одних только мировых кандидатов почти всегда
// заканчивается ничем. Но если работа уже есть — они идут в тот же прогон.
const reasons = [];
if (rework.length) reasons.push(`rework: ${rework.length} материал(ов) на переделке`);
if (cards.matured.length) reasons.push(`needs-verification: ${cards.matured.length} карточк(и) созрели`);
if (localSel.stats.fresh) reasons.push(`inbox: ${localSel.stats.fresh} новых item(ов)`);

// Возраст самого свежего item'а в инбоксе — единственный честный признак
// того, что фетчер жив.
//
// Зачем отдельно. Heartbeat, который следит за этим по расписанию, сам
// живёт на GitHub Actions — и когда встают все планировщики разом, он встаёт
// вместе с ними и промолчит. Ровно это случилось 3 августа: с 01:16 до 03:25
// в репозитории не отработала ни одна плановая задача, и никто не узнал.
// Сторож, который умирает вместе с системой, — не сторож.
//
// Планёрка приходит по расписанию code.claude.com, независимому от GitHub.
// Она и есть внешний наблюдатель — единственный, кто способен заметить,
// что GitHub замолчал целиком.
const allItems = [...local.items, ...world.items];
let newestAgeMinutes = null;
for (const it of allItems) {
  const age = itemAgeHours(it, at);
  if (age === null) continue;
  const min = age * 60;
  if (newestAgeMinutes === null || min < newestAgeMinutes) newestAgeMinutes = min;
}
newestAgeMinutes = newestAgeMinutes === null ? null : Math.round(newestAgeMinutes);

// Порог. Фетчер ходит по два раза в 20-минутное окно, так что при живом
// GitHub свежесть держится в пределах получаса. Час — это уже пропущено
// минимум три захода подряд, случайностью не объясняется.
const FETCHER_SILENT_AFTER_MIN = 60;
const fetcherSilent =
  newestAgeMinutes !== null && newestAgeMinutes > FETCHER_SILENT_AFTER_MIN;

const warnings = [];
if (fetcherSilent) {
  warnings.push(
    `ФЕТЧЕР МОЛЧИТ: самому свежему item'у ${newestAgeMinutes} мин. ` +
      "Похоже, встали GitHub Actions — проверь вкладку Actions и лимит минут. " +
      "Сообщи владельцу: сам он об этом не узнает, heartbeat стоит вместе с остальными.",
  );
}
if (!journal.ok) warnings.push(journal.note);
if (journal.badLines) warnings.push(`журнал: ${journal.badLines} битых строк пропущено`);
if (local.badLines) warnings.push(`inbox: ${local.badLines} битых строк пропущено`);
if (world.badLines) warnings.push(`world-inbox: ${world.badLines} битых строк пропущено`);
if (!local.files.length) warnings.push("инбокса за сегодня и вчера нет — фетчер молчит?");

const report = {
  hasWork: reasons.length > 0,
  reasons,
  tashkentDay: tashkentDay(at),
  generatedAt: new Date(at).toISOString(),
  inbox: {
    files: local.files,
    newestAgeMinutes,
    fetcherSilent,
    ...localSel.stats,
  },
  world: {
    files: world.files,
    ...worldSel.stats,
    note: "мировые кандидаты сами по себе прогон не запускают — берутся, если прогон уже идёт",
  },
  rework,
  cards: {
    matured: cards.matured,
    waitingCount: cards.waiting.length,
    nextDueInHours: cards.waiting.length
      ? Math.min(...cards.waiting.map((c) => c.inHours))
      : null,
  },
  journal: {
    done: journal.done.size,
    claimedByOthers: journal.claimed.size,
    runFiles: journal.files.length,
    ok: journal.ok,
  },
  warnings,
};

process.stdout.write(JSON.stringify(report, null, 2) + "\n");

if (human) {
  const l = report.inbox;
  console.error(
    `[preflight] ${report.hasWork ? "РАБОТА ЕСТЬ" : "работы нет"} · ` +
      `inbox ${l.fresh} новых из ${l.raw} (дублей ${l.duplicates}, виденных ${l.alreadySeen}, старых ${l.stale}) · ` +
      `world ${report.world.fresh} новых из ${report.world.raw} · ` +
      `rework ${rework.length} · карточек созрело ${cards.matured.length}, ждёт ${cards.waiting.length}` +
      (journal.claimed.size ? ` · занято соседом ${journal.claimed.size} ссыл.` : "") +
      (newestAgeMinutes === null ? "" : ` · свежесть инбокса ${newestAgeMinutes} мин`),
  );
  for (const w of warnings) console.error(`[preflight] WARN: ${w}`);
}
