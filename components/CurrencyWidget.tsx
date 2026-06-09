import {
  fetchCbuSnapshot,
  formatFetchedAt,
  formatRate,
  pickRates,
} from "@/lib/cbu";

const SIDEBAR_CODES = ["USD", "EUR", "RUB", "CNY", "KZT"];

export async function CurrencyWidget() {
  const { rates: all, fetchedAt } = await fetchCbuSnapshot();
  const rates = pickRates(all, SIDEBAR_CODES);
  const rateDate = rates.find((r) => r.date)?.date ?? "";
  const updated = formatFetchedAt(fetchedAt);

  return (
    <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider">Курсы</h3>
        {updated && (
          <span className="text-[10px] text-neutral-500">
            обновлено {updated}
          </span>
        )}
      </div>
      <ul className="mt-2 divide-y divide-neutral-100 dark:divide-neutral-800">
        {rates.map((r) => {
          const down = r.diff < 0;
          return (
            <li
              key={r.code}
              className="flex items-center justify-between py-2.5"
            >
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  {r.code}
                </div>
                <div className="truncate text-xs text-neutral-500">{r.name}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold tabular-nums">
                  {formatRate(r.rate)}
                </div>
                <div
                  className={`text-[10px] tabular-nums ${
                    down ? "text-rose-500" : "text-emerald-500"
                  }`}
                >
                  {down ? "▾" : "▴"} {Math.abs(r.diffPct).toFixed(2)}%
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-2 flex items-center justify-between border-t border-neutral-200 pt-2 text-[10px] text-neutral-500 dark:border-neutral-800">
        {rateDate && <span>Курс на {rateDate}</span>}
        <a
          href="https://cbu.uz/ru/arkhiv-kursov-valyut/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-brand"
        >
          Источник: ЦБ РУз →
        </a>
      </div>
    </div>
  );
}
