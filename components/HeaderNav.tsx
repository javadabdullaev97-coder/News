"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { rubrics } from "@/lib/data";

export function HeaderNav() {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-1 text-sm font-medium md:flex">
      {rubrics.slice(0, 6).map((r) => {
        const href = `/rubric/${r.slug}`;
        const isActive = pathname === href;
        return (
          <Link
            key={r.slug}
            href={href}
            className={`relative rounded-md px-3 py-1.5 transition-colors ${
              isActive
                ? "text-brand"
                : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-900 dark:hover:text-white"
            }`}
          >
            {r.title}
            {isActive && (
              <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-brand" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <div className="container-news flex gap-2 overflow-x-auto py-2 text-sm">
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
    </div>
  );
}
