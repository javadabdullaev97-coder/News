import { ScorersBlock } from "@/components/wc2026/ScorersBlock";

export const metadata = {
  title: "Бомбардиры — ЧМ-2026 — LEAP",
};

export default function WCScorersPage() {
  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-sm text-neutral-400">
        Топ-20 бомбардиров и ассистентов турнира. Данные приходят от
        football-data.org и обновляются каждые 15 минут после голов.
      </p>
      <ScorersBlock limit={20} />
    </div>
  );
}
