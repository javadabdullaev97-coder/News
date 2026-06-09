import { Flag } from "@/components/wc2026/Flag";
import { WC_MATCHES, getTeamByFifa, type WCMatch } from "@/lib/wc2026";

export const metadata = {
  title: "Расписание — ЧМ-2026 — LEAP",
};

function dayKey(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    weekday: "long",
    timeZone: "Asia/Tashkent",
  });
}

function timeKey(iso: string) {
  return new Date(iso).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tashkent",
  });
}

function MatchRow({ m }: { m: WCMatch }) {
  const home = getTeamByFifa(m.homeFifa);
  const away = getTeamByFifa(m.awayFifa);
  const isUz = m.homeFifa === "UZB" || m.awayFifa === "UZB";
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
        isUz
          ? "border-brand/40 bg-brand/10"
          : "border-white/10 bg-white/5"
      }`}
    >
      <div className="w-16 shrink-0 text-sm font-bold tabular-nums text-neutral-200">
        {timeKey(m.date)}
      </div>
      {m.group && (
        <span className="hidden shrink-0 rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-neutral-300 sm:inline-block">
          Гр. {m.group}
        </span>
      )}
      <div className="flex flex-1 items-center justify-center gap-3 truncate">
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <span className="truncate text-right text-sm font-semibold text-white">
            {home?.name ?? m.homeFifa}
          </span>
          <Flag code={home?.code ?? "_tbd"} size={22} />
        </div>
        <span className="text-xs font-bold text-neutral-500">—</span>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Flag code={away?.code ?? "_tbd"} size={22} />
          <span className="truncate text-sm font-semibold text-white">
            {away?.name ?? m.awayFifa}
          </span>
        </div>
      </div>
      <div className="hidden w-48 shrink-0 truncate text-right text-[11px] text-neutral-500 lg:block">
        {m.venue}
      </div>
    </div>
  );
}

export default function WCSchedulePage() {
  const sorted = [...WC_MATCHES].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const byDay = new Map<string, WCMatch[]>();
  for (const m of sorted) {
    const key = dayKey(m.date);
    const list = byDay.get(key) ?? [];
    list.push(m);
    byDay.set(key, list);
  }

  return (
    <div className="space-y-8">
      <p className="max-w-2xl text-sm text-neutral-400">
        Время указано по Ташкенту. Жёлтым выделены матчи сборной Узбекистана.
        В расписании — все матчи группы H и часть знаковых игр других групп;
        полная сетка пополняется ближе к старту турнира.
      </p>

      {[...byDay.entries()].map(([day, matches]) => (
        <section key={day}>
          <h2 className="border-b border-white/10 pb-2 text-sm font-bold uppercase tracking-wider text-white">
            {day}
          </h2>
          <div className="mt-4 flex flex-col gap-3">
            {matches.map((m) => (
              <MatchRow key={m.id} m={m} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
