#!/usr/bin/env node
// Тянет посты из Telegram-каналов через публичный HTML-эндпоинт t.me/s/<slug>.
// Дедупит по permalink в общий content/inbox/seen.json (тот же файл что и RSS),
// пишет свежее в content/inbox/YYYY-MM-DD.jsonl.
//
// CLI:
//   node scripts/pull-telegram-inbox.mjs
//   node scripts/pull-telegram-inbox.mjs --priority=P0
//   node scripts/pull-telegram-inbox.mjs --type=source
//   node scripts/pull-telegram-inbox.mjs --id=huquqiyaxborot
//
// Формат строки (совпадает с pull-news-inbox.mjs плюс sourceKind + views):
//   {sourceId, sourceName, sourceType, sourcePriority, sourceKind: "telegram",
//    title, link, pubDate, snippet, views, fetchedAt}

import { parse as parseHTML } from "node-html-parser";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSeenLinks, saveSeenLinks } from "../lib/inbox-core.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(HERE);
const CONFIG_PATH = join(ROOT, "config/telegram-channels.json");
const INBOX_DIR = join(ROOT, "content/inbox");

const CONCURRENCY = 6; // мягче чем на RSS, чтобы Telegram не начал 429
const FETCH_TIMEOUT_MS = 20_000;
const SNIPPET_MAX = 800;
const TITLE_MAX = 140;

const argv = process.argv.slice(2);
const filters = {
  priority: findArg("--priority"),
  type: findArg("--type"),
  id: findArg("--id"),
};

function findArg(flag) {
  const p = argv.find((a) => a.startsWith(`${flag}=`));
  return p ? p.slice(flag.length + 1).split(",") : null;
}

function matches(ch) {
  if (filters.priority && !filters.priority.includes(ch.priority)) return false;
  if (filters.type && !filters.type.includes(ch.type)) return false;
  if (filters.id && !filters.id.includes(ch.id)) return false;
  return true;
}

const config = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
const channels = config.channels.filter(matches);

if (!channels.length) {
  console.error("No channels matched filters — nothing to do.");
  process.exit(0);
}

mkdirSync(INBOX_DIR, { recursive: true });
const seen = loadSeenLinks(ROOT);

function normalizeText(s) {
  if (!s) return "";
  return s
    .replace(/ /g, " ")
    .replace(/[\r\t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function firstLine(text) {
  const t = text.trim();
  const nl = t.indexOf("\n");
  const line = nl === -1 ? t : t.slice(0, nl);
  return line.slice(0, TITLE_MAX).trim();
}

function parseViews(raw) {
  if (!raw) return null;
  const s = raw.trim().toUpperCase();
  const m = s.match(/^([\d.,]+)\s*([KM]?)$/);
  if (!m) return null;
  const num = Number(m[1].replace(",", "."));
  if (!Number.isFinite(num)) return null;
  const mult = m[2] === "K" ? 1000 : m[2] === "M" ? 1_000_000 : 1;
  return Math.round(num * mult);
}

async function fetchWithTimeout(url, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent":
          "LEAP-News-Aggregator/1.0 (+https://leap.uz; contact: team@leap.uz)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "ru,en;q=0.8,uz;q=0.5",
      },
      redirect: "follow",
    });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchChannel(ch) {
  try {
    const res = await fetchWithTimeout(ch.url, FETCH_TIMEOUT_MS);
    if (!res.ok) {
      return { ok: false, ch, error: `HTTP ${res.status}` };
    }
    const html = await res.text();
    const root = parseHTML(html);
    const posts = root.querySelectorAll(".tgme_widget_message_wrap");

    const items = [];
    for (const wrap of posts) {
      // permalink
      const dateLink = wrap.querySelector(".tgme_widget_message_date");
      const permalink = dateLink?.getAttribute("href") || null;
      if (!permalink) continue;

      // pubDate из <time datetime="...">
      const timeEl = wrap.querySelector("time");
      const pubDate = timeEl?.getAttribute("datetime") || null;

      // Текст поста
      const textEl = wrap.querySelector(".tgme_widget_message_text");
      const rawText = textEl ? textEl.innerHTML : "";
      // Заменим <br> на \n, потом стрипнем теги
      const text = normalizeText(
        rawText
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/<[^>]+>/g, "")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))),
      );

      // Пропускаем сервисные посты без текста и без фото/видео.
      // Медиа-only посты (фото без подписи) тоже пропускаем — они бесполезны
      // для агрегатора без картинки, а картинку не тянем.
      if (!text || text.length < 3) continue;

      // Просмотры
      const viewsEl = wrap.querySelector(".tgme_widget_message_views");
      const views = parseViews(viewsEl?.text || null);

      const title = firstLine(text);
      const snippet = text.slice(0, SNIPPET_MAX);

      items.push({
        sourceId: ch.id,
        sourceName: ch.name,
        sourceType: ch.type,
        sourcePriority: ch.priority,
        sourceKind: "telegram",
        title,
        link: permalink,
        pubDate,
        snippet,
        views,
        fetchedAt: new Date().toISOString(),
      });
    }

    return { ok: true, ch, items };
  } catch (err) {
    return { ok: false, ch, error: err.message || String(err) };
  }
}

async function runLimited(items, limit, fn) {
  const results = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (true) {
      const i = idx++;
      if (i >= items.length) return;
      results[i] = await fn(items[i]);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}

console.error(
  `[tg-inbox] ${channels.length} channels, concurrency ${CONCURRENCY}`,
);
const results = await runLimited(channels, CONCURRENCY, fetchChannel);

const failed = results.filter((r) => !r.ok);
const ok = results.filter((r) => r.ok);

const allItems = ok.flatMap((r) => r.items);
const fresh = allItems.filter((it) => it.link && !seen.has(it.link));

const nowTashkent = new Date(Date.now() + 5 * 3600 * 1000);
const today = nowTashkent.toISOString().slice(0, 10);
const dayFile = join(INBOX_DIR, `${today}.jsonl`);

if (fresh.length) {
  const lines = fresh.map((x) => JSON.stringify(x)).join("\n") + "\n";
  appendFileSync(dayFile, lines);

  for (const it of fresh) seen.add(it.link);
  saveSeenLinks(seen, ROOT);
}

console.error(
  `[tg-inbox] fetched ${allItems.length}, fresh ${fresh.length}, ` +
    `failed ${failed.length}/${channels.length}, day=${today}`,
);

if (fresh.length) {
  const byId = new Map();
  for (const it of fresh) byId.set(it.sourceId, (byId.get(it.sourceId) || 0) + 1);
  for (const [id, cnt] of [...byId.entries()].sort((a, b) => b[1] - a[1])) {
    console.error(`  +${String(cnt).padStart(3)}  ${id}`);
  }
}

if (failed.length) {
  console.error("[tg-inbox] failed channels:");
  for (const f of failed) console.error(`  ✗  ${f.ch.id}: ${f.error}`);
}

if (failed.length === channels.length) process.exit(1);
