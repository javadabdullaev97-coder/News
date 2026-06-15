import { Flag } from "@/components/wc2026/Flag";
import { WC_SCORERS, WC_TEAMS } from "@/lib/wc2026";

function teamCodeByTla(tla: string | null): string {
  if (!tla) return "_tbd";
  const team = WC_TEAMS.find((t) => t.fifa === tla);
  return team?.code ?? "_tbd";
}

export function ScorersBlock({ limit = 10 }: { limit?: number }) {
  const list = WC_SCORERS.scorers.slice(0, limit);
  if (list.length === 0) {
    return (
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-bold uppercase tracking-wider text-white">
            Бомбардиры
          </h2>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-sm text-neutral-400">
          Таблица заполнится после первых голов турнира. Источник —
          football-data.org, обновляется каждые 15 минут.
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider text-white">
          Бомбардиры
        </h2>
        {WC_SCORERS.updatedAt && (
          <span className="text-[10px] text-neutral-500">
            обновлено{" "}
            {new Date(WC_SCORERS.updatedAt).toLocaleTimeString("ru-RU", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Asia/Tashkent",
            })}
          </span>
        )}
      </div>
      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-wider text-neutral-500">
            <tr>
              <th className="w-10 py-2 text-center">#</th>
              <th className="py-2 pl-2 text-left">Игрок</th>
              <th className="hidden py-2 text-left sm:table-cell">Сборная</th>
              <th className="w-12 py-2 text-center" title="Голы">⚽</th>
              <th className="hidden w-12 py-2 text-center md:table-cell" title="Голевые передачи">🅰</th>
              <th className="hidden w-12 py-2 text-center md:table-cell" title="Пенальти">пен.</th>
              <th className="hidden w-12 py-2 pr-3 text-center sm:table-cell" title="Матчей сыграно">М</th>
            </tr>
          </thead>
          <tbody>
            {list.map((s, i) => (
              <tr
                key={`${s.playerName}-${i}`}
                className="border-t border-white/5 text-neutral-200"
              >
                <td className="py-2.5 text-center tabular-nums text-neutral-500">
                  {i + 1}
                </td>
                <td className="py-2.5 pl-2 font-semibold text-white">
                  {s.playerName ?? "—"}
                </td>
                <td className="hidden py-2.5 sm:table-cell">
                  <div className="flex items-center gap-2">
                    <Flag code={teamCodeByTla(s.teamTla)} size={18} />
                    <span className="truncate">{s.teamName ?? s.teamTla}</span>
                  </div>
                </td>
                <td className="py-2.5 text-center font-bold tabular-nums text-white">
                  {s.goals}
                </td>
                <td className="hidden py-2.5 text-center tabular-nums text-neutral-400 md:table-cell">
                  {s.assists}
                </td>
                <td className="hidden py-2.5 text-center tabular-nums text-neutral-400 md:table-cell">
                  {s.penalties}
                </td>
                <td className="hidden py-2.5 pr-3 text-center tabular-nums text-neutral-400 sm:table-cell">
                  {s.playedMatches}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
