import Image from "next/image";
import Link from "next/link";
import { Flag } from "@/components/wc2026/Flag";
import { articles, feedDate } from "@/lib/data";
import {
  WC_MATCHES,
  getMatchStatus,
  readableRef,
  timeTashkent,
  type WCMatch,
} from "@/lib/wc2026";

type MatchWithStatus = {
  m: WCMatch;
  status: "scheduled" | "live" | "finished";
  minute?: number;
  when: number;
};

// «2026-06-15» по Asia/Tashkent — стабильный ключ дня для группировки.
function tashkentDayKey(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", {
    timeZone: "Asia/Tashkent",
  });
}

function dayLabel(iso: string, todayKey: string): string {
  const key = tashkentDayKey(iso);
  const dayDate = new Date(`${key}T12:00:00+05:00`).getTime();
  const todayDate = new Date(`${todayKey}T12:00:00+05:00`).getTime();
  const diff = Math.round((dayDate - todayDate) / (24 * 3600 * 1000));
  if (diff === -1) return "Вчера";
  if (diff === 0) return "Сегодня";
  if (diff === 1) return "Завтра";
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    weekday: "long",
    timeZone: "Asia/Tashkent",
  });
}

function StatusPill({
  status,
  minute,
  dateLocal,
}: {
  status: "scheduled" | "live" | "finished";
  minute?: number;
  dateLocal: string;
}) {
  if (status === "finished") {
    return (
      <span className="text-[9px] uppercase tracking-wider text-neutral-500">
        завершён
      </span>
    );
  }
  if (status === "live") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400">
        <span className="relative inline-flex h-1.5 w-1.5">
          <span className="absolute inset-0 animate-ping rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
        </span>
        {minute ? `${minute}'` : "live"}
      </span>
    );
  }
  return (
    <span className="text-[10px] font-bold tabular-nums text-brand">
      {timeTashkent(dateLocal)}
    </span>
  );
}

function MatchRow({ item }: { item: MatchWithStatus }) {
  const { m, status, minute } = item;
  const home = readableRef(m.homeRef);
  const away = readableRef(m.awayRef);
  const isUz = m.homeRef === "UZB" || m.awayRef === "UZB";
  const score =
    status === "finished" && m.score
      ? `${m.score.home}:${m.score.away}`
      : status === "live" && m.score
        ? `${m.score.home}:${m.score.away}`
        : "—:—";

  return (
    <div
      className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs ${
        isUz ? "border-brand/40 bg-brand/5" : "border-white/10 bg-white/5"
      }`}
    >
      <div className="w-10 shrink-0">
        <StatusPill
          status={status}
          minute={minute}
          dateLocal={m.dateLocal}
        />
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
        <span
          className="truncate text-right font-semibold text-white"
          title={home.long}
        >
          {home.team?.name ?? home.short}
        </span>
        <Flag code={home.team?.code ?? "_tbd"} size={16} />
      </div>
      <div
        className={`min-w-[34px] shrink-0 text-center font-mono font-bold tabular-nums ${
          status === "finished"
            ? "text-white"
            : status === "live"
              ? "text-red-300"
              : "text-neutral-500"
        }`}
      >
        {score}
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <Flag code={away.team?.code ?? "_tbd"} size={16} />
        <span
          className="truncate font-semibold text-white"
          title={away.long}
        >
          {away.team?.name ?? away.short}
        </span>
      </div>
    </div>
  );
}

function pickMatchCenter(now: number): MatchWithStatus[] {
  const day = 24 * 60 * 60 * 1000;
  const all = WC_MATCHES.map((m): MatchWithStatus => {
    const st = getMatchStatus(m, now);
    return {
      m,
      status: st.status,
      minute: st.minute,
      when: new Date(m.dateLocal).getTime(),
    };
  });

  const live = all.filter((x) => x.status === "live");
  const recent = all
    .filter((x) => x.status === "finished" && now - x.when < day + 3 * 3600 * 1000)
    .sort((a, b) => b.when - a.when);
  const upcoming = all
    .filter((x) => x.status === "scheduled" && x.when - now < day)
    .sort((a, b) => a.when - b.when);

  const inWindow = [...live, ...recent.slice(0, 4), ...upcoming.slice(0, 8)];
  if (inWindow.length > 0) return inWindow.slice(0, 9);

  // Window пустой (например, межтуровый день или до старта турнира) —
  // покажем шесть ближайших по календарю.
  return all
    .filter((x) => x.status === "scheduled")
    .sort((a, b) => a.when - b.when)
    .slice(0, 6);
}

export default function WCHomePage() {
  const now = Date.now();
  const matchCenter = pickMatchCenter(now);
  const todayKey = new Date(now).toLocaleDateString("en-CA", {
    timeZone: "Asia/Tashkent",
  });

  // Группировка матч-центра по дням Ташкента, в хронологическом порядке.
  const dayMap = new Map<string, MatchWithStatus[]>();
  for (const item of matchCenter) {
    const key = tashkentDayKey(item.m.dateLocal);
    const list = dayMap.get(key) ?? [];
    list.push(item);
    dayMap.set(key, list);
  }
  const matchCenterByDay = [...dayMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dayKey, items]) => ({
      dayKey,
      label: dayLabel(items[0].m.dateLocal, todayKey),
      items: items.sort((a, b) => a.when - b.when),
    }));

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
      {/* Матч-центр: последние сутки + лайв + ближайшие сутки */}
      {matchCenter.length > 0 && (
        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-lg font-bold uppercase tracking-wider text-white">
              Матч-центр
            </h2>
            <Link
              href="/wc2026/schedule"
              className="text-xs font-medium text-brand hover:underline"
            >
              Все матчи →
            </Link>
          </div>
          <div className="space-y-4">
            {matchCenterByDay.map(({ dayKey, label, items }) => (
              <div key={dayKey}>
                <div className="mb-1.5 flex items-baseline gap-2 border-b border-white/10 pb-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                    {label}
                  </h3>
                  <span className="text-[10px] text-neutral-500">
                    {new Date(items[0].m.dateLocal).toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "long",
                      timeZone: "Asia/Tashkent",
                    })}
                  </span>
                </div>
                <div className="grid gap-1.5 md:grid-cols-2 lg:grid-cols-3">
                  {items.map((item) => (
                    <MatchRow key={item.m.id} item={item} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

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
