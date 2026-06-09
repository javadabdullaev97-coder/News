import type { Metadata } from "next";
import { Fragment } from "react";
import { ArticleCard } from "@/components/ArticleCard";
import { AdSlot } from "@/components/AdSlot";
import { articles } from "@/lib/data";

export const metadata: Metadata = {
  title: "Все новости — LEAP",
  description:
    "Единая лента всех материалов LEAP: политика, экономика, бизнес, общество, спорт, мир, технологии и культура.",
};

export default function AllPage() {
  const sorted = [...articles].sort(
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
                Все новости
              </h1>
              <p className="mt-1 text-sm text-neutral-500">
                Единая лента — всё, что мы публикуем, по времени
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4">
            {sorted.map((a, i) => (
              <Fragment key={a.slug}>
                {a.featured ? (
                  <div className="my-2">
                    <ArticleCard article={a} variant="hero" />
                  </div>
                ) : (
                  <ArticleCard article={a} variant="compact" />
                )}
                {i === 6 && (
                  <AdSlot
                    id="all-inline-leaderboard"
                    size="970x90"
                    label="В ленте «Все»"
                    className="my-2"
                  />
                )}
              </Fragment>
            ))}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="sticky top-[140px] space-y-6">
            <AdSlot
              id="all-sidebar-rect"
              size="300x250"
              label="Сайдбар · все новости"
            />
            <AdSlot
              id="all-sidebar-tall"
              size="300x600"
              label="Сайдбар · все новости · tall"
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
