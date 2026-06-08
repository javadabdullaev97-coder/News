"use client";

import { useEffect, useState } from "react";

const days = [
  { label: "Сегодня", high: 34, low: 21, icon: "☀️", desc: "Ясно" },
  { label: "Завтра", high: 36, low: 22, icon: "🌤", desc: "Малооблачно" },
  { label: "Ср", high: 32, low: 20, icon: "⛅", desc: "Облачно" },
  { label: "Чт", high: 29, low: 18, icon: "🌦", desc: "Дождь" },
];

export function WeatherWidget() {
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
    <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider">Ташкент</h3>
        <span className="text-[10px] capitalize text-neutral-500">
          {now?.date}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-4">
        <span className="text-5xl">☀️</span>
        <div>
          <div className="text-3xl font-bold tabular-nums">+34°</div>
          <div className="text-xs text-neutral-500">Ясно · ощущается +36°</div>
        </div>
      </div>

      <ul className="mt-4 grid grid-cols-4 gap-1 border-t border-neutral-100 pt-3 text-center dark:border-neutral-800">
        {days.map((d) => (
          <li key={d.label} className="rounded-lg p-1.5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900">
            <div className="text-[10px] uppercase text-neutral-500">{d.label}</div>
            <div className="mt-0.5 text-xl">{d.icon}</div>
            <div className="mt-0.5 text-xs">
              <span className="font-semibold tabular-nums">{d.high}°</span>
              <span className="text-neutral-400 tabular-nums"> / {d.low}°</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
