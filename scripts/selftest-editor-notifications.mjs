#!/usr/bin/env node
// Регрессия на уведомления владельцу. Цена ошибки здесь не в токенах,
// а в доверии: заваленный повторами чат перестают читать, и тогда теряется
// то единственное уведомление, ради которого всё и заводилось.
//
// Обе проверки закрывают жалобы владельца от 09.08.2026:
//
//   1. По материалу, который УЖЕ вышел (полоса ЧП, kind: "revocable"),
//      приходили напоминания раз в два часа с текстом «Материал
//      не публикуется, пока не ответите». Он опубликован — текст неверен
//      по факту. Молчание владельца здесь означает согласие.
//
//   2. Один материал давал ТРИ карточки — ru, uz, en, — каждая со своим
//      уведомлением и своим потоком напоминаний. Ответ и так переносится
//      на все языки: перевод переезжает вместе с оригиналом.
//
// Проверяем не тексты сообщений, а сами правила отбора: кому напоминаем
// и на какие файлы заводим карточку. Тексты меняются, правила — нет.

import { readFileSync, mkdtempSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ROOT } from "../lib/inbox-core.mjs";
import { loadQueue, saveQueue } from "../lib/editor-queue-log.mjs";

let failed = 0;
const ok = (c, m) => {
  if (!c) failed++;
  console.log((c ? "  ok  " : "  FAIL ") + m);
};

const src = readFileSync(join(ROOT, "scripts/editor-queue.mjs"), "utf8");

// ── 1. remind() пропускает уже опубликованное ────────────────────────────
const remindBody = src.slice(src.indexOf("async function remind()"));
const remindLoop = remindBody.slice(0, remindBody.indexOf("console.error"));

ok(
  /if\s*\(item\.kind === "revocable"\)\s*continue;/.test(remindLoop),
  "remind() пропускает kind: revocable — по вышедшему материалу не напоминаем"
);

const revocableIdx = remindLoop.indexOf('item.kind === "revocable"');
const ageIdx = remindLoop.indexOf("const ageH");
ok(
  revocableIdx !== -1 && revocableIdx < ageIdx,
  "отсечка стоит ДО расчёта возраста — ни одна ветка напоминания её не обходит"
);

// Запись обязана остаться в очереди: по ней ловится реплай «стоп».
ok(
  !/revocable[^]{0,200}?splice|filter\(\s*\(?i\)?\s*=>\s*i\.kind !== "revocable"/.test(remindLoop),
  "revocable не удаляется из очереди — иначе потеряется право отзыва"
);

// ── 2. scanPending() не заводит карточку на языковую версию ──────────────
const scanBody = src.slice(src.indexOf("async function scanPending()"));

ok(
  /if\s*\(\/\\\.\(uz\|en\)\\\.mdx\$\/\.test\(name\)\)\s*continue;/.test(scanBody),
  "scanPending() пропускает <slug>.uz.mdx и <slug>.en.mdx"
);

const langIdx = scanBody.indexOf("(uz|en)");
const slugIdx = scanBody.indexOf('const slug = name.replace');
ok(
  langIdx !== -1 && langIdx < slugIdx,
  "отсечка стоит ДО вычисления слага — иначе в очередь попадёт слаг вида «<slug>.uz»"
);

// ── 3. Ответ «ок» по-прежнему переносит переводы ─────────────────────────
// Пропуск языковых версий при опросе законен ровно потому, что ответ
// применяется ко всем языкам. Если этот перенос уберут, п.2 превратится
// в потерю переводов — поэтому связка проверяется здесь же.
ok(
  /for \(const lang of \["uz", "en"\]\)/.test(src),
  "перенос языковых версий вместе с оригиналом на месте — основание для п.2"
);

// ── 4. Регрессия формулировки: revocable говорит «отвечать не нужно» ─────
ok(
  /Отвечать не нужно, материал уже опубликован/.test(src),
  "уведомление о вышедшем материале прямо говорит, что ответ не требуется"
);

// ── 5. Уборка обязана переживать перезагрузку очереди ───────────────────
// Журнал очереди — лог событий, и выйти из pending запись может ровно одним
// способом: событием resolve. Первая версия уборки языковых дублей просто
// вырезала элементы из массива pending — diffToEvents не находил для них
// события, и после перезагрузки возвращались все двенадцать. В консоли
// «убрано 12», в очереди по-прежнему 25. Тихий холостой ход.
{
  const root = mkdtempSync(join(tmpdir(), "queue-prune-"));
  mkdirSync(join(root, "content/state"), { recursive: true });

  let q = loadQueue(root);
  const prev0 = JSON.parse(JSON.stringify(q));
  q.pending = [
    { slug: "topic", title: "Оригинал", askedAt: new Date().toISOString(), messageId: 1 },
    { slug: "topic.uz", title: "Uz", askedAt: new Date().toISOString(), messageId: 2 },
    { slug: "topic.en", title: "En", askedAt: new Date().toISOString(), messageId: 3 },
  ];
  saveQueue(root, prev0, q);
  ok(loadQueue(root).pending.length === 3, "три карточки записались в журнал");

  // Неправильный способ: просто выкинуть из pending.
  const before = loadQueue(root);
  const naive = JSON.parse(JSON.stringify(before));
  naive.pending = naive.pending.filter((i) => !/\.(uz|en)$/.test(i.slug));
  saveQueue(root, before, naive);
  ok(
    loadQueue(root).pending.length === 3,
    "вырезание из pending НЕ сохраняется — ловушка, ради которой этот тест"
  );

  // Правильный способ: закрыть как решённые.
  const before2 = loadQueue(root);
  const proper = JSON.parse(JSON.stringify(before2));
  const drop = proper.pending.filter((i) => /\.(uz|en)$/.test(i.slug));
  proper.pending = proper.pending.filter((i) => !/\.(uz|en)$/.test(i.slug));
  proper.resolved = [
    ...(proper.resolved ?? []),
    ...drop.map((i) => ({ ...i, answer: { kind: "superseded" } })),
  ];
  saveQueue(root, before2, proper);

  const after = loadQueue(root);
  ok(after.pending.length === 1, "после закрытия в очереди остаётся один вопрос");
  ok(after.pending[0].slug === "topic", "остаётся именно оригинал, а не перевод");
  ok(after.resolved.length === 2, "языковые карточки лежат в resolved, а не пропали");
}

console.log(failed ? `\n${failed} проверок упало` : "\nвсе проверки прошли");
process.exit(failed ? 1 : 0);
