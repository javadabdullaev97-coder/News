import Link from "next/link";
import { notFound } from "next/navigation";
import { Flag } from "@/components/wc2026/Flag";
import {
  WC_MATCHES,
  getMatchDetails,
  getMatchStatus,
  kickoffTashkent,
  readableRef,
  type WCMatchBooking,
  type WCMatchGoal,
  type WCMatchSub,
} from "@/lib/wc2026";

const STAGE_LABEL: Record<string, string> = {
  group: "Группа",
  r32: "1/16 финала",
  r16: "1/8 финала",
  qf: "1/4 финала",
  sf: "1/2 финала",
  third: "Матч за 3-е место",
  final: "Финал",
};

export function generateStaticParams() {
  return WC_MATCHES.map((m) => ({ id: m.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const m = WC_MATCHES.find((x) => x.id === id);
  if (!m) return {};
  const home = readableRef(m.homeRef);
  const away = readableRef(m.awayRef);
  const title = `${home.team?.name ?? home.short} — ${away.team?.name ?? away.short} · ЧМ-2026 · LEAP`;
  return { title };
}

function minuteLabel(g: {
  minute: number | null;
  injuryTime?: number | null;
}) {
  if (g.minute == null) return "?";
  if (g.injuryTime) return `${g.minute}+${g.injuryTime}'`;
  return `${g.minute}'`;
}

function GoalLine({
  g,
  homeRef,
}: {
  g: WCMatchGoal;
  homeRef: string;
}) {
  const isHome = g.team === homeRef;
  const align = isHome ? "items-start text-left" : "items-end text-right";
  return (
    <div className={`flex flex-col gap-0.5 ${align}`}>
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <span className="text-xs font-mono tabular-nums text-brand">
          ⚽ {minuteLabel(g)}
        </span>
        <span>{g.scorer ?? "—"}</span>
      </div>
      {g.assist && (
        <div className="text-[11px] text-neutral-500">
          ассист: {g.assist}
        </div>
      )}
      {g.score && (
        <div className="text-[11px] font-bold text-neutral-400">
          {g.score.home}:{g.score.away}
        </div>
      )}
    </div>
  );
}

function BookingLine({
  b,
  homeRef,
}: {
  b: WCMatchBooking;
  homeRef: string;
}) {
  const isHome = b.team === homeRef;
  const align = isHome ? "items-start text-left" : "items-end text-right";
  const icon = b.card === "RED" || b.card === "YELLOW_RED" ? "🟥" : "🟨";
  return (
    <div className={`flex flex-col gap-0.5 ${align}`}>
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <span className="text-xs font-mono tabular-nums text-neutral-400">
          {icon} {minuteLabel(b)}
        </span>
        <span>{b.player ?? "—"}</span>
      </div>
    </div>
  );
}

function SubLine({ s, homeRef }: { s: WCMatchSub; homeRef: string }) {
  const isHome = s.team === homeRef;
  const align = isHome ? "items-start text-left" : "items-end text-right";
  return (
    <div className={`flex flex-col gap-0.5 ${align}`}>
      <div className="flex items-center gap-2 text-sm text-neutral-300">
        <span className="text-xs font-mono tabular-nums text-neutral-500">
          🔄 {minuteLabel(s)}
        </span>
        <span className="text-emerald-400">↑ {s.playerIn ?? "—"}</span>
        <span className="text-rose-400">↓ {s.playerOut ?? "—"}</span>
      </div>
    </div>
  );
}

export default async function WCMatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const m = WC_MATCHES.find((x) => x.id === id);
  if (!m) notFound();

  const home = readableRef(m.homeRef);
  const away = readableRef(m.awayRef);
  const details = getMatchDetails(id);
  const status = getMatchStatus(m).status;

  const stageLabel =
    m.stage === "group" && m.group
      ? `Группа ${m.group}`
      : STAGE_LABEL[m.stage];

  // Объединяем события в один timeline и сортируем по минуте.
  type Event =
    | { kind: "goal"; minute: number; injuryTime: number | null; data: WCMatchGoal }
    | { kind: "booking"; minute: number; injuryTime: number | null; data: WCMatchBooking }
    | { kind: "sub"; minute: number; injuryTime: number | null; data: WCMatchSub };

  const timeline: Event[] = [];
  if (details) {
    for (const g of details.goals)
      timeline.push({
        kind: "goal",
        minute: g.minute ?? 0,
        injuryTime: g.injuryTime ?? null,
        data: g,
      });
    for (const b of details.bookings)
      timeline.push({
        kind: "booking",
        minute: b.minute ?? 0,
        injuryTime: b.injuryTime ?? null,
        data: b,
      });
    for (const s of details.substitutions)
      timeline.push({
        kind: "sub",
        minute: s.minute ?? 0,
        injuryTime: s.injuryTime ?? null,
        data: s,
      });
  }
  timeline.sort((a, b) => {
    if (a.minute !== b.minute) return a.minute - b.minute;
    return (a.injuryTime ?? 0) - (b.injuryTime ?? 0);
  });

  const score = m.score
    ? `${m.score.home} : ${m.score.away}`
    : status === "scheduled"
      ? "—"
      : "—";

  return (
    <div className="space-y-8">
      <Link
        href="/wc2026"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-400 hover:text-white"
      >
        ← К матч-центру
      </Link>

      {/* Шапка матча */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-wider text-neutral-400">
          <span className="rounded-md bg-white/10 px-2 py-0.5 text-white">
            {stageLabel}
          </span>
          <span className="font-mono text-neutral-500">{m.id}</span>
          <span>{kickoffTashkent(m.dateLocal)} (Tashkent)</span>
          {status === "live" && (
            <span className="inline-flex items-center gap-1 font-bold text-red-400">
              <span className="relative inline-flex h-1.5 w-1.5">
                <span className="absolute inset-0 animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
              </span>
              LIVE
            </span>
          )}
        </div>

        <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="flex items-center justify-end gap-3">
            <div className="text-right">
              <div className="font-serif text-xl font-bold text-white md:text-2xl">
                {home.team?.name ?? home.short}
              </div>
              {home.team?.confederation && (
                <div className="mt-0.5 text-[10px] uppercase tracking-wider text-neutral-500">
                  {home.team.confederation}
                </div>
              )}
            </div>
            <Flag code={home.team?.code ?? "_tbd"} size={48} />
          </div>

          <div
            className={`text-center font-mono text-3xl font-extrabold tabular-nums md:text-4xl ${
              status === "live"
                ? "text-red-300"
                : status === "finished"
                  ? "text-white"
                  : "text-neutral-500"
            }`}
          >
            {score}
          </div>

          <div className="flex items-center gap-3">
            <Flag code={away.team?.code ?? "_tbd"} size={48} />
            <div>
              <div className="font-serif text-xl font-bold text-white md:text-2xl">
                {away.team?.name ?? away.short}
              </div>
              {away.team?.confederation && (
                <div className="mt-0.5 text-[10px] uppercase tracking-wider text-neutral-500">
                  {away.team.confederation}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1 border-t border-white/10 pt-3 text-[11px] text-neutral-400">
          <span>🏟 {m.venueRu}, {m.cityRu}</span>
          {details?.referees?.[0]?.name && (
            <span>· судья: {details.referees[0].name}</span>
          )}
        </div>
      </section>

      {/* Timeline событий */}
      {details && timeline.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-white">
            События матча
          </h2>
          <div className="space-y-1.5 overflow-hidden rounded-xl border border-white/10 bg-white/5">
            {timeline.map((e, i) => (
              <div
                key={`${e.kind}-${i}`}
                className="grid grid-cols-[1fr_1fr] gap-4 border-t border-white/5 px-4 py-2 first:border-t-0"
              >
                {e.kind === "goal" && <GoalLine g={e.data} homeRef={m.homeRef} />}
                {e.kind === "booking" && (
                  <BookingLine b={e.data} homeRef={m.homeRef} />
                )}
                {e.kind === "sub" && <SubLine s={e.data} homeRef={m.homeRef} />}
              </div>
            ))}
          </div>
        </section>
      ) : status === "scheduled" ? (
        <section className="rounded-xl border border-white/10 bg-white/5 p-5 text-sm text-neutral-400">
          Матч ещё не начался. Здесь появятся голы, карточки и замены поминутно
          после старта.
        </section>
      ) : (
        <section className="rounded-xl border border-white/10 bg-white/5 p-5 text-sm text-neutral-400">
          События матча подтянутся в течение ближайшего обновления. Скрипт
          собирает детали поэтапно (по 5 матчей за прогон), чтобы не упереться
          в лимит API.
        </section>
      )}
    </div>
  );
}
