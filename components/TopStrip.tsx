"use client";

import { useEffect, useState } from "react";

const courses = [
  { code: "USD", value: "12 587", delta: "-0.4%", down: true },
  { code: "EUR", value: "13 740", delta: "+0.2%", down: false },
  { code: "RUB", value: "138.2", delta: "-0.1%", down: true },
  { code: "Au, 1 г", value: "1 580 000", delta: "+0.8%", down: false },
];

function tashkentTime() {
  return new Date().toLocaleString("ru-RU", {
    timeZone: "Asia/Tashkent",
    weekday: "short",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TopStrip() {
  const [now, setNow] = useState<string | null>(null);

  useEffect(() => {
    setNow(tashkentTime());
    const id = setInterval(() => setNow(tashkentTime()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
      <div className="container-news flex h-8 items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="relative inline-flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="font-medium">Редакция онлайн</span>
          <span className="hidden text-neutral-500 sm:inline">·</span>
          <span className="hidden text-neutral-500 sm:inline tabular-nums">
            {now ?? ""}
          </span>
        </div>

        <div className="flex items-center gap-3 overflow-hidden">
          {courses.map((c) => (
            <div key={c.code} className="flex items-center gap-1 whitespace-nowrap">
              <span className="text-neutral-500">{c.code}</span>
              <span className="font-semibold tabular-nums">{c.value}</span>
              <span
                className={`text-[10px] tabular-nums ${
                  c.down ? "text-rose-500" : "text-emerald-500"
                }`}
              >
                {c.down ? "▾" : "▴"} {c.delta}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
