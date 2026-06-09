import { fetchCbuRates, formatRate, pickRates } from "@/lib/cbu";
import { TashkentClock } from "./TashkentClock";

export async function TopStrip() {
  const all = await fetchCbuRates();
  const rates = pickRates(all, ["USD", "EUR", "RUB"]);

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
          <span className="hidden text-neutral-500 sm:inline">
            <TashkentClock />
          </span>
        </div>

        <div className="flex items-center gap-3 overflow-hidden">
          {rates.map((r) => {
            const down = r.diff < 0;
            return (
              <div
                key={r.code}
                className="flex items-center gap-1 whitespace-nowrap"
              >
                <span className="text-neutral-500">{r.code}</span>
                <span className="font-semibold tabular-nums">
                  {formatRate(r.rate)}
                </span>
                <span
                  className={`text-[10px] tabular-nums ${
                    down ? "text-rose-500" : "text-emerald-500"
                  }`}
                >
                  {down ? "▾" : "▴"} {Math.abs(r.diffPct).toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
