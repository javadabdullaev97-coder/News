"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { rubrics } from "@/lib/data";
import { rubricTitle, t as tr } from "@/lib/i18n";
import type { Lang } from "@/lib/types";
import { useSearch } from "./SearchModal";

export function MobileMenuButton() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname() || "/";
  const firstSeg = pathname.split("/").filter(Boolean)[0];
  const lang: Lang = firstSeg === "uz" || firstSeg === "en" ? firstSeg : "ru";
  const prefix = lang === "ru" ? "" : `/${lang}`;
  const { setOpen: openSearch } = useSearch();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const drawer = (
    <div
      className="fixed inset-0 z-[55] bg-black/50 backdrop-blur-sm md:hidden"
      onClick={() => setOpen(false)}
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        className="absolute right-0 top-0 flex h-full w-[85%] max-w-sm flex-col bg-white shadow-2xl drawer-in dark:bg-neutral-950"
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <span className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Меню
          </span>
          <button
            type="button"
            aria-label="Закрыть"
            onClick={() => setOpen(false)}
            className="grid h-9 w-9 place-items-center rounded-full text-xl text-neutral-500 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-900"
          >
            ✕
          </button>
        </div>

        <div className="border-b border-neutral-200 p-4 dark:border-neutral-800">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setTimeout(() => openSearch(true), 50);
            }}
            className="flex w-full items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-500 transition-colors hover:border-brand hover:text-brand dark:border-neutral-800 dark:bg-neutral-900"
          >
            <span>🔎</span>
            <span>Поиск по статьям…</span>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <Link
            href={`${prefix}/all`}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
              pathname === `${prefix}/all`
                ? "bg-brand text-white"
                : "bg-brand/5 text-brand hover:bg-brand/10"
            }`}
          >
            <span aria-hidden className="text-base">≡</span>
            {tr(lang, "feed")}
          </Link>

          <div className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
            Рубрики
          </div>
          {rubrics.map((r) => {
            const href = `${prefix}/rubric/${r.slug}`;
            const isActive = pathname === href;
            return (
              <Link
                key={r.slug}
                href={href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-brand/10 text-brand"
                    : "text-neutral-800 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-900"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${r.color}`} />
                {rubricTitle(r.slug, lang, r.title)}
              </Link>
            );
          })}

          <div className="mt-4 border-t border-neutral-200 px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:border-neutral-800">
            Ещё
          </div>
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-800 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-900"
          >
            🏠 Главная
          </Link>
          <Link
            href="/saved"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-800 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-900"
          >
            🔖 Сохранённое
          </Link>
          <a
            href="/rss.xml"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-800 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-900"
          >
            📡 RSS
          </a>
        </nav>

        <div className="border-t border-neutral-200 p-4 text-xs text-neutral-500 dark:border-neutral-800">
          © 2026 LEAP News
        </div>
      </aside>
    </div>
  );

  return (
    <>
      <button
        type="button"
        aria-label="Меню"
        onClick={() => setOpen(true)}
        className="grid h-9 w-9 place-items-center rounded-full border border-neutral-200 bg-white text-base shadow-sm transition-all duration-150 hover:border-brand hover:text-brand active:scale-95 dark:border-neutral-800 dark:bg-neutral-900 md:hidden"
      >
        ☰
      </button>

      {mounted && open && createPortal(drawer, document.body)}
    </>
  );
}
