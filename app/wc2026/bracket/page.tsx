import { WC_BRACKET, type BracketMatch } from "@/lib/wc2026";

export const metadata = {
  title: "Сетка плей-офф — ЧМ-2026 — LEAP",
};

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
}

function readableSlot(slot: string) {
  const num = slot.match(/^([12])([A-L])$/);
  if (num) {
    const place = num[1] === "1" ? "Победитель" : "Второе место";
    return `${place} группы ${num[2]}`;
  }
  const best = slot.match(/^BEST3-(\d)$/);
  if (best) return `Одно из лучших третьих мест (№${best[1]})`;
  if (slot.startsWith("W ")) return `Победитель матча ${slot.slice(2)}`;
  if (slot.startsWith("L ")) return `Проигравший матча ${slot.slice(2)}`;
  return slot;
}

function compactSlot(slot: string) {
  const best = slot.match(/^BEST3-(\d)$/);
  if (best) return `3-е #${best[1]}`;
  if (slot.startsWith("W ")) return slot.replace("W ", "Поб. ");
  if (slot.startsWith("L ")) return slot.replace("L ", "Проигр. ");
  return slot;
}

function SlotRow({ slot }: { slot: string }) {
  return (
    <div
      className="flex items-center gap-2 truncate"
      title={readableSlot(slot)}
    >
      <span
        aria-hidden
        className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-white/10 text-[8px] font-bold text-neutral-400"
      >
        ?
      </span>
      <span className="truncate text-[11px] font-semibold text-neutral-100">
        {compactSlot(slot)}
      </span>
    </div>
  );
}

function MatchCard({
  m,
  highlight,
}: {
  m: BracketMatch;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex h-[68px] flex-col justify-between rounded-md border px-2 py-1.5 ${
        highlight
          ? "border-brand/50 bg-brand/5 ring-1 ring-brand/30"
          : "border-white/10 bg-white/5"
      }`}
    >
      <div className="flex items-center justify-between text-[9px] uppercase tracking-wider text-neutral-500">
        <span className="font-mono">{m.id}</span>
        {m.date && <span>{shortDate(m.date)}</span>}
      </div>
      <div className="space-y-1">
        <SlotRow slot={m.home} />
        <SlotRow slot={m.away} />
      </div>
    </div>
  );
}

function Column({
  label,
  matches,
  width,
}: {
  label: string;
  matches: BracketMatch[];
  width: number;
}) {
  return (
    <div
      className="flex shrink-0 flex-col"
      style={{ width }}
    >
      <div className="mb-3 border-b border-white/10 pb-2 text-center text-[10px] font-bold uppercase tracking-wider text-neutral-400">
        {label}
      </div>
      <div className="flex flex-1 flex-col justify-around gap-2">
        {matches.map((m) => (
          <MatchCard key={m.id} m={m} />
        ))}
      </div>
    </div>
  );
}

function CenterColumn({
  finalMatch,
  thirdMatch,
}: {
  finalMatch: BracketMatch;
  thirdMatch: BracketMatch;
}) {
  return (
    <div className="flex shrink-0 flex-col items-stretch" style={{ width: 180 }}>
      <div className="mb-3 border-b border-brand/40 pb-2 text-center text-[10px] font-bold uppercase tracking-wider text-brand">
        🏆 Финал
      </div>
      <div className="flex flex-1 flex-col justify-around gap-6">
        <div>
          <div className="rounded-lg border-2 border-brand/60 bg-brand/10 px-2 py-2 shadow-[0_0_24px_rgba(255,123,0,0.15)]">
            <div className="flex items-center justify-between text-[9px] uppercase tracking-wider text-brand">
              <span className="font-mono">{finalMatch.id}</span>
              {finalMatch.date && <span>{shortDate(finalMatch.date)}</span>}
            </div>
            <div className="mt-1.5 space-y-1">
              <SlotRow slot={finalMatch.home} />
              <SlotRow slot={finalMatch.away} />
            </div>
          </div>
          <div className="mt-2 text-center text-[10px] font-bold uppercase tracking-wider text-neutral-500">
            Чемпион мира
          </div>
        </div>

        <div>
          <div className="text-center text-[10px] font-bold uppercase tracking-wider text-neutral-500">
            Матч за 3-е место
          </div>
          <div className="mt-2 rounded-md border border-white/10 bg-white/5 px-2 py-1.5">
            <div className="flex items-center justify-between text-[9px] uppercase tracking-wider text-neutral-500">
              <span className="font-mono">{thirdMatch.id}</span>
              {thirdMatch.date && <span>{shortDate(thirdMatch.date)}</span>}
            </div>
            <div className="mt-1.5 space-y-1">
              <SlotRow slot={thirdMatch.home} />
              <SlotRow slot={thirdMatch.away} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WCBracketPage() {
  const r32 = WC_BRACKET.filter((m) => m.round === "r32");
  const r16 = WC_BRACKET.filter((m) => m.round === "r16");
  const qf = WC_BRACKET.filter((m) => m.round === "qf");
  const sf = WC_BRACKET.filter((m) => m.round === "sf");
  const finalMatch = WC_BRACKET.find((m) => m.round === "final")!;
  const thirdMatch = WC_BRACKET.find((m) => m.round === "third")!;

  // Делим на две половины сетки
  const leftR32 = r32.slice(0, 8);
  const rightR32 = r32.slice(8, 16);
  const leftR16 = r16.slice(0, 4);
  const rightR16 = r16.slice(4, 8);
  const leftQF = qf.slice(0, 2);
  const rightQF = qf.slice(2, 4);
  const leftSF = sf.slice(0, 1);
  const rightSF = sf.slice(1, 2);

  const COL_NARROW = 140;
  const COL_WIDE = 150;

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-sm text-neutral-300">
        <h2 className="text-sm font-bold uppercase tracking-wider text-white">
          Сетка плей-офф
        </h2>
        <p className="mt-2 text-neutral-400">
          Слева и справа — две половины турнирной сетки. В центре — финал
          и матч за 3-е место. Слоты заполнятся по итогам группового
          этапа: <b>1A/2B</b> — победитель и второе место соответствующих
          групп, <b>3-е #N</b> — одна из восьми лучших третьих команд,
          <b> Поб. R32-1</b> — победитель указанного матча. Наведи курсор
          на любой слот, чтобы увидеть расшифровку.
        </p>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 pb-6">
        <div
          className="mx-auto flex min-w-max items-stretch gap-3"
          style={{ minHeight: 650 }}
        >
          <Column label="1/16 финала" matches={leftR32} width={COL_NARROW} />
          <Column label="1/8 финала" matches={leftR16} width={COL_NARROW} />
          <Column label="1/4 финала" matches={leftQF} width={COL_NARROW} />
          <Column label="1/2 финала" matches={leftSF} width={COL_WIDE} />
          <CenterColumn finalMatch={finalMatch} thirdMatch={thirdMatch} />
          <Column label="1/2 финала" matches={rightSF} width={COL_WIDE} />
          <Column label="1/4 финала" matches={rightQF} width={COL_NARROW} />
          <Column label="1/8 финала" matches={rightR16} width={COL_NARROW} />
          <Column label="1/16 финала" matches={rightR32} width={COL_NARROW} />
        </div>
      </div>
    </div>
  );
}
