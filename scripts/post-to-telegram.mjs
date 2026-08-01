#!/usr/bin/env node
// Постит новые статьи в Telegram-канал @leap_uz после мержа PR в main.
// Запускается GitHub Action-ом при push в main; определяет какие .mdx в
// content/posts/ появились по сравнению с прошлым коммитом, форматирует
// каждую как ТГ-пост и отправляет через Bot API.
//
// Дедупит через content/state/telegram-posted.json (URL статьи → message_id).
//
// ENV:
//   TELEGRAM_BOT_TOKEN — токен бота (secret)
//   TELEGRAM_CHANNEL   — @leap_uz или -1001234567890
//   SITE_URL           — https://leap.uz
//   DRY_RUN            — 1 чтобы только вывести что запостил бы, но не постить

import {
  existsSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(HERE);
const POSTS_DIR = join(ROOT, "content/posts");
const STATE_PATH = join(ROOT, "content/state/telegram-posted.json");

const {
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHANNEL,
  SITE_URL = "https://leap.uz",
  DRY_RUN,
} = process.env;

const dryRun = DRY_RUN === "1" || DRY_RUN === "true";

if (!dryRun && (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHANNEL)) {
  console.error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL. Set DRY_RUN=1 to test without.");
  process.exit(1);
}

// Найти все .mdx во всех днях
function collectMdx(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectMdx(p));
    else if (entry.isFile() && entry.name.endsWith(".mdx")) out.push(p);
  }
  return out;
}

// Простой YAML-парсер frontmatter: только то что нам нужно.
function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const fm = {};
  const lines = m[1].split("\n");
  let currentKey = null;
  let currentObj = null;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim()) continue;
    const topMatch = raw.match(/^([a-zA-Z][\w]*):\s*(.*)$/);
    if (topMatch) {
      currentKey = topMatch[1];
      const val = topMatch[2].trim();
      if (val === "" || val === "|") {
        // multi-line or object follows
        fm[currentKey] = {};
        currentObj = fm[currentKey];
      } else {
        fm[currentKey] = parseScalar(val);
        currentObj = null;
      }
    } else if (currentObj && raw.startsWith("  ")) {
      const kv = raw.trim().match(/^([a-zA-Z][\w]*):\s*(.*)$/);
      if (kv) currentObj[kv[1]] = parseScalar(kv[2].trim());
    }
    // arrays handled crudely — только для tags, читаем как одну строку
  }
  // Отдельный проход для массивов ["a", "b"]
  const tagsMatch = m[1].match(/^tags:\s*\[(.*?)\]/m);
  if (tagsMatch) {
    fm.tags = tagsMatch[1]
      .split(",")
      .map((s) => s.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }
  return fm;
}

function parseScalar(v) {
  if (v.startsWith('"') && v.endsWith('"')) return v.slice(1, -1);
  if (v === "true") return true;
  if (v === "false") return false;
  if (v === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}

// Извлечь первый абзац после frontmatter — это лид.
// Markdown-разметку ссылок снимаем, оставляя якорь: в Telegram «[текст](url)»
// ушло бы в канал как есть.
function extractLede(text) {
  const body = text.replace(/^---[\s\S]*?---\n/, "").trim();
  const firstBlank = body.indexOf("\n\n");
  const lede = firstBlank === -1 ? body : body.slice(0, firstBlank);
  return lede
    .trim()
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/\s*\n\s*/g, " ");
}

// Слаг из пути: content/posts/2026-07-31/cb-rate-hike-15pct.mdx → cb-rate-hike-15pct
function slugFromPath(p) {
  return p.replace(/\.mdx$/, "").split("/").pop();
}

// Дата из пути: content/posts/2026-07-31/... → 2026-07-31
function dateFromPath(p) {
  const m = p.match(/content\/posts\/(\d{4}-\d{2}-\d{2})\//);
  return m ? m[1] : null;
}

// Публичный URL статьи. Обязан совпадать с роутером Next.js: единственный
// маршрут статьи в приложении — app/article/[slug]/page.tsx, то есть
// /article/<slug>. Дата в путь не входит.
function articleUrl(date, slug) {
  return `${SITE_URL.replace(/\/$/, "")}/article/${slug}`;
}

// Сущности, которые редакция пишет в MDX (неразрывный пробел в числах и т.д.).
// Раскрываем до escapeHTML, иначе «1&nbsp;000» уедет в канал как «1&amp;nbsp;000».
const ENTITIES = {
  "&nbsp;": " ",
  "&mdash;": "—",
  "&ndash;": "–",
  "&laquo;": "«",
  "&raquo;": "»",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
};

function decodeEntities(s) {
  let out = s;
  for (const [ent, ch] of Object.entries(ENTITIES)) out = out.split(ent).join(ch);
  return out.split("&amp;").join("&");
}

// HTML для Telegram Bot API (parse_mode=HTML)
function escapeHTML(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Пост в канал: заголовок, лид, ссылка. Без хештегов — решение редакции.
// frontmatter.tags при этом остаётся: он нужен сайту для рубрикации и поиска,
// в Telegram просто не выводится.
function buildMessage(fm, lede, url) {
  const title = escapeHTML(decodeEntities(fm.title || ""));
  const plainLede = decodeEntities(lede);
  const shortLede = escapeHTML(
    plainLede.length > 500 ? plainLede.slice(0, 497) + "…" : plainLede,
  );
  return `<b>${title}</b>\n\n${shortLede}\n\n<a href="${url}">Читать на leap.uz →</a>`;
}

async function tgApi(method, body) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram API error: ${data.description} (${data.error_code})`);
  return data.result;
}

async function postArticle(mdxPath, fm) {
  const date = dateFromPath(mdxPath);
  const slug = slugFromPath(mdxPath);
  const url = articleUrl(date, slug);
  const raw = readFileSync(mdxPath, "utf8");
  const lede = extractLede(raw);
  const text = buildMessage(fm, lede, url);
  const imageAbs = fm.image?.url
    ? join(ROOT, "public", fm.image.url.replace(/^\/+/, ""))
    : null;
  const hasImage = imageAbs && existsSync(imageAbs);

  if (dryRun) {
    console.log("=".repeat(60));
    console.log("SLUG:", slug);
    console.log("URL:", url);
    console.log("IMAGE:", hasImage ? fm.image.url : "(none)");
    console.log("MESSAGE:");
    console.log(text);
    return { messageId: null, url, dryRun: true };
  }

  if (hasImage) {
    // sendPhoto с caption (лимит caption 1024, если длиннее — sendMessage after)
    if (text.length <= 1024) {
      const buf = readFileSync(imageAbs);
      const form = new FormData();
      form.append("chat_id", TELEGRAM_CHANNEL);
      form.append("photo", new Blob([buf]), `${slug}.jpg`);
      form.append("caption", text);
      form.append("parse_mode", "HTML");
      const res = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`,
        { method: "POST", body: form },
      );
      const data = await res.json();
      if (!data.ok) throw new Error(`sendPhoto: ${data.description}`);
      return { messageId: data.result.message_id, url };
    }
  }

  // Fallback: обычное сообщение с превью URL (Telegram сам подтянет og:image)
  const msg = await tgApi("sendMessage", {
    chat_id: TELEGRAM_CHANNEL,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: false,
  });
  return { messageId: msg.message_id, url };
}

// ─── main ───
const allMdx = collectMdx(POSTS_DIR).sort();
const state = existsSync(STATE_PATH)
  ? JSON.parse(readFileSync(STATE_PATH, "utf8"))
  : { posted: {} };

const posted = state.posted || {};
const pending = [];

for (const mdxPath of allMdx) {
  const rel = relative(ROOT, mdxPath);
  const raw = readFileSync(mdxPath, "utf8");
  const fm = parseFrontmatter(raw);
  if (!fm.title) {
    console.error(`[skip] no title in ${rel}`);
    continue;
  }
  const date = dateFromPath(mdxPath);
  const slug = slugFromPath(mdxPath);
  const url = articleUrl(date, slug);
  if (posted[url]) {
    continue; // уже постили
  }
  pending.push({ mdxPath, fm, url, rel });
}

console.error(`[tg] ${pending.length} new post(s) to publish`);

let ok = 0;
let failed = 0;
for (const p of pending) {
  try {
    const result = await postArticle(p.mdxPath, p.fm);
    if (!dryRun) {
      posted[p.url] = {
        messageId: result.messageId,
        postedAt: new Date().toISOString(),
      };
      // сохраняем после каждого поста — если упадём, не потеряем прогресс
      writeFileSync(
        STATE_PATH,
        JSON.stringify({ posted, updatedAt: new Date().toISOString() }, null, 2),
      );
    }
    ok++;
    console.error(`  ✓ ${p.rel}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${p.rel}: ${err.message}`);
  }
  // Не флудим — Telegram лимит 30 сообщений/сек, но для каналов рекомендуют 1/сек
  if (pending.length > 1) await new Promise((r) => setTimeout(r, 1200));
}

console.error(`[tg] posted ${ok}, failed ${failed}`);
if (failed) process.exit(1);
