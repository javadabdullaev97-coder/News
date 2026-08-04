#!/usr/bin/env node
// Снимает из канала все посты одного языка и помечает их отозванными,
// чтобы автопост отправил материалы заново.
//
// ЗАЧЕМ. Формат поста меняется — подпись, футер, порядок строк, — и в уже
// отправленных постах он остаётся прежним: Telegram не редактирует их сам.
// Для старого канала с историей это терпимо, для только что заведённого нет:
// 05.08.2026 первые 11 постов @leap_news_uz ушли с русской строкой
// «Читать полностью на leap.uz» под узбекским текстом. Проще снять и
// отправить заново, чем оставить канал разноязычным с первого дня.
//
// Отзыв в реестре обязателен: без него дедуп считает материал отправленным
// и повторной отправки не будет.
//
//   LANG=uz node scripts/revoke-lang-posts.mjs
//   LANG=uz DRY_RUN=1 node scripts/revoke-lang-posts.mjs
//
// Bot API удаляет сообщения 48 часов. Что старше — останется в канале,
// и это осознанное ограничение: инструмент для свежих каналов и свежих
// правок формата, а не для переписывания истории.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { appendLog } from "../lib/state-log.mjs";
import { loadPostedByLangSlug, POSTED_LOG } from "../lib/telegram-posted.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const { TELEGRAM_BOT_TOKEN, LANG, DRY_RUN } = process.env;
const dryRun = DRY_RUN === "1" || DRY_RUN === "true";
const lang = LANG || "uz";

// Канал того же языка, что и посты: удалять сообщение нужно там, где оно лежит.
const CHANNEL = {
  ru: process.env.TELEGRAM_CHANNEL,
  uz: process.env.TELEGRAM_CHANNEL_UZ,
}[lang];

if (!dryRun && (!TELEGRAM_BOT_TOKEN || !CHANNEL)) {
  console.error(`Нужны TELEGRAM_BOT_TOKEN и канал для языка ${lang} (или DRY_RUN=1).`);
  process.exit(1);
}

const targets = [];
for (const [key, rec] of loadPostedByLangSlug(ROOT)) {
  if (!key.startsWith(`${lang} `) || !rec.messageId) continue;
  targets.push({ key, url: rec.url, messageId: rec.messageId });
}

console.error(`[revoke-lang] ${lang}: постов к снятию ${targets.length}`);
for (const t of targets) console.error(`   #${t.messageId} ${t.url}`);

if (dryRun) {
  console.error("[revoke-lang] DRY_RUN — ничего не удалено");
  process.exit(0);
}

let okCount = 0;
let gone = 0;
let failed = 0;
for (const t of targets) {
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: CHANNEL, message_id: t.messageId }),
  });
  const data = await res.json();
  if (data.ok) {
    okCount++;
  } else if (/not found|to delete/i.test(data.description ?? "")) {
    gone++;
  } else {
    failed++;
    console.error(`  ✗ #${t.messageId}: ${data.description}`);
    continue; // не отзываем запись: пост остался в канале, повтор дал бы дубль
  }
  appendLog(join(ROOT, POSTED_LOG), {
    url: t.url,
    messageId: t.messageId,
    revokedAt: new Date().toISOString(),
    reason: "format-change",
  });
  await new Promise((r) => setTimeout(r, 300));
}

console.error(`[revoke-lang] снято ${okCount}, уже отсутствовало ${gone}, ошибок ${failed}`);
process.exit(failed ? 1 : 0);
