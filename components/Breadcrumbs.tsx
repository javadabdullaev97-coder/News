import Link from "next/link";

export type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Хлебные крошки">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-500">
        {items.map((c, i) => {
          const isLast = i === items.length - 1;
          return (
            // min-w-0 обязателен: у flex-элемента min-width по умолчанию auto,
            // поэтому последняя крошка (полный заголовок статьи) не сжималась и
            // растягивала колонку — на экране 390px страница уезжала вбок на 3px.
            <li key={i} className="flex min-w-0 items-center gap-2">
              {c.href && !isLast ? (
                <Link
                  href={c.href}
                  className="transition-colors hover:text-brand"
                >
                  {c.label}
                </Link>
              ) : (
                <span
                  className={
                    isLast ? "truncate text-neutral-700 dark:text-neutral-300" : ""
                  }
                  title={isLast ? c.label : undefined}
                  aria-current={isLast ? "page" : undefined}
                >
                  {c.label}
                </span>
              )}
              {!isLast && (
                <span aria-hidden className="text-neutral-300 dark:text-neutral-700">
                  ›
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
