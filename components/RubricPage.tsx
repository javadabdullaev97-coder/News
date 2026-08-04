import { notFound } from "next/navigation";
import Link from "next/link";
import { ArticleCard } from "@/components/ArticleCard";
import { AdSlot } from "@/components/AdSlot";
import { LeapTag } from "@/components/LeapTag";
import { CurrencyWidget } from "@/components/CurrencyWidget";
import { WeatherWidget } from "@/components/WeatherWidget";
import { articleHref, articlesByLang, getRubric, rubrics, type Lang } from "@/lib/data";
import { rubricTitle, t } from "@/lib/i18n";

export const RUBRIC_SLUGS = rubrics.map((r) => r.slug);

/** Страница рубрики на одном языке. */
export function RubricPage({ slug, lang = "ru" }: { slug: string; lang?: Lang }) {
  const rubric = getRubric(slug);
  if (!rubric) notFound();

  const inLang = articlesByLang(lang);
  const list = inLang.filter((a) => a.rubric === slug);
  const popular = inLang.slice(0, 5);
  const title = rubricTitle(slug, lang, rubric.title);

  return (
    <div className="container-news py-6">
      <AdSlot
        id={`rubric-${slug}-top-billboard`}
        size="970x250"
        label={`Премиум-баннер · рубрика «${rubric.title}»`}
        /* подпись слота — служебная, всегда по-русски: её видит только верстальщик */
        className="mb-8"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-4">
            <span className={`h-12 w-1.5 rounded ${rubric.color}`} />
            <div>
              <LeapTag rubricSlug={rubric.slug} size="xl" />
              <p className="mt-1 text-sm text-neutral-500">
                {title} · {t(lang, "all")}
              </p>
            </div>
          </div>

          {list.length === 0 ? (
            <p className="mt-12 text-center text-neutral-500">
              {t(lang, "notFoundHint")}
            </p>
          ) : (
            <div className="mt-8 grid gap-8 sm:grid-cols-2">
              {list.map((a) => (
                <ArticleCard key={a.slug} article={a} />
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-6">
          <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider">
                {t(lang, "popular")}
              </h3>
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

          <AdSlot
            id={`rubric-${slug}-sidebar-rect`}
            size="300x250"
            label="Сайдбар рубрики"
          />

          <WeatherWidget />

          {slug === "business" && (
            <CurrencyWidget
              codes={["USD", "EUR", "RUB", "GBP", "CHF", "JPY", "CNY", "KZT"]}
            />
          )}
          {slug === "economy" && <CurrencyWidget />}
        </aside>
      </div>
    </div>
  );
}
