import Link from "next/link";
import { articles } from "@/lib/data";

export function BreakingTicker() {
  const items = articles.slice(0, 6);
  const doubled = [...items, ...items];

  return (
    <div className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
      <div className="container-news flex h-9 items-center gap-3 overflow-hidden">
        <span className="shrink-0 rounded bg-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
          ⚡ Сейчас
        </span>
        <div className="group relative flex-1 overflow-hidden">
          <div className="flex w-max gap-8 animate-marquee group-hover:[animation-play-state:paused]">
            {doubled.map((a, i) => (
              <Link
                key={`${a.slug}-${i}`}
                href={`/article/${a.slug}`}
                className="flex shrink-0 items-center gap-2 text-sm hover:text-brand"
              >
                <span className="h-1 w-1 rounded-full bg-brand" />
                <span>{a.title}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
