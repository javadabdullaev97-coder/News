"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { articles, rubrics, getAuthor, getRubric, timeAgo } from "@/lib/data";

type SearchCtx = { open: boolean; setOpen: (v: boolean) => void };
const Ctx = createContext<SearchCtx>({ open: false, setOpen: () => {} });

export function useSearch() {
  return useContext(Ctx);
}

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Ctx.Provider value={{ open, setOpen }}>
      {children}
      <SearchModal />
    </Ctx.Provider>
  );
}

type ResultItem =
  | { kind: "article"; slug: string; title: string; rubric?: string; cover: string; publishedAt: string }
  | { kind: "rubric"; slug: string; title: string }
  | { kind: "author"; slug: string; name: string };

function SearchModal() {
  const { open, setOpen } = useSearch();
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  const results = useMemo<ResultItem[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return articles.slice(0, 5).map((a) => ({
        kind: "article" as const,
        slug: a.slug,
        title: a.title,
        rubric: a.rubric,
        cover: a.cover,
        publishedAt: a.publishedAt,
      }));
    }

    const articleHits = articles
      .filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.lead.toLowerCase().includes(q) ||
          a.tags.some((t) => t.toLowerCase().includes(q)),
      )
      .slice(0, 6)
      .map((a) => ({
        kind: "article" as const,
        slug: a.slug,
        title: a.title,
        rubric: a.rubric,
        cover: a.cover,
        publishedAt: a.publishedAt,
      }));

    const rubricHits = rubrics
      .filter((r) => r.title.toLowerCase().includes(q))
      .map((r) => ({ kind: "rubric" as const, slug: r.slug, title: r.title }));

    const authorSlugs = new Set<string>();
    articles.forEach((a) => authorSlugs.add(a.authorSlug));
    const authorHits = Array.from(authorSlugs)
      .map((slug) => getAuthor(slug))
      .filter((a) => a.name.toLowerCase().includes(q))
      .map((a) => ({ kind: "author" as const, slug: a.slug, name: a.name }));

    return [...articleHits, ...rubricHits, ...authorHits];
  }, [query]);

  useEffect(() => setActiveIdx(0), [query]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = results[activeIdx];
        if (!item) return;
        const href =
          item.kind === "article"
            ? `/article/${item.slug}`
            : item.kind === "rubric"
              ? `/rubric/${item.slug}`
              : `/rubric/${rubrics[0].slug}`;
        setOpen(false);
        router.push(href);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, activeIdx, results, router, setOpen]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-black/50 p-4 pt-[10vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-neutral-200 dark:bg-neutral-950 dark:ring-neutral-800"
      >
        <div className="flex items-center gap-3 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <span className="text-neutral-400">🔎</span>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по статьям, рубрикам, авторам…"
            className="flex-1 bg-transparent text-base outline-none placeholder:text-neutral-400"
          />
          <kbd className="rounded border border-neutral-300 px-1.5 py-0.5 text-[10px] text-neutral-500 dark:border-neutral-700">
            Esc
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {results.length === 0 ? (
            <div className="px-3 py-10 text-center text-sm text-neutral-500">
              Ничего не нашлось по «{query}»
            </div>
          ) : (
            <Results
              items={results}
              activeIdx={activeIdx}
              onHover={setActiveIdx}
              onSelect={() => setOpen(false)}
            />
          )}
        </div>

        <div className="flex items-center justify-between border-t border-neutral-200 px-3 py-2 text-[11px] text-neutral-500 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd> навигация
            </span>
            <span className="flex items-center gap-1">
              <Kbd>↵</Kbd> открыть
            </span>
          </div>
          <span className="flex items-center gap-1">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </span>
        </div>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-neutral-300 px-1 text-[10px] dark:border-neutral-700">
      {children}
    </kbd>
  );
}

function Results({
  items,
  activeIdx,
  onHover,
  onSelect,
}: {
  items: ResultItem[];
  activeIdx: number;
  onHover: (i: number) => void;
  onSelect: () => void;
}) {
  const grouped = useMemo(() => {
    const g: { label: string; items: { item: ResultItem; idx: number }[] }[] = [];
    const articleItems = items
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => item.kind === "article");
    const rubricItems = items
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => item.kind === "rubric");
    const authorItems = items
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => item.kind === "author");
    if (articleItems.length) g.push({ label: "Статьи", items: articleItems });
    if (rubricItems.length) g.push({ label: "Рубрики", items: rubricItems });
    if (authorItems.length) g.push({ label: "Авторы", items: authorItems });
    return g;
  }, [items]);

  return (
    <div>
      {grouped.map((group) => (
        <div key={group.label} className="mb-2">
          <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
            {group.label}
          </div>
          {group.items.map(({ item, idx }) => (
            <ResultRow
              key={`${item.kind}-${"slug" in item ? item.slug : ""}-${idx}`}
              item={item}
              isActive={idx === activeIdx}
              onMouseEnter={() => onHover(idx)}
              onClick={onSelect}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function ResultRow({
  item,
  isActive,
  onMouseEnter,
  onClick,
}: {
  item: ResultItem;
  isActive: boolean;
  onMouseEnter: () => void;
  onClick: () => void;
}) {
  const cls = `flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
    isActive
      ? "bg-brand/10 text-brand"
      : "text-neutral-800 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-900"
  }`;

  if (item.kind === "article") {
    const rubric = getRubric(item.rubric ?? "");
    return (
      <Link
        href={`/article/${item.slug}`}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        className={cls}
      >
        <div className="relative h-10 w-14 shrink-0 overflow-hidden rounded">
          <Image src={item.cover} alt="" fill sizes="56px" className="object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{item.title}</div>
          <div className="text-[11px] text-neutral-500">
            {rubric?.title} · {timeAgo(item.publishedAt)}
          </div>
        </div>
      </Link>
    );
  }
  if (item.kind === "rubric") {
    return (
      <Link
        href={`/rubric/${item.slug}`}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        className={cls}
      >
        <span className="grid h-10 w-10 place-items-center rounded bg-neutral-100 text-base dark:bg-neutral-800">
          📂
        </span>
        <div className="min-w-0 flex-1 text-sm font-medium">{item.title}</div>
      </Link>
    );
  }
  return (
    <div onMouseEnter={onMouseEnter} className={cls + " cursor-default"}>
      <span className="grid h-10 w-10 place-items-center rounded-full bg-neutral-100 text-xs font-bold dark:bg-neutral-800">
        {item.name
          .split(" ")
          .map((p) => p[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()}
      </span>
      <div className="min-w-0 flex-1 text-sm font-medium">{item.name}</div>
    </div>
  );
}

export function SearchButton({ className = "" }: { className?: string }) {
  const { setOpen } = useSearch();
  return (
    <button
      onClick={() => setOpen(true)}
      aria-label="Поиск (Cmd+K)"
      className={
        className ||
        "grid h-9 w-9 place-items-center rounded-full border border-neutral-200 bg-white text-sm shadow-sm transition-all duration-150 hover:border-brand hover:text-brand hover:shadow active:scale-95 dark:border-neutral-800 dark:bg-neutral-900"
      }
    >
      🔎
    </button>
  );
}
