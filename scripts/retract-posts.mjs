#!/usr/bin/env node
// Снимает материал с раздачи: удаляет его посты из каналов всех языков
// и помечает записи отозванными в реестре.
//
// ЗАЧЕМ. Снятая с сайта статья продолжает жить в Telegram: удалить файл
// из content/posts можно коммитом, а пост в канале — только через Bot API.
// 15.08.2026 один удар по югу Ливана вышел тремя статьями подряд, две
// из них ушли в оба канала; убрать их с сайта было нечем и наполовину.
// Прежние чистильщики для такого не годились: revoke-lang-posts снимает
// ВСЕ посты языка, cleanup-telegram-duplicates разбирает конкретную аварию
// 04.08.2026 по своим правилам.
//
// Отзыв в реестре обязателен: без него дедуп считает материал отправленным,
// а если запись просто стереть — следующий прогон отправит его заново.
//
// ЗАПРОС лежит в content/state/retract-request.json:
//   { "slugs": ["israel-lebanon-strikes-truce-violation"],
//     "reason": "дубль темы", "requestedAt": "2026-08-15T20:00:00Z" }
//
// Пуш этого файла в main запускает воркфлоу retract-posts.yml — секреты
// есть только там, в песочнице ни токена, ни каналов нет.
//
//   DRY_RUN=1 node scripts/retract-posts.mjs        — показать, что снял бы
//   SLUGS=a,b node scripts/retract-posts.mjs        — без файла запроса
//   MESSAGES=uz:225,uz:226 node scripts/retract-posts.mjs
//
// Форма MESSAGES нужна для постов, которых НЕТ в реестре. Такие бывают:
// 17.08.2026 три сообщения ушли в узбекский канал и не записались — по
// слагу их не найти, а удалять надо. Номер сообщения виден в его ссылке
// (t.me/leap_news_uz/225). Тот же список можно положить в заявку полем
// "messages": ["uz:225", "uz:226"].
//
// Bot API удаляет сообщения 48 часов. Что старше — останется в канале,
// и скрипт про это честно скажет: молча «успешно» на неудалённом посте
// хуже, чем видимая ошибка.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { appendLog } from "../lib/state-log.mjs";
import { loadPostedByLangSlug, POSTED_LOG } from "../lib/telegram-posted.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const { TELEGRAM_BOT_TOKEN, DRY_RUN, SLUGS } = process.env;
const dryRun = DRY_RUN === "1" || DRY_RUN === "true";

// Каналы по паре (куда отправляли, язык). Профильные добавлены 17.08.2026:
// до этого скрипт снимал материал только с основного канала, и статья,
// ушедшая ещё и в спортивный или технологический, оставалась там висеть —
// причём в реестре числилась отозванной, то есть о ней забывали совсем.
const CHANNEL = {
  "main\u0000ru": process.env.TELEGRAM_CHANNEL,
  "main\u0000uz": process.env.TELEGRAM_CHANNEL_UZ,
  "sport\u0000ru": process.env.TELEGRAM_CHANNEL_SPORT,
  "sport\u0000uz": process.env.TELEGRAM_CHANNEL_SPORT_UZ,
  "tech\u0000ru": process.env.TELEGRAM_CHANNEL_TECH,
  "tech\u0000uz": process.env.TELEGRAM_CHANNEL_TECH_UZ,
};
const TARGETS = ["main", "sport", "tech"];

const REQUEST = join(ROOT, "content/state/retract-request.json");

/** Явные номера сообщений: ["uz:225", "ru:271"] → [{lang, messageId}]. */
function wantedMessages() {
  const raw = [];
  if (process.env.MESSAGES) raw.push(...process.env.MESSAGES.split(","));
  if (existsSync(REQUEST)) {
    try {
      const req = JSON.parse(readFileSync(REQUEST, "utf8"));
      if (Array.isArray(req.messages)) raw.push(...req.messages);
    } catch {
      // разбор заявки уже отчитается ниже, в wantedSlugs
    }
  }
  const out = [];
  for (const item of raw) {
    // Форма «uz:225» — основной канал; «tech-uz:64» — профильный.
    const m = String(item).trim().match(/^(?:(sport|tech)-)?(ru|uz):(\d+)$/);
    if (!m) {
      console.error(
        `[retract] пропускаю «${item}»: нужен вид язык:номер (uz:225) ` +
          "или канал-язык:номер (tech-uz:64)",
      );
      continue;
    }
    out.push({ target: m[1] ?? "main", lang: m[2], messageId: Number(m[3]) });
  }
  return out;
}

function wantedSlugs() {
  if (SLUGS) return SLUGS.split(",").map((s) => s.trim()).filter(Boolean);
  if (!existsSync(REQUEST)) return [];
  try {
    const req = JSON.parse(readFileSync(REQUEST, "utf8"));
    return Array.isArray(req.slugs) ? req.slugs.filter(Boolean) : [];
  } catch (err) {
    console.error(`[retract] запрос не читается: ${err.message}`);
    return [];
  }
}

const slugs = new Set(wantedSlugs());
const explicit = wantedMessages();
if (!slugs.size && !explicit.length) {
  console.error("[retract] нечего снимать — ни слагов, ни номеров сообщений");
  process.exit(0);
}
if (slugs.size) console.error(`[retract] слагов в запросе: ${slugs.size} — ${[...slugs].join(", ")}`);
if (explicit.length) {
  console.error(
    `[retract] номеров сообщений: ${explicit.length} — ` +
      explicit.map((e) => `${e.lang}:${e.messageId}`).join(", "),
  );
}

const targets = [];
// Явные номера идут первыми и без записи в реестре: их там и нет — ради
// этого форма и добавлена. Отзывать в журнале нечего, url неизвестен.
for (const e of explicit) {
  targets.push({ target: e.target, lang: e.lang, slug: null, url: null, messageId: e.messageId });
}
for (const target of TARGETS) {
  for (const [key, rec] of loadPostedByLangSlug(ROOT, target)) {
    const [lang, slug] = key.split(" ");
    if (!slugs.has(slug) || !rec.messageId) continue;
    targets.push({ target, lang, slug, url: rec.url, messageId: rec.messageId });
  }
}

if (!targets.length) {
  console.error("[retract] в каналах этих материалов нет — снимать нечего");
  process.exit(0);
}
for (const t of targets) console.error(`   [${t.target}/${t.lang}] #${t.messageId} ${t.url}`);

if (dryRun) {
  console.error("[retract] DRY_RUN — ничего не удалено");
  process.exit(0);
}
if (!TELEGRAM_BOT_TOKEN) {
  console.error("Нужен TELEGRAM_BOT_TOKEN (или DRY_RUN=1).");
  process.exit(1);
}

let removed = 0;
let gone = 0;
let failed = 0;
for (const t of targets) {
  const chat = CHANNEL[`${t.target}\u0000${t.lang}`];
  if (!chat) {
    console.error(`  ✗ [${t.target}/${t.lang}]: канал не задан, #${t.messageId} остался в канале`);
    failed++;
    continue;
  }
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chat, message_id: t.messageId }),
  });
  const data = await res.json();
  if (data.ok) {
    removed++;
  } else if (/not found|to delete/i.test(data.description ?? "")) {
    // Уже удалён руками — запись всё равно отзываем, иначе материал
    // будет считаться отправленным.
    gone++;
  } else {
    failed++;
    console.error(`  ✗ [${t.target}/${t.lang}] #${t.messageId}: ${data.description}`);
    // Пост остался в канале — запись не трогаем: отозвав её, мы бы
    // разрешили автопосту отправить материал ещё раз.
    continue;
  }
  // У поста, снятого по явному номеру, записи в реестре нет — и отзывать
  // нечего: дедуп про него всё равно не знал.
  if (!t.url) continue;
  appendLog(join(ROOT, POSTED_LOG), {
    url: t.url,
    messageId: t.messageId,
    // Без target отзыв прописался бы основному каналу, а профильная
    // отправка осталась бы «живой» в реестре.
    ...(t.target === "main" ? {} : { target: t.target }),
    revokedAt: new Date().toISOString(),
    reason: "retract",
  });
}

console.error(
  `[retract] удалено ${removed}, уже не было ${gone}, не удалось ${failed}`,
);
process.exit(failed ? 1 : 0);
