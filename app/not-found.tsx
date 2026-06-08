import Link from "next/link";
import { rubrics } from "@/lib/data";
import { IconChevron } from "@/components/brand/Logos";

export const metadata = {
  title: "Страница не найдена",
};

export default function NotFound() {
  return (
    <div className="container-news flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <div className="opacity-90">
        <IconChevron size={84} />
      </div>
      <h1 className="mt-6 font-serif text-5xl font-bold md:text-6xl">404</h1>
      <p className="mt-3 max-w-md text-lg text-neutral-600 dark:text-neutral-400">
        Эта страница, кажется, перепрыгнула слишком далеко. Мы её не нашли.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-brand-600 hover:shadow active:scale-95"
      >
        На главную →
      </Link>

      <div className="mt-12 w-full max-w-2xl">
        <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Или загляните в рубрики
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {rubrics.map((r) => (
            <Link
              key={r.slug}
              href={`/rubric/${r.slug}`}
              className="rounded-full border border-neutral-200 bg-white px-4 py-1.5 text-sm font-medium shadow-sm transition-all duration-150 hover:border-brand hover:text-brand active:scale-95 dark:border-neutral-800 dark:bg-neutral-900"
            >
              {r.title}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
