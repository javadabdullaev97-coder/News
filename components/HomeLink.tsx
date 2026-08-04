"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoChevron } from "./brand/Logos";
import { homeHref } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

/**
 * Логотип ведёт на главную ТОГО ЖЕ языка: читатель узбекской версии,
 * нажав на логотип, должен остаться в узбекской, а не переехать
 * в русскую без предупреждения.
 */
export function HomeLink() {
  const pathname = usePathname() || "/";
  const first = pathname.split("/").filter(Boolean)[0];
  const lang: Lang = first === "uz" || first === "en" ? first : "ru";
  return (
    <Link
      href={homeHref(lang)}
      aria-label="LEAP — на главную"
      className="transition-transform active:scale-95"
    >
      <LogoChevron size={32} />
    </Link>
  );
}
