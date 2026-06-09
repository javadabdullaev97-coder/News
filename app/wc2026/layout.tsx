import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Flag } from "@/components/wc2026/Flag";
import { WCSubNav } from "@/components/wc2026/SubNav";

const HOSTS: { code: string; name: string }[] = [
  { code: "us", name: "США" },
  { code: "ca", name: "Канада" },
  { code: "mx", name: "Мексика" },
];

export const metadata: Metadata = {
  title: "ЧМ-2026 — LEAP",
  description:
    "Хаб ЧМ-2026: расписание, группы, плей-офф сетка, регламент турнира и новости с фокусом на сборную Узбекистана.",
};

export default function WCLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-neutral-950 text-white">
      <div className="container-news pt-12 md:pt-16">
        <div className="flex items-stretch justify-between gap-6 pb-8">
          <div className="flex items-stretch gap-4 md:gap-5">
            <div className="relative aspect-square shrink-0 self-stretch overflow-hidden rounded-xl bg-white">
              <Image
                src="/wc2026/fifa-wc-2026-logo.jpg"
                alt="FIFA World Cup 2026"
                fill
                sizes="(max-width: 768px) 96px, 128px"
                className="object-contain p-1"
                priority
              />
            </div>
            <div className="flex min-w-0 flex-col justify-center">
              <h1 className="whitespace-nowrap font-serif text-2xl font-extrabold leading-tight md:text-4xl">
                Чемпионат мира по футболу 2026
              </h1>
              <p className="mt-1.5 text-xs text-neutral-400 md:mt-2 md:text-sm">
                11 июня — 19 июля · 48 команд · 12 групп · 104 матча
              </p>
            </div>
          </div>

          <div className="hidden shrink-0 self-center md:block">
            <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Хозяева
            </div>
            <ul className="mt-2 space-y-1.5">
              {HOSTS.map((h) => (
                <li
                  key={h.code}
                  className="flex items-center gap-2 text-xs uppercase tracking-wider text-neutral-300"
                >
                  <Flag code={h.code} size={16} />
                  {h.name}
                </li>
              ))}
            </ul>
          </div>

          <Link
            href="/"
            className="hidden shrink-0 self-start whitespace-nowrap rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-neutral-300 transition-colors hover:bg-white/5 hover:text-white sm:inline-block"
          >
            ← На главную
          </Link>
        </div>
      </div>

      <WCSubNav />

      <div className="container-news pb-16 pt-8">{children}</div>
    </div>
  );
}
