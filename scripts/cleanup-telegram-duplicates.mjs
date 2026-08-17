#!/usr/bin/env node
// Убирает из каналов дубли: повторные отправки одного материала.
//
// ПЕРЕПИСАН 17.08.2026. Прежняя версия группировала записи по одному слагу,
// игнорируя язык и канал, и удаляла все «лишние» messageId из одного
// TELEGRAM_CHANNEL. С появлением узбекского и профильных каналов это стало
// опасным: идентификаторы сообщений в Telegram нумеруются ПО ЧАТУ, поэтому
// узбекский пост #212 и спортивный #49 считались дублями русского, а команда
// на удаление уходила в основной канал — где под этими номерами лежат
// совершенно другие материалы. Запуск чистильщика удалил бы посторонние посты.
//
// Теперь дубль определяется тройкой «канал + язык + слаг», и удаление идёт
// ровно в тот чат, где сообщение было отправлено.
//
// Историческая справка — авария 04.08.2026, ради которой скрипт заводился:
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

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { appendLog } from "../lib/state-log.mjs";
import { loadPostedAll, resolveChannels, POSTED_LOG } from "../lib/telegram-posted.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const { TELEGRAM_BOT_TOKEN, DRY_RUN } = process.env;
const dryRun = DRY_RUN === "1" || DRY_RUN === "true";

if (!dryRun && !TELEGRAM_BOT_TOKEN) {
  console.error("Нужен TELEGRAM_BOT_TOKEN (или DRY_RUN=1).");
  process.exit(1);
}

const CHANNELS = resolveChannels();

// Живые отправки по каждому каналу. Отозванные записи сюда не попадают:
// материал уже снят, удалять в канале нечего.
const groups = loadPostedAll(ROOT);

const toDelete = [];
for (const [key, list] of groups) {
  if (list.length < 2) continue;
  const [target, lang, slug] = key.split(" ");
  const keep = list[0];                       // самая ранняя — оригинал
  const seen = new Set([keep.messageId]);
  for (const rec of list.slice(1)) {
    if (!rec.messageId || seen.has(rec.messageId)) continue;
    seen.add(rec.messageId);
    toDelete.push({
      target, lang, slug,
      url: rec.url,
      messageId: rec.messageId,
      keep: keep.messageId,
    });
  }
}

console.error(
  `[cleanup] групп отправки: ${groups.size}, дублей к удалению: ${toDelete.length}`,
);
for (const d of toDelete) {
  console.error(
    `   ${d.target}/${d.lang} ${d.slug}: удалить #${d.messageId} (оригинал #${d.keep})`,
  );
}

if (dryRun) {
  console.error("[cleanup] DRY_RUN — ничего не удалено");
  process.exit(0);
}

let okCount = 0;
let gone = 0;
let failed = 0;
for (const d of toDelete) {
  // Чат — тот, в который сообщение реально ушло. Раньше здесь стоял один
  // TELEGRAM_CHANNEL, и это удаляло посторонние посты с совпавшим номером.
  const chat = CHANNELS[d.target]?.[d.lang];
  if (!chat) {
    failed++;
    console.error(`  ✗ ${d.target}/${d.lang} #${d.messageId}: канал не задан — пропуск`);
    continue;
  }
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chat, message_id: d.messageId }),
  });
  const data = await res.json();
  const removed = data.ok;
  const alreadyGone = !removed && /not found|to delete/i.test(data.description ?? "");
  if (removed) {
    okCount++;
    console.error(`  ✓ ${d.target}/${d.lang} ${d.slug} #${d.messageId}`);
  } else if (alreadyGone) {
    gone++;
    console.error(`  – ${d.target}/${d.lang} ${d.slug} #${d.messageId}: уже удалено`);
  } else {
    failed++;
    console.error(`  ✗ ${d.target}/${d.lang} ${d.slug} #${d.messageId}: ${data.description}`);
    continue; // пост жив — запись не трогаем
  }
  // Отзываем запись о дубле. Без этого реестр продолжает считать материал
  // отправленным дважды, и следующий прогон чистильщика ходит по кругу.
  const revoke = {
    url: d.url,
    messageId: d.messageId,
    revokedAt: new Date().toISOString(),
    reason: "duplicate-cleanup",
  };
  if (d.target !== "main") revoke.target = d.target;
  appendLog(join(ROOT, POSTED_LOG), revoke);
  // Пауза против лимитов Bot API — удалений может быть много.
  await new Promise((r) => setTimeout(r, 300));
}

console.error(`[cleanup] удалено ${okCount}, уже отсутствовало ${gone}, ошибок ${failed}`);
process.exit(failed ? 1 : 0);
