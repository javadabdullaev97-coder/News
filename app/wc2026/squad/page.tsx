import { Flag } from "@/components/wc2026/Flag";
import {
  WC_HEAD_COACH,
  WC_SQUAD,
  WC_SQUAD_ANNOUNCED_ISO,
  WC_SQUAD_SOURCE_URL,
  type WCSquadPlayer,
} from "@/lib/wc2026";

export const metadata = {
  title: "Состав сборной — ЧМ-2026 — LEAP",
};

const POSITION_ORDER: WCSquadPlayer["position"][] = [
  "вратарь",
  "защитник",
  "полузащитник",
  "нападающий",
];

const POSITION_TITLE: Record<WCSquadPlayer["position"], string> = {
  вратарь: "Вратари",
  защитник: "Защитники",
  полузащитник: "Полузащитники",
  нападающий: "Нападающие",
};

// Карта 3-буквенных кодов страны клуба в 2-буквенные ISO для флага
const CLUB_COUNTRY_FLAG: Record<string, string> = {
  UZB: "uz",
  ENG: "gb-eng",
  IRN: "ir",
  TUR: "tr",
  UAE: "ae",
  ITA: "it",
  ESP: "es",
  GER: "de",
};

function clubFlagCode(c: string): string {
  return CLUB_COUNTRY_FLAG[c] ?? "_tbd";
}

function PlayerRow({ p }: { p: WCSquadPlayer }) {
  return (
    <div className="flex items-center gap-3 border-t border-white/5 px-4 py-3 first:border-t-0">
      <Flag code="uz" size={22} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-white">{p.nameRu}</div>
        <div className="mt-0.5 truncate text-[11px] text-neutral-400">
          {p.clubRu}
        </div>
      </div>
      <Flag code={clubFlagCode(p.clubCountry)} size={16} />
    </div>
  );
}

export default function WCSquadPage() {
  const byPosition = POSITION_ORDER.map((pos) => ({
    pos,
    players: WC_SQUAD.filter((p) => p.position === pos),
  }));

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-brand/40 bg-brand/5 p-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-brand">
            Главный тренер
          </div>
          <div className="mt-2 text-xl font-bold">{WC_HEAD_COACH.nameRu}</div>
          <p className="mt-2 text-sm text-neutral-300">{WC_HEAD_COACH.note}</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
            Заявка
          </div>
          <div className="mt-2 text-xl font-bold">
            {WC_SQUAD.length} игроков
          </div>
          <div className="mt-1 text-xs text-neutral-400">
            Объявлена{" "}
            {new Date(WC_SQUAD_ANNOUNCED_ISO).toLocaleDateString("ru-RU", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </div>
          <a
            href={WC_SQUAD_SOURCE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-xs font-medium text-brand hover:underline"
          >
            beIN Sports — официальный состав →
          </a>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        {byPosition.map(({ pos, players }) => (
          <section
            key={pos}
            className="overflow-hidden rounded-xl border border-white/10 bg-white/5"
          >
            <div className="flex items-baseline justify-between border-b border-white/10 px-4 py-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                {POSITION_TITLE[pos]}
              </h2>
              <span className="text-[11px] text-neutral-500">
                {players.length}
              </span>
            </div>
            <div>
              {players.map((p) => (
                <PlayerRow key={p.nameRu} p={p} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
