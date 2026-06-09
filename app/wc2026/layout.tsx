import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { WCSubNav } from "@/components/wc2026/SubNav";

export const metadata: Metadata = {
  title: "ЧМ-2026 — LEAP",
  description:
    "Хаб ЧМ-2026: расписание, группы, плей-офф сетка, регламент турнира и новости с фокусом на сборную Узбекистана.",
};

export default function WCLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-neutral-950 text-white">
      <div className="container-news pt-8">
        <div className="flex items-stretch justify-between gap-4 pb-6">
          <div className="flex items-stretch gap-4 md:gap-5">
            <div className="relative aspect-square shrink-0 self-stretch overflow-hidden rounded-xl bg-white">
              <Image
                src="/wc2026/fifa-wc-2026-logo.jpg"
                alt="FIFA World Cup 2026"
                fill
                sizes="(max-width: 768px) 96px, 128px"
                className="scale-[1.35] object-cover"
                priority
              />
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-xs uppercase tracking-wider text-neutral-400">
                США · Канада · Мексика
              </span>
              <h1 className="mt-1 font-serif text-2xl font-extrabold leading-tight md:mt-2 md:text-4xl">
                Чемпионат мира по футболу 2026
              </h1>
              <p className="mt-1 text-xs text-neutral-400 md:text-sm">
                11 июня — 19 июля · 48 команд · 12 групп · 104 матча
              </p>
            </div>
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
