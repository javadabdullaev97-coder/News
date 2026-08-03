#!/usr/bin/env node
// Собирает метрики TG-постов: просмотры, статус.
//
// Bot API views/forwards не отдаёт, поэтому идём через публичную
// embed-страницу канала: `https://t.me/<slug>/<id>?embed=1&mode=tme`.
// Там в HTML есть `.tgme_widget_message_views` с K/M-суффиксом.
//
// Без метрик policy калибруется вслепую. Первый эффект от этого файла —
// увидеть, какие категории/темы реально читают, а какие проваливаются:
// это база для будущего пересмотра весов в newsroom-policy.json.
//
// Что пишем в content/state/metrics-daily.json:
//   {
//     "collectedAt": "...",
//     "channel": "leap_news",
//     "posts": {
//       "<messageId>": {
//         "url": "https://leap.uz/article/<slug>",
//         "postedAt": "...",
//         "views": 1234,
//         "forwards": null,   // публичный embed не отдаёт forwards
//         "lastCheckedAt": "..."
//       }
//     }
//   }
//
// ENV:
//   TELEGRAM_CHANNEL — @leap_news или leap_news (без @)
//   DRY_RUN=1        — только показать

import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadPosted } from "../lib/telegram-posted.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

const METRICS_PATH = join(ROOT, "content/state/metrics-daily.json");

const { TELEGRAM_CHANNEL, DRY_RUN } = process.env;
const dryRun = DRY_RUN === "1" || DRY_RUN === "true";

if (!TELEGRAM_CHANNEL) {
  console.error("Missing TELEGRAM_CHANNEL");
  process.exit(1);
}
const channelSlug = TELEGRAM_CHANNEL.replace(/^@/, "");

const posted = Object.fromEntries(loadPosted(ROOT));
if (!Object.keys(posted).length) {
  console.error("Реестр отправленных постов пуст — нечего мерить");
  process.exit(0);
}

// Сколько дней назад стоит перепроверять пост. Просмотры на TG растут
// первые ~72 часа, дальше плато — мерить дальше почти бесполезно, только
// нагружаем t.me. После 14 дней вообще не трогаем.
const MAX_AGE_DAYS = 14;
function isTooOld(postedAt) {
  const age = (Date.now() - new Date(postedAt).getTime()) / 86400_000;
  return age > MAX_AGE_DAYS;
}

// Регексп для K/M-суффиксов: "12.3K" → 12300, "1.5M" → 1500000.
function parseViews(raw) {
  if (!raw) return null;
  const s = String(raw).trim().toUpperCase();
  const m = s.match(/^([\d.,]+)\s*([KM]?)$/);
  if (!m) return null;
  const num = Number(m[1].replace(",", "."));
  if (!Number.isFinite(num)) return null;
  const mult = m[2] === "K" ? 1000 : m[2] === "M" ? 1_000_000 : 1;
  return Math.round(num * mult);
}

async function fetchViews(messageId) {
  const url = `https://t.me/${channelSlug}/${messageId}?embed=1&mode=tme`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    },
  });
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
  const html = await res.text();
  // На публичной embed-странице просмотры — в span.tgme_widget_message_views.
  const m = html.match(/<span class="tgme_widget_message_views">([^<]+)<\/span>/);
  if (!m) return { ok: false, error: "views tag not found" };
  const views = parseViews(m[1]);
  return { ok: true, views };
}

async function main() {
  const existing = existsSync(METRICS_PATH)
    ? JSON.parse(readFileSync(METRICS_PATH, "utf8"))
    : { posts: {} };

  const now = new Date().toISOString();
  let updated = 0;
  let skippedOld = 0;
  let failed = 0;

  // Concurrency 3 — t.me public embed не любит бомбёжку, но 3 в параллель ок.
  const entries = Object.entries(posted);
  const CONC = 3;
  const queue = [...entries];
  const workers = Array.from({ length: CONC }, async () => {
    while (queue.length) {
      const [url, meta] = queue.shift();
      const messageId = String(meta.messageId);

      if (isTooOld(meta.postedAt)) {
        skippedOld++;
        continue;
      }

      const result = await fetchViews(messageId);
      if (!result.ok) {
        console.error(`[metrics] ${messageId}: ${result.error}`);
        failed++;
        continue;
      }

      existing.posts[messageId] = {
        url,
        postedAt: meta.postedAt,
        views: result.views,
        forwards: null,
        lastCheckedAt: now,
      };
      updated++;
    }
  });
  await Promise.all(workers);

  existing.collectedAt = now;
  existing.channel = channelSlug;

  if (dryRun) {
    console.log(`[metrics] DRY_RUN — не сохраняем. Обновлено: ${updated}, пропущено старых: ${skippedOld}, упало: ${failed}`);
    // Топ-5 по просмотрам для видимости
    const top = Object.entries(existing.posts)
      .filter(([_, p]) => typeof p.views === "number")
      .sort((a, b) => b[1].views - a[1].views)
      .slice(0, 5);
    for (const [msgId, p] of top) {
      console.log(`  ${msgId} ${p.views}v  ${p.url}`);
    }
    return;
  }

  mkdirSync(dirname(METRICS_PATH), { recursive: true });
  writeFileSync(METRICS_PATH, JSON.stringify(existing, null, 2));
  console.log(`[metrics] обновлено ${updated}, пропущено старых ${skippedOld}, упало ${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
