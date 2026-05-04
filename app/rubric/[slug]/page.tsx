import { notFound } from "next/navigation";
import { ArticleCard } from "@/components/ArticleCard";
import { getArticlesByRubric, getRubric, rubrics } from "@/lib/data";

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

  return (
    <div className="container-news py-8">
      <div className="flex items-center gap-3">
        <span className={`h-8 w-1.5 rounded ${rubric.color}`} />
        <h1 className="font-serif text-4xl font-bold">{rubric.title}</h1>
      </div>
      <p className="mt-2 text-neutral-600 dark:text-neutral-400">
        Все материалы рубрики · {list.length} публикаций
      </p>

      {list.length === 0 ? (
        <p className="mt-12 text-center text-neutral-500">
          В этой рубрике пока нет материалов.
        </p>
      ) : (
        <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((a) => (
            <ArticleCard key={a.slug} article={a} />
          ))}
        </div>
      )}
    </div>
  );
}
