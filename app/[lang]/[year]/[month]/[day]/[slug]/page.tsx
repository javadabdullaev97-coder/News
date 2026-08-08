import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Fragment } from "react";
import {
  allArticles,
  articleHref,
  articles,
  formatDate,
  getArticle,
  getArticlesByRubric,
  getRubric,
  timeAgo,
} from "@/lib/data";
import type { Lang } from "@/lib/types";
import { LangSwitch } from "@/components/LangSwitch";
import { ReadingProgress } from "@/components/ReadingProgress";
import { AdSlot } from "@/components/AdSlot";
import { BookmarkButton } from "@/components/BookmarkButton";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { InlineSubscribe } from "@/components/InlineSubscribe";
import { ShareButtons } from "@/components/ShareButtons";

/**
 * Инлайновые ссылки `[якорь](url)` из тела статьи.
 *
 * Открываются в той же вкладке — §3 редполитики. Ссылка здесь сноска
 * на первоисточник, а не выход с сайта: читатель идёт сверить цифру
 * в постановлении и возвращается кнопкой «назад». Кому нужна новая
 * вкладка, сделает cmd/ctrl+click — принудительный target="_blank"
 * такую возможность не добавляет, а отнимает выбор.
 */
function renderInline(text: string): React.ReactNode[] {
  const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = regex.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(
      <a
        key={`l-${key++}`}
        href={m[2]}
        className="text-brand underline decoration-brand/30 decoration-2 underline-offset-4 transition-colors hover:decoration-brand"
      >
        {m[1]}
      </a>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/**
 * Блок тела статьи → элемент. Тип блока определяется markdown-префиксом,
 * который проставляет генератор (см. scripts/build-posts.mjs и lib/types.ts).
 * Демо-статьи из lib/data.ts префиксов не содержат и попадают в ветку абзаца.
 */
function renderBlock(block: string, key: number): React.ReactNode {
  if (block.startsWith("#### ")) {
    return <h4 key={key}>{renderInline(block.slice(5))}</h4>;
  }
  if (block.startsWith("### ")) {
    return <h3 key={key}>{renderInline(block.slice(4))}</h3>;
  }
  if (block.startsWith("## ")) {
    return <h2 key={key}>{renderInline(block.slice(3))}</h2>;
  }
  if (block.startsWith("> ")) {
    return (
      <blockquote key={key}>
        <p>{renderInline(block.slice(2))}</p>
      </blockquote>
    );
  }
  if (block.startsWith("- ")) {
    const items = block.split("\n").map((l) => l.replace(/^-\s+/, ""));
    return (
      <ul key={key}>
        {items.map((item, i) => (
          <li key={i}>{renderInline(item)}</li>
        ))}
      </ul>
    );
  }
  return <p key={key}>{renderInline(block)}</p>;
}

// Каждой статье — свой путь /ru/ГГГГ/ММ/ДД/slug. Параметры разбираются
// из готового адреса, а не собираются заново: articleHref остаётся
// единственным местом, где формат маршрута описан.
export function generateStaticParams() {
  // По одному пути на КАЖДУЮ языковую версию: /ru/…, /uz/…, /en/…
  // Страницы существуют только для реально переведённых материалов —
  // ссылка на непереведённый язык нигде не выдаётся (см. LangSwitch).
  return allArticles.map((a) => {
    const [, lang, year, month, day, slug] = articleHref(a).split("/");
    return { lang, year, month, day, slug };
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; lang: Lang }>;
}): Promise<Metadata> {
  const { slug, lang } = await params;
  const article = getArticle(slug, lang);
  if (!article) return {};
  const url = articleHref(article);
  // hreflang: поисковику нужно знать, что это версии одного материала,
  // иначе три перевода конкурируют друг с другом как дубли.
  const languages = Object.fromEntries(
    article.langs.map((l) => [l, articleHref(article, l)]),
  );
  return {
    title: article.title,
    description: article.description ?? article.lead,
    openGraph: {
      type: "article",
      title: article.title,
      description: article.description ?? article.lead,
      url,
      images: [{ url: article.cover, width: 1600, height: 900, alt: article.title }],
      publishedTime: article.publishedAt,
      tags: article.tags,
      siteName: "LEAP",
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.description ?? article.lead,
      images: [article.cover],
    },
    alternates: { canonical: url, languages },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string; lang: Lang }>;
}) {
  const { slug, lang } = await params;
  const article = getArticle(slug, lang);
  if (!article) notFound();

  const rubric = getRubric(article.rubric);
  const sameRubric = getArticlesByRubric(article.rubric).filter(
    (a) => a.slug !== article.slug,
  );
  const related = sameRubric.slice(0, 3);
  const popular = [
    ...sameRubric,
    ...articles.filter(
      (a) => a.slug !== article.slug && a.rubric !== article.rubric,
    ),
  ].slice(0, 5);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.description ?? article.lead,
    image: [article.cover],
    datePublished: article.publishedAt,
    dateModified: article.publishedAt,
    author: [{ "@type": "Organization", name: "LEAP News" }],
    publisher: {
      "@type": "Organization",
      name: "LEAP",
      logo: { "@type": "ImageObject", url: "https://leap.uz/icon.png" },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://leap.uz${articleHref(article)}`,
    },
    keywords: article.tags.join(", "),
    articleSection: rubric?.title,
  };

  return (
    <>
      <ReadingProgress />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article className="container-news py-6">
        <AdSlot
          id={`article-top-billboard`}
          size="970x250"
          label="Премиум-баннер · топ статьи"
          className="mb-8"
        />

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Breadcrumbs
              items={[
                { label: "Главная", href: "/" },
                rubric
                  ? { label: rubric.title, href: `/rubric/${rubric.slug}` }
                  : { label: "Статья" },
                { label: article.title },
              ]}
            />

            <div className="mt-6">
              {rubric && (
                <Link
                  href={`/rubric/${rubric.slug}`}
                  className={`inline-block rounded px-2 py-0.5 text-xs font-semibold uppercase text-white ${rubric.color}`}
                >
                  {rubric.title}
                </Link>
              )}
              <h1 className="mt-4 max-w-[610px] text-[26px] font-extrabold leading-[1.18] tracking-tight md:text-[30px] lg:text-[34px]">
                {article.title}
              </h1>
              <p className="mt-3 max-w-[610px] text-base font-medium leading-[1.45] text-neutral-700 md:mt-4 md:text-[19px] dark:text-neutral-300">
                {article.leadRich ? renderInline(article.leadRich) : article.lead}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-neutral-200 py-3 text-sm text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
              <time
                dateTime={article.publishedAt}
                title={formatDate(article.publishedAt)}
                className="inline-flex items-center gap-1.5"
              >
                <span aria-hidden className="text-neutral-400">🕐</span>
                {timeAgo(article.publishedAt)}
              </time>
              <div className="ml-auto flex items-center gap-2">
                <LangSwitch article={article} />
                <ShareButtons title={article.title} />
                <BookmarkButton slug={article.slug} variant="labelled" />
              </div>
            </div>

            <figure className="mt-8">
              <div className="relative aspect-[16/9] overflow-hidden rounded-xl">
                <Image
                  src={article.cover}
                  alt={article.coverAlt ?? article.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 850px"
                  className="object-cover"
                  priority
                />
              </div>
              <figcaption className="mt-2 text-xs text-neutral-500">
                {article.coverCredit
                  ? `Фото: ${article.coverCredit}`
                  : `Фото: ${rubric?.title.toLowerCase()}`}{" "}
                · {timeAgo(article.publishedAt)}
              </figcaption>
            </figure>

            <aside className="mt-6 max-w-[610px] rounded-xl border-l-4 border-brand bg-brand-50 px-5 py-4 text-sm dark:bg-brand/10">
              <div className="text-xs font-bold uppercase tracking-wider text-brand">
                ⚡ Прочитать за 30 секунд
              </div>
              <p className="mt-1.5 leading-relaxed text-neutral-800 dark:text-neutral-100">
                {article.lead}
              </p>
            </aside>

            {/* Вертикальный ритм снят с spot.uz (17px/1.5, отступ абзаца 10px,
                колонка 610px) — владелец выбрал их плотность 08.08.2026.
                Отступы у абзацев и списков заданы ТОЛЬКО снизу: маргины
                соседей схлопываются, и при парном my-* верхний отступ абзаца
                перебивал бы нижний отступ заголовка — подзаголовок отрывался
                от своего текста. Здесь нижний отступ H2 (8px) работает как есть.
                Дефолты @tailwindcss/typography заданы в em и дают 57px перед H2
                против 20px между абзацами, поэтому переопределены явно. */}
            <div className="prose prose-neutral mt-8 max-w-[610px] text-[16px] leading-[1.5] tracking-[-0.005em] md:text-[17px] dark:prose-invert prose-p:mt-0 prose-p:mb-[10px] prose-h2:mt-6 prose-h2:mb-2 prose-h2:text-[20px] prose-h2:leading-[1.3] md:prose-h2:text-[22px] prose-h3:mt-5 prose-h3:mb-1.5 prose-h3:text-[18px] prose-h3:leading-[1.35] md:prose-h3:text-[19px] prose-h4:mt-[18px] prose-h4:mb-1 prose-h4:text-[17px] prose-ul:mt-0 prose-ul:mb-[10px] prose-li:my-[3px] prose-blockquote:my-[15px] prose-blockquote:border-l-4 prose-blockquote:border-brand prose-blockquote:bg-neutral-50 prose-blockquote:px-5 prose-blockquote:py-3 prose-blockquote:not-italic prose-blockquote:font-medium dark:prose-blockquote:bg-neutral-900">
              {article.body.map((block, i) => renderBlock(block, i))}
            </div>

            {article.sources && article.sources.length > 0 && (
              <section className="mt-8 max-w-[610px] rounded-xl border border-neutral-200 px-5 py-4 dark:border-neutral-800">
                <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Источники
                </h2>
                <ol className="mt-3 space-y-2 text-sm">
                  {article.sources.map((s) => (
                    <li key={s.url} className="flex gap-2">
                      <span aria-hidden className="text-neutral-400">
                        ↗
                      </span>
                      <a
                        href={s.url}
                        className="text-brand underline decoration-brand/30 decoration-2 underline-offset-4 transition-colors hover:decoration-brand"
                      >
                        {s.name}
                      </a>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            <div className="mt-8 flex flex-wrap gap-2">
              {article.tags.map((t) => (
                <Link
                  key={t}
                  href={`/rubric/${article.rubric}`}
                  className="rounded-full bg-neutral-100 px-3 py-1 text-xs transition-colors hover:bg-brand hover:text-white dark:bg-neutral-800"
                >
                  #{t}
                </Link>
              ))}
            </div>

            <div className="mt-8 border-t border-neutral-200 pt-6 dark:border-neutral-800">
              <div className="text-xs uppercase tracking-wider text-neutral-500">
                Поделиться
              </div>
              <div className="mt-3">
                <ShareButtons title={article.title} size="lg" />
              </div>
            </div>

            <InlineSubscribe />
          </div>

          <aside className="space-y-6">
            <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
              <div className="flex items-baseline justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider">
                  Сейчас читают
                </h3>
                <span className="text-xs text-neutral-500">обновлено</span>
              </div>
              <ol className="mt-2">
                {popular.map((a, i) => (
                  <li
                    key={a.slug}
                    className="flex gap-3 border-b border-neutral-100 py-3 last:border-0 dark:border-neutral-800"
                  >
                    <span className="font-serif text-2xl font-bold text-brand">
                      {i + 1}
                    </span>
                    <Link
                      href={articleHref(a)}
                      className="text-sm font-medium leading-snug hover:text-brand"
                    >
                      {a.title}
                    </Link>
                  </li>
                ))}
              </ol>
            </div>

            <div className="sticky top-[140px]">
              <AdSlot
                id={`article-${article.slug}-sidebar-rect`}
                size="300x250"
                label="Сайдбар статьи · sticky"
              />
            </div>
          </aside>
        </div>

        <AdSlot
          id="article-end-billboard"
          size="970x250"
          label="Премиум-баннер · после статьи"
          className="mt-16"
        />

        {related.length > 0 && (
          <section className="mt-16 border-t border-neutral-200 pt-10 dark:border-neutral-800">
            <div className="flex items-baseline justify-between pb-3">
              <h2 className="text-2xl font-bold">Продолжите читать</h2>
              {rubric && (
                <Link
                  href={`/rubric/${rubric.slug}`}
                  className="text-sm font-medium text-brand hover:underline"
                >
                  Все в {rubric.title.toLowerCase()} →
                </Link>
              )}
            </div>
            <div className="mt-2 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((a) => (
                <Link key={a.slug} href={articleHref(a)} className="group">
                  <div className="relative aspect-[16/10] overflow-hidden rounded-lg ring-1 ring-neutral-200/0 transition-all duration-300 group-hover:shadow-lg group-hover:ring-neutral-200 dark:group-hover:ring-neutral-800">
                    <Image
                      src={a.cover}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover"
                    />
                  </div>
                  <h3 className="mt-3 text-base font-bold leading-snug transition-colors group-hover:text-brand">
                    {a.title}
                  </h3>
                  <div className="mt-1 text-xs text-neutral-500">
                    {timeAgo(a.publishedAt)}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </>
  );
}
