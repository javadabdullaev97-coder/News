import Link from "next/link";
import { notFound } from "next/navigation";
import { Flag } from "@/components/wc2026/Flag";
import {
  WC_MATCHES,
  getMatchStatus,
  kickoffTashkent,
  readableRef,
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
  const status = getMatchStatus(m).status;

  const stageLabel =
    m.stage === "group" && m.group
      ? `Группа ${m.group}`
      : STAGE_LABEL[m.stage];

  const score = m.score ? `${m.score.home} : ${m.score.away}` : "—";

  return (
    <div className="space-y-6">
      <Link
        href="/wc2026"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-400 hover:text-white"
      >
        ← К матч-центру
      </Link>

      <section className="rounded-xl border border-white/10 bg-white/5 p-6">
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
          {status === "finished" && (
            <span className="text-neutral-500">завершён</span>
          )}
        </div>

        <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
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
            className={`text-center font-mono text-3xl font-extrabold tabular-nums md:text-5xl ${
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

        <div className="mt-6 border-t border-white/10 pt-4 text-sm text-neutral-300">
          <span aria-hidden className="mr-1.5">🏟</span>
          {m.venueRu}, {m.cityRu}
        </div>
      </section>

      {m.stage === "group" && m.group && (
        <div className="flex flex-wrap gap-2 text-xs">
          <Link
            href="/wc2026/groups"
            className="rounded-full border border-white/15 px-3 py-1 font-medium text-neutral-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            Турнирная таблица группы {m.group}
          </Link>
          <Link
            href="/wc2026/schedule"
            className="rounded-full border border-white/15 px-3 py-1 font-medium text-neutral-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            Все матчи дня
          </Link>
        </div>
      )}
    </div>
  );
}
