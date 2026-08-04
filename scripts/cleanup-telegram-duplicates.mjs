#!/usr/bin/env node
// Убирает из канала дубли, оставленные аварией 04.08.2026.
//
// ЧТО СЛУЧИЛОСЬ. Переезд адресов обнулил URL-дедуп постера, и все ранее
// отправленные статьи ушли в канал повторно — волнами, потому что несколько
// прогонов очереди редактора работали параллельно. Дедуп починен (теперь
// по слагу), но отправленные дубли остались висеть в канале.
//
// ЧТО ДЕЛАЕТ. Собирает ВСЕ события реестра (легаси-JSON плюс каждая строка
// журнала — там остались messageId всех волн), группирует по слагу,
// оставляет самую раннюю запись — оригинальный пост — и удаляет из канала
// все остальные messageId.
//
// Bot API удаляет сообщения только 48 часов; дубли свежие, все проходят.
// Ошибка «message to delete not found» — штатный ответ на уже удалённое
// вручную, не сбой.
//
//   DRY_RUN=1 node scripts/cleanup-telegram-duplicates.mjs  — только показать
//
// Требует TELEGRAM_BOT_TOKEN и TELEGRAM_CHANNEL — запускается воркфлоу
// cleanup-tg-duplicates.yml, в песочницах секретов нет.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readLog } from "../lib/state-log.mjs";
import { slugOfUrl, POSTED_LOG, POSTED_LEGACY } from "../lib/telegram-posted.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL, DRY_RUN } = process.env;
const dryRun = DRY_RUN === "1" || DRY_RUN === "true";

if (!dryRun && (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHANNEL)) {
  console.error("Нужны TELEGRAM_BOT_TOKEN и TELEGRAM_CHANNEL (или DRY_RUN=1).");
  process.exit(1);
}

// Все события, а не свёрнутое состояние: у одного слага могло быть
// несколько волн дублей, и каждый messageId нужен отдельно.
const events = [];
const legacy = join(ROOT, POSTED_LEGACY);
if (existsSync(legacy)) {
  try {
    for (const [url, rec] of Object.entries(JSON.parse(readFileSync(legacy, "utf8"))?.posted ?? {})) {
      events.push({ url, ...rec });
    }
  } catch {
    // Битый легаси уже пережили — журнал ниже даст свою часть.
  }
}
events.push(...readLog(join(ROOT, POSTED_LOG)).events);

const bySlug = new Map();
for (const e of events) {
  if (!e?.url || !e.messageId) continue;
  const slug = slugOfUrl(e.url);
  (bySlug.get(slug) ?? bySlug.set(slug, []).get(slug)).push(e);
}

const toDelete = [];
for (const [slug, list] of bySlug) {
  list.sort((a, b) => String(a.postedAt).localeCompare(String(b.postedAt)));
  const keep = list[0];
  const dupes = [...new Set(list.slice(1).map((e) => e.messageId))].filter(
    (id) => id !== keep.messageId,
  );
  for (const id of dupes) toDelete.push({ slug, messageId: id, keep: keep.messageId });
}

console.error(`[cleanup] слагов в реестре: ${bySlug.size}, дублей к удалению: ${toDelete.length}`);
for (const d of toDelete) {
  console.error(`   ${d.slug}: удалить message ${d.messageId} (оригинал ${d.keep})`);
}

if (dryRun) {
  console.error("[cleanup] DRY_RUN — ничего не удалено");
  process.exit(0);
}

let okCount = 0;
let gone = 0;
let failed = 0;
for (const d of toDelete) {
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: TELEGRAM_CHANNEL, message_id: d.messageId }),
  });
  const data = await res.json();
  if (data.ok) {
    okCount++;
    console.error(`  ✓ ${d.slug} #${d.messageId}`);
  } else if (/not found|to delete/i.test(data.description ?? "")) {
    gone++;
    console.error(`  – ${d.slug} #${d.messageId}: уже удалено`);
  } else {
    failed++;
    console.error(`  ✗ ${d.slug} #${d.messageId}: ${data.description}`);
  }
  // Пауза против лимитов Bot API — удалений может быть много.
  await new Promise((r) => setTimeout(r, 300));
}

console.error(`[cleanup] удалено ${okCount}, уже отсутствовало ${gone}, ошибок ${failed}`);
process.exit(failed ? 1 : 0);
