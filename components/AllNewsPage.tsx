import Image from "next/image";
import Link from "next/link";
import { AdSlot } from "@/components/AdSlot";
import { articleHref, articlesByLang, feedDate, getRubric, type Article, type Lang } from "@/lib/data";
import { rubricTitle, t } from "@/lib/i18n";
import { LoadMoreList } from "@/app/all/LoadMoreList";

function FeedMeta({ article }: { article: Article }) {
  const lang = article.lang;
  const rubric = getRubric(article.rubric);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
      <time dateTime={article.publishedAt}>{feedDate(article.publishedAt)}</time>
      {rubric && (
        <span className={`text-xs font-semibold ${rubric.textColor}`}>
          {rubricTitle(article.rubric, lang, rubric.title)}
        </span>
      )}
    </div>
  );
}

function FeatureRow({ article }: { article: Article }) {
  const href = articleHref(article);
  return (
    <Link href={href} className="group block py-6">
      <FeedMeta article={article} />
      <h2 className="mt-2 font-serif text-2xl font-bold leading-[1.2] tracking-tight transition-colors group-hover:text-brand md:text-3xl">
        {article.title}
      </h2>
      <p className="mt-3 max-w-3xl text-base leading-relaxed text-neutral-700 dark:text-neutral-300">
        {article.lead}
      </p>
      <div className="relative mt-4 aspect-[16/9] overflow-hidden rounded-lg">
        <Image
          src={article.cover}
          alt=""
          fill
          sizes="(max-width: 1024px) 100vw, 800px"
          className="object-cover"
        />
      </div>
    </Link>
  );
}

function ListRow({ article }: { article: Article }) {
  const href = articleHref(article);
  return (
    <Link href={href} className="group block py-6">
      <FeedMeta article={article} />
      <div className="mt-2 flex gap-5">
        <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-lg sm:h-28 sm:w-40 md:h-32 md:w-48">
          <Image
            src={article.cover}
            alt=""
            fill
            sizes="(max-width: 768px) 128px, 192px"
            className="object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-xl font-bold leading-snug tracking-tight transition-colors group-hover:text-brand md:text-2xl">
            {article.title}
          </h3>
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400 md:text-base">
            {article.lead}
          </p>
        </div>
      </div>
    </Link>
  );
}

/** Единая лента материалов одного языка. */
export function AllNewsPage({ lang = "ru" }: { lang?: Lang }) {
  const sorted = [...articlesByLang(lang)].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );

  return (
    <div className="container-news py-6">
      <AdSlot
        id="all-top-billboard"
        size="970x250"
        label="Премиум-баннер · все новости"
        className="mb-8"
      />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-4 border-b border-neutral-200 pb-6 dark:border-neutral-800">
            <span className="h-12 w-1.5 rounded bg-brand" />
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
                {t(lang, "all")}
              </h1>
            </div>
          </div>

          <LoadMoreList
            pageSize={100}
            items={sorted.map((a) =>
              a.featured ? (
                <FeatureRow key={a.slug} article={a} />
              ) : (
                <ListRow key={a.slug} article={a} />
              ),
            )}
          />
        </div>

        <aside>
          <div className="sticky top-[140px]">
            <AdSlot
              id="all-sidebar-tall"
              size="300x600"
              label="Сайдбар · все новости"
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
