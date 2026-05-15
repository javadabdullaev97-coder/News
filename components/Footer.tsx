import { rubrics } from "@/lib/data";
import Link from "next/link";
import { LogoChevron } from "./brand/Logos";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="container-news grid gap-8 py-10 md:grid-cols-4">
        <div>
          <LogoChevron size={32} />
          <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
            Новости, которые опережают.
          </p>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase text-neutral-500">Рубрики</div>
          <ul className="mt-3 space-y-1 text-sm">
            {rubrics.slice(0, 4).map((r) => (
              <li key={r.slug}>
                <Link href={`/rubric/${r.slug}`} className="hover:text-brand">
                  {r.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase text-neutral-500">Редакция</div>
          <ul className="mt-3 space-y-1 text-sm">
            <li>О LEAP</li>
            <li>Контакты</li>
            <li>Реклама</li>
            <li>Вакансии</li>
          </ul>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase text-neutral-500">
            Дайджест на почту
          </div>
          <form className="mt-3 flex">
            <input
              type="email"
              placeholder="ваш@email"
              className="w-full rounded-l-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950"
            />
            <button
              type="button"
              className="rounded-r-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
            >
              ОК
            </button>
          </form>
        </div>
      </div>
      <div className="border-t border-neutral-200 py-4 text-center text-xs text-neutral-500 dark:border-neutral-800">
        © 2026 LEAP News. Все права защищены.
      </div>
    </footer>
  );
}
