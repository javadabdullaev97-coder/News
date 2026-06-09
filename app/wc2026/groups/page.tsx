import { Flag } from "@/components/wc2026/Flag";
import {
  WC_GROUP_IDS,
  getGroupTeams,
} from "@/lib/wc2026";

export const metadata = {
  title: "Группы — ЧМ-2026 — LEAP",
};

export default function WCGroupsPage() {
  return (
    <div className="space-y-8">
      <p className="max-w-2xl text-sm text-neutral-400">
        Все 12 групп турнира. Из каждой в плей-офф выходят первые два места +
        восемь лучших третьих мест по сумме всех групп. Команды узбекской группы
        H подсвечены.
      </p>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {WC_GROUP_IDS.map((g) => {
          const teams = getGroupTeams(g);
          return (
            <div
              key={g}
              className={`overflow-hidden rounded-xl border ${
                g === "H"
                  ? "border-brand/40 bg-brand/5"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`grid h-7 w-7 place-items-center rounded-md text-xs font-bold ${
                      g === "H" ? "bg-brand text-white" : "bg-white/10 text-white"
                    }`}
                  >
                    {g}
                  </span>
                  <span className="text-xs uppercase tracking-wider text-neutral-400">
                    Группа
                  </span>
                </div>
                {g === "H" && (
                  <span className="rounded-full bg-brand/20 px-2 py-0.5 text-[10px] font-bold uppercase text-brand">
                    Узбекистан
                  </span>
                )}
              </div>
              <table className="w-full text-sm">
                <thead className="text-[11px] uppercase tracking-wider text-neutral-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Команда</th>
                    <th className="px-2 py-2 text-center">М</th>
                    <th className="px-2 py-2 text-center">±</th>
                    <th className="px-3 py-2 text-center font-bold">О</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((t) => (
                    <tr
                      key={t.fifa}
                      className={`border-t border-white/5 ${
                        t.isUz ? "font-semibold text-white" : "text-neutral-200"
                      }`}
                    >
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <Flag code={t.code} size={18} />
                          <span className="truncate">{t.name}</span>
                        </div>
                      </td>
                      <td className="px-2 py-2.5 text-center text-neutral-400">0</td>
                      <td className="px-2 py-2.5 text-center text-neutral-400">0</td>
                      <td className="px-3 py-2.5 text-center font-bold">0</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-sm text-neutral-300">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white">
          Сокращения
        </h3>
        <p className="mt-2 text-xs text-neutral-400">
          <b>М</b> — матчи, <b>В</b> — победы, <b>Н</b> — ничьи, <b>П</b> —
          поражения, <b>±</b> — разница забитых и пропущенных мячей,{" "}
          <b>О</b> — очки.
        </p>
      </div>
    </div>
  );
}
