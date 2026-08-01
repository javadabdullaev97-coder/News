#!/usr/bin/env node
// Собирает content/posts/**/*.mdx в lib/generated-posts.ts — обычный TS-модуль
// с массивом статей и без обращений к файловой системе.
//
// Зачем именно генерация, а не чтение fs в рантайме: next.config.mjs использует
// output: "export" (статическая сборка), а lib/data.ts импортируют в том числе
// клиентские компоненты (SearchModal, MobileDrawer, HeaderNav, SavedClient).
// Любой node:fs внутри этой цепочки сломал бы клиентский бандл.
//
// Запускается автоматически через npm-хуки prebuild / predev / prelint.
// Вручную: npm run posts:build

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(HERE);
const POSTS_DIR = join(ROOT, "content/posts");
const OUT_PATH = join(ROOT, "lib/generated-posts.ts");

// Рубрики, объявленные в lib/data.ts. Категория из frontmatter обязана быть
// одной из них, иначе статья не попадёт ни в один раздел сайта.
const KNOWN_RUBRICS = new Set([
  "politics",
  "economy",
  "business",
  "society",
  "sport",
  "world",
  "tech",
  "culture",
]);

// Уровни срочности. Источник истины — config/newsroom-policy.json, секция urgency.
const KNOWN_URGENCY = new Set(["breaking", "standard", "deferred"]);

function collectMdx(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectMdx(p));
    else if (entry.isFile() && entry.name.endsWith(".mdx")) out.push(p);
  }
  return out;
}

// HTML-сущности, которые редакция реально пишет в MDX. Без декодирования
// «1&nbsp;000» отрендерилось бы читателю буквально, вместе с амперсандом.
const ENTITIES = {
  "&nbsp;": " ",
  "&mdash;": "—",
  "&ndash;": "–",
  "&laquo;": "«",
  "&raquo;": "»",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&lt;": "<",
  "&gt;": ">",
};

export function decodeEntities(s) {
  let out = s;
  for (const [ent, ch] of Object.entries(ENTITIES)) {
    out = out.split(ent).join(ch);
  }
  // &amp; последним, иначе «&amp;nbsp;» превратился бы в неразрывный пробел.
  return out.split("&amp;").join("&");
}

function stripQuotes(v) {
  const t = v.trim();
  if (
    (t.startsWith('"') && t.endsWith('"') && t.length > 1) ||
    (t.startsWith("'") && t.endsWith("'") && t.length > 1)
  ) {
    return t.slice(1, -1);
  }
  return t;
}

// Разбор inline-массива: ["a", "b"] → ["a", "b"]
function parseInlineArray(v) {
  const t = v.trim();
  if (!t.startsWith("[")) return null;
  const inner = t.slice(1, t.lastIndexOf("]"));
  if (!inner.trim()) return [];
  const items = [];
  let cur = "";
  let quote = null;
  for (const ch of inner) {
    if (quote) {
      if (ch === quote) quote = null;
      else cur += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === ",") {
      items.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) items.push(cur.trim());
  return items.map((s) => decodeEntities(stripQuotes(s)));
}

/**
 * Минимальный парсер того подмножества YAML, которое реально встречается
 * во frontmatter LEAP: скаляры, inline-массивы, список объектов (sources)
 * и одноуровневый вложенный объект (image).
 */
function parseFrontmatter(text, rel) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) throw new Error(`нет frontmatter в ${rel}`);
  const lines = m[1].split("\n");
  const fm = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    if (/^\s/.test(line)) continue; // вложенные строки разбираются ниже, по ключу

    const km = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!km) continue;
    const key = km[1];
    const rawValue = km[2];

    if (rawValue.trim() === "") {
      // Блок: либо список объектов (sources), либо вложенный объект (image).
      const block = [];
      let j = i + 1;
      while (j < lines.length && (/^\s+\S/.test(lines[j]) || !lines[j].trim())) {
        block.push(lines[j]);
        j++;
      }
      i = j - 1;

      if (block.some((l) => /^\s*-\s/.test(l))) {
        const list = [];
        let cur = null;
        for (const l of block) {
          const item = l.match(/^\s*-\s*(\S+):\s*(.*)$/);
          if (item) {
            if (cur) list.push(cur);
            cur = { [item[1]]: decodeEntities(stripQuotes(item[2])) };
            continue;
          }
          const prop = l.match(/^\s+(\S+):\s*(.*)$/);
          if (prop && cur) cur[prop[1]] = decodeEntities(stripQuotes(prop[2]));
        }
        if (cur) list.push(cur);
        fm[key] = list;
      } else {
        const obj = {};
        for (const l of block) {
          const prop = l.match(/^\s+([A-Za-z_][\w-]*):\s*(.*)$/);
          if (!prop) continue;
          const v = prop[2].trim();
          obj[prop[1]] = v === "null" || v === "" ? null : decodeEntities(stripQuotes(v));
        }
        fm[key] = obj;
      }
      continue;
    }

    const arr = parseInlineArray(rawValue);
    fm[key] = arr !== null ? arr : decodeEntities(stripQuotes(rawValue));
  }

  return fm;
}

/**
 * Тело MDX → массив блоков. Блок сохраняет markdown-префикс (`## `, `> `, `- `),
 * по которому рендерер в app/article/[slug]/page.tsx выбирает тег.
 * Первый абзац — лид, он идёт отдельным полем и в body не попадает.
 */
function parseBody(text) {
  const raw = text.replace(/^---\n[\s\S]*?\n---\n/, "").trim();
  const blocks = [];

  for (const chunk of raw.split(/\n{2,}/)) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;

    const lines = trimmed.split("\n").map((l) => l.trim());
    // Список: все строки начинаются с маркера. Склеиваем в один блок.
    if (lines.every((l) => /^[-*]\s+/.test(l))) {
      blocks.push(lines.map((l) => l.replace(/^[*]\s+/, "- ")).join("\n"));
      continue;
    }
    // Заголовки и цитаты — как есть, остальное схлопываем в одну строку:
    // перенос внутри абзаца в markdown значим только как пробел.
    if (/^(#{2,4}\s|>\s)/.test(trimmed)) {
      blocks.push(lines.join(" ").replace(/^(>\s*)+/, "> "));
      continue;
    }
    blocks.push(lines.join(" "));
  }

  const leadIndex = blocks.findIndex((b) => !/^(#{2,4}\s|>\s|-\s)/.test(b));
  const lead = leadIndex === -1 ? "" : blocks[leadIndex];
  const body = blocks.filter((_, i) => i !== leadIndex);
  return {
    // lead — плоский текст: он идёт в карточки, поиск, og:description и в
    // Telegram, где markdown-разметка отрендерилась бы буквально.
    lead: stripMarkdownLinks(decodeEntities(lead)),
    // leadRich сохраняет ссылки — их разбирает renderInline на странице статьи.
    leadRich: decodeEntities(lead),
    body: body.map(decodeEntities),
  };
}

/** `[якорь](url)` → `якорь`. */
function stripMarkdownLinks(s) {
  return s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");
}

function slugFromPath(p) {
  return p.replace(/\.mdx$/, "").split("/").pop();
}

function dateFromPath(p) {
  const m = p.replace(/\\/g, "/").match(/content\/posts\/(\d{4}-\d{2}-\d{2})\//);
  return m ? m[1] : null;
}

function build() {
  const files = collectMdx(POSTS_DIR);
  const articles = [];
  const problems = [];

  for (const file of files) {
    const rel = relative(ROOT, file).replace(/\\/g, "/");
    let fm;
    try {
      fm = parseFrontmatter(readFileSync(file, "utf8"), rel);
    } catch (err) {
      problems.push(`${rel}: ${err.message}`);
      continue;
    }

    const slug = slugFromPath(file);
    const { lead, leadRich, body } = parseBody(readFileSync(file, "utf8"));

    if (!fm.title) problems.push(`${rel}: пустой title`);
    if (!lead) problems.push(`${rel}: не нашёлся лид (первый абзац после frontmatter)`);

    const rubric = typeof fm.category === "string" ? fm.category : "";
    if (!KNOWN_RUBRICS.has(rubric)) {
      problems.push(
        `${rel}: категория "${rubric}" отсутствует в rubrics (lib/data.ts) — статья не попадёт в раздел`,
      );
    }

    const image = fm.image && typeof fm.image === "object" ? fm.image : {};
    if (!image.url) {
      problems.push(`${rel}: не заполнен image.url — статью нечем показать в карточке`);
    }

    // urgency задаёт срок годности материала: его читает Telegram-постер
    // (кикер «СРОЧНО») и логика прямой публикации в config/newsroom-policy.json.
    // Пустое значение — не ошибка, это standard по умолчанию; ошибка — опечатка,
    // из-за которой breaking молча уехал бы в обычную очередь.
    const urgency =
      typeof fm.urgency === "string" && fm.urgency ? fm.urgency : "standard";
    if (!KNOWN_URGENCY.has(urgency)) {
      problems.push(
        `${rel}: urgency "${urgency}" не из списка ${[...KNOWN_URGENCY].join(" | ")} — материал будет обработан как standard`,
      );
    }

    articles.push({
      slug,
      title: fm.title || slug,
      lead,
      leadRich: leadRich !== lead ? leadRich : undefined,
      body,
      rubric,
      urgency: KNOWN_URGENCY.has(urgency) ? urgency : "standard",
      publishedAt: fm.publishedAt || "",
      cover: image.url || "",
      tags: Array.isArray(fm.tags) ? fm.tags : [],
      description: typeof fm.description === "string" ? fm.description : undefined,
      updatedAt: typeof fm.updatedAt === "string" ? fm.updatedAt : undefined,
      sources: Array.isArray(fm.sources)
        ? fm.sources.filter((s) => s && s.name && s.url)
        : undefined,
      coverAlt: image.alt || undefined,
      coverCredit: image.credit || undefined,
      publishedDate: dateFromPath(file) || undefined,
      featured: fm.featured === true || fm.featured === "true" || undefined,
    });
  }

  // Свежие сверху — как и ожидает лента на главной.
  articles.sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));

  // Главная выбирает герой-материал как articles.find(a => a.featured).
  // Если редакция не пометила ни один материал вручную, героем становится
  // самый свежий — иначе на первом экране осталась бы висеть демо-статья,
  // а живые новости ушли бы в ленту под ней.
  if (articles.length && !articles.some((a) => a.featured)) {
    articles[0].featured = true;
  }

  const dup = articles
    .map((a) => a.slug)
    .filter((s, i, arr) => arr.indexOf(s) !== i);
  if (dup.length) problems.push(`дубли слагов: ${[...new Set(dup)].join(", ")}`);

  const header = [
    "// СГЕНЕРИРОВАННЫЙ ФАЙЛ — не редактируй руками.",
    "// Источник: content/posts/**/*.mdx. Пересобрать: npm run posts:build",
    "",
    'import type { Article } from "./types";',
    "",
  ].join("\n");

  const out = `${header}export const mdxArticles: Article[] = ${JSON.stringify(
    articles,
    null,
    2,
  )};\n`;

  writeFileSync(OUT_PATH, out);

  const rel = relative(ROOT, OUT_PATH);
  console.log(`[posts] ${articles.length} статей из ${files.length} .mdx → ${rel}`);
  for (const p of problems) console.warn(`[posts] ⚠ ${p}`);

  // Проблемы не роняют сборку: планёрка не должна вставать из-за одной
  // статьи с кривым frontmatter. Но в логе они видны.
  return problems.length;
}

build();
