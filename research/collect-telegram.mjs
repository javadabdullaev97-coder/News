#!/usr/bin/env node
// Фаза 1b конкурентного рисёрча: отматывает публичную ленту t.me/s/<channel>
// назад по истории и сохраняет посты за окно.
//
// Bot API тут неприменим — чужие каналы читать им нельзя. Публичная
// веб-версия отдаёт по 20 сообщений на страницу и листается параметром
// ?before=<id>; она же показывает просмотры, чего Bot API не отдаёт даже для
// своих каналов.
//
// CLI:
//   node research/collect-telegram.mjs
//   node research/collect-telegram.mjs --from=2026-05-01 --to=2026-07-31
//   node research/collect-telegram.mjs --channel=spotuz,gazetauz
//
// Выход: research/raw/telegram-<channel>.jsonl
//   {channel, outlet, lang, msgId, postedAt, text, links, hasPhoto, hasVideo,
//    views, isForward, replyTo}

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CHANNELS } from "./lib/channels.mjs";
import { USER_AGENT } from "./lib/outlets.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = join(HERE, "raw");

const DEFAULT_FROM = "2026-05-01";
const DEFAULT_TO = "2026-07-31";

const argv = process.argv.slice(2);
const arg = (flag, fallback) => {
  const hit = argv.find((a) => a.startsWith(`${flag}=`));
  return hit ? hit.slice(flag.length + 1) : fallback;
};

const CHANNEL_CONCURRENCY = +arg("--concurrency", "4");
const PAGE_DELAY_MS = +arg("--delay", "350");
const TIMEOUT_MS = 30_000;
// При четырёх каналах в параллель Telegram начинает отдавать 502 где-то на
// второй тысяче страниц. Это придушивание темпа, а не отказ: та же страница
// открывается после паузы. Поэтому попыток много, а ожидание растёт до
// полуминуты — иначе отмотка обрывается на середине окна и канал приходится
// собирать заново целиком.
const RETRIES = 6;
const BACKOFF_MS = [2_000, 5_000, 12_000, 25_000, 40_000];
// Страховка от бесконечного листания, если разметка изменится и парсер
// перестанет находить id: 4000 страниц это 80 тысяч сообщений на канал,
// заведомо больше трёх месяцев у самого плодовитого издания.
const MAX_PAGES = 4000;

const from = arg("--from", DEFAULT_FROM);
const to = arg("--to", DEFAULT_TO);
const only = arg("--channel", null)?.split(",");

const channels = CHANNELS.filter((c) => !only || only.includes(c.id));
if (!channels.length) {
  console.error(`Ни один канал не подошёл под --channel=${only?.join(",")}`);
  process.exit(1);
}

// ── сеть ───────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchPage(url) {
  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      if (attempt === RETRIES) throw err;
      await sleep(BACKOFF_MS[attempt - 1] ?? BACKOFF_MS.at(-1));
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

// ── разбор страницы ────────────────────────────────────────────────────────

const decodeEntities = (s) =>
  s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();

// «1.2K» / «45.3K» / «1.1M» / «870» → число.
function parseViews(raw) {
  if (!raw) return null;
  const m = raw.trim().match(/^([\d.]+)\s*([KM])?$/);
  if (!m) return null;
  const n = Number.parseFloat(m[1]);
  if (Number.isNaN(n)) return null;
  const mult = m[2] === "M" ? 1e6 : m[2] === "K" ? 1e3 : 1;
  return Math.round(n * mult);
}

// Сообщения на странице идут блоками, каждый начинается с data-post. Режем по
// этому якорю: разбирать вложенность div'ов регуляркой безнадёжно, а всё, что
// нам нужно от сообщения, лежит после его data-post и до следующего.
function parseMessages(html, channel) {
  const parts = html.split(/data-post="/).slice(1);
  const out = [];

  for (const part of parts) {
    const idMatch = part.match(/^([^"]+)"/);
    if (!idMatch) continue;
    const [chan, idStr] = idMatch[1].split("/");
    const msgId = Number.parseInt(idStr, 10);
    if (!Number.isFinite(msgId)) continue;
    // Внутри блока попадаются ссылки на сообщения других каналов (репосты);
    // якорь чужого канала — не наше сообщение.
    if (chan.toLowerCase() !== channel.toLowerCase()) continue;

    const body = part.slice(0, part.length);

    const postedAt = body.match(/<time datetime="([^"]+)"/)?.[1] ?? null;

    const textBlock = body.match(
      /<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/,
    )?.[1];
    const text = textBlock ? decodeEntities(textBlock) : "";

    const links = textBlock
      ? [...textBlock.matchAll(/href="([^"]+)"/g)]
          .map((m) => m[1])
          .filter((h) => h.startsWith("http"))
      : [];

    const views = parseViews(
      body.match(/tgme_widget_message_views"[^>]*>([^<]*)</)?.[1],
    );

    out.push({
      channel,
      msgId,
      postedAt,
      text,
      links,
      hasPhoto: /tgme_widget_message_photo_wrap/.test(body),
      hasVideo: /tgme_widget_message_video/.test(body),
      isForward: /tgme_widget_message_forwarded_from/.test(body),
      replyTo: /tgme_widget_message_reply/.test(body),
      views,
    });
  }

  // Дубли возникают, когда один и тот же id встречается в блоке ответа и в
  // самом сообщении.
  const seen = new Set();
  return out.filter((m) => {
    if (seen.has(m.msgId)) return false;
    seen.add(m.msgId);
    return true;
  });
}

// ── отмотка одного канала ──────────────────────────────────────────────────

async function walkChannel(channel) {
  const collected = new Map();
  let before = null;
  let pages = 0;
  let reachedWindow = false;
  let stopReason = "исчерпана история";

  while (pages < MAX_PAGES) {
    const url = before
      ? `https://t.me/s/${channel.id}?before=${before}`
      : `https://t.me/s/${channel.id}`;

    let html;
    try {
      html = await fetchPage(url);
    } catch (err) {
      stopReason = `сбой загрузки: ${err.message}`;
      break;
    }
    pages += 1;

    const messages = parseMessages(html, channel.id);
    if (!messages.length) {
      stopReason = "страница без сообщений";
      break;
    }

    let oldest = Infinity;
    let oldestDate = null;
    for (const msg of messages) {
      if (msg.msgId < oldest) {
        oldest = msg.msgId;
        oldestDate = msg.postedAt;
      }
      if (!msg.postedAt) continue;
      const day = msg.postedAt.slice(0, 10);
      if (day < from || day > to) continue;
      reachedWindow = true;
      collected.set(msg.msgId, {
        outlet: channel.outlet,
        lang: channel.lang,
        ...msg,
      });
    }

    if (oldestDate && oldestDate.slice(0, 10) < from) {
      stopReason = "дошли до начала окна";
      break;
    }
    if (!Number.isFinite(oldest) || oldest <= 1) {
      stopReason = "начало канала";
      break;
    }

    before = oldest;
    process.stdout.write(
      `  ${channel.id}: стр. ${pages}, собрано ${collected.size}, глубина ${oldestDate?.slice(0, 10) ?? "?"}    \r`,
    );
    await sleep(PAGE_DELAY_MS);
  }

  if (pages >= MAX_PAGES) stopReason = "упёрлись в лимит страниц";

  const rows = [...collected.values()].sort((a, b) => a.msgId - b.msgId);
  const out = join(RAW_DIR, `telegram-${channel.id}.jsonl`);
  writeFileSync(out, rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : ""));

  const days = new Set(rows.map((r) => r.postedAt?.slice(0, 10)).filter(Boolean));
  const withLinks = rows.filter((r) => r.links.length).length;
  const withViews = rows.filter((r) => r.views != null);
  const medianViews = withViews.length
    ? withViews.map((r) => r.views).sort((a, b) => a - b)[Math.floor(withViews.length / 2)]
    : null;

  return {
    channel: channel.id,
    outlet: channel.outlet,
    lang: channel.lang,
    subscribers: channel.subscribers,
    pages,
    posts: rows.length,
    days: days.size,
    perDay: days.size ? +(rows.length / days.size).toFixed(1) : 0,
    withLinks,
    linkShare: rows.length ? +((withLinks / rows.length) * 100).toFixed(1) : 0,
    medianViews,
    viewsPerSubscriber:
      medianViews && channel.subscribers
        ? +((medianViews / channel.subscribers) * 100).toFixed(1)
        : null,
    reachedWindow,
    stopReason,
    file: out,
  };
}

// ── прогон ─────────────────────────────────────────────────────────────────

mkdirSync(RAW_DIR, { recursive: true });

console.log(`Окно ${from} … ${to}, каналов ${channels.length}\n`);

const summary = [];
let cursor = 0;
await Promise.all(
  Array.from({ length: Math.min(CHANNEL_CONCURRENCY, channels.length) }, async () => {
    while (cursor < channels.length) {
      const channel = channels[cursor];
      cursor += 1;
      try {
        const stats = await walkChannel(channel);
        summary.push(stats);
        console.log(
          `\n@${stats.channel} [${stats.lang}] ${stats.posts} постов за ${stats.days} дн. ` +
            `(${stats.perDay}/день), со ссылкой ${stats.linkShare}%, ` +
            `медиана просмотров ${stats.medianViews ?? "—"}` +
            (stats.viewsPerSubscriber ? ` (${stats.viewsPerSubscriber}% от подписчиков)` : "") +
            ` — ${stats.stopReason}`,
        );
      } catch (err) {
        console.error(`\n@${channel.id}: ${err.message}`);
        summary.push({ channel: channel.id, error: err.message });
      }
    }
  }),
);

// Сводку дописываем, а не перезаписываем. Каналы регулярно приходится
// добирать поштучно после придушивания темпа, и прогон с --channel не должен
// стирать из сводки те двенадцать, которых он не касался.
const summaryPath = join(RAW_DIR, "telegram-summary.json");
const previous = existsSync(summaryPath)
  ? JSON.parse(readFileSync(summaryPath, "utf8")).channels ?? []
  : [];
const merged = new Map(previous.map((c) => [c.channel, c]));
for (const stats of summary) merged.set(stats.channel, stats);

const channelsOut = [...merged.values()].sort((a, b) => (b.posts ?? 0) - (a.posts ?? 0));
writeFileSync(
  summaryPath,
  JSON.stringify(
    { window: { from, to }, collectedAt: new Date().toISOString(), channels: channelsOut },
    null,
    2,
  ),
);
console.log(`\nСводка: ${join(RAW_DIR, "telegram-summary.json")}`);
