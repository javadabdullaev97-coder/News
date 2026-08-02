// Единый парсер frontmatter для всей редакционной автоматизации.
//
// Раньше в scripts/ было три самодельных YAML-парсера
// (build-posts.mjs, post-to-telegram.mjs, preview-telegram-formats.mjs),
// каждый со своим подмножеством и своими багами: post-to-telegram не
// парсил sources как массив объектов до багфикса; preview использовал
// одиночные regexp'ы и молча тащил только первое совпадение; build
// сам справлялся, но был скопипастен. Одна нестандартная строка от
// планёрки — и три места читали её по-разному, TG-пост расходился
// с сайтом.
//
// Теперь один модуль поверх `yaml` (npm, полное соответствие YAML 1.2).
// Плюс общие текстовые хелперы, которые нужны и сайту, и постеру
// (decodeEntities, extractLede, stripMarkdownLinks).

import { parse as parseYAML } from "yaml";

const FM_MATCH = /^---\n([\s\S]*?)\n---/;

/**
 * Разбирает frontmatter mdx-файла в объект. Возвращает пустой объект,
 * если блока нет — вызывающая сторона решает, ошибка это или нет.
 *
 * Для строгих потребителей (build сайта) — используй parseFrontmatterStrict.
 */
export function parseFrontmatter(text) {
  const m = text.match(FM_MATCH);
  if (!m) return {};
  try {
    const parsed = parseYAML(m[1]);
    return (parsed && typeof parsed === "object") ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * То же, но бросает при отсутствии frontmatter или невалидном YAML.
 * Используется в build-posts, где отсутствие frontmatter означает
 * поломанную статью и должно валить сборку.
 */
export function parseFrontmatterStrict(text, ref = "unknown") {
  const m = text.match(FM_MATCH);
  if (!m) throw new Error(`нет frontmatter в ${ref}`);
  try {
    const parsed = parseYAML(m[1]);
    if (!parsed || typeof parsed !== "object") {
      throw new Error(`frontmatter в ${ref} пустой или не объект`);
    }
    return parsed;
  } catch (err) {
    throw new Error(`невалидный YAML в ${ref}: ${err.message}`);
  }
}

/** Обрезать frontmatter, оставить тело статьи. */
export function stripFrontmatter(text) {
  return text.replace(/^---\n[\s\S]*?\n---\n?/, "").trim();
}

// ─── HTML-сущности ───
// Редакция пишет числа с неразрывным пробелом (`1&nbsp;000`), кавычки-
// ёлочки как entity и т.д. — их надо раскрыть ДО escapeHTML, иначе
// «&nbsp;» уедет как «&amp;nbsp;».

const ENTITIES = {
  "&nbsp;": " ",
  "&mdash;": "—",
  "&ndash;": "–",
  "&laquo;": "«",
  "&raquo;": "»",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&hellip;": "…",
};

export function decodeEntities(s) {
  if (!s) return "";
  let out = String(s);
  for (const [ent, ch] of Object.entries(ENTITIES)) {
    out = out.split(ent).join(ch);
  }
  // Числовые: &#123; и &#x7b;
  out = out.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
  out = out.replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  // &amp; всегда последним — иначе преобразует уже раскрытые сущности.
  return out.split("&amp;").join("&");
}

/** `[якорь](url)` → `якорь`. Нужно для лидов, которые идут в plain-text
 *  (Telegram, og:description, поиск). */
export function stripMarkdownLinks(s) {
  return String(s).replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");
}

/** Escape для Telegram HTML parse_mode. */
export function escapeHTML(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Первый абзац тела как plain-text: без markdown-разметки ссылок, без
 * переносов внутри абзаца. Это то, что идёт в TG-пост и как лид на
 * карточке рубрики.
 */
export function extractLede(text) {
  const body = stripFrontmatter(text);
  const firstBlank = body.indexOf("\n\n");
  const lede = firstBlank === -1 ? body : body.slice(0, firstBlank);
  return stripMarkdownLinks(lede.trim()).replace(/\s*\n\s*/g, " ");
}
