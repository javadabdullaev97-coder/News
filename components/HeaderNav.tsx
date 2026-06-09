"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { rubrics } from "@/lib/data";

export function HeaderNav() {
  const pathname = usePathname();
  const isAllActive = pathname === "/all";
  const isWcActive = pathname === "/wc2026" || pathname.startsWith("/wc2026/");
  return (
    <nav className="hidden flex-1 items-center justify-center gap-0.5 text-sm font-medium lg:flex">
      <Link
        href="/all"
        aria-current={isAllActive ? "page" : undefined}
        className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider transition-colors ${
          isAllActive
            ? "bg-brand text-white"
            : "bg-brand/10 text-brand hover:bg-brand/15"
        }`}
      >
        Все
      </Link>
      <span
        aria-hidden
        className="mx-1.5 h-4 w-px bg-neutral-200 dark:bg-neutral-800"
      />
      {rubrics.map((r) => {
        const href = `/rubric/${r.slug}`;
        const isActive = pathname === href;
        return (
          <Link
            key={r.slug}
            href={href}
            className={`relative rounded-md px-2.5 py-1.5 transition-colors ${
              isActive
                ? "text-brand"
                : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-900 dark:hover:text-white"
            }`}
          >
            {r.title}
            {isActive && (
              <span className="absolute inset-x-2.5 -bottom-px h-0.5 rounded-full bg-brand" />
            )}
          </Link>
        );
      })}
      <span
        aria-hidden
        className="mx-1.5 h-4 w-px bg-neutral-200 dark:bg-neutral-800"
      />
      <Link
        href="/wc2026"
        aria-current={isWcActive ? "page" : undefined}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider transition-colors ${
          isWcActive
            ? "bg-brand text-white"
            : "bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        }`}
      >
        <span aria-hidden>🏆</span>
        ЧМ-2026
      </Link>
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const isAllActive = pathname === "/all";
  const isWcActive = pathname === "/wc2026" || pathname.startsWith("/wc2026/");
  return (
    <div className="container-news flex gap-2 overflow-x-auto py-2 text-sm">
      <Link
        href="/all"
        className={`whitespace-nowrap rounded-full border border-brand px-3 py-1 font-semibold transition-colors ${
          isAllActive ? "bg-brand text-white" : "bg-brand/5 text-brand hover:bg-brand/10"
        }`}
      >
        Все
      </Link>
      <span
        aria-hidden
        className="mx-0.5 my-1 h-auto w-px self-stretch bg-neutral-200 dark:bg-neutral-800"
      />
      {rubrics.map((r) => {
        const href = `/rubric/${r.slug}`;
        const isActive = pathname === href;
        return (
          <Link
            key={r.slug}
            href={href}
            className={`whitespace-nowrap rounded-full px-3 py-1 transition-colors ${
              isActive
                ? "bg-brand text-white"
                : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900"
            }`}
          >
            {r.title}
          </Link>
        );
      })}
      <span
        aria-hidden
        className="mx-0.5 my-1 h-auto w-px self-stretch bg-neutral-200 dark:bg-neutral-800"
      />
      <Link
        href="/wc2026"
        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 font-semibold transition-colors ${
          isWcActive
            ? "bg-brand text-white"
            : "bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900"
        }`}
      >
        <span aria-hidden>🏆</span>
        ЧМ-2026
      </Link>
    </div>
  );
}
