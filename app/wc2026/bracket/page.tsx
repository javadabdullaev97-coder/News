import { Flag } from "@/components/wc2026/Flag";
import {
  WC_MATCHES,
  isSlotPreliminary,
  readableRef,
  resolveBracketSlot,
  type WCMatch,
} from "@/lib/wc2026";

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
  // Если слот прямой код команды — r.team уже заполнен.
  // Иначе пытаемся резолвить по текущим стандингам / результатам матчей.
  const resolved = r.team ?? resolveBracketSlot(slot);
  const preliminary = resolved && !r.team && isSlotPreliminary(slot);
  const title = resolved
    ? preliminary
      ? `${r.long} → ${resolved.name} (предварительно, групповой этап не завершён)`
      : `${r.long} → ${resolved.name}`
    : r.long;
  // Окраска шрифта:
  // — белый: команда точно определена (стандарт + 3 матча сыграны или
  //   уже определилась победа в плей-офф),
  // — серый: предварительно (вышла на место в группе, но матчи ещё идут)
  //   или ещё не резолвится.
  const textCls =
    resolved && !preliminary ? "text-neutral-100" : "text-neutral-400";
  return (
    <div className="flex items-center gap-1.5 truncate" title={title}>
      <Flag code={resolved?.code ?? r.team?.code ?? "_tbd"} size={14} />
      <span className={`truncate text-[10px] font-semibold ${textCls}`}>
        {resolved?.name ?? r.short}
      </span>
    </div>
  );
}

function MatchCard({ m }: { m: WCMatch }) {
  return (
    <div className="flex h-[58px] flex-col justify-between rounded-md border border-white/10 bg-white/5 px-1.5 py-1">
      <div className="flex items-center justify-between gap-1 text-[8px] uppercase tracking-wider text-neutral-500">
        <span className="font-mono">{m.id}</span>
        <span className="truncate">{shortDate(m.dateLocal)}</span>
      </div>
      <div className="space-y-0.5">
        <SlotRow slot={m.homeRef} />
        <SlotRow slot={m.awayRef} />
      </div>
    </div>
  );
}

function Column({
  label,
  matches,
  grow = 1,
}: {
  label: string;
  matches: WCMatch[];
  grow?: number;
}) {
  return (
    <div
      className="flex min-w-[88px] flex-col"
      style={{ flex: `${grow} 1 0` }}
    >
      <div className="mb-2 border-b border-white/10 pb-1.5 text-center text-[9px] font-bold uppercase tracking-wider text-neutral-400">
        {label}
      </div>
      <div className="flex flex-1 flex-col justify-around gap-1.5">
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
    <div
      className="flex min-w-[110px] flex-col items-stretch"
      style={{ flex: "1.4 1 0" }}
    >
      <div className="mb-2 border-b border-brand/40 pb-1.5 text-center text-[9px] font-bold uppercase tracking-wider text-brand">
        🏆 Финал
      </div>
      <div className="flex flex-1 flex-col justify-around gap-4">
        <div>
          <div className="rounded-lg border-2 border-brand/60 bg-brand/10 px-1.5 py-1.5 shadow-[0_0_24px_rgba(255,123,0,0.15)]">
            <div className="flex items-center justify-between gap-1 text-[8px] uppercase tracking-wider text-brand">
              <span className="font-mono">{finalMatch.id}</span>
              <span className="truncate">{shortDate(finalMatch.dateLocal)}</span>
            </div>
            <div className="mt-1 space-y-0.5">
              <SlotRow slot={finalMatch.homeRef} />
              <SlotRow slot={finalMatch.awayRef} />
            </div>
          </div>
          <div className="mt-1.5 text-center text-[9px] font-bold uppercase tracking-wider text-neutral-500">
            Чемпион мира
          </div>
        </div>

        <div>
          <div className="text-center text-[9px] font-bold uppercase tracking-wider text-neutral-500">
            Матч за 3-е место
          </div>
          <div className="mt-1.5 rounded-md border border-white/10 bg-white/5 px-1.5 py-1">
            <div className="flex items-center justify-between gap-1 text-[8px] uppercase tracking-wider text-neutral-500">
              <span className="font-mono">{thirdMatch.id}</span>
              <span className="truncate">{shortDate(thirdMatch.dateLocal)}</span>
            </div>
            <div className="mt-1 space-y-0.5">
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

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-neutral-300 md:p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-white">
          Сетка плей-офф
        </h2>
        <p className="mt-2 text-xs text-neutral-400 md:text-sm">
          Слева и справа — две половины сетки, в центре финал и матч за 3-е
          место. <b>1A/2B</b> — победитель и второе место групп;{" "}
          <b>3-е ABCDF</b> — лучшее третье место из пула групп. Имена команд
          подставляются автоматически по текущим стандингам — обновляются при
          каждом коммите счетов (≈ раз в 15 минут). Белым — команды, чьи
          места уже окончательны; серым — предварительные позиции (группа
          не доиграна) и ещё не определившиеся слоты. Наведи курсор —
          увидишь расшифровку.
        </p>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 pb-4 md:mx-0 md:overflow-visible md:px-0">
        <div
          className="flex min-w-[880px] items-stretch gap-1 md:min-w-0 md:gap-1.5"
          style={{ minHeight: 580 }}
        >
          <Column label="1/16" matches={leftR32} />
          <Column label="1/8" matches={leftR16} />
          <Column label="1/4" matches={leftQF} />
          <Column label="1/2" matches={leftSF} grow={1.05} />
          <CenterColumn finalMatch={finalMatch} thirdMatch={thirdMatch} />
          <Column label="1/2" matches={rightSF} grow={1.05} />
          <Column label="1/4" matches={rightQF} />
          <Column label="1/8" matches={rightR16} />
          <Column label="1/16" matches={rightR32} />
        </div>
      </div>
    </div>
  );
}
