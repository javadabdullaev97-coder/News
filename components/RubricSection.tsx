import Link from "next/link";
import { ArticleCard } from "./ArticleCard";
import { LeapTag } from "./LeapTag";
import { getArticlesByRubric, getRubric } from "@/lib/data";

export function RubricSection({ rubricSlug }: { rubricSlug: string }) {
  const rubric = getRubric(rubricSlug);
  const items = getArticlesByRubric(rubricSlug).slice(0, 4);
  if (!rubric || items.length === 0) return null;

  const [main, ...rest] = items;
  const href = `/rubric/${rubric.slug}`;

  return (
    <section className="mt-14">
      <div className="flex items-end justify-between border-b border-neutral-200 pb-3 dark:border-neutral-800">
        <LeapTag rubricSlug={rubric.slug} size="lg" href={href} />
        <Link
          href={href}
          className="text-sm font-medium text-brand transition-colors hover:underline"
        >
          Все материалы →
        </Link>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <ArticleCard article={main} variant="default" />
        </div>
        {rest.length > 0 && (
          <div className="flex flex-col gap-1 lg:col-span-2">
            {rest.map((a) => (
              <ArticleCard key={a.slug} article={a} variant="compact" />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
