#!/usr/bin/env node
// Убирает из каналов дубли одного и того же материала.
//
// ПЕРЕПИСАН 17.08.2026 ПОД НЕСКОЛЬКО КАНАЛОВ. Прежняя версия группировала
// записи по одному слагу и удаляла все сообщения, кроме самого раннего, из
// канала TELEGRAM_CHANNEL. С появлением языковых и профильных каналов это
// стало опасно: у одного слага теперь ЗАКОННО существует до шести отправок —
// русская, узбекская и английская версии в основном канале плюс те же в
// спортивном или технологическом. Старая логика посчитала бы пять из них
// дублями и попыталась удалить чужие message_id в основном канале, а
// нумерация сообщений у каждого канала своя — то есть удалила бы
// произвольные посты, случайно совпавшие по номеру.
//
// Теперь ключ группировки — тройка (канал, язык, слаг), и удаление идёт
// в том канале, куда сообщение было отправлено.
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
const {
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHANNEL,
  TELEGRAM_CHANNEL_UZ,
  TELEGRAM_CHANNEL_SPORT,
  TELEGRAM_CHANNEL_SPORT_UZ,
  TELEGRAM_CHANNEL_TECH,
  TELEGRAM_CHANNEL_TECH_UZ,
  DRY_RUN,
} = process.env;
const dryRun = DRY_RUN === "1" || DRY_RUN === "true";

if (!dryRun && (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHANNEL)) {
  console.error("Нужны TELEGRAM_BOT_TOKEN и TELEGRAM_CHANNEL (или DRY_RUN=1).");
  process.exit(1);
}

// Куда какая запись реестра была отправлена. Ключ — target из записи
// (main по умолчанию для всего, что писалось до появления профильных
// каналов) плюс язык, вычисленный из адреса статьи.
const CHANNELS = {
  "main\u0000ru": TELEGRAM_CHANNEL,
  "main\u0000uz": TELEGRAM_CHANNEL_UZ,
  "sport\u0000ru": TELEGRAM_CHANNEL_SPORT,
  "sport\u0000uz": TELEGRAM_CHANNEL_SPORT_UZ,
  "tech\u0000ru": TELEGRAM_CHANNEL_TECH,
  "tech\u0000uz": TELEGRAM_CHANNEL_TECH_UZ,
};

// Язык из адреса: https://leap.uz/<lang>/2026/08/17/<slug>.
function langOfUrl(url) {
  const m = String(url).match(/^https?:\/\/[^/]+\/([a-z]{2})\//);
  return m ? m[1] : "ru";
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

// Отозванные записи в счёт не идут: сообщения уже нет в канале.
const revoked = new Set();
for (const e of events) {
  if (e?.ev === "revoked" && e.messageId) revoked.add(`${e.target ?? "main"}\u0000${e.messageId}`);
}

const byPost = new Map();
for (const e of events) {
  if (!e?.url || !e.messageId || e.ev === "revoked") continue;
  const target = e.target ?? "main";
  const lang = langOfUrl(e.url);
  if (revoked.has(`${target}\u0000${e.messageId}`)) continue;
  const key = `${target}\u0000${lang}\u0000${slugOfUrl(e.url)}`;
  (byPost.get(key) ?? byPost.set(key, []).get(key)).push({ ...e, target, lang });
}

const toDelete = [];
for (const [key, list] of byPost) {
  const [target, lang, slug] = key.split("\u0000");
  list.sort((a, b) => String(a.postedAt).localeCompare(String(b.postedAt)));
  const keep = list[0];
  const dupes = [...new Set(list.slice(1).map((e) => e.messageId))].filter(
    (id) => id !== keep.messageId,
  );
  for (const id of dupes) {
    toDelete.push({ slug, lang, target, messageId: id, keep: keep.messageId });
  }
}

console.error(
  `[cleanup] отправок в реестре: ${byPost.size}, дублей к удалению: ${toDelete.length}`,
);
for (const d of toDelete) {
  console.error(
    `   ${d.slug} [${d.target}/${d.lang}]: удалить message ${d.messageId} (оригинал ${d.keep})`,
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
  const chat = CHANNELS[`${d.target}\u0000${d.lang}`];
  if (!chat) {
    // Канала для этой пары нет в секретах — трогать чужую нумерацию нельзя.
    failed++;
    console.error(`  ✗ ${d.slug} [${d.target}/${d.lang}] #${d.messageId}: канал не задан в секретах`);
    continue;
  }
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chat, message_id: d.messageId }),
  });
  const data = await res.json();
  if (data.ok) {
    okCount++;
    console.error(`  ✓ ${d.slug} [${d.target}/${d.lang}] #${d.messageId}`);
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
