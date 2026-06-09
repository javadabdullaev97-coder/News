import Image from "next/image";
import Link from "next/link";
import { Flag } from "@/components/wc2026/Flag";
import { articles, feedDate } from "@/lib/data";
import {
  WC_MATCHES,
  kickoffTashkent,
  readableRef,
  type WCMatch,
} from "@/lib/wc2026";

const STAGE_LABEL: Record<WCMatch["stage"], string> = {
  group: "Группа",
  r32: "1/16 финала",
  r16: "1/8 финала",
  qf: "1/4 финала",
  sf: "1/2 финала",
  third: "Матч за 3-е",
  final: "Финал",
};

function dayLabelTashkent(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    weekday: "short",
    timeZone: "Asia/Tashkent",
  });
}

function MatchTile({ m }: { m: WCMatch }) {
  const home = readableRef(m.homeRef);
  const away = readableRef(m.awayRef);
  const isUz = m.homeRef === "UZB" || m.awayRef === "UZB";
  return (
    <div
      className={`rounded-xl border p-4 ${
        isUz ? "border-brand/40 bg-brand/5" : "border-white/10 bg-white/5"
      }`}
    >
      <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-wider text-neutral-500">
        <span className="font-bold text-neutral-300">
          {m.stage === "group" && m.group
            ? `Группа ${m.group}`
            : STAGE_LABEL[m.stage]}
        </span>
        {isUz && (
          <span className="rounded-full bg-brand px-2 py-0.5 text-[9px] font-bold text-white">
            Узбекистан
          </span>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Flag code={home.team?.code ?? "_tbd"} size={26} />
          <span className="truncate text-sm font-semibold">
            {home.team?.name ?? home.short}
          </span>
        </div>
        <span className="shrink-0 text-xs font-bold text-neutral-500">—</span>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <span className="truncate text-right text-sm font-semibold">
            {away.team?.name ?? away.short}
          </span>
          <Flag code={away.team?.code ?? "_tbd"} size={26} />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/5 pt-2 text-[11px] text-neutral-500">
        <span>{kickoffTashkent(m.dateLocal)} (Tashkent)</span>
        <span className="truncate text-right">{m.cityRu}</span>
      </div>
    </div>
  );
}

export default function WCHomePage() {
  const now = Date.now();
  const upcoming = [...WC_MATCHES]
    .filter((m) => new Date(m.dateLocal).getTime() >= now)
    .sort(
      (a, b) =>
        new Date(a.dateLocal).getTime() - new Date(b.dateLocal).getTime(),
    );
  const uzNext = upcoming.find(
    (m) => m.homeRef === "UZB" || m.awayRef === "UZB",
  );
  const nextMatches = upcoming.slice(0, 6);
  const firstUpcomingDay = upcoming[0]
    ? dayLabelTashkent(upcoming[0].dateLocal)
    : null;

  const wcNews = articles
    .filter((a) => a.tags.includes("ЧМ-2026"))
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );
  const lead = wcNews[0];
  const rest = wcNews.slice(1);

  return (
    <div className="space-y-12">
      {/* Матч-центр: ближайший матч Уз. + ближайшие игры турнира */}
      {uzNext && (
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-lg font-bold uppercase tracking-wider text-white">
              Ближайший матч сборной
            </h2>
            <Link
              href="/wc2026/uzbekistan"
              className="text-xs font-medium text-brand hover:underline"
            >
              Соперники по группе K →
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-[2fr_3fr]">
            <MatchTile m={uzNext} />
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm leading-relaxed text-neutral-300">
              Сборная Узбекистана впервые в истории сыграет на чемпионате
              мира. В группе K — Португалия, Колумбия и ДР Конго. В плей-офф
              проходят первые два места и восемь лучших третьих мест.
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <Link
                  href="/wc2026/uzbekistan"
                  className="rounded-full border border-brand/40 bg-brand/10 px-3 py-1 font-medium text-brand transition-colors hover:bg-brand hover:text-white"
                >
                  Соперники Узбекистана
                </Link>
                <Link
                  href="/wc2026/groups"
                  className="rounded-full border border-white/15 px-3 py-1 font-medium text-neutral-300 transition-colors hover:bg-white/5"
                >
                  Группы и лучшие 3-и места
                </Link>
                <Link
                  href="/wc2026/bracket"
                  className="rounded-full border border-white/15 px-3 py-1 font-medium text-neutral-300 transition-colors hover:bg-white/5"
                >
                  Сетка плей-офф
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-bold uppercase tracking-wider text-white">
            Ближайшие матчи
          </h2>
          {firstUpcomingDay && (
            <span className="text-xs text-neutral-500">
              старт: {firstUpcomingDay} (Tashkent)
            </span>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {nextMatches.map((m) => (
            <MatchTile key={m.id} m={m} />
          ))}
        </div>
        <div className="mt-4">
          <Link
            href="/wc2026/schedule"
            className="text-xs font-medium text-brand hover:underline"
          >
            Все 104 матча →
          </Link>
        </div>
      </section>

      {/* Лента новостей */}
      {wcNews.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-bold uppercase tracking-wider text-white">
            Новости турнира
          </h2>

          {lead && (
            <Link
              href={`/article/${lead.slug}`}
              className="group block overflow-hidden rounded-xl border border-white/10 bg-white/5 transition-colors hover:border-brand/40 hover:bg-white/10"
            >
              <div className="grid md:grid-cols-[3fr_2fr]">
                <div className="relative aspect-[16/9] md:aspect-auto">
                  <Image
                    src={lead.cover}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 100vw, 60vw"
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-col justify-center p-5 md:p-6">
                  <div className="text-[11px] uppercase tracking-wider text-neutral-500">
                    {feedDate(lead.publishedAt)}
                  </div>
                  <h3 className="mt-2 font-serif text-2xl font-bold leading-snug text-white transition-colors group-hover:text-brand">
                    {lead.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-neutral-400">
                    {lead.lead}
                  </p>
                </div>
              </div>
            </Link>
          )}

          {rest.length > 0 && (
            <div className="mt-4 divide-y divide-white/10">
              {rest.map((a) => (
                <Link
                  key={a.slug}
                  href={`/article/${a.slug}`}
                  className="group block py-5"
                >
                  <div className="text-[11px] uppercase tracking-wider text-neutral-500">
                    {feedDate(a.publishedAt)}
                  </div>
                  <div className="mt-2 flex gap-4">
                    <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg md:h-24 md:w-36">
                      <Image
                        src={a.cover}
                        alt=""
                        fill
                        sizes="(max-width: 768px) 112px, 144px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-serif text-base font-bold leading-snug text-white transition-colors group-hover:text-brand md:text-lg">
                        {a.title}
                      </h3>
                      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-neutral-400 md:text-sm">
                        {a.lead}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
