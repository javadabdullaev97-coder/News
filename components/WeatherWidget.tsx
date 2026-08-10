"use client";

import { useEffect, useState } from "react";
import {
  dayLabel,
  loadWeather,
  symbolIcon,
  symbolText,
  WEATHER_SOURCE,
  type WeatherData,
} from "@/lib/weather-ui";
import { t } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

// Числа приходят с нашего же /api/weather (см. src/weather.ts): worker ходит
// к MET Norway, держит ответ час в кэше и отдаёт его всем читателям сразу.
//
// До 10.08.2026 здесь стоял захардкоженный массив: «сегодня +34, ясно»
// показывалось круглый год, а «Ср» и «Чт» оставались средой и четвергом
// в любой день недели. Выдуманная погода на новостном сайте — та же
// выдуманная цифра, что и в статье: читатель по ней планирует день.
//
// Пока данные летят — показываем каркас, а не нули. Не долетели — виджета
// нет вовсе: пустая рамка с прочерками хуже её отсутствия.
export function WeatherWidget({
  lang = "ru",
  className = "",
}: {
  lang?: Lang;
  className?: string;
}) {
  const [data, setData] = useState<WeatherData | null | "loading">("loading");
  const [today, setToday] = useState("");

  useEffect(() => {
    loadWeather().then((d) => setData(d));
    setToday(
      new Date().toLocaleDateString(lang === "en" ? "en-GB" : "ru-RU", {
        timeZone: "Asia/Tashkent",
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    );
  }, [lang]);

  if (data === "loading") {
    return (
      <div
        className={`animate-pulse rounded-xl border border-neutral-200 p-4 dark:border-neutral-800 ${className}`}
        aria-hidden
      >
        <div className="h-4 w-24 rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="mt-6 h-10 w-32 rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="mt-8 space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-4 rounded bg-neutral-100 dark:bg-neutral-900" />
          ))}
        </div>
      </div>
    );
  }
  if (!data?.now) return null;

  return (
    <div
      className={`flex flex-col rounded-xl border border-neutral-200 p-4 dark:border-neutral-800 ${className}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold uppercase tracking-wider">
          {t(lang, "weather")}
        </h3>
        <span className="text-[10px] capitalize text-neutral-500">{today}</span>
      </div>

      <div className="mt-3 flex flex-1 items-center gap-4">
        <span className="text-6xl">{symbolIcon(data.now.symbol)}</span>
        <div>
          <div className="text-4xl font-bold tabular-nums">
            {data.now.temp > 0 ? "+" : ""}
            {data.now.temp}°
          </div>
          <div className="mt-1 text-xs text-neutral-500">
            {symbolText(data.now.symbol, lang)}
          </div>
          <div className="text-xs tabular-nums text-neutral-500">
            {data.now.humidity}% · {data.now.wind} м/с
          </div>
        </div>
      </div>

      <ul className="mt-4 divide-y divide-neutral-100 border-t border-neutral-100 dark:divide-neutral-800 dark:border-neutral-800">
        {/* Рядом стоит блок воздуха — вчетвером дни перерастают пару
            карточек слева, и под ними открывается полоса пустоты.
            Четвёртый день там же, в «Ленте» его никто не ищет. */}
        {data.days.slice(0, data.air ? 3 : 4).map((d, i) => (
          <li key={d.date} className="flex items-center gap-3 py-2">
            <span className="w-16 shrink-0 text-[10px] uppercase tracking-wider text-neutral-500">
              {dayLabel(d.date, i, lang)}
            </span>
            <span className="text-lg leading-none">{symbolIcon(d.symbol)}</span>
            <span className="truncate text-xs text-neutral-500">
              {symbolText(d.symbol, lang)}
            </span>
            <span className="ml-auto shrink-0 text-xs">
              <span className="font-semibold tabular-nums">{d.high}°</span>
              <span className="tabular-nums text-neutral-400"> / {d.low}°</span>
            </span>
          </li>
        ))}
      </ul>

      {/* CC BY 4.0 требует назвать источник — это условие бесплатного доступа. */}
      <div className="mt-2 border-t border-neutral-200 pt-2 text-[10px] text-neutral-500 dark:border-neutral-800">
        <a
          href="https://www.met.no/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-brand"
        >
          {WEATHER_SOURCE[lang]}
        </a>
      </div>
    </div>
  );
}
