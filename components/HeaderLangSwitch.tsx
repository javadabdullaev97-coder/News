"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { allArticles, type Lang } from "@/lib/data";
import { LANGS } from "@/lib/types";

const LABEL: Record<Lang, string> = { ru: "RU", uz: "UZ", en: "EN" };

/**
 * Переключатель языка в шапке.
 *
 * Работает от адреса: сохраняет, где читатель находится, и меняет только
 * язык. Русский живёт в корне (`/`, `/all`, `/rubric/x`), узбекский
 * и английский — под префиксом (`/uz/all`).
 *
 * Отдельный случай — страница материала. Перевода может не быть: архив
 * переводится постепенно, а свежие материалы выходят на русском, даже
 * если переводчик не успел. Ссылка на несуществующую версию дала бы 404,
 * поэтому язык без перевода показывается серым и не кликается. Список
 * доступных версий берётся из того же сгенерированного корпуса, что
 * и остальной сайт.
 */
const ARTICLE_RE = /^\/(ru|uz|en)\/(\d{4})\/(\d{2})\/(\d{2})\/([^/]+)\/?$/;

export function HeaderLangSwitch() {
  const pathname = usePathname() || "/";

  const article = pathname.match(ARTICLE_RE);
  let current: Lang = "ru";
  let hrefFor: (l: Lang) => string | null;

  if (article) {
    const [, lang, y, m, d, slug] = article;
    current = lang as Lang;
    const versions = new Set(
      allArticles.filter((a) => a.slug === slug).map((a) => a.lang),
    );
    hrefFor = (l) => (versions.has(l) ? `/${l}/${y}/${m}/${d}/${slug}` : null);
  } else {
    const seg = pathname.split("/").filter(Boolean);
    const first = seg[0];
    const prefixed = first === "uz" || first === "en";
    current = prefixed ? (first as Lang) : "ru";
    const rest = prefixed ? seg.slice(1) : seg;
    const tail = rest.join("/");
    hrefFor = (l) =>
      l === "ru" ? `/${tail}` : `/${l}${tail ? `/${tail}` : ""}`;
  }

  return (
    <div
      className="hidden items-center gap-0.5 rounded-full border border-neutral-200 bg-white p-0.5 text-xs shadow-sm dark:border-neutral-800 dark:bg-neutral-900 sm:flex"
      aria-label="Язык сайта"
    >
      {LANGS.map((l) => {
        if (l === current) {
          return (
            <span
              key={l}
              aria-current="true"
              className="rounded-full bg-neutral-900 px-2 py-1 font-semibold text-white dark:bg-white dark:text-neutral-900"
            >
              {LABEL[l]}
            </span>
          );
        }
        const href = hrefFor(l);
        if (!href) {
          return (
            <span
              key={l}
              title="Перевод этого материала пока не готов"
              className="rounded-full px-2 py-1 text-neutral-300 dark:text-neutral-700"
            >
              {LABEL[l]}
            </span>
          );
        }
        return (
          <Link
            key={l}
            href={href}
            hrefLang={l}
            className="rounded-full px-2 py-1 text-neutral-500 transition-colors hover:text-neutral-900 dark:hover:text-white"
          >
            {LABEL[l]}
          </Link>
        );
      })}
    </div>
  );
}
