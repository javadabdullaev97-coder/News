import Link from "next/link";
import { Flag } from "@/components/wc2026/Flag";
import { articles, feedDate } from "@/lib/data";
import {
  WC_MATCHES,
  getGroupTeams,
  getTeamByFifa,
  getUzMatches,
} from "@/lib/wc2026";

function formatMatchDate(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    timeZone: "Asia/Tashkent",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MatchTile({
  homeFifa,
  awayFifa,
  date,
  venue,
  highlight,
}: {
  homeFifa: string;
  awayFifa: string;
  date: string;
  venue: string;
  highlight?: boolean;
}) {
  const home = getTeamByFifa(homeFifa);
  const away = getTeamByFifa(awayFifa);
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight
          ? "border-brand/40 bg-brand/5"
          : "border-white/10 bg-white/5"
      }`}
    >
      <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-neutral-400">
        <span>{formatMatchDate(date)} (Tashkent)</span>
        {highlight && (
          <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">
            Узбекистан
          </span>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Flag code={home?.code ?? "_tbd"} size={28} />
          <span className="truncate text-sm font-semibold">{home?.name ?? homeFifa}</span>
        </div>
        <span className="text-xs font-bold text-neutral-500">VS</span>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <span className="truncate text-right text-sm font-semibold">{away?.name ?? awayFifa}</span>
          <Flag code={away?.code ?? "_tbd"} size={28} />
        </div>
      </div>
      <div className="mt-2 truncate text-[11px] text-neutral-500">{venue}</div>
    </div>
  );
}

export default function WCOverviewPage() {
  const uzMatches = getUzMatches();
  const groupH = getGroupTeams("H");
  const upcoming = [...WC_MATCHES]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 6);
  const wcNews = articles
    .filter((a) => a.tags.includes("ЧМ-2026"))
    .slice(0, 4);

  return (
    <div className="space-y-10">
      {/* Уз-фокус */}
      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold uppercase tracking-wider text-white">
            Сборная Узбекистана
          </h2>
          <Link
            href="/wc2026/schedule"
            className="text-xs font-medium text-brand hover:underline"
          >
            Полное расписание →
          </Link>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {uzMatches.map((m) => (
            <MatchTile
              key={m.id}
              homeFifa={m.homeFifa}
              awayFifa={m.awayFifa}
              date={m.date}
              venue={m.venue}
              highlight
            />
          ))}
        </div>
      </section>

      {/* Группа H — мини-таблица */}
      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold uppercase tracking-wider text-white">
            Группа H
          </h2>
          <Link
            href="/wc2026/groups"
            className="text-xs font-medium text-brand hover:underline"
          >
            Все группы →
          </Link>
        </div>
        <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-white/5">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-[11px] uppercase tracking-wider text-neutral-400">
              <tr>
                <th className="px-4 py-2 text-left">#</th>
                <th className="px-2 py-2 text-left">Команда</th>
                <th className="px-2 py-2 text-center" title="Матчи">М</th>
                <th className="px-2 py-2 text-center" title="Победы">В</th>
                <th className="px-2 py-2 text-center" title="Ничьи">Н</th>
                <th className="px-2 py-2 text-center" title="Поражения">П</th>
                <th className="px-2 py-2 text-center" title="Разница мячей">±</th>
                <th className="px-4 py-2 text-center font-bold">О</th>
              </tr>
            </thead>
            <tbody>
              {groupH.map((t, i) => (
                <tr
                  key={t.fifa}
                  className={`border-t border-white/5 ${
                    t.isUz ? "bg-brand/10 font-semibold text-white" : "text-neutral-200"
                  }`}
                >
                  <td className="px-4 py-3 text-left text-neutral-500">{i + 1}</td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-2">
                      <Flag code={t.code} size={20} />
                      <span>{t.name}</span>
                    </div>
                  </td>
                  <td className="px-2 py-3 text-center text-neutral-400">0</td>
                  <td className="px-2 py-3 text-center text-neutral-400">0</td>
                  <td className="px-2 py-3 text-center text-neutral-400">0</td>
                  <td className="px-2 py-3 text-center text-neutral-400">0</td>
                  <td className="px-2 py-3 text-center text-neutral-400">0</td>
                  <td className="px-4 py-3 text-center font-bold">0</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-white/10 bg-white/5 px-4 py-2 text-[11px] text-neutral-500">
            Турнир ещё не стартовал — таблица заполняется по ходу матчей.
          </p>
        </div>
      </section>

      {/* Ближайшие матчи */}
      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold uppercase tracking-wider text-white">
            Ближайшие матчи
          </h2>
          <Link
            href="/wc2026/schedule"
            className="text-xs font-medium text-brand hover:underline"
          >
            Все матчи →
          </Link>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {upcoming.map((m) => (
            <MatchTile
              key={m.id}
              homeFifa={m.homeFifa}
              awayFifa={m.awayFifa}
              date={m.date}
              venue={m.venue}
              highlight={m.homeFifa === "UZB" || m.awayFifa === "UZB"}
            />
          ))}
        </div>
      </section>

      {/* Новости */}
      {wcNews.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-bold uppercase tracking-wider text-white">
              Свежее по турниру
            </h2>
            <Link
              href="/wc2026/news"
              className="text-xs font-medium text-brand hover:underline"
            >
              Все новости →
            </Link>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {wcNews.map((a) => (
              <Link
                key={a.slug}
                href={`/article/${a.slug}`}
                className="group rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-brand/40 hover:bg-white/10"
              >
                <div className="text-[11px] uppercase tracking-wider text-neutral-500">
                  {feedDate(a.publishedAt)}
                </div>
                <h3 className="mt-1 font-serif text-lg font-bold leading-snug transition-colors group-hover:text-brand">
                  {a.title}
                </h3>
                <p className="mt-2 line-clamp-2 text-sm text-neutral-400">{a.lead}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
