"use client";

import { useEffect, useState } from "react";
import {
  AIR_SOURCE,
  AIR_TITLE,
  aqiBand,
  loadWeather,
  type WeatherData,
} from "@/lib/weather-ui";
import type { Lang } from "@/lib/types";

// Индекс качества воздуха по Ташкенту. Данные — AQICN, станции Чиланзар
// и Юнусабад, показания снимает Узгидромет: это измерение официального
// ведомства, а не модельный расчёт, и по нашим же правилам об источниках
// это единственный вариант, который можно печатать.
//
// Виджет исчезает целиком, если данных нет: не задан AQICN_TOKEN у воркера,
// станция молчит, запрос не прошёл. Прочерк вместо индекса читатель прочтёт
// как «чисто», а это не то, что мы знаем.
export function AirWidget({
  lang = "ru",
  className = "",
}: {
  lang?: Lang;
  className?: string;
}) {
  const [data, setData] = useState<WeatherData | null>(null);
  useEffect(() => {
    loadWeather().then(setData);
  }, []);

  const air = data?.air;
  if (!air) return null;

  const band = aqiBand(air.aqi, lang);

  return (
    <div
      className={`rounded-xl border border-neutral-200 p-4 dark:border-neutral-800 ${className}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold uppercase tracking-wider">
          {AIR_TITLE[lang]}
        </h3>
        <span className="truncate text-[10px] text-neutral-500">{air.station}</span>
      </div>

      <div className="mt-2 flex items-end gap-3">
        <span className={`text-4xl font-bold leading-none tabular-nums ${band.tone}`}>
          {air.aqi}
        </span>
        <span className={`text-xs font-semibold leading-tight ${band.tone}`}>
          {band.label}
        </span>
        <span className="ml-auto text-right text-[11px] leading-tight tabular-nums text-neutral-500">
          {air.pm25 !== null && <span className="block">PM2.5 · {air.pm25}</span>}
          {air.pm10 !== null && <span className="block">PM10 · {air.pm10}</span>}
        </span>
      </div>

      <div className="mt-2 text-[10px] text-neutral-500">
        <a
          href="https://aqicn.org/city/tashkent/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-brand"
        >
          {AIR_SOURCE[lang]}
        </a>
      </div>
    </div>
  );
}
