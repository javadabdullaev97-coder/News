import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { TopStrip } from "./TopStrip";
import { BreakingTicker } from "./BreakingTicker";
import { LogoChevron } from "./brand/Logos";
import { HeaderNav, MobileNav } from "./HeaderNav";
import { SearchButton } from "./SearchModal";

export function Header() {
  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur dark:bg-neutral-950/85">
      <TopStrip />
      <div className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="container-news flex h-14 items-center justify-between gap-6">
          <Link
            href="/"
            aria-label="LEAP — на главную"
            className="transition-transform active:scale-95"
          >
            <LogoChevron size={32} />
          </Link>

          <HeaderNav />

          <div className="flex items-center gap-1.5">
            <SearchButton />
            <div className="hidden items-center gap-0.5 rounded-full border border-neutral-200 bg-white p-0.5 text-xs shadow-sm dark:border-neutral-800 dark:bg-neutral-900 sm:flex">
              <button className="rounded-full bg-neutral-900 px-2 py-1 font-semibold text-white dark:bg-white dark:text-neutral-900">
                RU
              </button>
              <button className="rounded-full px-2 py-1 text-neutral-500 transition-colors hover:text-neutral-900 dark:hover:text-white">
                UZ
              </button>
              <button className="rounded-full px-2 py-1 text-neutral-500 transition-colors hover:text-neutral-900 dark:hover:text-white">
                EN
              </button>
            </div>
            <ThemeToggle />
          </div>
        </div>
        <div className="border-t border-neutral-200 dark:border-neutral-800 md:hidden">
          <MobileNav />
        </div>
      </div>
      <BreakingTicker />
    </header>
  );
}
