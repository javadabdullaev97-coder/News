import type { Article, Rubric } from "./types";
import { mdxArticles } from "./generated-posts";

export type { Article, ArticleSource, Rubric, Lang } from "./types";
import type { Lang } from "./types";
export { LANGS } from "./types";

export const rubrics: Rubric[] = [
  { slug: "politics", title: "Политика", color: "bg-blue-500", textColor: "text-blue-500" },
  { slug: "economy", title: "Экономика", color: "bg-emerald-500", textColor: "text-emerald-500" },
  { slug: "business", title: "Бизнес", color: "bg-amber-500", textColor: "text-amber-500" },
  { slug: "society", title: "Общество", color: "bg-rose-500", textColor: "text-rose-500" },
  { slug: "sport", title: "Спорт", color: "bg-orange-500", textColor: "text-orange-500" },
  { slug: "world", title: "Мир", color: "bg-sky-500", textColor: "text-sky-500" },
  { slug: "tech", title: "Технологии", color: "bg-violet-500", textColor: "text-violet-500" },
  { slug: "culture", title: "Культура", color: "bg-pink-500", textColor: "text-pink-500" },
];

/**
 * Демонстрационный корпус, с которого начинался сайт. Живые материалы редакции
 * приходят из content/posts/**\/*.mdx через lib/generated-posts.ts.
 */
// Демо-корпус удалён 07.08.2026 по решению владельца.
//
// Это были заглушки, на которых сайт жил до запуска редакции: 37 материалов
// мая–июня, написанных не редакцией и не проходивших ни фактчек, ни бильда.
// Пока живых материалов было мало, они держали ленту непустой. Теперь их
// 268 на трёх языках, а заглушки продолжали идти в карту сайта наравне
// с настоящими публикациями — то есть Google индексировал бы их как
// материалы издания. Заодно они и создавали видимость 47 «непереведённых»
// статей: переводов у них нет и быть не могло.

/**
 * ВСЕ языковые версии всех материалов. Нужен маршрутам /uz/… и /en/…
 * и переключателю языка; ленты и списки берут `articles` (только русские).
 *
 * Источник теперь один — content/posts/**\/*.mdx через generated-posts.
 * Демо-корпуса больше нет, подмешивать нечего.
 */
export const allArticles: Article[] = [...mdxArticles].sort((a, b) =>
  a.publishedAt < b.publishedAt ? 1 : -1,
);

/**
 * Лента издания. Пока русская: главная, рубрики и поиск живут на русском,
 * переводы существуют на уровне отдельных страниц материалов. Когда
 * локализуем интерфейс целиком, здесь появится параметр языка.
 */
export const articles: Article[] = allArticles.filter((a) => a.lang === "ru");

/**
 * Лента конкретного языка. Для uz/en это только переведённые материалы:
 * показывать в узбекской ленте русский текст значит обманывать читателя,
 * который переключил язык.
 */
export function articlesByLang(lang: Lang): Article[] {
  return lang === DEFAULT_LANG ? articles : allArticles.filter((a) => a.lang === lang);
}

export function getArticle(slug: string, lang: Lang = DEFAULT_LANG) {
  return (
    allArticles.find((a) => a.slug === slug && a.lang === lang) ??
    (lang === DEFAULT_LANG ? articles.find((a) => a.slug === slug) : undefined)
  );
}

export function getArticlesByRubric(rubricSlug: string) {
  return articles.filter((a) => a.rubric === rubricSlug);
}

export function getRubric(slug: string) {
  return rubrics.find((r) => r.slug === slug);
}

/**
 * Адрес статьи: /ru/2026/08/04/slug
 *
 * ПОЧЕМУ С ДАТОЙ. Слаг сам по себе уникален только внутри одного дня.
 * Новостные заголовки повторяются из года в год — «Курс доллара вырос»,
 * «В Ташкенте отключат воду», — и без даты второй такой материал пришлось бы
 * называть чужим именем с суффиксом. Дата снимает вопрос навсегда: на одну
 * дату одно название, дальше сколько угодно.
 *
 * ПОЧЕМУ БЕЗ РУБРИКИ. Статьи меняют рубрику — её проставляет seo-агент после
 * редактора, и переклассификация дело обычное. Рубрика в адресе означала бы,
 * что каждый такой переезд ломает ссылку, уже разосланную в канал и
 * проиндексированную. Дата не меняется никогда.
 *
 * ЯЗЫКОВОЙ ПРЕФИКС на вырост: сейчас издание одноязычное, но узбекская и
 * английская версии запланированы, и вводить префикс потом — значит второй
 * раз ломать все ссылки.
 */
export const DEFAULT_LANG = "ru";

export function articleHref(
  a: Pick<Article, "slug" | "publishedAt"> & { publishedDate?: string; lang?: Lang },
  lang?: Lang,
) {
  // publishedDate — каталог дня из content/posts, самый надёжный источник.
  // Для демо-корпуса его нет, поэтому день берётся из publishedAt по
  // ташкентскому календарю: адрес обязан совпадать с тем днём, который
  // читатель видит под заголовком.
  const day = a.publishedDate ?? tashkentDay(a.publishedAt);
  const [y, m, d] = day.split("-");
  return `/${lang ?? a.lang ?? DEFAULT_LANG}/${y}/${m}/${d}/${a.slug}`;
}

function tashkentDay(iso: string) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "1970-01-01";
  const d = new Date(t + 5 * 60 * 60 * 1000); // Ташкент — UTC+5 круглый год
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}

export function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateTime(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).replace(" г.", "");
  const time = d.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date}, ${time}`;
}

export function feedDate(iso: string) {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "только что";
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${pluralRu(hours, "час", "часа", "часов")} назад`;
  const days = Math.floor(hours / 24);
  if (days <= 3) return `${days} ${pluralRu(days, "день", "дня", "дней")} назад`;
  return d
    .toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
    .replace(" г.", "");
}

export function timeAgo(iso: string) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "только что";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ${pluralRu(days, "день", "дня", "дней")} назад`;
  return formatDate(iso);
}

function pluralRu(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
