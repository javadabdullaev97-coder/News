import { WC_BRACKET, type BracketMatch } from "@/lib/wc2026";

export const metadata = {
  title: "Сетка плей-офф — ЧМ-2026 — LEAP",
};

const ROUND_TITLES: Record<BracketMatch["round"], string> = {
  r32: "1/16 финала",
  r16: "1/8 финала",
  qf: "Четвертьфинал",
  sf: "Полуфинал",
  third: "Матч за 3-е место",
  final: "Финал",
};

function readableSlot(slot: string) {
  const num = slot.match(/^([12])([A-L])$/);
  if (num) {
    const place = num[1] === "1" ? "Победитель" : "Второе место";
    return `${place} группы ${num[2]}`;
  }
  const best = slot.match(/^BEST3-(\d)$/);
  if (best) return `Третье место №${best[1]} (из 8 лучших)`;
  const winner = slot.match(/^W (.+)$/);
  if (winner) return `Победитель ${winner[1]}`;
  const loser = slot.match(/^L (.+)$/);
  if (loser) return `Проигравший ${loser[1]}`;
  return slot;
}

function shortSlot(slot: string) {
  if (slot.match(/^BEST3-\d$/)) return "3-е место";
  if (slot.match(/^W /)) return slot.replace(/^W /, "W ");
  if (slot.match(/^L /)) return slot.replace(/^L /, "L ");
  return slot;
}

function MatchCard({ m }: { m: BracketMatch }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs">
      <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-neutral-500">
        <span>{m.id}</span>
        {m.date && (
          <span>
            {new Date(m.date).toLocaleDateString("ru-RU", {
              day: "numeric",
              month: "short",
            })}
          </span>
        )}
      </div>
      <div
        className="font-semibold text-neutral-100"
        title={readableSlot(m.home)}
      >
        {shortSlot(m.home)}
      </div>
      <div className="my-1 text-[10px] uppercase tracking-wider text-neutral-500">
        vs
      </div>
      <div
        className="font-semibold text-neutral-100"
        title={readableSlot(m.away)}
      >
        {shortSlot(m.away)}
      </div>
    </div>
  );
}

function Column({
  title,
  matches,
}: {
  title: string;
  matches: BracketMatch[];
}) {
  return (
    <div className="min-w-[180px] shrink-0">
      <div className="sticky top-0 z-10 mb-3 rounded-md bg-neutral-900/80 px-3 py-2 text-xs font-bold uppercase tracking-wider text-neutral-400 backdrop-blur">
        {title}
      </div>
      <div className="flex flex-col gap-3">
        {matches.map((m) => (
          <MatchCard key={m.id} m={m} />
        ))}
      </div>
    </div>
  );
}

export default function WCBracketPage() {
  const r32 = WC_BRACKET.filter((m) => m.round === "r32");
  const r16 = WC_BRACKET.filter((m) => m.round === "r16");
  const qf = WC_BRACKET.filter((m) => m.round === "qf");
  const sf = WC_BRACKET.filter((m) => m.round === "sf");
  const third = WC_BRACKET.find((m) => m.round === "third");
  const final = WC_BRACKET.find((m) => m.round === "final");

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-sm text-neutral-300">
        <h2 className="text-sm font-bold uppercase tracking-wider text-white">
          Как читать сетку
        </h2>
        <p className="mt-2 text-neutral-400">
          Из 12 групп в 1/16 финала выходят первые два места и восемь лучших
          третьих. Победители групп (1A, 1B…) и вторые места (2A, 2B…) уже
          разнесены по конкретным матчам. Слот «третье место №N» занимает
          один из восьми лучших третьих по итогам всех групп — конкретное
          соответствие определяет таблица ФИФА в зависимости от того, из
          каких групп вышли эти восемь команд.
        </p>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 pb-4">
        <div className="flex min-w-max items-start gap-5">
          <Column title={ROUND_TITLES.r32} matches={r32} />
          <Column title={ROUND_TITLES.r16} matches={r16} />
          <Column title={ROUND_TITLES.qf} matches={qf} />
          <Column title={ROUND_TITLES.sf} matches={sf} />
          <Column
            title="Финал · 3-е место"
            matches={[third, final].filter(Boolean) as BracketMatch[]}
          />
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-xs text-neutral-400">
        <p>
          Подсказки: наведи курсор на «W R32-3» или «3-е место №N» — всплывёт
          расшифровка слота. По мере прохождения турнира мы будем подставлять
          реальные сборные на места победителей и проигравших.
        </p>
      </div>
    </div>
  );
}
