import Link from "next/link";
import { ArticleCard } from "./ArticleCard";
import { LeapTag } from "./LeapTag";
import { articlesByLang, getRubric, type Lang } from "@/lib/data";
import { t as tr } from "@/lib/i18n";

// Классы Tailwind должны быть написаны литералами: динамическая строка вида
// `lg:grid-cols-${n}` не попадёт в сборку и колонки развалятся.
//
// Сетка ТРЁХКОЛОНОЧНАЯ при любом числе материалов до четырёх, и это важно
// именно для одного. Раньше на единственном материале стояла пустая строка
// классов — то есть грид в одну колонку, и карточка растягивалась во всю
// ширину контейнера: фото размером с экран, под ним одинокий заголовок.
// На русской версии этого не видно (в каждой рубрике есть материалы),
// а узбекская и английская ленты пока неполные, и там раздувало каждую
// вторую рубрику. Теперь одинокая карточка занимает треть ряда, как
// и должна, а справа остаётся воздух.
const EQUAL_GRID: Record<number, string> = {
  1: "sm:grid-cols-2 lg:grid-cols-3",
  2: "sm:grid-cols-2 lg:grid-cols-3",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

export function RubricSection({
  rubricSlug,
  exclude,
  lang = "ru",
}: {
  rubricSlug: string;
  lang?: Lang;
  /** Слаги, уже показанные выше на странице, — чтобы блок рубрики их не повторял. */
  exclude?: ReadonlySet<string>;
}) {
  const rubric = getRubric(rubricSlug);
  const items = articlesByLang(lang)
    .filter((a) => a.rubric === rubricSlug && !exclude?.has(a.slug))
    .slice(0, 5);
  if (!rubric || items.length === 0) return null;

  const href =
    lang === "ru" ? `/rubric/${rubric.slug}` : `/${lang}/rubric/${rubric.slug}`;
  const header = (
    <div className="flex items-end justify-between border-b border-neutral-200 pb-3 dark:border-neutral-800">
      <LeapTag rubricSlug={rubric.slug} size="lg" href={href} />
      <Link
        href={href}
        className="text-sm font-medium text-brand transition-colors hover:underline"
      >
        {tr(lang, "all")} →
      </Link>
    </div>
  );

  // Раскладка «крупная карточка + лента справа» держится ровно тогда, когда
  // справа есть четыре компактные карточки: они как раз добирают высоту
  // главной. При двух-трёх материалах правая колонка оказывалась вдвое короче
  // левой, и под ней зияла пустая полоса — в таких рубриках выкладываем
  // одинаковые карточки в ряд.
  const [main, ...rest] = items;
  if (rest.length < 4) {
    return (
      <section className="mt-14">
        {header}
        <div className={`mt-6 grid gap-8 ${EQUAL_GRID[items.length] ?? ""}`}>
          {items.map((a) => (
            <ArticleCard key={a.slug} article={a} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="mt-14">
      {header}
      <div className="mt-6 grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <ArticleCard article={main} variant="default" />
        </div>
        <div className="flex flex-col justify-between gap-1 lg:col-span-2">
          {rest.map((a) => (
            <ArticleCard key={a.slug} article={a} variant="compact" />
          ))}
        </div>
      </div>
    </section>
  );
}
