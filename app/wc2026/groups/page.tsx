import { Flag } from "@/components/wc2026/Flag";
import {
  WC_GROUP_IDS,
  WC_TIEBREAKERS_BEST_THIRDS,
  buildGroupStandings,
  compareStandings,
  type Standing,
  type WCGroupId,
} from "@/lib/wc2026";

export const metadata = {
  title: "Группы — ЧМ-2026 — LEAP",
};

function GroupCard({ g }: { g: WCGroupId }) {
  const standings = buildGroupStandings(g);
  const isUzGroup = g === "K";
  return (
    <div
      className={`overflow-hidden rounded-xl border ${
        isUzGroup ? "border-brand/40 bg-brand/5" : "border-white/10 bg-white/5"
      }`}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className={`grid h-7 w-7 place-items-center rounded-md text-xs font-bold ${
              isUzGroup ? "bg-brand text-white" : "bg-white/10 text-white"
            }`}
          >
            {g}
          </span>
          <span className="text-xs uppercase tracking-wider text-neutral-400">
            Группа
          </span>
        </div>
        {isUzGroup && (
          <span className="rounded-full bg-brand/20 px-2 py-0.5 text-[10px] font-bold uppercase text-brand">
            Узбекистан
          </span>
        )}
      </div>
      <table className="w-full text-sm">
        <thead className="text-[11px] uppercase tracking-wider text-neutral-500">
          <tr>
            <th className="w-8 py-2 text-center" title="Место">#</th>
            <th className="py-2 text-left">Команда</th>
            <th className="w-7 py-2 text-center" title="Матчи">М</th>
            <th className="w-7 py-2 text-center" title="Победы">В</th>
            <th className="w-7 py-2 text-center" title="Ничьи">Н</th>
            <th className="w-7 py-2 text-center" title="Поражения">П</th>
            <th className="w-9 py-2 text-center" title="Разница мячей">±</th>
            <th className="w-9 py-2 pr-3 text-center font-bold" title="Очки">О</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => {
            const position = i + 1;
            const qualifies = position <= 2;
            return (
              <tr
                key={s.team.fifa}
                className={`border-t border-white/5 ${
                  s.team.isUz
                    ? "font-semibold text-white"
                    : "text-neutral-200"
                }`}
              >
                <td className="relative py-2.5 pl-3 pr-1 text-center tabular-nums text-neutral-500">
                  {qualifies && (
                    <span
                      aria-hidden
                      className="absolute inset-y-1 left-0 w-1 rounded-full bg-emerald-500"
                    />
                  )}
                  {position}
                </td>
                <td className="py-2.5 pr-1">
                  <div className="flex items-center gap-2">
                    <Flag code={s.team.code} size={18} />
                    <span className="truncate">{s.team.name}</span>
                  </div>
                </td>
                <td className="py-2.5 text-center text-neutral-400 tabular-nums">{s.p}</td>
                <td className="py-2.5 text-center text-neutral-400 tabular-nums">{s.w}</td>
                <td className="py-2.5 text-center text-neutral-400 tabular-nums">{s.d}</td>
                <td className="py-2.5 text-center text-neutral-400 tabular-nums">{s.l}</td>
                <td className="py-2.5 text-center text-neutral-400 tabular-nums">
                  {s.gf - s.ga}
                </td>
                <td className="py-2.5 pr-3 text-center font-bold tabular-nums">{s.pts}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// 12 третьих мест по группам → отсортированы по критериям ФИФА → топ-8 проходят.
function buildBestThirds(): { row: Standing; group: WCGroupId; qualifies: boolean }[] {
  const thirds = WC_GROUP_IDS.map((g) => {
    const standings = buildGroupStandings(g);
    return { row: standings[2], group: g };
  });
  // При равенстве (все нули в начале турнира) сортировка фактически по рейтингу ФИФА → стабильно по группе.
  thirds.sort((a, b) => compareStandings(a.row, b.row));
  return thirds.map((t, i) => ({ ...t, qualifies: i < 8 }));
}

function BestThirdsTable() {
  const rows = buildBestThirds();
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider text-white">
          Лучшие третьи места
        </h2>
        <span className="text-xs text-neutral-500">{rows.length} команд → 8 в плей-офф</span>
      </div>
      <p className="mb-4 max-w-2xl text-xs text-neutral-400">
        После каждого матча группы таблица пересортируется по критериям ФИФА.
        Восемь верхних команд (с зелёной отметкой слева) проходят в 1/16
        финала. Сейчас турнир ещё не стартовал — все показатели нулевые,
        порядок временно по рейтингу ФИФА.
      </p>
      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
        <table className="w-full text-sm">
          <thead className="text-[11px] uppercase tracking-wider text-neutral-500">
            <tr>
              <th className="w-12 py-2.5 text-center">#</th>
              <th className="w-14 py-2.5 text-center">Гр.</th>
              <th className="py-2.5 pl-2 text-left">Команда</th>
              <th className="w-9 py-2.5 text-center" title="Матчи">М</th>
              <th className="w-9 py-2.5 text-center" title="Победы">В</th>
              <th className="w-9 py-2.5 text-center" title="Ничьи">Н</th>
              <th className="w-9 py-2.5 text-center" title="Поражения">П</th>
              <th className="w-10 py-2.5 text-center" title="Забито">ЗМ</th>
              <th className="w-10 py-2.5 text-center" title="Пропущено">ПМ</th>
              <th className="w-10 py-2.5 text-center" title="Разница мячей">±</th>
              <th className="w-12 py-2.5 pr-3 text-center font-bold" title="Очки">О</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ row, group, qualifies }, i) => {
              const position = i + 1;
              return (
                <tr
                  key={group}
                  className={`border-t border-white/5 ${
                    qualifies ? "" : "opacity-70"
                  } ${row.team.isUz ? "font-semibold text-white" : "text-neutral-200"}`}
                >
                  <td className="relative py-3 pl-3 pr-1 text-center tabular-nums text-neutral-500">
                    {qualifies && (
                      <span
                        aria-hidden
                        className="absolute inset-y-1.5 left-0 w-1 rounded-full bg-emerald-500"
                      />
                    )}
                    {position}
                  </td>
                  <td className="py-3 text-center text-xs font-bold text-neutral-400">
                    {group}
                  </td>
                  <td className="py-3 pl-2 pr-1">
                    <div className="flex items-center gap-2">
                      <Flag code={row.team.code} size={20} />
                      <span className="truncate">{row.team.name}</span>
                    </div>
                  </td>
                  <td className="py-3 text-center text-neutral-400 tabular-nums">{row.p}</td>
                  <td className="py-3 text-center text-neutral-400 tabular-nums">{row.w}</td>
                  <td className="py-3 text-center text-neutral-400 tabular-nums">{row.d}</td>
                  <td className="py-3 text-center text-neutral-400 tabular-nums">{row.l}</td>
                  <td className="py-3 text-center text-neutral-400 tabular-nums">{row.gf}</td>
                  <td className="py-3 text-center text-neutral-400 tabular-nums">{row.ga}</td>
                  <td className="py-3 text-center text-neutral-400 tabular-nums">
                    {row.gf - row.ga}
                  </td>
                  <td className="py-3 pr-3 text-center font-bold tabular-nums">{row.pts}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-4 text-xs text-neutral-400">
        <div className="font-semibold uppercase tracking-wider text-neutral-300">
          Критерии сортировки
        </div>
        <ol className="mt-2 list-decimal space-y-0.5 pl-5">
          {WC_TIEBREAKERS_BEST_THIRDS.map((rule, i) => (
            <li key={i}>{rule}</li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export default function WCGroupsPage() {
  return (
    <div className="space-y-10">
      <p className="max-w-2xl text-sm text-neutral-400">
        Все 12 групп турнира. Из каждой в плей-офф выходят первые два места
        (отмечены зелёным слева) и восемь лучших третьих мест по сумме всех
        групп — отдельная таблица ниже. Группа Узбекистана подсвечена.
      </p>

      <div className="grid gap-5 md:grid-cols-2">
        {WC_GROUP_IDS.map((g) => (
          <GroupCard key={g} g={g} />
        ))}
      </div>

      <BestThirdsTable />

      <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-sm text-neutral-300">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white">
          Сокращения
        </h3>
        <p className="mt-2 text-xs text-neutral-400">
          <b>М</b> — матчи, <b>В</b> — победы, <b>Н</b> — ничьи, <b>П</b> —
          поражения, <b>ЗМ</b> — забитые мячи, <b>ПМ</b> — пропущенные,{" "}
          <b>±</b> — разница забитых и пропущенных, <b>О</b> — очки.
        </p>
      </div>
    </div>
  );
}
