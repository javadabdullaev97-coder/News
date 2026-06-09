"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS: { href: string; label: string }[] = [
  { href: "/wc2026", label: "Новости и матчи" },
  { href: "/wc2026/uzbekistan", label: "Сборная Узбекистана" },
  { href: "/wc2026/groups", label: "Группы" },
  { href: "/wc2026/bracket", label: "Сетка плей-офф" },
  { href: "/wc2026/schedule", label: "Расписание" },
  { href: "/wc2026/rules", label: "Регламент" },
];

export function WCSubNav() {
  const pathname = usePathname();
  return (
    <div className="sticky top-14 z-30 -mx-4 border-b border-neutral-800 bg-neutral-950 px-4 backdrop-blur md:mx-0 md:rounded-t-xl md:px-0">
      <div className="container-news flex gap-1 overflow-x-auto py-2 text-sm">
        {TABS.map((t) => {
          const isActive = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`relative whitespace-nowrap rounded-md px-3 py-1.5 font-medium transition-colors ${
                isActive
                  ? "bg-white/10 text-white"
                  : "text-neutral-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {t.label}
              {isActive && (
                <span className="absolute inset-x-3 -bottom-2 h-0.5 rounded-full bg-brand" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
