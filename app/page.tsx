import { ArticleCard } from "@/components/ArticleCard";
import { AdSlot, NativeAdCard } from "@/components/AdSlot";
import { RubricSection } from "@/components/RubricSection";
import { articles, rubrics } from "@/lib/data";
import Link from "next/link";

export default function HomePage() {
  const featured = articles.find((a) => a.featured) ?? articles[0];
  const secondary = articles.filter((a) => a.featured && a.slug !== featured.slug);
  const latest = articles.filter((a) => a.slug !== featured.slug).slice(0, 6);
  const sidebar = articles.slice(0, 5);

  return (
    <div className="container-news py-6">
      <AdSlot
        id="home-top-billboard"
        size="970x250"
        label="Премиум-баннер · топ главной"
        className="mb-8"
      />

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ArticleCard article={featured} variant="hero" />
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            {secondary.map((a) => (
              <ArticleCard key={a.slug} article={a} />
            ))}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider">Сейчас читают</h3>
              <span className="text-xs text-neutral-500">обновлено</span>
            </div>
            <ol className="mt-2">
              {sidebar.map((a, i) => (
                <li
                  key={a.slug}
                  className="flex gap-3 border-b border-neutral-100 py-3 last:border-0 dark:border-neutral-800"
                >
                  <span className="font-serif text-2xl font-bold text-brand">{i + 1}</span>
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
            id="home-sidebar-rect"
            size="300x250"
            label="Сайдбар главной"
          />
        </aside>
      </section>

      <section className="mt-12">
        <div className="flex items-baseline justify-between border-b border-neutral-200 pb-3 dark:border-neutral-800">
          <h2 className="font-serif text-2xl font-bold">Главное</h2>
          <Link href="#" className="text-sm font-medium text-brand hover:underline">
            Все новости →
          </Link>
        </div>
        <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {latest.slice(0, 2).map((a) => (
            <ArticleCard key={a.slug} article={a} />
          ))}
          <NativeAdCard id="home-feed-native-1" brand="Hamkorbank" />
          {latest.slice(2).map((a) => (
            <ArticleCard key={a.slug} article={a} />
          ))}
        </div>
      </section>

      <RubricSection rubricSlug="politics" />
      <RubricSection rubricSlug="business" />

      <AdSlot
        id="home-mid-leaderboard"
        size="970x90"
        label="Между секциями"
        className="my-12"
      />

      <RubricSection rubricSlug="sport" />
      <RubricSection rubricSlug="tech" />

      <section className="mt-16">
        <h2 className="font-serif text-2xl font-bold">По рубрикам</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {rubrics.map((r) => (
            <Link
              key={r.slug}
              href={`/rubric/${r.slug}`}
              className="rounded-full border border-neutral-300 px-4 py-1.5 text-sm font-medium transition-all duration-150 hover:border-brand hover:text-brand active:scale-95 dark:border-neutral-700"
            >
              {r.title}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
