import Link from "next/link";
import { rubrics } from "@/lib/data";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/80 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/80">
      <div className="container-news flex h-14 items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-brand font-black text-white">
            L
          </span>
          <span className="text-lg font-extrabold tracking-tight">LEAP</span>
        </Link>

        <nav className="hidden items-center gap-5 text-sm font-medium md:flex">
          {rubrics.slice(0, 6).map((r) => (
            <Link
              key={r.slug}
              href={`/rubric/${r.slug}`}
              className="text-neutral-700 transition hover:text-brand dark:text-neutral-300"
            >
              {r.title}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            aria-label="Поиск"
            className="rounded-full border border-neutral-300 p-2 text-sm transition hover:border-brand hover:text-brand dark:border-neutral-700"
          >
            🔎
          </button>
          <div className="hidden items-center gap-1 rounded-full border border-neutral-300 p-1 text-xs dark:border-neutral-700 sm:flex">
            <button className="rounded-full bg-neutral-900 px-2 py-0.5 text-white dark:bg-white dark:text-neutral-900">
              RU
            </button>
            <button className="px-2 py-0.5 text-neutral-500">UZ</button>
            <button className="px-2 py-0.5 text-neutral-500">EN</button>
          </div>
          <ThemeToggle />
        </div>
      </div>
      <div className="border-t border-neutral-200 dark:border-neutral-800 md:hidden">
        <div className="container-news flex gap-4 overflow-x-auto py-2 text-sm">
          {rubrics.map((r) => (
            <Link
              key={r.slug}
              href={`/rubric/${r.slug}`}
              className="whitespace-nowrap text-neutral-700 hover:text-brand dark:text-neutral-300"
            >
              {r.title}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
