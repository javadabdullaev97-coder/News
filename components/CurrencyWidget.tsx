import {
  fetchCbuSnapshot,
  flagUrl,
  formatDiff,
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
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold uppercase tracking-wider">Курсы</h3>
        {rateDate && (
          <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
            на {rateDate}
          </span>
        )}
      </div>
      <ul className="mt-2 divide-y divide-neutral-100 dark:divide-neutral-800">
        {rates.map((r) => {
          const down = r.diff < 0;
          return (
            <li
              key={r.code}
              className="flex items-center justify-between gap-3 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full bg-neutral-100 ring-1 ring-neutral-200/70 dark:bg-neutral-800 dark:ring-neutral-700">
                  <img
                    src={flagUrl(r.code, 80)}
                    alt=""
                    width={28}
                    height={28}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    {r.code}
                  </div>
                  <div className="truncate text-xs text-neutral-500">
                    {r.name}
                  </div>
                </div>
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
