import {
  fetchCbuSnapshot,
  flagUrl,
  formatDiff,
  formatFetchedAt,
  formatRate,
  pickRates,
} from "@/lib/cbu";

const DEFAULT_CODES = ["USD", "EUR", "RUB"];

export async function CurrencyWidget({
  codes = DEFAULT_CODES,
  className = "",
}: {
  codes?: string[];
  className?: string;
}) {
  const { rates: all, fetchedAt } = await fetchCbuSnapshot();
  const rates = pickRates(all, codes);
  const rateDate = rates.find((r) => r.date)?.date ?? "";
  const updated = formatFetchedAt(fetchedAt);

  return (
    // См. WeatherWidget: растянуть виджет просит вызывающий через className.
    // Слабину распределяет список валют, «обновлено» остаётся у нижнего края.
    <div
      className={`flex flex-col rounded-xl border border-neutral-200 p-4 dark:border-neutral-800 ${className}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold uppercase tracking-wider">Курсы</h3>
        {rateDate && (
          <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
            на {rateDate}
          </span>
        )}
      </div>
      <ul className="mt-2 flex flex-1 flex-col justify-around divide-y divide-neutral-100 dark:divide-neutral-800">
        {rates.map((r) => {
          const down = r.diff < 0;
          return (
            <li
              key={r.code}
              className="flex items-center justify-between gap-3 py-2.5"
            >
              <div className="flex items-center gap-2">
                <span className="grid h-4 w-4 shrink-0 overflow-hidden rounded-full ring-1 ring-neutral-200/70 dark:ring-neutral-700">
                  <img
                    src={flagUrl(r.code, 40)}
                    alt=""
                    width={16}
                    height={16}
                    className="h-full w-full object-cover"
                  />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                  {r.code}
                </span>
              </div>
              <div className="text-right">
                <div className="font-semibold tabular-nums">
                  {formatRate(r.rate)}
                </div>
                <div
                  className={`text-[11px] tabular-nums ${
                    down ? "text-rose-500" : "text-emerald-500"
                  }`}
                >
                  {down ? "▾" : "▴"} {formatDiff(r.diff)}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-neutral-200 pt-2 text-xs text-neutral-500 dark:border-neutral-800">
        {updated && <span>обновлено {updated}</span>}
        <a
          href="https://cbu.uz/ru/arkhiv-kursov-valyut/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-brand"
        >
          ЦБ РУз →
        </a>
      </div>
    </div>
  );
}
