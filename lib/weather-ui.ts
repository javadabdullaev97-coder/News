// Подписи для виджетов погоды и воздуха: сами числа приходят с /api/weather,
// а словами их называет клиент — он знает язык страницы.
//
// Один загрузчик на оба виджета намеренно: они стоят рядом и просят одно
// и то же. Без общего обещания получилось бы два запроса на каждого читателя.

import type { Lang } from "./types";

export type WeatherData = {
  updatedAt: string;
  now: { temp: number; symbol: string; humidity: number; wind: number } | null;
  days: { date: string; high: number; low: number; symbol: string }[];
  air: {
    aqi: number;
    pm25: number | null;
    pm10: number | null;
    station: string;
    measuredAt: string;
  } | null;
};

let inflight: Promise<WeatherData | null> | null = null;

export function loadWeather(): Promise<WeatherData | null> {
  if (!inflight) {
    inflight = fetch("/api/weather")
      .then((r) => (r.ok ? (r.json() as Promise<WeatherData>) : null))
      .catch(() => null);
  }
  return inflight;
}

// Коды MET Norway. Суффиксы _day / _night / _polartwilight отбрасываем:
// на значке они меняли бы только солнце на луну, а подпись — нет.
const SYMBOLS: Record<string, { icon: string; ru: string; uz: string; en: string }> = {
  clearsky: { icon: "☀️", ru: "Ясно", uz: "Ochiq", en: "Clear" },
  fair: { icon: "🌤", ru: "Малооблачно", uz: "Kam bulutli", en: "Fair" },
  partlycloudy: { icon: "⛅", ru: "Переменная облачность", uz: "O'zgaruvchan bulutli", en: "Partly cloudy" },
  cloudy: { icon: "☁️", ru: "Облачно", uz: "Bulutli", en: "Cloudy" },
  fog: { icon: "🌫", ru: "Туман", uz: "Tuman", en: "Fog" },
  lightrain: { icon: "🌦", ru: "Небольшой дождь", uz: "Kuchsiz yomg'ir", en: "Light rain" },
  lightrainshowers: { icon: "🌦", ru: "Небольшой дождь", uz: "Kuchsiz yomg'ir", en: "Light showers" },
  rain: { icon: "🌧", ru: "Дождь", uz: "Yomg'ir", en: "Rain" },
  rainshowers: { icon: "🌧", ru: "Ливень", uz: "Jala", en: "Showers" },
  heavyrain: { icon: "🌧", ru: "Сильный дождь", uz: "Kuchli yomg'ir", en: "Heavy rain" },
  heavyrainshowers: { icon: "🌧", ru: "Сильный ливень", uz: "Kuchli jala", en: "Heavy showers" },
  lightsleet: { icon: "🌨", ru: "Мокрый снег", uz: "Yomg'ir-qor", en: "Light sleet" },
  sleet: { icon: "🌨", ru: "Мокрый снег", uz: "Yomg'ir-qor", en: "Sleet" },
  heavysleet: { icon: "🌨", ru: "Сильный мокрый снег", uz: "Kuchli yomg'ir-qor", en: "Heavy sleet" },
  lightsnow: { icon: "🌨", ru: "Небольшой снег", uz: "Kuchsiz qor", en: "Light snow" },
  snow: { icon: "❄️", ru: "Снег", uz: "Qor", en: "Snow" },
  heavysnow: { icon: "❄️", ru: "Сильный снег", uz: "Kuchli qor", en: "Heavy snow" },
  thunder: { icon: "⛈", ru: "Гроза", uz: "Momaqaldiroq", en: "Thunder" },
};

function baseCode(symbol: string): string {
  const base = symbol.replace(/_(day|night|polartwilight)$/, "");
  if (SYMBOLS[base]) return base;
  // Составные коды вида rainandthunder / snowshowersandthunder.
  if (base.includes("thunder")) return "thunder";
  if (base.includes("snow")) return "snow";
  if (base.includes("sleet")) return "sleet";
  if (base.includes("rain")) return "rain";
  return "cloudy";
}

export function symbolIcon(symbol: string): string {
  return SYMBOLS[baseCode(symbol)].icon;
}

export function symbolText(symbol: string, lang: Lang): string {
  return SYMBOLS[baseCode(symbol)][lang];
}

const TODAY = { ru: "Сегодня", uz: "Bugun", en: "Today" };
const TOMORROW = { ru: "Завтра", uz: "Ertaga", en: "Tomorrow" };
const WEEKDAYS: Record<Lang, string[]> = {
  ru: ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"],
  uz: ["Yak", "Du", "Se", "Chor", "Pay", "Ju", "Sha"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};

/** «Сегодня», «Завтра», дальше — день недели. Индекс считаем от первой даты. */
export function dayLabel(date: string, index: number, lang: Lang): string {
  if (index === 0) return TODAY[lang];
  if (index === 1) return TOMORROW[lang];
  // Дата приходит как ГГГГ-ММ-ДД без времени — берём её как UTC-полночь,
  // иначе браузер в минусовом поясе показал бы предыдущий день.
  return WEEKDAYS[lang][new Date(`${date}T00:00:00Z`).getUTCDay()];
}

// Шкала US EPA — по ней AQICN и считает свой индекс.
const AQI_BANDS: {
  max: number;
  tone: string;
  ru: string;
  uz: string;
  en: string;
}[] = [
  { max: 50, tone: "text-emerald-500", ru: "Хороший", uz: "Yaxshi", en: "Good" },
  { max: 100, tone: "text-amber-500", ru: "Умеренный", uz: "O'rtacha", en: "Moderate" },
  { max: 150, tone: "text-orange-500", ru: "Вреден для чувствительных", uz: "Sezgirlar uchun zararli", en: "Unhealthy for sensitive groups" },
  { max: 200, tone: "text-rose-500", ru: "Вредный", uz: "Zararli", en: "Unhealthy" },
  { max: 300, tone: "text-violet-500", ru: "Очень вредный", uz: "Juda zararli", en: "Very unhealthy" },
  { max: Infinity, tone: "text-red-700", ru: "Опасный", uz: "Xavfli", en: "Hazardous" },
];

export function aqiBand(aqi: number, lang: Lang): { label: string; tone: string } {
  const band = AQI_BANDS.find((b) => aqi <= b.max) ?? AQI_BANDS[AQI_BANDS.length - 1];
  return { label: band[lang], tone: band.tone };
}

export const AIR_TITLE = { ru: "Воздух", uz: "Havo", en: "Air quality" };
export const AIR_SOURCE = {
  ru: "Узгидромет · AQICN",
  uz: "O'zgidromet · AQICN",
  en: "Uzhydromet · AQICN",
};
export const WEATHER_SOURCE = {
  ru: "Прогноз: MET Norway",
  uz: "Prognoz: MET Norway",
  en: "Forecast: MET Norway",
};
