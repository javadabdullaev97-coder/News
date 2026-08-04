import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { LogoChevron } from "./brand/Logos";
import { HeaderNav } from "./HeaderNav";
import { SearchButton } from "./SearchModal";
import { MobileMenuButton } from "./MobileDrawer";
import { HeaderLangSwitch } from "./HeaderLangSwitch";
import { HomeLink } from "./HomeLink";

export function Header() {
  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur dark:bg-neutral-950/85">
      <div className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="container-news flex h-14 items-center justify-between gap-4">
          <HomeLink />

          <HeaderNav />

          <div className="flex items-center gap-1.5">
            <div className="hidden md:block">
              <SearchButton />
            </div>
            <HeaderLangSwitch />
            <ThemeToggle />
            <MobileMenuButton />
          </div>
        </div>
      </div>
    </header>
  );
}
