import { Fragment } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArticleCard } from "@/components/ArticleCard";
import { AdSlot, NativeAdCard } from "@/components/AdSlot";
import { LeapTag } from "@/components/LeapTag";
import { CurrencyWidget } from "@/components/CurrencyWidget";
import { WeatherWidget } from "@/components/WeatherWidget";
import { articles, getArticlesByRubric, getRubric, rubrics } from "@/lib/data";

export function generateStaticParams() {
  return rubrics.map((r) => ({ slug: r.slug }));
}

export default async function RubricPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const rubric = getRubric(slug);
  if (!rubric) notFound();

  const list = getArticlesByRubric(slug);
  const popular = articles.slice(0, 5);

  return (
    <div className="container-news py-6">
      <AdSlot
        id={`rubric-${slug}-top-billboard`}
        size="970x250"
        label={`Премиум-баннер · рубрика «${rubric.title}»`}
        className="mb-8"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-4">
            <span className={`h-12 w-1.5 rounded ${rubric.color}`} />
            <div>
              <LeapTag rubricSlug={rubric.slug} size="xl" />
              <p className="mt-1 text-sm text-neutral-500">
                {rubric.title} · все материалы
              </p>
            </div>
          </div>

          {list.length === 0 ? (
            <p className="mt-12 text-center text-neutral-500">
              В этой рубрике пока нет материалов.
            </p>
          ) : (
            <div className="mt-8 grid gap-8 sm:grid-cols-2">
              {list.map((a, i) => (
                <Fragment key={a.slug}>
                  <ArticleCard article={a} />
                  {i === 3 && (
                    <NativeAdCard
                      id={`rubric-${slug}-native-1`}
                      brand="Рекламодатель"
                    />
                  )}
                </Fragment>
              ))}
            </div>
          )}
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
                    href={`/article/${a.slug}`}
                    className="text-sm font-medium leading-snug hover:text-brand"
                  >
                    {a.title}
                  </Link>
                </li>
              ))}
            </ol>
          </div>

          <AdSlot
            id={`rubric-${slug}-sidebar-rect`}
            size="300x250"
            label="Сайдбар рубрики"
          />

          <WeatherWidget />

          <CurrencyWidget
            codes={
              slug === "business"
                ? ["USD", "EUR", "RUB", "GBP", "CHF", "JPY", "CNY", "KZT"]
                : undefined
            }
          />
        </aside>
      </div>
    </div>
  );
}
