// Общие типы контента. Вынесены из lib/data.ts отдельным модулем, чтобы
// сгенерированный lib/generated-posts.ts мог их импортировать без циклической
// зависимости (data.ts → generated-posts.ts → types.ts).

export type Rubric = {
  slug: string;
  title: string;
  color: string;
  textColor: string;
};

export type ArticleSource = {
  name: string;
  url: string;
};

/** Языки издания. Русский — исходный, остальные переводятся с него. */
export type Lang = "ru" | "uz" | "en";
export const LANGS: Lang[] = ["ru", "uz", "en"];

export type Article = {
  slug: string;
  /**
   * Язык этой версии материала. Русская версия — оригинал, узбекская
   * и английская переводятся с неё переводчиком редакции перед публикацией.
   * Слаг у всех трёх ОДИН: он опознаёт материал, а не текст, и по нему
   * связываются языковые версии, реестр Telegram и отзыв публикации.
   */
  lang: Lang;
  /** Языки, на которых этот материал существует — для переключателя и hreflang. */
  langs: Lang[];
  title: string;
  /** Лид плоским текстом — для карточек, поиска, og:description и Telegram. */
  lead: string;
  /**
   * Тот же лид, но с сохранённой markdown-разметкой ссылок. Задан только если
   * лид действительно содержит ссылки. Страница статьи рендерит его через
   * renderInline, остальные места используют плоский lead.
   */
  leadRich?: string;
  /**
   * Тело статьи поблочно. Блок хранится с markdown-префиксом, по которому
   * рендерер определяет тип: `## ` — подзаголовок, `### ` — под-подзаголовок,
   * `> ` — цитата, `- ` — пункты списка (весь список одним блоком, пункты
   * разделены `\n`). Блок без префикса — обычный абзац.
   *
   * Инлайновые ссылки в формате `[якорь](url)` разбирает renderInline
   * в app/article/[slug]/page.tsx.
   */
  body: string[];
  rubric: string;
  /**
   * Срок годности материала, а не его важность. Задаётся планёркой,
   * валидируется в scripts/build-posts.mjs, правила — в
   * config/newsroom-policy.json (секция urgency).
   *
   * breaking — публикуется немедленно и отдельно от остальных тем;
   * standard — обычная новость дня (значение по умолчанию);
   * deferred — не портится, выходит в спокойные часы.
   */
  urgency?: "breaking" | "standard" | "deferred";
  publishedAt: string;
  cover: string;
  featured?: boolean;
  tags: string[];

  // ─── поля, приходящие из frontmatter MDX (у демо-статей отсутствуют) ───

  /** SEO-описание из frontmatter. Если задано — идёт в meta description вместо lead. */
  description?: string;
  updatedAt?: string;
  /** Список первоисточников. Редполитика требует минимум два. */
  sources?: ArticleSource[];
  coverAlt?: string;
  coverCredit?: string;
  /** Дата-папка из content/posts/<YYYY-MM-DD>/ — нужна для сверки с автопостингом. */
  publishedDate?: string;
};
