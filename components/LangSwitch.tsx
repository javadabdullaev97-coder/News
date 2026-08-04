import Link from "next/link";
import { articleHref, type Article, type Lang } from "@/lib/data";

const LABEL: Record<Lang, string> = { ru: "RU", uz: "UZ", en: "EN" };

/**
 * Переключатель языка материала.
 *
 * Стоит на странице статьи, а не в шапке, и это осознанно: переводится
 * пока сам материал, а не интерфейс — главная, рубрики и поиск остаются
 * русскими. Кнопка языка в шапке вела бы на страницу, которой нет.
 *
 * Язык, которого у материала нет, показывается серым и не кликается:
 * статических страниц для непереведённых версий не существует, и ссылка
 * на них дала бы 404. Пока архив не переведён целиком, это норма.
 */
export function LangSwitch({ article }: { article: Article }) {
  if (article.langs.length < 2) return null;
  return (
    <div className="flex items-center gap-1 text-xs" aria-label="Язык материала">
      {(["ru", "uz", "en"] as Lang[]).map((l) => {
        const has = article.langs.includes(l);
        const current = l === article.lang;
        if (current) {
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
        if (!has) {
          return (
            <span
              key={l}
              title="Перевод пока не готов"
              className="rounded-full px-2 py-1 text-neutral-300 dark:text-neutral-700"
            >
              {LABEL[l]}
            </span>
          );
        }
        return (
          <Link
            key={l}
            href={articleHref(article, l)}
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
