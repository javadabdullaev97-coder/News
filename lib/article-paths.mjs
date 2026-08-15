// Разбор путей content/posts: язык, слаг, дата, публичный адрес.
//
// Эти правила уже действуют в scripts/post-to-telegram.mjs — там они живут
// собственной копией, и трогать её здесь я намеренно не стал: телеграм-канал
// работает, а любая правка рабочего постера ради красоты — это риск без
// повода. Новый код (Instagram, Facebook) берёт правила отсюда. Если копии
// когда-нибудь начнут расходиться, мигрировать надо телеграм на этот модуль,
// а не наоборот.
//
// Правила выведены из двух аварий, обе описаны в post-to-telegram.mjs:
//   04.08.2026 — суффикс языка попадал в слаг, и ссылки в переводах вели
//                на /ru/…/<slug>.en, то есть в никуда;
//   04.08.2026 — переводы считались отдельными материалами и уходили
//                в русский канал (28 постов на узбекском и английском).

export const DEFAULT_LANG = "ru";
export const TRANSLATED_LANGS = new Set(["uz", "en"]);

/** Язык версии из имени файла: <slug>.uz.mdx → uz, <slug>.mdx → ru. */
export function langFromPath(p) {
  const m = p
    .replace(/\.mdx$/, "")
    .split("/")
    .pop()
    .match(/^.+\.([a-z]{2})$/);
  return m && TRANSLATED_LANGS.has(m[1]) ? m[1] : DEFAULT_LANG;
}

/** Слаг из пути. Суффикс языка частью слага НЕ является. */
export function slugFromPath(p) {
  const base = p
    .replace(/\.mdx$/, "")
    .split("/")
    .pop();
  const m = base.match(/^(.+)\.([a-z]{2})$/);
  return m && TRANSLATED_LANGS.has(m[2]) ? m[1] : base;
}

/** Дата из пути: content/posts/2026-07-31/… → 2026-07-31. */
export function dateFromPath(p) {
  const m = p.match(/content\/posts\/(\d{4}-\d{2}-\d{2})\//);
  return m ? m[1] : null;
}

/** Месяц из даты: 2026-07-31 → 2026-07. Каталог хранения картинок. */
export function monthFromDate(date) {
  return date ? date.slice(0, 7) : null;
}

/**
 * Публичный адрес статьи. Обязан совпадать с роутером Next.js и с
 * articleHref() из lib/data.ts: /<язык>/ГГГГ/ММ/ДД/<slug>.
 */
export function articleUrl(siteUrl, date, slug, lang = DEFAULT_LANG) {
  const base = String(siteUrl).replace(/\/$/, "");
  if (!date) return `${base}/article/${slug}`;
  return `${base}/${lang}/${date.replace(/-/g, "/")}/${slug}`;
}
