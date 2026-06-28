import { Flag } from "@/components/wc2026/Flag";
import {
  WC_MATCHES,
  getMatchStatus,
  readableRef,
  resolveBracketSlot,
  type WCMatch,
} from "@/lib/wc2026";

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

function tashkentTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tashkent",
  });
}

const STAGE_LABELS: Record<string, string> = {
  group: "Группа",
  r32: "1/16",
  r16: "1/8",
  qf: "1/4",
  sf: "1/2",
  third: "За 3-е",
  final: "Финал",
};

function MatchRow({ m }: { m: WCMatch }) {
  const home = readableRef(m.homeRef);
  const away = readableRef(m.awayRef);
  // Для плей-офф слотов («1A» / «BEST3-X» / «W M73») — пробуем подставить
  // конкретную команду по текущим результатам, если уже определилась.
  const homeResolved = home.team ?? resolveBracketSlot(m.homeRef);
  const awayResolved = away.team ?? resolveBracketSlot(m.awayRef);
  const isUz = m.homeRef === "UZB" || m.awayRef === "UZB";
  const status = getMatchStatus(m).status;
  const score = m.score;
  const middleText =
    score && (status === "finished" || status === "live")
      ? `${score.home} : ${score.away}`
      : "—";
  const middleClass =
    status === "live"
      ? "text-red-300"
      : status === "finished"
        ? "text-white"
        : "text-neutral-500";

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
        isUz ? "border-brand/40 bg-brand/10" : "border-white/10 bg-white/5"
      }`}
    >
      <div className="w-16 shrink-0">
        <div
          className={`text-sm font-bold tabular-nums ${
            status === "finished" ? "text-neutral-500" : "text-neutral-200"
          }`}
        >
          {tashkentTime(m.dateLocal)}
        </div>
        {status === "live" && (
          <div className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold text-red-400">
            <span className="relative inline-flex h-1.5 w-1.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
            </span>
            live
          </div>
        )}
        {status === "finished" && (
          <div className="mt-0.5 text-[9px] uppercase tracking-wider text-neutral-500">
            завершён
          </div>
        )}
      </div>
      <span className="hidden shrink-0 rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-neutral-300 sm:inline-block">
        {m.stage === "group" && m.group
          ? `Гр. ${m.group}`
          : STAGE_LABELS[m.stage] ?? m.stage}
      </span>
      <div className="flex flex-1 items-center justify-center gap-3">
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <span
            className="truncate text-right text-sm font-semibold text-white"
            title={home.long}
          >
            {homeResolved?.name ?? home.long}
          </span>
          <Flag code={homeResolved?.code ?? "_tbd"} size={22} />
        </div>
        <span
          className={`min-w-[42px] text-center font-mono text-sm font-bold tabular-nums ${middleClass}`}
        >
          {middleText}
        </span>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Flag code={awayResolved?.code ?? "_tbd"} size={22} />
          <span
            className="truncate text-sm font-semibold text-white"
            title={away.long}
          >
            {awayResolved?.name ?? away.long}
          </span>
        </div>
      </div>
      <div className="hidden w-56 shrink-0 truncate text-right text-[11px] text-neutral-500 lg:block">
        {m.venueRu} · {m.cityRu}
      </div>
    </div>
  );
}

export default function WCSchedulePage() {
  const sorted = [...WC_MATCHES].sort(
    (a, b) => new Date(a.dateLocal).getTime() - new Date(b.dateLocal).getTime(),
  );

  const byDay = new Map<string, WCMatch[]>();
  for (const m of sorted) {
    const key = dayKey(m.dateLocal);
    const list = byDay.get(key) ?? [];
    list.push(m);
    byDay.set(key, list);
  }

  return (
    <div className="space-y-8">
      <p className="max-w-2xl text-sm text-neutral-400">
        Все 104 матча турнира. Время — по Ташкенту. Матчи сборной Узбекистана
        выделены. С 28 июня начинается плей-офф: слоты команд (1A, 2B, 3-е
        ABCDF…) заменяются на реальные сборные по итогам группового этапа.
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
