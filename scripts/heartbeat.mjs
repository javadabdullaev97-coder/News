#!/usr/bin/env node
// Heartbeat — раз в час смотрит state-файлы конвейера и алертит
// в Telegram-чат редактора, если что-то молчит слишком долго.
//
// Три канала «зелёная галка ≠ живой»:
//
// 1. Фетчер news-inbox падает на 429/403, но `continue-on-error: true`
//    в workflow даёт зелёный статус. Единственный сигнал — что новых
//    записей в content/inbox/<today>.jsonl не появляется. Смотрим
//    mtime; если >2ч без обновлений в рабочее время — алерт.
//
// 2. Планёрка не запустилась (harness code.claude.com упал, сессия
//    зависла, cron не сработал). content/state/last-routine-run.json
//    не обновляется. Если >6ч без обновлений — алерт.
//
// 3. Материал в editor-queue.pending стоит >24ч без ответа. Редактор
//    забыл, поехал в отпуск, или напоминание из editor-queue.mjs
//    (mode: remind) не проходит.
//
// Anti-spam: state-файл content/state/heartbeat-alerts.json помнит,
// когда был последний алерт по каждому каналу; повторный не шлём
// раньше чем через ALERT_COOLDOWN_HOURS.
//
// ENV:
//   TELEGRAM_BOT_TOKEN       — тот же бот
//   TELEGRAM_EDITOR_CHAT_ID  — куда слать алерт
//   DRY_RUN=1                — только напечатать, не слать и не писать state

import {
  existsSync,
  statSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const STATE_DIR = join(ROOT, "content/state");
const HEARTBEAT_STATE = join(STATE_DIR, "heartbeat-alerts.json");

const { TELEGRAM_BOT_TOKEN, TELEGRAM_EDITOR_CHAT_ID, DRY_RUN } = process.env;
const dryRun = DRY_RUN === "1" || DRY_RUN === "true";

const ALERT_COOLDOWN_HOURS = 6;
const INBOX_STALE_HOURS = 2;
const ROUTINE_STALE_HOURS = 6;
const QUEUE_STALE_HOURS = 24;

// Раньше здесь была функция isTashkentQuietNow(): с 23:00 до 07:00 Ташкента
// алерты по инбоксу глушились с обоснованием «планёрка спит, RSS лениво».
// Обоснование неверно — ничего не спит: планёрка запускается раз в час
// круглосуточно, фетчер ходит каждые полчаса (news-inbox.yml, "5,35" и
// "20,50" без ограничения по часам). Владелец подтвердил 3 августа: окон нет,
// работаем 24/7. Ценой глушилки был молчащий ночной сбой фетчера — до восьми
// часов без единого сигнала.
//
// Осталась единственная законная поблажка: сразу после полуночи Ташкента
// файла за новый день ещё физически нет, пока не отработал первый тик
// фетчера. Ждём час, дальше это уже сбой.
const NEW_DAY_GRACE_HOURS = 1;

function tashkentHourNow(now = Date.now()) {
  return new Date(now + 5 * 3600 * 1000).getUTCHours();
}

function tashkentDayKey(now = Date.now()) {
  // ISO-дата в TZ Ташкента без внешних библиотек.
  const shifted = new Date(now + 5 * 3600 * 1000);
  return shifted.toISOString().slice(0, 10);
}

function hoursSince(ts) {
  return (Date.now() - ts) / 3600 / 1000;
}

function loadAlertsState() {
  if (!existsSync(HEARTBEAT_STATE)) return { channels: {} };
  try {
    return JSON.parse(readFileSync(HEARTBEAT_STATE, "utf8"));
  } catch {
    return { channels: {} };
  }
}

function saveAlertsState(state) {
  if (dryRun) return;
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(HEARTBEAT_STATE, JSON.stringify(state, null, 2));
}

function shouldAlert(state, channel) {
  const last = state.channels[channel];
  if (!last) return true;
  const lastAt = new Date(last.at).getTime();
  return hoursSince(lastAt) >= ALERT_COOLDOWN_HOURS;
}

function markAlerted(state, channel, message) {
  state.channels[channel] = {
    at: new Date().toISOString(),
    message,
  };
}

async function sendTelegram(text) {
  if (dryRun) {
    console.log("[heartbeat] DRY_RUN — не отправляем:");
    console.log(text);
    return;
  }
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_EDITOR_CHAT_ID) {
    console.error("Missing TELEGRAM_BOT_TOKEN/TELEGRAM_EDITOR_CHAT_ID");
    process.exit(1);
  }
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: TELEGRAM_EDITOR_CHAT_ID,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });
  const data = await res.json();
  if (!data.ok) {
    console.error(`Telegram API: ${data.description}`);
    process.exit(1);
  }
}

// ─── Проверки ───

function checkInbox() {
  const today = tashkentDayKey();
  const file = join(ROOT, `content/inbox/${today}.jsonl`);
  if (!existsSync(file)) {
    // Файла нет — фетчер за сегодня ещё не отработал. Нормально только
    // в первый час после полуночи Ташкента, дальше это сбой.
    if (tashkentHourNow() < NEW_DAY_GRACE_HOURS) return null;
    return {
      channel: "inbox-missing",
      severity: "warn",
      message: `⚠️ <b>Inbox</b>: файл <code>content/inbox/${today}.jsonl</code> не существует. Фетчер не отработал сегодня?`,
    };
  }
  const age = hoursSince(statSync(file).mtimeMs);
  if (age > INBOX_STALE_HOURS) {
    return {
      channel: "inbox-stale",
      severity: "warn",
      message:
        `⚠️ <b>Inbox молчит</b>: последнее обновление ${age.toFixed(1)}ч назад ` +
        `(порог ${INBOX_STALE_HOURS}ч). Проверь Actions → Pull news inbox: массовый 403/429?`,
    };
  }
  return null;
}

function checkRoutine() {
  const file = join(STATE_DIR, "last-routine-run.json");
  if (!existsSync(file)) {
    // Первый запуск, файла нет — ничего не алертим.
    return null;
  }
  const age = hoursSince(statSync(file).mtimeMs);
  if (age > ROUTINE_STALE_HOURS) {
    return {
      channel: "routine-stale",
      severity: "warn",
      message:
        `⚠️ <b>Планёрка молчит</b>: last-routine-run.json не обновлялся ${age.toFixed(1)}ч ` +
        `(порог ${ROUTINE_STALE_HOURS}ч). Проверь code.claude.com → LEAP Planyorka → History.`,
    };
  }
  return null;
}

function checkEditorQueue() {
  const file = join(STATE_DIR, "editor-queue.json");
  if (!existsSync(file)) return null;
  let queue;
  try {
    queue = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return {
      channel: "queue-corrupt",
      severity: "error",
      message: `❌ <b>editor-queue.json не парсится как JSON</b>. Смотри вручную.`,
    };
  }
  const pending = Array.isArray(queue.pending) ? queue.pending : [];
  const stale = pending.filter(
    (item) => item.pushedAt && hoursSince(new Date(item.pushedAt).getTime()) > QUEUE_STALE_HOURS,
  );
  if (stale.length) {
    const list = stale.slice(0, 5).map((x) => `— <code>${x.slug}</code>`).join("\n");
    return {
      channel: "queue-stale",
      severity: "warn",
      message:
        `⚠️ <b>Материалы в очереди без ответа >${QUEUE_STALE_HOURS}ч</b> (${stale.length} шт):\n` +
        list +
        (stale.length > 5 ? `\n…и ещё ${stale.length - 5}` : ""),
    };
  }
  return null;
}

// ─── main ───

const state = loadAlertsState();
const results = [checkInbox(), checkRoutine(), checkEditorQueue()].filter(Boolean);

if (!results.length) {
  console.log("[heartbeat] всё живо");
  process.exit(0);
}

let sent = 0;
let suppressed = 0;
for (const alert of results) {
  if (!shouldAlert(state, alert.channel)) {
    suppressed++;
    console.log(`[heartbeat] ${alert.channel} — уже алертили <${ALERT_COOLDOWN_HOURS}ч назад, скипаем`);
    continue;
  }
  await sendTelegram(alert.message);
  markAlerted(state, alert.channel, alert.message);
  sent++;
}

saveAlertsState(state);
console.log(`[heartbeat] отправлено ${sent}, подавлено ${suppressed}`);
