import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  articles,
  formatDate,
  getArticle,
  getArticlesByRubric,
  getAuthor,
  getRubric,
  timeAgo,
} from "@/lib/data";
import { Fragment } from "react";
import { ReadingProgress } from "@/components/ReadingProgress";
import { AuthorBlock } from "@/components/AuthorBlock";
import { AdSlot } from "@/components/AdSlot";

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
      logo: {
        "@type": "ImageObject",
        url: "https://leap.uz/icon.png",
      },
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article className="container-news py-8">
        <AdSlot
          id="article-top-leaderboard"
          size="970x90"
          label="Топ-баннер статьи"
          className="mb-8"
        />
        <div className="mx-auto max-w-3xl">
          {rubric && (
            <Link
              href={`/rubric/${rubric.slug}`}
              className={`inline-block rounded px-2 py-0.5 text-xs font-semibold uppercase text-white ${rubric.color}`}
            >
              {rubric.title}
            </Link>
          )}
          <h1 className="mt-4 font-serif text-3xl font-bold leading-tight md:text-5xl">
            {article.title}
          </h1>
          <p className="mt-4 text-lg text-neutral-700 dark:text-neutral-300">
            {article.lead}
          </p>

          <div className="mt-6 flex items-center justify-between border-y border-neutral-200 py-3 text-sm text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
            <div>
              <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                {author.name}
              </span>
              <span className="mx-2">·</span>
              <time dateTime={article.publishedAt} title={formatDate(article.publishedAt)}>
                {timeAgo(article.publishedAt)}
              </time>
              <span className="mx-2">·</span>
              {article.readingTime} мин чтения
            </div>
            <div className="flex gap-2">
              <button
                aria-label="Поделиться"
                className="rounded-full border border-neutral-300 px-3 py-1 text-xs hover:border-brand hover:text-brand dark:border-neutral-700"
              >
                ↗ Поделиться
              </button>
            </div>
          </div>

          <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-xl">
            <Image
              src={article.cover}
              alt={article.title}
              fill
              sizes="(max-width: 1024px) 100vw, 768px"
              className="object-cover"
              priority
            />
          </div>

          <div className="mt-4 rounded-lg border border-brand/30 bg-brand-50 p-4 text-sm dark:bg-brand/10">
            <div className="font-semibold text-brand">⚡ Прочитать за 30 секунд</div>
            <p className="mt-1 text-neutral-800 dark:text-neutral-200">{article.lead}</p>
          </div>

          <div className="prose prose-neutral mt-8 max-w-none font-serif text-lg leading-relaxed dark:prose-invert">
            {article.body.map((p, i) => (
              <Fragment key={i}>
                <p className="mb-5">{p}</p>
                {i === 0 && article.body.length > 1 && (
                  <div className="my-8 not-prose mx-auto max-w-[336px]">
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
              <span
                key={t}
                className="rounded-full bg-neutral-100 px-3 py-1 text-xs dark:bg-neutral-800"
              >
                #{t}
              </span>
            ))}
          </div>

          <AuthorBlock author={author} />
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
            <h2 className="font-serif text-2xl font-bold">Ещё в рубрике</h2>
            <div className="mt-4 grid gap-6 sm:grid-cols-3">
              {related.map((a) => (
                <Link key={a.slug} href={`/article/${a.slug}`} className="group">
                  <div className="relative aspect-[16/10] overflow-hidden rounded-lg">
                    <Image
                      src={a.cover}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover transition group-hover:scale-105"
                    />
                  </div>
                  <h3 className="mt-3 font-serif text-base font-bold group-hover:text-brand">
                    {a.title}
                  </h3>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </>
  );
}
