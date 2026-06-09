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
        <div className="flex items-start justify-between gap-4 pb-6">
          <div className="flex items-start gap-5">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-white md:h-24 md:w-24">
              <Image
                src="/wc2026/fifa-wc-2026-logo.jpg"
                alt="FIFA World Cup 2026"
                fill
                sizes="96px"
                className="object-contain p-1"
                priority
              />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 items-center gap-2 rounded-full bg-brand px-3 text-xs font-bold uppercase tracking-wider">
                  🏆 ЧМ-2026
                </span>
                <span className="text-xs uppercase tracking-wider text-neutral-400">
                  США · Канада · Мексика
                </span>
              </div>
              <h1 className="mt-3 font-serif text-3xl font-extrabold leading-tight md:text-4xl">
                Чемпионат мира по футболу 2026
              </h1>
              <p className="mt-1 text-sm text-neutral-400">
                11 июня — 19 июля · 48 команд · 12 групп · 104 матча
              </p>
            </div>
          </div>
          <Link
            href="/"
            className="hidden whitespace-nowrap rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-neutral-300 transition-colors hover:bg-white/5 hover:text-white sm:inline-block"
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
