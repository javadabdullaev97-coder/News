import { Flag } from "@/components/wc2026/Flag";
import { WC_MATCHES, readableRef, type WCMatch } from "@/lib/wc2026";

export const metadata = {
  title: "Сетка плей-офф — ЧМ-2026 — LEAP",
};

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Tashkent",
  });
}

function SlotRow({ slot }: { slot: string }) {
  const r = readableRef(slot);
  return (
    <div className="flex items-center gap-2 truncate" title={r.long}>
      <Flag code={r.team?.code ?? "_tbd"} size={16} />
      <span className="truncate text-[11px] font-semibold text-neutral-100">
        {r.team?.name ?? r.short}
      </span>
    </div>
  );
}

function MatchCard({ m }: { m: WCMatch }) {
  return (
    <div className="flex h-[72px] flex-col justify-between rounded-md border border-white/10 bg-white/5 px-2 py-1.5">
      <div className="flex items-center justify-between text-[9px] uppercase tracking-wider text-neutral-500">
        <span className="font-mono">{m.id}</span>
        <span>{shortDate(m.dateLocal)}</span>
      </div>
      <div className="space-y-1">
        <SlotRow slot={m.homeRef} />
        <SlotRow slot={m.awayRef} />
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
  matches: WCMatch[];
  width: number;
}) {
  return (
    <div className="flex shrink-0 flex-col" style={{ width }}>
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
  finalMatch: WCMatch;
  thirdMatch: WCMatch;
}) {
  return (
    <div className="flex shrink-0 flex-col items-stretch" style={{ width: 200 }}>
      <div className="mb-3 border-b border-brand/40 pb-2 text-center text-[10px] font-bold uppercase tracking-wider text-brand">
        🏆 Финал
      </div>
      <div className="flex flex-1 flex-col justify-around gap-6">
        <div>
          <div className="rounded-lg border-2 border-brand/60 bg-brand/10 px-2 py-2 shadow-[0_0_24px_rgba(255,123,0,0.15)]">
            <div className="flex items-center justify-between text-[9px] uppercase tracking-wider text-brand">
              <span className="font-mono">{finalMatch.id}</span>
              <span>{shortDate(finalMatch.dateLocal)}</span>
            </div>
            <div className="mt-1.5 space-y-1">
              <SlotRow slot={finalMatch.homeRef} />
              <SlotRow slot={finalMatch.awayRef} />
            </div>
          </div>
          <div className="mt-2 text-center text-[10px] font-bold uppercase tracking-wider text-neutral-500">
            Чемпион мира
          </div>
          <div className="mt-1 text-center text-[10px] text-neutral-500">
            {finalMatch.venueRu}, {finalMatch.cityRu}
          </div>
        </div>

        <div>
          <div className="text-center text-[10px] font-bold uppercase tracking-wider text-neutral-500">
            Матч за 3-е место
          </div>
          <div className="mt-2 rounded-md border border-white/10 bg-white/5 px-2 py-1.5">
            <div className="flex items-center justify-between text-[9px] uppercase tracking-wider text-neutral-500">
              <span className="font-mono">{thirdMatch.id}</span>
              <span>{shortDate(thirdMatch.dateLocal)}</span>
            </div>
            <div className="mt-1.5 space-y-1">
              <SlotRow slot={thirdMatch.homeRef} />
              <SlotRow slot={thirdMatch.awayRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WCBracketPage() {
  const r32 = WC_MATCHES.filter((m) => m.stage === "r32");
  const r16 = WC_MATCHES.filter((m) => m.stage === "r16");
  const qf = WC_MATCHES.filter((m) => m.stage === "qf");
  const sf = WC_MATCHES.filter((m) => m.stage === "sf");
  const finalMatch = WC_MATCHES.find((m) => m.stage === "final")!;
  const thirdMatch = WC_MATCHES.find((m) => m.stage === "third")!;

  const leftR32 = r32.slice(0, 8);
  const rightR32 = r32.slice(8, 16);
  const leftR16 = r16.slice(0, 4);
  const rightR16 = r16.slice(4, 8);
  const leftQF = qf.slice(0, 2);
  const rightQF = qf.slice(2, 4);
  const leftSF = sf.slice(0, 1);
  const rightSF = sf.slice(1, 2);

  const COL_NARROW = 145;
  const COL_WIDE = 155;

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-sm text-neutral-300">
        <h2 className="text-sm font-bold uppercase tracking-wider text-white">
          Сетка плей-офф
        </h2>
        <p className="mt-2 text-neutral-400">
          Слева и справа — две половины сетки, в центре финал и матч за 3-е
          место. Слоты заполнятся по итогам группового этапа: <b>1A/2B</b> —
          победитель и второе место групп; <b>3-е ABCDF</b> — лучшее третье
          место из пула групп, которые ФИФА свяжет с этим слотом. Наведи курсор
          на слот, чтобы увидеть расшифровку.
        </p>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 pb-6">
        <div
          className="mx-auto flex min-w-max items-stretch gap-3"
          style={{ minHeight: 680 }}
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
