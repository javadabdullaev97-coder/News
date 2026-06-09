import { fetchCbuRates, formatRate } from "@/lib/cbu";

export async function CurrencyWidget() {
  const rates = await fetchCbuRates();
  const date = rates.find((r) => r.date)?.date ?? "";

  return (
    <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider">Курсы</h3>
        <span className="text-[10px] text-neutral-500">
          {date ? `на ${date}` : "обновляется"}
        </span>
      </div>
      <ul className="mt-2 divide-y divide-neutral-100 dark:divide-neutral-800">
        {rates.map((r) => {
          const down = r.diff < 0;
          return (
            <li key={r.code} className="flex items-center justify-between py-2.5">
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
      <div className="mt-2 border-t border-neutral-200 pt-2 text-[10px] text-neutral-500 dark:border-neutral-800">
        Источник:{" "}
        <a
          href="https://cbu.uz/ru/arkhiv-kursov-valyut/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-brand"
        >
          ЦБ Республики Узбекистан
        </a>
      </div>
    </div>
  );
}
