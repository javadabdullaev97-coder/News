#!/usr/bin/env node
// Регрессия на журнальное состояние. Каждый пункт закрывает конкретный риск
// перехода telegram-posted.json → .jsonl. Цена ошибки здесь выше, чем в
// инбоксе: потерянная запись означает повторный пост в канал, который увидят
// подписчики.

import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { appendLog, foldByKey, readLog } from "../lib/state-log.mjs";
import { loadPosted, markPosted, POSTED_LOG, POSTED_LEGACY } from "../lib/telegram-posted.mjs";

let failed = 0;
const ok = (cond, msg) => {
  console.log((cond ? "  ok  " : "  FAIL ") + msg);
  if (!cond) failed++;
};
const fresh = () => {
  const r = mkdtempSync(join(tmpdir(), "statelog-"));
  mkdirSync(join(r, "content/state"), { recursive: true });
  return r;
};

// ── журнал как таковой ────────────────────────────────────────────────
{
  const root = fresh();
  const p = join(root, "content/state/x.jsonl");
  ok(readLog(p).events.length === 0, "нет файла — пустой журнал, а не падение");

  appendLog(p, { k: "a", at: "2026-08-04T10:00:00Z" });
  appendLog(p, { k: "b", at: "2026-08-04T10:01:00Z" });
  ok(readLog(p).events.length === 2, "дописывание не затирает предыдущее событие");

  // Битая строка: реальный сценарий — оборванная запись при убитом процессе.
  writeFileSync(p, readFileSync(p, "utf8") + "{сломанная строка\n");
  const r = readLog(p);
  ok(r.events.length === 2 && r.badLines === 1, "битая строка пропускается, журнал жив");
}

// ── сворачивание ──────────────────────────────────────────────────────
{
  const events = [
    { url: "u1", messageId: 1, postedAt: "2026-08-04T10:00:00Z" },
    { url: "u2", messageId: 2, postedAt: "2026-08-04T10:05:00Z" },
    // Дубль после merge=union: та же строка приехала с обеих сторон.
    { url: "u1", messageId: 1, postedAt: "2026-08-04T10:00:00Z" },
  ];
  const m = foldByKey(events, (e) => e.url, (e) => e.postedAt);
  ok(m.size === 2, "дубли после merge=union схлопываются");

  // Порядок строк после склейки не отражает порядок событий — побеждать
  // должна поздняя метка времени, а не последняя позиция в файле.
  const m2 = foldByKey(
    [
      { url: "u", messageId: 9, postedAt: "2026-08-04T12:00:00Z" },
      { url: "u", messageId: 5, postedAt: "2026-08-04T09:00:00Z" },
    ],
    (e) => e.url,
    (e) => e.postedAt,
  );
  ok(m2.get("u").messageId === 9, "при склейке побеждает событие с поздней меткой");
}

// ── реестр отправленных ───────────────────────────────────────────────
{
  const root = fresh();
  ok(loadPosted(root).size === 0, "пустой реестр — не падение");

  // Главный риск выката: старый JSON обязан читаться, иначе первый же
  // прогон отправит в канал заново все ранее опубликованные статьи.
  writeFileSync(
    join(root, POSTED_LEGACY),
    JSON.stringify({ posted: { "https://leap.uz/article/a": { messageId: 7, postedAt: "2026-08-01T00:00:00Z" } } }),
  );
  ok(loadPosted(root).get("https://leap.uz/article/a")?.messageId === 7, "легаси-JSON читается");

  markPosted(root, { url: "https://leap.uz/article/b", messageId: 8 });
  const m = loadPosted(root);
  ok(m.size === 2, "журнал дополняет легаси, а не заменяет его");
  ok(m.has("https://leap.uz/article/a"), "старая запись переживает первую дозапись");

  // Битый легаси не должен обнулять реестр молча — журнальная часть остаётся.
  writeFileSync(join(root, POSTED_LEGACY), "{не json");
  ok(loadPosted(root).has("https://leap.uz/article/b"), "битый легаси не роняет журнал");
}

// ── дозапись идёт строкой, а не переписыванием файла ──────────────────
{
  const root = fresh();
  markPosted(root, { url: "u1", messageId: 1 });
  markPosted(root, { url: "u2", messageId: 2 });
  const lines = readFileSync(join(root, POSTED_LOG), "utf8").trim().split("\n");
  ok(lines.length === 2, "две отправки — две строки (append-only, merge=union применим)");
}

console.log(failed ? `\nпровалено ${failed}` : "\nвсе проверки пройдены");
process.exit(failed ? 1 : 0);
