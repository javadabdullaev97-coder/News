#!/usr/bin/env node
// Регрессия на бронь отправки. Цена ошибки здесь несимметрична и обе
// стороны настоящие: бронь не держит — подписчики получают одно и то же
// по три раза (17.08.2026, курс доллара, сообщения 224–226); бронь не
// снимается после явного отказа Telegram — материал не уйдёт никогда.

import { mkdtempSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  reservePost,
  releaseReservation,
  markPosted,
  isPostedNow,
} from "../lib/telegram-posted.mjs";

let failed = 0;
const ok = (cond, msg) => {
  console.log((cond ? "  ok  " : "  FAIL ") + msg);
  if (!cond) failed++;
};

const fresh = () => {
  const r = mkdtempSync(join(tmpdir(), "tgres-"));
  mkdirSync(join(r, "content/state"), { recursive: true });
  return r;
};

const URL_RU = "https://leap.uz/ru/2026/08/17/usd-rate-min-2023";
const URL_UZ = "https://leap.uz/uz/2026/08/17/usd-rate-min-2023";

// ── бронь занимает позицию ────────────────────────────────────────────
{
  const root = fresh();
  ok(!isPostedNow(root, "uz", "usd-rate-min-2023"), "до брони материал считается неотправленным");

  reservePost(root, { url: URL_UZ });
  const held = isPostedNow(root, "uz", "usd-rate-min-2023");
  ok(Boolean(held), "бронь считается занятой позицией — повторной отправки не будет");
  ok(held?.messageId === null, "у брони нет messageId: это ещё не пост");
}

// ── успешная отправка перекрывает бронь ───────────────────────────────
{
  const root = fresh();
  reservePost(root, { url: URL_UZ });
  markPosted(root, { url: URL_UZ, messageId: 227 });
  const rec = isPostedNow(root, "uz", "usd-rate-min-2023");
  ok(rec?.messageId === 227, "после отправки в реестре стоит настоящий messageId");
}

// ── явный отказ снимает бронь ─────────────────────────────────────────
{
  const root = fresh();
  reservePost(root, { url: URL_UZ });
  releaseReservation(root, { url: URL_UZ, reason: "send-rejected: chat not found" });
  ok(
    !isPostedNow(root, "uz", "usd-rate-min-2023"),
    "снятая бронь освобождает материал — следующий прогон отправит его",
  );
}

// ── каналы независимы ─────────────────────────────────────────────────
{
  const root = fresh();
  reservePost(root, { url: URL_UZ, target: "tech" });
  ok(
    !isPostedNow(root, "uz", "usd-rate-min-2023"),
    "бронь в профильном канале не блокирует основной",
  );
  ok(
    Boolean(isPostedNow(root, "uz", "usd-rate-min-2023", "tech")),
    "и наоборот — в своём канале бронь видна",
  );
}

// ── языки независимы ──────────────────────────────────────────────────
{
  const root = fresh();
  reservePost(root, { url: URL_RU });
  ok(Boolean(isPostedNow(root, "ru", "usd-rate-min-2023")), "русская бронь стоит");
  ok(
    !isPostedNow(root, "uz", "usd-rate-min-2023"),
    "узбекская версия — другой канал и другие подписчики, бронь её не трогает",
  );
}

console.log(failed ? `\nпровалено ${failed}` : "\nвсе проверки пройдены");
process.exit(failed ? 1 : 0);
