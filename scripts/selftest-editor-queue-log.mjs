#!/usr/bin/env node
// Регрессия на журнал очереди редактора. Цена ошибки: потерянный ответ
// владельца (материал стоит вечно) либо повторно заданный вопрос по теме,
// на которую уже ответили — обе аварии в этом проекте уже случались.

import { mkdtempSync, mkdirSync, writeFileSync, appendFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  loadQueue,
  saveQueue,
  snapshot,
  diffToEvents,
  QUEUE_LOG,
  QUEUE_LEGACY,
} from "../lib/editor-queue-log.mjs";

let failed = 0;
const ok = (cond, msg) => {
  console.log((cond ? "  ok  " : "  FAIL ") + msg);
  if (!cond) failed++;
};
const fresh = () => {
  const r = mkdtempSync(join(tmpdir(), "eq-"));
  mkdirSync(join(r, "content/state"), { recursive: true });
  return r;
};
const item = (slug, askedAt, extra = {}) => ({ slug, askedAt, title: slug, messageId: 1, ...extra });

// ── пустое состояние ──────────────────────────────────────────────────
{
  const q = loadQueue(fresh());
  ok(q.pending.length === 0 && q.resolved.length === 0 && q.updateOffset === 0,
     "нет файлов — пустая очередь, а не падение");
}

// ── легаси читается ───────────────────────────────────────────────────
{
  const root = fresh();
  writeFileSync(join(root, QUEUE_LEGACY), JSON.stringify({
    pending: [item("a", "2026-08-04T10:00:00Z")],
    resolved: [{ ...item("b", "2026-08-03T10:00:00Z"), answer: "ок" }],
    updateOffset: 500,
  }));
  const q = loadQueue(root);
  ok(q.pending.length === 1 && q.pending[0].slug === "a", "легаси pending читается");
  ok(q.resolved.length === 1 && q.resolved[0].answer === "ок", "легаси resolved читается с ответом");
  ok(q.updateOffset === 500, "легаси updateOffset читается");
}

// ── четыре типа изменений превращаются в события ──────────────────────
{
  const prev = { pending: [], resolved: [], updateOffset: 0 };
  const next = {
    pending: [item("a", "2026-08-04T10:00:00Z")],
    resolved: [],
    updateOffset: 10,
  };
  const evs = diffToEvents(prev, next, "2026-08-04T10:00:01Z");
  ok(evs.filter((e) => e.ev === "ask").length === 1, "новый вопрос даёт событие ask");
  ok(evs.filter((e) => e.ev === "offset").length === 1, "сдвиг offset даёт событие offset");

  // Напоминание меняет поле у уже стоящего материала — это не новый ask.
  const withRemind = {
    pending: [item("a", "2026-08-04T10:00:00Z", { remindedAt: "2026-08-04T22:00:00Z" })],
    resolved: [],
    updateOffset: 10,
  };
  const evs2 = diffToEvents(next, withRemind);
  ok(evs2.length === 1 && evs2[0].ev === "remind", "напоминание даёт ровно одно событие remind");

  // Ответ переносит материал из pending в resolved.
  const answered = {
    pending: [],
    resolved: [{ ...item("a", "2026-08-04T10:00:00Z"), answer: "ок" }],
    updateOffset: 11,
  };
  const evs3 = diffToEvents(withRemind, answered);
  ok(evs3.some((e) => e.ev === "resolve" && e.answer === "ок"), "ответ даёт событие resolve");
}

// ── полный цикл через файлы ───────────────────────────────────────────
{
  const root = fresh();
  let q = loadQueue(root);
  let snap = snapshot(q);
  q.pending.push(item("a", "2026-08-04T10:00:00Z"));
  q.updateOffset = 100;
  saveQueue(root, snap, q);

  q = loadQueue(root);
  ok(q.pending.length === 1 && q.updateOffset === 100, "вопрос и offset переживают перечитывание");

  snap = snapshot(q);
  const answered = { ...q.pending[0], answer: "ок" };
  q.resolved.push(answered);
  q.pending.splice(0, 1);
  q.updateOffset = 101;
  saveQueue(root, snap, q);

  q = loadQueue(root);
  ok(q.pending.length === 0, "после ответа материал уходит из pending");
  ok(q.resolved.length === 1 && q.resolved[0].answer === "ок", "ответ сохраняется в resolved");
  ok(q.updateOffset === 101, "offset монотонно растёт");
}

// ── второй заход по тому же слагу не затирает первый ──────────────────
{
  const root = fresh();
  let q = loadQueue(root);
  let snap = snapshot(q);
  q.pending.push(item("dup", "2026-08-04T10:00:00Z"));
  saveQueue(root, snap, q);

  q = loadQueue(root);
  snap = snapshot(q);
  q.resolved.push({ ...q.pending[0], answer: "стоп" });
  q.pending.splice(0, 1);
  saveQueue(root, snap, q);

  // Материал доработали и спросили заново — тот же slug, новое время.
  q = loadQueue(root);
  snap = snapshot(q);
  q.pending.push(item("dup", "2026-08-04T14:00:00Z"));
  saveQueue(root, snap, q);

  q = loadQueue(root);
  ok(q.pending.length === 1 && q.pending[0].askedAt === "2026-08-04T14:00:00Z",
     "повторный вопрос по тому же слагу встаёт в pending");
  ok(q.resolved.length === 1 && q.resolved[0].answer === "стоп",
     "первый ответ по этому слагу не потерян — на него опирается scan-pending");
}

// ── склейка merge=union не ломает состояние ───────────────────────────
{
  const root = fresh();
  let q = loadQueue(root);
  const snap = snapshot(q);
  q.pending.push(item("x", "2026-08-04T10:00:00Z"));
  q.updateOffset = 7;
  saveQueue(root, snap, q);

  // union склеивает обе стороны: строки приезжают повторно и вперемешку.
  const log = join(root, QUEUE_LOG);
  const lines = readFileSync(log, "utf8");
  appendFileSync(log, lines);
  appendFileSync(log, JSON.stringify({ ev: "offset", at: "2026-08-04T09:00:00Z", value: 3 }) + "\n");

  const merged = loadQueue(root);
  ok(merged.pending.length === 1, "дублированные строки не удваивают материал в очереди");
  ok(merged.updateOffset === 7, "offset берётся максимальный, старое значение его не откатывает");
}

// ── дозапись строкой, а не переписыванием ─────────────────────────────
{
  const root = fresh();
  const q = loadQueue(root);
  const snap = snapshot(q);
  q.pending.push(item("a", "2026-08-04T10:00:00Z"));
  q.pending.push(item("b", "2026-08-04T10:01:00Z"));
  saveQueue(root, snap, q);
  const lines = readFileSync(join(root, QUEUE_LOG), "utf8").trim().split("\n");
  ok(lines.length === 2, "два вопроса — две строки (append-only, merge=union применим)");

  // Повторный save без изменений не должен плодить события.
  const before = readFileSync(join(root, QUEUE_LOG), "utf8");
  saveQueue(root, snapshot(loadQueue(root)), loadQueue(root));
  ok(readFileSync(join(root, QUEUE_LOG), "utf8") === before, "save без изменений ничего не дописывает");
}

console.log(failed ? `\nпровалено ${failed}` : "\nвсе проверки пройдены");
process.exit(failed ? 1 : 0);
