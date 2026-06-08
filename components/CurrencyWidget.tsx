"use client";

import { useEffect, useState } from "react";

const rates = [
  { code: "USD", name: "Доллар США", value: "12 587", delta: -47, deltaPct: -0.4 },
  { code: "EUR", name: "Евро", value: "13 740", delta: +28, deltaPct: +0.2 },
  { code: "RUB", name: "Российский рубль", value: "138,2", delta: -0.2, deltaPct: -0.1 },
  { code: "AU", name: "Золото · 1 г", value: "1 580 000", delta: +12000, deltaPct: +0.8 },
];

export function CurrencyWidget() {
  const [updated, setUpdated] = useState<string | null>(null);
  useEffect(() => {
    setUpdated(
      new Date().toLocaleTimeString("ru-RU", {
        timeZone: "Asia/Tashkent",
        hour: "2-digit",
        minute: "2-digit",
      }),
    );
  }, []);

  return (
    <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider">Курсы</h3>
        <span className="text-[10px] text-neutral-500">
          {updated ? `обновлено ${updated}` : "обновляется"}
        </span>
      </div>
      <ul className="mt-2 divide-y divide-neutral-100 dark:divide-neutral-800">
        {rates.map((r) => {
          const down = r.delta < 0;
          return (
            <li key={r.code} className="flex items-center justify-between py-2.5">
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  {r.code}
                </div>
                <div className="truncate text-xs text-neutral-500">{r.name}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold tabular-nums">{r.value}</div>
                <div
                  className={`text-[10px] tabular-nums ${
                    down ? "text-rose-500" : "text-emerald-500"
                  }`}
                >
                  {down ? "▾" : "▴"} {Math.abs(r.deltaPct).toFixed(1)}%
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-2 border-t border-neutral-200 pt-2 text-[10px] text-neutral-500 dark:border-neutral-800">
        Источник: ЦБ Республики Узбекистан
      </div>
    </div>
  );
}
