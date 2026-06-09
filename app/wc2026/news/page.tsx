import Link from "next/link";
import Image from "next/image";
import { articles, feedDate } from "@/lib/data";

export const metadata = {
  title: "Новости ЧМ-2026 — LEAP",
};

export default function WCNewsPage() {
  const list = articles
    .filter((a) => a.tags.includes("ЧМ-2026"))
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );

  if (list.length === 0) {
    return (
      <p className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-sm text-neutral-400">
        По турниру пока нет публикаций. Загляните позже.
      </p>
    );
  }

  return (
    <div className="divide-y divide-white/10">
      {list.map((a) => (
        <Link
          key={a.slug}
          href={`/article/${a.slug}`}
          className="group block py-6"
        >
          <div className="text-[11px] uppercase tracking-wider text-neutral-500">
            {feedDate(a.publishedAt)}
          </div>
          <div className="mt-2 flex gap-5">
            <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-lg sm:h-28 sm:w-40 md:h-32 md:w-48">
              <Image
                src={a.cover}
                alt=""
                fill
                sizes="(max-width: 768px) 128px, 192px"
                className="object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-serif text-xl font-bold leading-snug text-white transition-colors group-hover:text-brand md:text-2xl">
                {a.title}
              </h3>
              <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-neutral-400 md:text-base">
                {a.lead}
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
