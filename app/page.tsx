import { ArticleCard } from "@/components/ArticleCard";
import { AdSlot } from "@/components/AdSlot";
import { RubricSection } from "@/components/RubricSection";
import { CurrencyWidget } from "@/components/CurrencyWidget";
import { WeatherWidget } from "@/components/WeatherWidget";
import { articles, rubrics, timeAgo, type Article } from "@/lib/data";
import Link from "next/link";

// Внутри скольких свежих материалов редакция может закрепить герой вручную.
// Раньше герой и два материала рядом с ним выбирались как articles.filter(featured),
// а флаг featured стоит только у демо-корпуса из lib/data.ts — из-за этого первый
// экран годами показывал июньские демо-статьи, пока живая лента уезжала вниз.
const HERO_PIN_WINDOW = 5;

export default function HomePage() {
  // Один проход по ленте: каждый материал занимает ровно один слот на странице.
  // Без этого «Главное» дублировало карточки из шапки, а сайдбар — героя.
  const used = new Set<string>();
  const take = (count: number) => {
    const out: Article[] = [];
    for (const a of articles) {
      if (used.has(a.slug)) continue;
      out.push(a);
      used.add(a.slug);
      if (out.length === count) break;
    }
    return out;
  };

  const hero = articles.slice(0, HERO_PIN_WINDOW).find((a) => a.featured) ?? articles[0];
  used.add(hero.slug);

  const secondary = take(2); // крупные карточки под героем
  const underHero = take(4); // компактная строка — добивает высоту левой колонки под сайдбар
  const rail = take(6); // «Лента» в сайдбаре
  const latest = take(6); // секция «Главное»

  return (
    <div className="container-news py-6">
      <AdSlot
        id="home-top-billboard"
        size="970x250"
        label="Премиум-баннер · топ главной"
        className="mb-8"
      />

      <section className="grid items-start gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ArticleCard article={hero} variant="hero" />

          {secondary.length > 0 && (
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {secondary.map((a) => (
                <ArticleCard key={a.slug} article={a} />
              ))}
            </div>
          )}

          {underHero.length > 0 && (
            <div className="mt-6 border-t border-neutral-200 pt-2 dark:border-neutral-800">
              {underHero.map((a) => (
                <ArticleCard key={a.slug} article={a} variant="compact" />
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-6">
          <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider">Лента</h3>
              <Link href="/all" className="text-xs font-medium text-brand hover:underline">
                все →
              </Link>
            </div>
            <ol className="mt-1">
              {rail.map((a) => (
                <li
                  key={a.slug}
                  className="border-b border-neutral-100 py-2.5 last:border-0 dark:border-neutral-800"
                >
                  <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                    {timeAgo(a.publishedAt)}
                  </div>
                  <Link
                    href={`/article/${a.slug}`}
                    className="mt-0.5 block text-sm font-medium leading-snug hover:text-brand"
                  >
                    {a.title}
                  </Link>
                </li>
              ))}
            </ol>
          </div>

          <WeatherWidget />

          <CurrencyWidget />

          <AdSlot
            id="home-sidebar-rect"
            size="300x250"
            label="Сайдбар главной"
          />
        </aside>
      </section>

      {latest.length > 0 && (
        <section className="mt-12">
          <div className="flex items-baseline justify-between border-b border-neutral-200 pb-3 dark:border-neutral-800">
            <h2 className="font-serif text-2xl font-bold">Главное</h2>
            <Link href="/all" className="text-sm font-medium text-brand hover:underline">
              Все новости →
            </Link>
          </div>
          <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {latest.map((a) => (
              <ArticleCard key={a.slug} article={a} />
            ))}
          </div>
        </section>
      )}

      <RubricSection rubricSlug="politics" exclude={used} />
      <RubricSection rubricSlug="economy" exclude={used} />
      <RubricSection rubricSlug="society" exclude={used} />

      <AdSlot
        id="home-mid-leaderboard"
        size="970x90"
        label="Между секциями"
        className="my-12"
      />

      <RubricSection rubricSlug="world" exclude={used} />
      <RubricSection rubricSlug="business" exclude={used} />
      <RubricSection rubricSlug="tech" exclude={used} />
      <RubricSection rubricSlug="sport" exclude={used} />

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
