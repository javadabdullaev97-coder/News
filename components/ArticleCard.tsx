import Link from "next/link";
import Image from "next/image";
import { Article, getRubric, timeAgo } from "@/lib/data";
import { BookmarkButton } from "./BookmarkButton";

type Variant = "hero" | "large" | "default" | "compact";

export function ArticleCard({
  article,
  variant = "default",
}: {
  article: Article;
  variant?: Variant;
}) {
  const rubric = getRubric(article.rubric);
  const href = `/article/${article.slug}`;

  if (variant === "hero") {
    return (
      <Link
        href={href}
        className="group relative block overflow-hidden rounded-xl ring-1 ring-neutral-200/60 transition-all duration-300 hover:ring-brand/40 hover:shadow-xl dark:ring-neutral-800"
      >
        <div className="relative aspect-[16/9] overflow-hidden">
          <Image
            src={article.cover}
            alt={article.title}
            fill
            sizes="(max-width: 1024px) 100vw, 66vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
          <div className="absolute bottom-0 p-6 text-white">
            {rubric && (
              <span
                className={`inline-block rounded px-2 py-0.5 text-xs font-semibold uppercase ${rubric.color}`}
              >
                {rubric.title}
              </span>
            )}
            <h2 className="mt-3 font-serif text-3xl font-bold leading-tight md:text-4xl">
              {article.title}
            </h2>
            <p className="mt-2 hidden max-w-2xl text-neutral-200 md:block">
              {article.lead}
            </p>
            <div className="mt-3 text-xs text-neutral-300">
              {timeAgo(article.publishedAt)}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  if (variant === "compact") {
    return (
      <Link
        href={href}
        className="group -mx-2 flex gap-3 rounded-lg border-b border-neutral-200 px-2 py-3 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
      >
        <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded">
          <Image
            src={article.cover}
            alt=""
            fill
            sizes="96px"
            className="object-cover"
          />
        </div>
        <div>
          {rubric && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-brand">
              {rubric.title}
            </span>
          )}
          <h3 className="text-sm font-semibold leading-snug transition-colors group-hover:text-brand">
            {article.title}
          </h3>
          <div className="mt-1 text-xs text-neutral-500">{timeAgo(article.publishedAt)}</div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="group block transition-all duration-300 hover:-translate-y-1"
    >
      <div className="relative aspect-[16/10] overflow-hidden rounded-lg ring-1 ring-neutral-200/0 transition-all duration-300 group-hover:shadow-lg group-hover:ring-neutral-200 dark:group-hover:ring-neutral-800">
        <Image
          src={article.cover}
          alt={article.title}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover"
        />
        <div className="absolute right-2 top-2 transition-opacity">
          <BookmarkButton slug={article.slug} />
        </div>
      </div>
      <div className="mt-3">
        {rubric && (
          <span className="text-xs font-semibold uppercase tracking-wider text-brand">
            {rubric.title}
          </span>
        )}
        <h3 className="mt-1 font-serif text-lg font-bold leading-snug transition-colors group-hover:text-brand">
          {article.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">
          {article.lead}
        </p>
        <div className="mt-2 text-xs text-neutral-500">
          {timeAgo(article.publishedAt)}
        </div>
      </div>
    </Link>
  );
}
