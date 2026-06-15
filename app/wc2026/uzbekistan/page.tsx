import Link from "next/link";
import { Flag } from "@/components/wc2026/Flag";
import { articles, feedDate } from "@/lib/data";
import {
  buildGroupStandings,
  getMatchPreview,
  getTeamByFifa,
  getUzMatches,
  kickoffTashkent,
  type WCMatch,
} from "@/lib/wc2026";

export const metadata = {
  title: "Сборная Узбекистана — ЧМ-2026 — LEAP",
};

function OpponentCard({ m, index }: { m: WCMatch; index: number }) {
  const opponentFifa = m.homeRef === "UZB" ? m.awayRef : m.homeRef;
  const opponent = getTeamByFifa(opponentFifa);
  const preview = getMatchPreview(m.id);

  if (!opponent) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-black/30 px-4 py-3 text-[11px] uppercase tracking-wider text-neutral-400">
        <span className="font-bold text-white">Матч {index + 1}</span>
        <span>{kickoffTashkent(m.dateLocal)} (Tashkent)</span>
      </div>

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

      {preview && (
        <p className="border-t border-white/10 px-5 py-4 text-sm leading-relaxed text-neutral-300">
          {preview}
        </p>
      )}

      <div className="border-t border-white/10 bg-black/20 px-5 py-3 text-[11px] text-neutral-400">
        <span aria-hidden className="mr-1.5">🏟</span>
        {m.venueRu}, {m.cityRu}
      </div>
    </div>
  );
}

export default function WCUzbekistanPage() {
  const uzMatches = getUzMatches();
  const groupK = buildGroupStandings("K");
  const wcNews = articles
    .filter(
      (a) =>
        a.tags.includes("ЧМ-2026") &&
        (a.tags.includes("сборная Узбекистана") ||
          a.tags.includes("Каннаваро") ||
          a.tags.includes("Хусанов")),
    )
    .slice(0, 4);

  return (
    <div className="space-y-10">
      {/* Матчи Узбекистана */}
      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold uppercase tracking-wider text-white">
            Соперники по группе K
          </h2>
          <Link
            href="/wc2026/schedule"
            className="text-xs font-medium text-brand hover:underline"
          >
            Полное расписание →
          </Link>
        </div>
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
              {groupK.map((s, i) => {
                const position = i + 1;
                const qualifies = position <= 2;
                return (
                  <tr
                    key={s.team.fifa}
                    className={`border-t border-white/5 ${
                      s.team.isUz
                        ? "bg-brand/10 font-semibold text-white"
                        : "text-neutral-200"
                    }`}
                  >
                    <td className="relative px-4 py-3 text-left tabular-nums text-neutral-500">
                      {qualifies && (
                        <span
                          aria-hidden
                          className="absolute inset-y-1 left-0 w-1 rounded-full bg-emerald-500"
                        />
                      )}
                      {position}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-2">
                        <Flag code={s.team.code} size={20} />
                        <span>{s.team.name}</span>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-center tabular-nums text-neutral-400">{s.p}</td>
                    <td className="px-2 py-3 text-center tabular-nums text-neutral-400">{s.w}</td>
                    <td className="px-2 py-3 text-center tabular-nums text-neutral-400">{s.d}</td>
                    <td className="px-2 py-3 text-center tabular-nums text-neutral-400">{s.l}</td>
                    <td className="px-2 py-3 text-center tabular-nums text-neutral-400">{s.gf - s.ga}</td>
                    <td className="px-4 py-3 text-center font-bold tabular-nums">{s.pts}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Новости про сборную */}
      {wcNews.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-bold uppercase tracking-wider text-white">
              Свежее по сборной
            </h2>
            <Link
              href="/wc2026"
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
