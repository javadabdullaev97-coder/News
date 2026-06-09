import {
  WC_BEST_THIRDS_RULES,
  WC_FORMAT_SUMMARY,
  WC_TIEBREAKERS,
  WC_TIEBREAKERS_BEST_THIRDS,
} from "@/lib/wc2026";

export const metadata = {
  title: "Регламент — ЧМ-2026 — LEAP",
};

export default function WCRulesPage() {
  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-bold uppercase tracking-wider text-white">
          Формат турнира
        </h2>
        <ul className="mt-4 space-y-2 text-sm text-neutral-300">
          {WC_FORMAT_SUMMARY.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-bold uppercase tracking-wider text-white">
          Тай-брейкеры в группе
        </h2>
        <p className="mt-3 text-sm text-neutral-400">
          Когда у двух или более команд в группе одинаковое число очков, ФИФА
          определяет места по следующим критериям — строго по порядку, переход
          к следующему только если предыдущий не разделил команды.
        </p>
        <ol className="mt-5 space-y-3">
          {WC_TIEBREAKERS.map((rule, i) => (
            <li
              key={i}
              className="flex gap-4 rounded-lg border border-white/5 bg-black/30 p-3"
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-white">
                {i + 1}
              </span>
              <span className="text-sm text-neutral-200">{rule}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-xl border border-brand/30 bg-brand/5 p-6">
        <h2 className="text-lg font-bold uppercase tracking-wider text-white">
          Лучшие третьи места
        </h2>
        <p className="mt-3 text-sm text-neutral-300">
          Главная новинка формата на 48 команд — попадание в плей-офф восьми
          из двенадцати команд, занявших третьи строчки в своих группах.
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-neutral-300">
          {WC_BEST_THIRDS_RULES.map((rule, i) => (
            <li key={i}>{rule}</li>
          ))}
        </ul>

        <h3 className="mt-6 text-sm font-bold uppercase tracking-wider text-white">
          Как сравниваются третьи места между группами
        </h3>
        <ol className="mt-3 space-y-2">
          {WC_TIEBREAKERS_BEST_THIRDS.map((rule, i) => (
            <li
              key={i}
              className="flex gap-3 rounded-lg border border-white/10 bg-black/30 p-3"
            >
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-bold text-white">
                {i + 1}
              </span>
              <span className="text-sm text-neutral-200">{rule}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
