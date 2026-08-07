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
import { parseFrontmatterStrict, decodeEntities } from "../lib/frontmatter.mjs";

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

// Языковая версия кодируется суффиксом имени файла: <slug>.uz.mdx, <slug>.en.mdx.
// Русская версия — <slug>.mdx без суффикса. Слаг у всех трёх один: он опознаёт
// материал, а не текст, и по нему связываются версии, реестр Telegram и отзыв.
const TRANSLATED_LANGS = new Set(["uz", "en"]);

function slugFromPath(p) {
  const base = p.replace(/\.mdx$/, "").split("/").pop();
  const m = base.match(/^(.+)\.([a-z]{2})$/);
  return m && TRANSLATED_LANGS.has(m[2]) ? m[1] : base;
}

function langFromPath(p) {
  const base = p.replace(/\.mdx$/, "").split("/").pop();
  const m = base.match(/^.+\.([a-z]{2})$/);
  return m && TRANSLATED_LANGS.has(m[1]) ? m[1] : "ru";
}

function dateFromPath(p) {
  const m = p.replace(/\\/g, "/").match(/content\/posts\/(\d{4}-\d{2}-\d{2})\//);
  return m ? m[1] : null;
}

function build() {
  const files = collectMdx(POSTS_DIR);
  const articles = [];
  const problems = [];
  const held = [];

  for (const file of files) {
    const rel = relative(ROOT, file).replace(/\\/g, "/");
    let fm;
    try {
      fm = parseFrontmatterStrict(readFileSync(file, "utf8"), rel);
    } catch (err) {
      problems.push(`${rel}: ${err.message}`);
      continue;
    }

    const slug = slugFromPath(file);
    const lang = langFromPath(file);
    const { lead, leadRich, body } = parseBody(readFileSync(file, "utf8"));

    if (!fm.title) problems.push(`${rel}: пустой title`);
    if (!lead) problems.push(`${rel}: не нашёлся лид (первый абзац после frontmatter)`);

    const rubric = typeof fm.category === "string" ? fm.category : "";
    if (!KNOWN_RUBRICS.has(rubric)) {
      problems.push(
        `${rel}: категория "${rubric}" отсутствует в rubrics (lib/data.ts) — статья не попадёт в раздел`,
      );
    }

    // Утечка служебной разметки агента в текст статьи.
    // Реальный случай 01.08.2026: материал о плотности предпринимательства
    // ушёл в main и на сайт с литеральным «</content></invoke>» в последнем
    // абзаце — хвост tool-call'а, который агент дописал в файл. Ни фактчекер,
    // ни editor, ни SEO этого не заметили: они читают смысл, а не разметку.
    // Поэтому проверка здесь, в сборке, где её нельзя пропустить.
    const LEAK_PATTERNS = [
      "</invoke>",
      "<invoke",
      "</content>",
      "<function_calls>",
      "</function_calls>",
      "antml:",
      "<parameter",
    ];
    const raw = readFileSync(file, "utf8");
    const leaks = LEAK_PATTERNS.filter((sig) => raw.includes(sig));
    // Предупреждения было мало: 07.08.2026 четыре перевода вышли на сайт
    // с хвостом «</content></invoke>» в последнем абзаце — лог никто не
    // читал. Теперь такой файл на сайт не идёт, пока его не вычистят.
    if (leaks.length) {
      held.push(
        `${rel}: служебная разметка агента (${leaks.join(", ")}) — на сайт не выпущен, вычисти файл`,
      );
      continue;
    }

    // Материал ждёт ответа владельца — на сайт он не идёт.
    //
    // Это жёсткая гарантия, а не соглашение. Раньше правило звучало так:
    // «картинка не подобралась — статья публикуется без картинки». То есть
    // если у бильда возник вопрос и владелец не успел ответить, материал
    // всё равно выходил, причём выходил в худшем виде. Спрашивать и при этом
    // публиковать не дожидаясь ответа — бессмысленно.
    //
    // Теперь статья с awaitingEditor физически не попадает в
    // lib/generated-posts.ts, а значит не может появиться ни на сайте,
    // ни в Telegram.
    // yaml даёт настоящий boolean, но сохраняем "true"-строку как страховку
    // от статей, где кто-то написал awaitingEditor в кавычках. И то и другое
    // должно тормозить публикацию.
    const awaiting =
      fm.awaitingEditor === true || fm.awaitingEditor === "true";
    if (awaiting) {
      held.push(`${rel}: ждёт ответа владельца — на сайт не выпущен`);
      continue;
    }

    // Картинки нет — материал на сайт не идёт. Тем же механизмом, что и
    // awaitingEditor: не предупреждением в логе, а физическим отсутствием
    // в lib/generated-posts.ts.
    //
    // Предупреждения оказалось мало. 08.08.2026 три черновика корреспондента
    // (`image.url: null`, фактчек ещё не пройден) легли прямо в content/posts
    // — путь черновика в спеке агента указывал на боевую папку — и вышли на
    // главную серыми прямоугольниками, минуя и бильда, и ворота публикатора.
    // Причину поправили, но полагаться на то, что в content/posts попадает
    // только проверенное, больше нельзя: это единственное место, через
    // которое проходят ВСЕ пути на сайт, здесь и держим правило владельца
    // 04.08.2026 «нельзя чтобы статьи выходили без картинки».
    const image = fm.image && typeof fm.image === "object" ? fm.image : {};
    if (!image.url) {
      held.push(`${rel}: нет image.url — на сайт не выпущен`);
      continue;
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
      lang,
      langs: [lang],
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
  const ru = articles.filter((a) => a.lang === "ru");
  if (ru.length && !ru.some((a) => a.featured)) {
    ru[0].featured = true;
  }

  // Языковые версии одного материала знают друг о друге: по этому списку
  // страница строит hreflang, а переключатель гасит недостающие языки.
  const langsBySlug = new Map();
  for (const a of articles) {
    const key = `${a.publishedDate ?? ""} ${a.slug}`;
    langsBySlug.set(key, [...(langsBySlug.get(key) ?? []), a.lang]);
  }
  for (const a of articles) {
    const key = `${a.publishedDate ?? ""} ${a.slug}`;
    a.langs = ["ru", "uz", "en"].filter((l) => (langsBySlug.get(key) ?? []).includes(l));
  }

  const dup = articles
    .map((a) => `${a.slug} ${a.lang}`)
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
  const byLang = ["ru", "uz", "en"]
    .map((l) => `${l}: ${articles.filter((a) => a.lang === l).length}`)
    .join(", ");
  console.log(`[posts] ${articles.length} версий (${byLang}) из ${files.length} .mdx → ${rel}`);
  for (const p of problems) console.warn(`[posts] ⚠ ${p}`);
  for (const h of held) console.warn(`[posts] ⏸ ${h}`);

  // Проблемы не роняют сборку: планёрка не должна вставать из-за одной
  // статьи с кривым frontmatter. Но в логе они видны.
  return problems.length;
}

build();
