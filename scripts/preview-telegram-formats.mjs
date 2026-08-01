#!/usr/bin/env node
// Отправляет владельцу в Telegram варианты оформления поста на реальных
// статьях — чтобы выбирать формат, глядя на то, как он выглядит в клиенте,
// а не на описание в переписке.
//
// Запускается вручную через workflow .github/workflows/preview-formats.yml,
// потому что токен бота лежит в секретах репозитория.
//
// Каждый вариант отправляется дважды не бывает: сначала короткая подпись
// «Вариант X», следом — сам пост ровно в том виде, в каком он ушёл бы
// в канал, включая картинку.
//
// ENV:
//   TELEGRAM_BOT_TOKEN, TELEGRAM_EDITOR_CHAT_ID
//   DRY_RUN=1 — только напечатать

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const { TELEGRAM_BOT_TOKEN, TELEGRAM_EDITOR_CHAT_ID, DRY_RUN } = process.env;
const dryRun = DRY_RUN === "1" || DRY_RUN === "true";
const SITE = "https://leap.uz";

const ENT = {
  "&nbsp;": " ",
  "&mdash;": "—",
  "&ndash;": "–",
  "&laquo;": "«",
  "&raquo;": "»",
  "&quot;": '"',
};
const dec = (s) => Object.entries(ENT).reduce((a, [k, v]) => a.split(k).join(v), s);
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const unlink = (s) => s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");

function clean(s, max) {
  const t = esc(dec(unlink(s || ""))).replace(/\s*\n\s*/g, " ").trim();
  if (!max || t.length <= max) return t;
  return t.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

function parseArticle(file) {
  const raw = readFileSync(file, "utf8");
  const fmBlock = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!fmBlock) return null;
  const fm = fmBlock[1];
  const val = (k) => (fm.match(new RegExp(`^${k}: "(.*)"`, "m")) || [])[1] || "";
  const imgUrl = (fm.match(/^image:\n(?:.*\n)*?\s+url: "(.*)"/m) || [])[1] || "";
  const srcName = (fm.match(/^\s+- name: "(.*)"/m) || [])[1] || "";

  const body = raw.replace(/^---[\s\S]*?---\n/, "").trim();
  const blocks = body.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  const paras = blocks.filter(
    (b) => !b.startsWith("#") && !b.startsWith("|") && !b.startsWith("- "),
  );
  const bullets = blocks
    .filter((b) => b.startsWith("- "))
    .flatMap((b) => b.split("\n"))
    .filter((l) => l.startsWith("- "))
    .map((l) => l.replace(/^-\s*/, ""));
  const quote = paras.slice(1).find((p) => /«[^»]{35,}»/.test(p));

  return {
    slug: file.split("/").pop().replace(/\.mdx$/, ""),
    title: val("title"),
    paras,
    bullets,
    quote,
    srcName: srcName.replace(/\s+[—–]\s+.*$/, "").replace(/\s*\([^)]*\)\s*$/, ""),
    image: imgUrl,
  };
}

const footer = (slug) =>
  `<a href="${SITE}/article/${slug}">Читать на leap.uz</a>`;

const sourceLine = (a) =>
  a.srcName ? `<i>Источник: ${clean(a.srcName, 70)}</i>` : null;

// ── Вариант A: заголовок, два абзаца, источник, футер
function variantA(a) {
  return [
    `<b>${clean(a.title, 200)}</b>`,
    clean(a.paras[0], 340),
    a.paras[1] ? clean(a.paras[1], 340) : null,
    sourceLine(a),
    footer(a.slug),
  ]
    .filter(Boolean)
    .join("\n\n");
}

// ── Вариант B: с цитатой в блокквоте и списком
function variantB(a) {
  const parts = [`<b>${clean(a.title, 200)}</b>`, clean(a.paras[0], 300)];
  if (a.quote) parts.push(`<blockquote>${clean(a.quote, 330)}</blockquote>`);
  else if (a.paras[1]) parts.push(clean(a.paras[1], 300));
  if (a.bullets.length) {
    parts.push(a.bullets.slice(0, 4).map((b) => `▪ ${clean(b, 95)}`).join("\n"));
  }
  const s = sourceLine(a);
  if (s) parts.push(s);
  parts.push(footer(a.slug));
  return parts.join("\n\n");
}

// ── Вариант C: короткий вход + раскрывающийся блок с деталями
function variantC(a) {
  const detail = a.paras.slice(1, 4).map((p) => clean(p, 260)).join("\n\n");
  const parts = [`<b>${clean(a.title, 200)}</b>`, clean(a.paras[0], 260)];
  if (detail) parts.push(`<blockquote expandable>${detail}</blockquote>`);
  const s = sourceLine(a);
  if (s) parts.push(s);
  parts.push(footer(a.slug));
  return parts.join("\n\n");
}

const VARIANTS = [
  ["A", "развёрнутый: заголовок, два абзаца, источник", variantA],
  ["B", "с цитатой в блокквоте и списком", variantB],
  ["C", "короткий вход, детали раскрываются по тапу", variantC],
];

async function api(method, body) {
  const res = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  const d = await res.json();
  if (!d.ok) throw new Error(`${method}: ${d.description}`);
  return d.result;
}

const CAPTION_LIMIT = 1024;

async function sendPost(text, imageRel) {
  const abs = imageRel ? join(ROOT, "public", imageRel.replace(/^\/+/, "")) : null;
  const hasImage = abs && existsSync(abs);

  if (dryRun) {
    console.log("-".repeat(60));
    console.log(`[${text.length} симв.${hasImage ? ", с картинкой" : ""}]`);
    console.log(text.replace(/<[^>]+>/g, ""));
    return;
  }

  if (hasImage && text.length <= CAPTION_LIMIT) {
    const form = new FormData();
    form.append("chat_id", TELEGRAM_EDITOR_CHAT_ID);
    form.append("photo", new Blob([readFileSync(abs)]), "cover.jpg");
    form.append("caption", text);
    form.append("parse_mode", "HTML");
    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`,
      { method: "POST", body: form },
    );
    const d = await res.json();
    if (!d.ok) throw new Error(`sendPhoto: ${d.description}`);
    return;
  }

  // Не влезло в подпись — отправляем картинку отдельно, следом текст.
  // Владелец увидит ровно то, чем обернётся вариант C в реальной ленте.
  if (hasImage) {
    const form = new FormData();
    form.append("chat_id", TELEGRAM_EDITOR_CHAT_ID);
    form.append("photo", new Blob([readFileSync(abs)]), "cover.jpg");
    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`,
      { method: "POST", body: form },
    );
    const d = await res.json();
    if (!d.ok) throw new Error(`sendPhoto: ${d.description}`);
  }
  await api("sendMessage", {
    chat_id: TELEGRAM_EDITOR_CHAT_ID,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
}

async function label(t) {
  if (dryRun) return console.log(`\n===== ${t.replace(/<[^>]+>/g, "")} =====`);
  await api("sendMessage", {
    chat_id: TELEGRAM_EDITOR_CHAT_ID,
    text: t,
    parse_mode: "HTML",
  });
}

// ── main ──

// Берём материалы, на которых варианты различимы: один с цитатой,
// один со списком, один обычный. Если явного не нашлось — что есть.
function pickArticles() {
  const base = join(ROOT, "content/posts");
  const files = [];
  for (const entry of readdirSync(base, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue; // в каталоге лежит ещё .gitkeep
    const p = join(base, entry.name);
    for (const f of readdirSync(p)) if (f.endsWith(".mdx")) files.push(join(p, f));
  }
  const parsed = files.map(parseArticle).filter((a) => a && a.title && a.paras.length);
  const withQuote = parsed.find((a) => a.quote && a.image);
  const withList = parsed.find((a) => a.bullets.length >= 3 && a !== withQuote);
  const plain = parsed.find(
    (a) => a.image && a !== withQuote && a !== withList && a.paras.length >= 3,
  );
  return [withQuote, withList, plain].filter(Boolean).slice(0, 2);
}

const picked = process.argv.slice(2).filter((x) => !x.startsWith("--"));
const articles = picked.length
  ? picked.map((p) => parseArticle(join(ROOT, p))).filter(Boolean)
  : pickArticles();

if (!articles.length) {
  console.error("Не нашлось подходящих статей для превью.");
  process.exit(1);
}

await label(
  "<b>Тест оформления</b>\n\nНиже три варианта на реальных статьях — ровно в том виде, " +
    "в каком они ушли бы в канал. Рубрики и даты в начале нет, первым идёт заголовок.\n\n" +
    "Ответьте, какой скелет ближе.",
);

for (const a of articles) {
  await label(`<b>Материал:</b> ${clean(a.title, 150)}`);
  for (const [code, desc, fn] of VARIANTS) {
    const text = fn(a);
    const overflow = text.length > CAPTION_LIMIT;
    await label(
      `<b>Вариант ${code}</b> — ${desc}\n<i>${text.length} симв.${
        overflow ? ", не влезает в подпись под фото — картинка уйдёт отдельно" : ""
      }</i>`,
    );
    await sendPost(text, a.image);
    if (!dryRun) await new Promise((r) => setTimeout(r, 900));
  }
}

console.error(`[preview] отправлено вариантов: ${articles.length * VARIANTS.length}`);
