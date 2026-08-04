#!/usr/bin/env node
// Перепубликация статьи в Telegram-канале: удалить старый пост, отправить новый.
//
// ЗАЧЕМ. Пост в канал уходит с картинкой, загруженной байтами в момент
// отправки. Если после выхода поста фото в статье заменили (04.08.2026:
// портретный кадр с заливкой у «25 штатов» заменён ландшафтным), на сайте
// всё уже правильно, а в канале продолжает висеть старый кадр — сам он не
// обновится никогда. Единственный способ — удалить сообщение и отправить
// заново с текущей картинкой.
//
// Формат поста, тихие часы и лимит подписи — те же, что у post-to-telegram.mjs
// (заголовок, лид, футер-ссылка; ночью Ташкента — без звука).
//
// Реестр: новая отправка дописывается в telegram-posted.jsonl. Свёртка
// loadPostedBySlug оставляет за слагом САМУЮ РАННЮЮ запись — то есть старую,
// уже удалённую. Для дедупа это безразлично (слаг числится отправленным),
// а отзыв по «стоп» сперва упрётся в удалённое сообщение — Bot API ответит
// «not found», это штатно.
//
//   SLUG=<slug> node scripts/repost-telegram.mjs        — удалить и переотправить
//   DRY_RUN=1 SLUG=<slug> node scripts/repost-telegram.mjs
//
// Требует TELEGRAM_BOT_TOKEN и TELEGRAM_CHANNEL — запускается воркфлоу
// repost-telegram.yml, в песочницах секретов нет. Bot API удаляет сообщения
// только 48 часов после отправки; старше — удалить не выйдет, только слать
// уточнение отдельным постом.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readLog } from "../lib/state-log.mjs";
import { markPosted, slugOfUrl, POSTED_LOG, POSTED_LEGACY } from "../lib/telegram-posted.mjs";
import { parseFrontmatter, extractLede, decodeEntities, escapeHTML } from "../lib/frontmatter.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const {
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHANNEL,
  SITE_URL = "https://leap.uz",
  SLUG,
  DRY_RUN,
} = process.env;
const dryRun = DRY_RUN === "1" || DRY_RUN === "true";
const slug = SLUG || process.argv[2];

if (!slug) {
  console.error("Использование: SLUG=<slug> node scripts/repost-telegram.mjs");
  process.exit(1);
}
if (!dryRun && (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHANNEL)) {
  console.error("Нужны TELEGRAM_BOT_TOKEN и TELEGRAM_CHANNEL (или DRY_RUN=1).");
  process.exit(1);
}

// ── статья ──
const dayDirRe = /^\d{4}-\d{2}-\d{2}$/;
let mdxPath = null;
const postsDir = join(ROOT, "content/posts");
for (const day of (existsSync(postsDir) ? readdirSync(postsDir) : [])) {
  if (!dayDirRe.test(day)) continue;
  const p = join(postsDir, day, `${slug}.mdx`);
  if (existsSync(p)) mdxPath = p;
}
if (!mdxPath) {
  console.error(`[repost] статья ${slug} не найдена в content/posts/ — переотправлять нечего`);
  process.exit(1);
}
const raw = readFileSync(mdxPath, "utf8");
const fm = parseFrontmatter(raw);
const day = mdxPath.match(/content\/posts\/(\d{4}-\d{2}-\d{2})\//)[1];
const url = `${SITE_URL.replace(/\/$/, "")}/ru/${day.replace(/-/g, "/")}/${slug}`;

// ── старые сообщения этого слага: все события, как у чистильщика дублей ──
const events = [];
const legacy = join(ROOT, POSTED_LEGACY);
if (existsSync(legacy)) {
  try {
    for (const [u, rec] of Object.entries(JSON.parse(readFileSync(legacy, "utf8"))?.posted ?? {})) {
      events.push({ url: u, ...rec });
    }
  } catch {
    // журнал ниже даст свою часть
  }
}
events.push(...readLog(join(ROOT, POSTED_LOG)).events);
const oldIds = [
  ...new Set(events.filter((e) => e?.url && e.messageId && slugOfUrl(e.url) === slug).map((e) => e.messageId)),
];

// ── формат поста — копия post-to-telegram.mjs ──
// Подпись-ссылка на языке материала — как в post-to-telegram.mjs.
const READ_MORE = { ru: "Читать полностью →", uz: "Batafsil →", en: "Read in full →" };

function buildMessage(ledeLimit) {
  const title = escapeHTML(decodeEntities(fm.title || ""));
  const plainLede = decodeEntities(extractLede(raw));
  const shortLede =
    plainLede.length > ledeLimit
      ? plainLede.slice(0, ledeLimit - 1).replace(/\s+\S*$/, "") + "…"
      : plainLede;
  return [`<b>${title}</b>`, escapeHTML(shortLede), `<a href="${url}">${READ_MORE[fm.lang] ?? READ_MORE.ru}</a>`].join("\n\n");
}
function buildCaption() {
  for (const limit of [600, 450, 320, 220, 140]) {
    const text = buildMessage(limit);
    if (text.length <= 1024) return text;
  }
  return null;
}
const tgConfig = JSON.parse(readFileSync(join(ROOT, "config/telegram-scoring.json"), "utf8"));
function silentNow(now = new Date()) {
  const cfg = tgConfig.silentHoursTashkent;
  if (!cfg || typeof cfg.from !== "number" || typeof cfg.to !== "number") return false;
  const hour = (now.getUTCHours() + 5) % 24;
  return cfg.from <= cfg.to ? hour >= cfg.from && hour < cfg.to : hour >= cfg.from || hour < cfg.to;
}

const imageAbs = fm.image?.url ? join(ROOT, "public", fm.image.url.replace(/^\/+/, "")) : null;
if (!imageAbs || !existsSync(imageAbs)) {
  console.error(`[repost] у статьи нет локальной картинки (${fm.image?.url}) — смысл перепубликации в свежем фото, останавливаюсь`);
  process.exit(1);
}

console.error(`[repost] ${slug}: удалить сообщения [${oldIds.join(", ") || "нет"}], отправить заново с ${fm.image.url}`);
if (dryRun) {
  console.log(JSON.stringify({ dryRun: true, slug, url, oldIds, image: fm.image.url }));
  process.exit(0);
}

// ── удаление ──
for (const id of oldIds) {
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: TELEGRAM_CHANNEL, message_id: id }),
  });
  const data = await res.json();
  if (data.ok) console.error(`  ✓ удалено #${id}`);
  else if (/not found|to delete/i.test(data.description ?? "")) console.error(`  – #${id} уже отсутствует`);
  else {
    console.error(`  ✗ #${id}: ${data.description}`);
    process.exit(1); // не шлём новый пост, пока старый висит — иначе дубль
  }
  await new Promise((r) => setTimeout(r, 300));
}

// ── отправка ──
const caption = buildCaption();
if (!caption) {
  console.error("[repost] подпись не влезла в 1024 даже без лида — правь заголовок");
  process.exit(1);
}
const form = new FormData();
form.append("chat_id", TELEGRAM_CHANNEL);
form.append("photo", new Blob([readFileSync(imageAbs)]), `${slug}.jpg`);
form.append("caption", caption);
form.append("parse_mode", "HTML");
if (silentNow()) form.append("disable_notification", "true");
const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
  method: "POST",
  body: form,
});
const data = await res.json();
if (!data.ok) {
  console.error(`[repost] sendPhoto: ${data.description}`);
  process.exit(1);
}
markPosted(ROOT, { url, messageId: data.result.message_id });
console.error(`[repost] отправлено заново: message ${data.result.message_id}`);
console.log(JSON.stringify({ slug, url, deleted: oldIds, messageId: data.result.message_id }));
