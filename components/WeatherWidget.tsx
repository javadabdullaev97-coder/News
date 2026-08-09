"use client";

import { useEffect, useState } from "react";

const days = [
  { label: "Сегодня", high: 34, low: 21, icon: "☀️", desc: "Ясно" },
  { label: "Завтра", high: 36, low: 22, icon: "🌤", desc: "Малооблачно" },
  { label: "Ср", high: 32, low: 20, icon: "⛅", desc: "Облачно" },
  { label: "Чт", high: 29, low: 18, icon: "🌦", desc: "Дождь" },
];

export function WeatherWidget({ className = "" }: { className?: string } = {}) {
  const [now, setNow] = useState<{ time: string; date: string } | null>(null);
  useEffect(() => {
    const d = new Date();
    setNow({
      time: d.toLocaleTimeString("ru-RU", {
        timeZone: "Asia/Tashkent",
        hour: "2-digit",
        minute: "2-digit",
      }),
      date: d.toLocaleDateString("ru-RU", {
        timeZone: "Asia/Tashkent",
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    });
  }, []);

  return (
    // flex-колонка, чтобы слабину по высоте забирал блок с температурой,
    // а прогноз оставался прижатым к низу. Растягивать виджет просит
    // вызывающий: на главной он сосед карточек новостей по строке грида
    // и приходит с className="h-full", в сайдбаре рубрики — без него,
    // иначе занял бы всю высоту колонки со списком статей.
    <div
      className={`flex flex-col rounded-xl border border-neutral-200 p-4 dark:border-neutral-800 ${className}`}
    >
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider">Ташкент</h3>
        <span className="text-[10px] capitalize text-neutral-500">
          {now?.date}
        </span>
      </div>

      <div className="mt-3 flex flex-1 items-center gap-4">
        <span className="text-6xl">☀️</span>
        <div>
          <div className="text-4xl font-bold tabular-nums">+34°</div>
          <div className="mt-1 text-xs text-neutral-500">Ясно</div>
          <div className="text-xs text-neutral-500">ощущается +36°</div>
        </div>
      </div>

      {/*
        Прогноз строками, а не полоской из четырёх колонок: в колонках
        помещался только градус, а строка вмещает ещё и описание погоды —
        и заодно занимает высоту содержанием там, где виджет растянут
        до карточек новостей.
      */}
      <ul className="mt-4 divide-y divide-neutral-100 border-t border-neutral-100 dark:divide-neutral-800 dark:border-neutral-800">
        {days.map((d) => (
          <li key={d.label} className="flex items-center gap-3 py-2">
            <span className="w-16 shrink-0 text-[10px] uppercase tracking-wider text-neutral-500">
              {d.label}
            </span>
            <span className="text-lg leading-none">{d.icon}</span>
            <span className="truncate text-xs text-neutral-500">{d.desc}</span>
            <span className="ml-auto shrink-0 text-xs">
              <span className="font-semibold tabular-nums">{d.high}°</span>
              <span className="text-neutral-400 tabular-nums"> / {d.low}°</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
