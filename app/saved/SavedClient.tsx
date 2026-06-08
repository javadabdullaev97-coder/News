"use client";

import Link from "next/link";
import { useBookmarks } from "@/lib/bookmarks";
import { getArticle } from "@/lib/data";
import { ArticleCard } from "@/components/ArticleCard";

export function SavedClient() {
  const { bookmarks } = useBookmarks();

  const saved = bookmarks.map(getArticle).filter(Boolean);

  if (saved.length === 0) {
    return (
      <div className="mt-12 rounded-xl border border-dashed border-neutral-300 p-12 text-center dark:border-neutral-700">
        <div className="text-5xl">🔖</div>
        <h2 className="mt-4 font-serif text-xl font-bold">
          Здесь пока пусто
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-neutral-600 dark:text-neutral-400">
          Нажмите на иконку закладки на любой статье или карточке, чтобы
          отложить её на потом.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
        >
          На главную →
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {saved.map((a) => a && <ArticleCard key={a.slug} article={a} />)}
    </div>
  );
}
