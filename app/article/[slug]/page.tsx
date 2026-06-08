import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Fragment } from "react";
import {
  articles,
  formatDate,
  getArticle,
  getArticlesByRubric,
  getAuthor,
  getRubric,
  timeAgo,
} from "@/lib/data";
import { ReadingProgress } from "@/components/ReadingProgress";
import { AuthorBlock } from "@/components/AuthorBlock";
import { AdSlot } from "@/components/AdSlot";
import { StickyShare } from "@/components/StickyShare";
import { BookmarkButton } from "@/components/BookmarkButton";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { InlineSubscribe } from "@/components/InlineSubscribe";

export function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return {};
  const author = getAuthor(article.authorSlug);
  const url = `/article/${article.slug}`;
  return {
    title: article.title,
    description: article.lead,
    authors: [{ name: author.name }],
    openGraph: {
      type: "article",
      title: article.title,
      description: article.lead,
      url,
      images: [{ url: article.cover, width: 1600, height: 900, alt: article.title }],
      publishedTime: article.publishedAt,
      authors: [author.name],
      tags: article.tags,
      siteName: "LEAP",
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.lead,
      images: [article.cover],
    },
    alternates: { canonical: url },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  const rubric = getRubric(article.rubric);
  const author = getAuthor(article.authorSlug);
  const related = getArticlesByRubric(article.rubric)
    .filter((a) => a.slug !== article.slug)
    .slice(0, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.lead,
    image: [article.cover],
    datePublished: article.publishedAt,
    dateModified: article.publishedAt,
    author: [{ "@type": "Person", name: author.name }],
    publisher: {
      "@type": "Organization",
      name: "LEAP",
      logo: { "@type": "ImageObject", url: "https://leap.uz/icon.png" },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://leap.uz/article/${article.slug}`,
    },
    keywords: article.tags.join(", "),
    articleSection: rubric?.title,
  };

  return (
    <>
      <ReadingProgress />
      <StickyShare title={article.title} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article className="container-news py-6">
        <AdSlot
          id="article-top-leaderboard"
          size="970x90"
          label="Топ-баннер статьи"
          className="mb-6"
        />

        <div className="mx-auto max-w-3xl">
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
            <h1 className="mt-4 font-serif text-4xl font-bold leading-[1.1] tracking-tight md:text-5xl lg:text-6xl">
              {article.title}
            </h1>
            <p className="mt-5 font-serif text-xl leading-relaxed text-neutral-700 md:text-2xl dark:text-neutral-300">
              {article.lead}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-neutral-200 py-3 text-sm text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="text-neutral-400">✍︎</span>
              <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                {author.name}
              </span>
            </span>
            <span aria-hidden className="text-neutral-300 dark:text-neutral-700">·</span>
            <time
              dateTime={article.publishedAt}
              title={formatDate(article.publishedAt)}
              className="inline-flex items-center gap-1.5"
            >
              <span aria-hidden className="text-neutral-400">🕐</span>
              {timeAgo(article.publishedAt)}
            </time>
            <span aria-hidden className="text-neutral-300 dark:text-neutral-700">·</span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="text-neutral-400">📖</span>
              {article.readingTime} мин чтения
            </span>
            <div className="ml-auto">
              <BookmarkButton slug={article.slug} variant="labelled" />
            </div>
          </div>

          <figure className="mt-8">
            <div className="relative aspect-[16/9] overflow-hidden rounded-xl">
              <Image
                src={article.cover}
                alt={article.title}
                fill
                sizes="(max-width: 1024px) 100vw, 768px"
                className="object-cover"
                priority
              />
            </div>
            <figcaption className="mt-2 text-xs text-neutral-500">
              Фото: {rubric?.title.toLowerCase()} · {timeAgo(article.publishedAt)}
            </figcaption>
          </figure>

          <aside className="mt-6 rounded-xl border-l-4 border-brand bg-brand-50 px-5 py-4 text-sm dark:bg-brand/10">
            <div className="text-xs font-bold uppercase tracking-wider text-brand">
              ⚡ Прочитать за 30 секунд
            </div>
            <p className="mt-1.5 leading-relaxed text-neutral-800 dark:text-neutral-100">
              {article.lead}
            </p>
          </aside>

          <div className="prose prose-neutral mt-10 max-w-none font-serif text-[19px] leading-[1.75] tracking-[-0.005em] dark:prose-invert prose-p:my-5 prose-blockquote:my-8 prose-blockquote:border-l-4 prose-blockquote:border-brand prose-blockquote:bg-neutral-50 prose-blockquote:px-6 prose-blockquote:py-4 prose-blockquote:not-italic prose-blockquote:font-serif prose-blockquote:text-xl prose-blockquote:font-medium dark:prose-blockquote:bg-neutral-900">
            {article.body.map((p, i) => (
              <Fragment key={i}>
                <p>{p}</p>
                {i === 0 && article.body.length > 1 && (
                  <div className="not-prose mx-auto my-10 max-w-[336px]">
                    <AdSlot
                      id={`article-${article.slug}-inarticle-1`}
                      size="300x250"
                      label="In-article #1"
                    />
                  </div>
                )}
              </Fragment>
            ))}
          </div>

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

          <AuthorBlock author={author} />

          <InlineSubscribe />
        </div>

        <div className="mx-auto mt-12 max-w-5xl">
          <AdSlot
            id="article-end-billboard"
            size="970x250"
            label="Под статьёй (перед related)"
          />
        </div>

        {related.length > 0 && (
          <section className="mx-auto mt-16 max-w-5xl">
            <div className="flex items-baseline justify-between border-b border-neutral-200 pb-3 dark:border-neutral-800">
              <h2 className="font-serif text-2xl font-bold">Продолжите читать</h2>
              {rubric && (
                <Link
                  href={`/rubric/${rubric.slug}`}
                  className="text-sm font-medium text-brand hover:underline"
                >
                  Все в {rubric.title.toLowerCase()} →
                </Link>
              )}
            </div>
            <div className="mt-6 grid gap-6 sm:grid-cols-3">
              {related.map((a) => (
                <Link key={a.slug} href={`/article/${a.slug}`} className="group">
                  <div className="relative aspect-[16/10] overflow-hidden rounded-lg ring-1 ring-neutral-200/0 transition-all duration-300 group-hover:shadow-lg group-hover:ring-neutral-200 dark:group-hover:ring-neutral-800">
                    <Image
                      src={a.cover}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <h3 className="mt-3 font-serif text-base font-bold leading-snug transition-colors group-hover:text-brand">
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
