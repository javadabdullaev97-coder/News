"use client";

import { useBookmarks } from "@/lib/bookmarks";
import { useToast } from "./Toast";

export function BookmarkButton({
  slug,
  variant = "icon",
}: {
  slug: string;
  variant?: "icon" | "labelled";
}) {
  const { isSaved, toggle } = useBookmarks();
  const { show } = useToast();
  const saved = isSaved(slug);

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const willSave = toggle(slug);
    show(willSave ? "Сохранено в закладки" : "Удалено из закладок", willSave ? "🔖" : "✕");
  }

  if (variant === "labelled") {
    return (
      <button
        onClick={onClick}
        aria-pressed={saved}
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150 active:scale-95 ${
          saved
            ? "border-brand bg-brand text-white"
            : "border-neutral-200 bg-white hover:border-brand hover:text-brand dark:border-neutral-800 dark:bg-neutral-900"
        }`}
      >
        <span>{saved ? "✓" : "🔖"}</span>
        {saved ? "Сохранено" : "Сохранить"}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      aria-pressed={saved}
      aria-label={saved ? "Удалить из закладок" : "Сохранить"}
      className={`grid h-7 w-7 place-items-center rounded-full text-xs transition-all duration-150 active:scale-90 ${
        saved
          ? "bg-brand text-white"
          : "border border-neutral-200 bg-white/90 text-neutral-600 opacity-0 backdrop-blur hover:border-brand hover:text-brand group-hover:opacity-100 dark:border-neutral-800 dark:bg-neutral-900/90 dark:text-neutral-400"
      }`}
    >
      {saved ? "✓" : "🔖"}
    </button>
  );
}
