// Погода и воздух по Ташкенту — единственный источник этих чисел на сайте.
//
// ЗАЧЕМ ЧЕРЕЗ WORKER, А НЕ В СБОРКЕ. Курсы валют тянутся во время сборки
// (lib/cbu.ts), и это видно читателю: пока редакция ничего не публикует,
// сайт не пересобирается, и под виджетом висит позавчерашняя дата. Погода
// меняется каждый час, а сборки бывают раз в несколько часов — при том же
// подходе виджет врал бы систематически. Поэтому данные отдаёт worker,
// а виджет забирает их у нас же с /api/weather. Заодно токен AQICN
// не попадает в браузер.
//
// ИСТОЧНИКИ. Оба выбраны так, чтобы лицензия допускала рекламу на сайте —
// у Open-Meteo бесплатный доступ разрешён только «частным сайтам без
// рекламы», и он поэтому не подходит, хотя технически удобнее всех.
//
//   Прогноз — MET Norway (Метеорологический институт Норвегии),
//   api.met.no. Ключа нет, обязателен опознаваемый User-Agent, лицензия
//   CC BY 4.0 с атрибуцией, коммерческое использование разрешено явно.
//   Просят уважать Expires и не долбить чаще — отсюда часовой кэш.
//
//   Воздух — AQICN (World Air Quality Index), api.waqi.info. Данные по
//   Ташкенту идут со станций Узгидромета — то есть это измерение
//   официального ведомства, а не модель. Нужен бесплатный токен;
//   нет токена — блок воздуха просто не показывается. Выдумывать
//   индекс нельзя: читатель по нему решает, выпускать ли ребёнка гулять.

const TASHKENT = { lat: 41.2995, lon: 69.2401 };
const UA = "LEAPNews/1.0 (https://leap.uz; javadabdullaev97@gmail.com)";
const TZ_OFFSET_MIN = 5 * 60; // Asia/Tashkent, без перехода на летнее время

export type DayForecast = {
  /** Локальная дата ГГГГ-ММ-ДД — подпись дня считает клиент, он знает язык. */
  date: string;
  high: number;
  low: number;
  symbol: string;
};

export type WeatherPayload = {
  updatedAt: string;
  now: {
    temp: number;
    symbol: string;
    humidity: number;
    wind: number;
  } | null;
  days: DayForecast[];
  air: {
    aqi: number;
    pm25: number | null;
    pm10: number | null;
    station: string;
    measuredAt: string;
  } | null;
};

/** Сдвигает момент в ташкентское время и возвращает дату ГГГГ-ММ-ДД. */
function localDate(iso: string): string {
  return new Date(new Date(iso).getTime() + TZ_OFFSET_MIN * 60_000)
    .toISOString()
    .slice(0, 10);
}

function localHour(iso: string): number {
  return new Date(new Date(iso).getTime() + TZ_OFFSET_MIN * 60_000).getUTCHours();
}

type MetPoint = {
  time: string;
  data: {
    instant?: { details?: Record<string, number> };
    next_1_hours?: { summary?: { symbol_code?: string } };
    next_6_hours?: { summary?: { symbol_code?: string } };
    next_12_hours?: { summary?: { symbol_code?: string } };
  };
};

async function fetchForecast(): Promise<Pick<WeatherPayload, "now" | "days">> {
  const res = await fetch(
    `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${TASHKENT.lat}&lon=${TASHKENT.lon}`,
    { headers: { "User-Agent": UA, Accept: "application/json" } },
  );
  if (!res.ok) throw new Error(`met.no ${res.status}`);
  const json = (await res.json()) as { properties?: { timeseries?: MetPoint[] } };
  const series = json.properties?.timeseries ?? [];
  if (!series.length) throw new Error("met.no: пустой прогноз");

  const first = series[0];
  const d = first.data.instant?.details ?? {};
  const now = {
    temp: Math.round(d.air_temperature ?? 0),
    symbol: symbolOf(first) ?? "clearsky_day",
    humidity: Math.round(d.relative_humidity ?? 0),
    wind: Math.round(d.wind_speed ?? 0),
  };

  // Суточные максимум и минимум — по всем точкам ЛОКАЛЬНОГО дня. Первый
  // день почти всегда неполный (прогноз начинается с текущего часа), и это
  // честно: «сегодня до 39» к вечеру уже неправда, а «осталось до 31» правда.
  const byDay = new Map<string, { temps: number[]; noon?: MetPoint }>();
  for (const p of series) {
    const day = localDate(p.time);
    const bucket = byDay.get(day) ?? { temps: [] };
    const t = p.data.instant?.details?.air_temperature;
    if (typeof t === "number") bucket.temps.push(t);
    // Значок дня берём у точки, ближайшей к полудню: ночной «ясно» ничего
    // не говорит о том, каким день будет.
    const h = localHour(p.time);
    const prevH = bucket.noon ? Math.abs(localHour(bucket.noon.time) - 12) : 99;
    if (Math.abs(h - 12) < prevH) bucket.noon = p;
    byDay.set(day, bucket);
  }

  const days: DayForecast[] = [...byDay.entries()]
    .slice(0, 4)
    .filter(([, b]) => b.temps.length)
    .map(([date, b]) => ({
      date,
      high: Math.round(Math.max(...b.temps)),
      low: Math.round(Math.min(...b.temps)),
      symbol: (b.noon && symbolOf(b.noon)) ?? "clearsky_day",
    }));

  return { now, days };
}

function symbolOf(p: MetPoint): string | undefined {
  return (
    p.data.next_1_hours?.summary?.symbol_code ??
    p.data.next_6_hours?.summary?.symbol_code ??
    p.data.next_12_hours?.summary?.symbol_code
  );
}

async function fetchAir(token: string): Promise<WeatherPayload["air"]> {
  const res = await fetch(
    `https://api.waqi.info/feed/geo:${TASHKENT.lat};${TASHKENT.lon}/?token=${encodeURIComponent(token)}`,
    { headers: { Accept: "application/json" } },
  );
  if (!res.ok) throw new Error(`waqi ${res.status}`);
  const json = (await res.json()) as {
    status?: string;
    data?: {
      aqi?: number;
      city?: { name?: string };
      iaqi?: Record<string, { v?: number }>;
      time?: { s?: string; iso?: string };
    };
  };
  if (json.status !== "ok" || typeof json.data?.aqi !== "number") {
    throw new Error(`waqi: ${json.status ?? "нет данных"}`);
  }
  // Станция приходит как «Tashkent Chilanzar, Uzbekistan». Страну убираем:
  // на узбекистанском сайте она не сообщает читателю ничего, а в шапке
  // виджета место дорогое — название иначе обрезается на полуслове.
  const station = (json.data.city?.name ?? "Tashkent").replace(
    /,\s*Uzbekistan\s*$/i,
    "",
  );
  return {
    aqi: json.data.aqi,
    pm25: json.data.iaqi?.pm25?.v ?? null,
    pm10: json.data.iaqi?.pm10?.v ?? null,
    station,
    measuredAt: json.data.time?.iso ?? json.data.time?.s ?? "",
  };
}

/**
 * Собирает выдачу для виджетов. Воздух необязателен: нет токена или
 * станция молчит — вернём `air: null`, и блок на сайте не появится.
 * Прогноз обязателен: без него отдавать нечего, пусть падает.
 */
export async function collectWeather(token?: string): Promise<WeatherPayload> {
  const [forecast, air] = await Promise.all([
    fetchForecast(),
    token
      ? fetchAir(token).catch((err) => {
          console.error(`[weather] воздух не пришёл: ${(err as Error).message}`);
          return null;
        })
      : Promise.resolve(null),
  ]);
  return { updatedAt: new Date().toISOString(), ...forecast, air };
}
