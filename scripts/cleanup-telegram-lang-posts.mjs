#!/usr/bin/env node
// Убирает из русского канала посты переводов, ушедшие туда по ошибке.
//
// ЧТО СЛУЧИЛОСЬ. 04.08.2026 в content/posts появились языковые версии
// (<slug>.uz.mdx, <slug>.en.mdx). Постер брал ВСЕ .mdx подряд и счёл их
// новыми материалами: в русский канал ушли 28 постов на узбекском
// и английском. Хуже того, ссылки в них мёртвые — суффикс языка попал
// в слаг: /ru/2026/08/04/<slug>.en.
//
// Причина устранена в post-to-telegram.mjs (переводы больше не попадают
// в обход языка канала). Этот скрипт убирает последствия.
//
// ЧТО ДЕЛАЕТ. Находит в реестре записи, чей URL кончается на `.uz` или
// `.en`, удаляет соответствующие сообщения из канала и помечает записи
// как отозванные — чтобы дедуп не считал материал отправленным.
//
//   DRY_RUN=1 node scripts/cleanup-telegram-lang-posts.mjs   — только показать
//
// Bot API удаляет сообщения 48 часов; посты свежие, проходят все.
// «message to delete not found» — штатный ответ на уже удалённое вручную.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { appendLog, readLog } from "../lib/state-log.mjs";
import { POSTED_LOG, POSTED_LEGACY } from "../lib/telegram-posted.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL, DRY_RUN } = process.env;
const dryRun = DRY_RUN === "1" || DRY_RUN === "true";

if (!dryRun && (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHANNEL)) {
  console.error("Нужны TELEGRAM_BOT_TOKEN и TELEGRAM_CHANNEL (или DRY_RUN=1).");
  process.exit(1);
}

const LANG_TAIL = /\.(uz|en)$/;

const events = [];
const legacy = join(ROOT, POSTED_LEGACY);
if (existsSync(legacy)) {
  try {
    for (const [url, rec] of Object.entries(JSON.parse(readFileSync(legacy, "utf8"))?.posted ?? {})) {
      events.push({ url, ...rec });
    }
  } catch {
    // журнал ниже даст свою часть
  }
}
events.push(...readLog(join(ROOT, POSTED_LOG)).events);

const targets = [];
const seen = new Set();
for (const e of events) {
  if (!e?.url || !e.messageId || e.revokedAt) continue;
  if (!LANG_TAIL.test(e.url)) continue;
  if (seen.has(e.messageId)) continue;
  seen.add(e.messageId);
  targets.push({ url: e.url, messageId: e.messageId });
}

console.error(`[cleanup-lang] постов переводов в русском канале: ${targets.length}`);
for (const t of targets) console.error(`   #${t.messageId} ${t.url}`);

if (dryRun) {
  console.error("[cleanup-lang] DRY_RUN — ничего не удалено");
  process.exit(0);
}

let okCount = 0;
let gone = 0;
let failed = 0;
for (const t of targets) {
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: TELEGRAM_CHANNEL, message_id: t.messageId }),
  });
  const data = await res.json();
  if (data.ok) {
    okCount++;
    console.error(`  ✓ #${t.messageId}`);
  } else if (/not found|to delete/i.test(data.description ?? "")) {
    gone++;
    console.error(`  – #${t.messageId}: уже удалено`);
  } else {
    failed++;
    console.error(`  ✗ #${t.messageId}: ${data.description}`);
    continue;
  }
  // Отзыв в реестре: иначе запись продолжает означать «этот материал
  // отправлен», и дедуп молча пропустит его, когда появится свой канал.
  appendLog(join(ROOT, POSTED_LOG), {
    url: t.url,
    messageId: t.messageId,
    revokedAt: new Date().toISOString(),
    reason: "wrong-channel-language",
  });
  await new Promise((r) => setTimeout(r, 300));
}

console.error(`[cleanup-lang] удалено ${okCount}, уже отсутствовало ${gone}, ошибок ${failed}`);
process.exit(failed ? 1 : 0);
