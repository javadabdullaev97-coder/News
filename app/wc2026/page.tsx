import Link from "next/link";
import { Flag } from "@/components/wc2026/Flag";
import { articles, feedDate } from "@/lib/data";
import {
  WC_GROUP_K_PREVIEW,
  WC_MATCHES,
  getGroupTeams,
  getMatchPreview,
  getTeamByFifa,
  getUzMatches,
  readableRef,
  type WCMatch,
} from "@/lib/wc2026";

function MatchTile({
  m,
  highlight,
}: {
  m: WCMatch;
  highlight?: boolean;
}) {
  const home = readableRef(m.homeRef);
  const away = readableRef(m.awayRef);
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight ? "border-brand/40 bg-brand/5" : "border-white/10 bg-white/5"
      }`}
    >
      <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-neutral-400">
        <span>{m.kickoffTashkent} (Tashkent)</span>
        {highlight && (
          <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">
            Узбекистан
          </span>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Flag code={home.team?.code ?? "_tbd"} size={28} />
          <span className="truncate text-sm font-semibold">{home.long}</span>
        </div>
        <span className="text-xs font-bold text-neutral-500">VS</span>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <span className="truncate text-right text-sm font-semibold">{away.long}</span>
          <Flag code={away.team?.code ?? "_tbd"} size={28} />
        </div>
      </div>
      <div className="mt-2 truncate text-[11px] text-neutral-500">
        {m.venueRu} · {m.cityRu}
      </div>
    </div>
  );
}

function OpponentCard({ m, index }: { m: WCMatch; index: number }) {
  const opponentFifa = m.homeRef === "UZB" ? m.awayRef : m.homeRef;
  const opponent = getTeamByFifa(opponentFifa);
  const preview = getMatchPreview(m.id);

  if (!opponent) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
      {/* Хедер с матч-метой */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-black/30 px-4 py-3 text-[11px] uppercase tracking-wider text-neutral-400">
        <span className="font-bold text-white">Матч {index + 1}</span>
        <span>{m.kickoffTashkent} (Tashkent)</span>
      </div>

      {/* Хиро-зона с соперником */}
      <div className="flex items-center gap-4 px-5 py-5">
        <Flag code={opponent.code} size={56} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-serif text-2xl font-bold text-white">
            {opponent.name}
          </div>
          <div className="mt-1 text-[11px] uppercase tracking-wider text-neutral-400">
            {opponent.confederation} · корзина {opponent.pot}
          </div>
        </div>
      </div>

      {/* Описание */}
      {preview && (
        <p className="border-t border-white/10 px-5 py-4 text-sm leading-relaxed text-neutral-300">
          {preview}
        </p>
      )}

      {/* Футер с местом проведения */}
      <div className="border-t border-white/10 bg-black/20 px-5 py-3 text-[11px] text-neutral-400">
        <span aria-hidden className="mr-1.5">🏟</span>
        {m.venueRu}, {m.cityRu}
      </div>
    </div>
  );
}

export default function WCOverviewPage() {
  const uzMatches = getUzMatches();
  const groupK = getGroupTeams("K");
  const upcoming = [...WC_MATCHES]
    .filter((m) => m.stage === "group")
    .slice(0, 6);
  const wcNews = articles
    .filter((a) => a.tags.includes("ЧМ-2026"))
    .slice(0, 4);

  return (
    <div className="space-y-10">
      {/* Матчи Узбекистана с превью */}
      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold uppercase tracking-wider text-white">
            Сборная Узбекистана · группа K
          </h2>
          <Link
            href="/wc2026/schedule"
            className="text-xs font-medium text-brand hover:underline"
          >
            Полное расписание →
          </Link>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-neutral-300">
          {WC_GROUP_K_PREVIEW}
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {uzMatches.map((m, i) => (
            <OpponentCard key={m.id} m={m} index={i} />
          ))}
        </div>
      </section>

      {/* Таблица группы K */}
      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold uppercase tracking-wider text-white">
            Группа K
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
              {groupK.map((t, i) => (
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

      {/* Стартовые матчи турнира */}
      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold uppercase tracking-wider text-white">
            Старт турнира
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
              m={m}
              highlight={m.homeRef === "UZB" || m.awayRef === "UZB"}
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
