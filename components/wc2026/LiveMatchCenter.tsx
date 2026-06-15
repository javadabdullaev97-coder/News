"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Flag } from "@/components/wc2026/Flag";
import { readableRef, timeTashkent, type WCMatch } from "@/lib/wc2026";

type MatchStatus = "scheduled" | "live" | "finished";

export type LiveMatchItem = {
  m: WCMatch;
  status: MatchStatus;
  minute?: number;
  when: number; // ms epoch
};

type LiveEntry = {
  utcDate?: string;
  status?: "live" | "finished" | "halftime";
  home?: number;
  away?: number;
  minute?: number;
};

type LiveResponse = {
  fetchedAt?: string;
  matches?: Record<string, LiveEntry>;
};

const POLL_INTERVAL_MS = 7_000;

// Та же логика, что в lib/wc2026.ts → computeLiveMinute.
// Дублируем здесь, чтобы клиент не тащил всю lib для одного хелпера.
function computeLiveMinute(start: number, now: number): number {
  const wall = Math.floor((now - start) / 60000);
  if (wall <= 0) return 1;
  if (wall <= 45) return wall;
  if (wall < 60) return 45; // перерыв
  return Math.max(46, Math.min(120, wall - 15));
}

function recomputeStatus(
  m: WCMatch,
  now: number,
): { status: MatchStatus; minute?: number } {
  const start = new Date(m.dateLocal).getTime();
  if (m.score) {
    if (m.score.status === "live") {
      return { status: "live", minute: computeLiveMinute(start, now) };
    }
    return { status: "finished" };
  }
  if (now < start) return { status: "scheduled" };
  return { status: "live", minute: computeLiveMinute(start, now) };
}

function tashkentDayKey(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", {
    timeZone: "Asia/Tashkent",
  });
}

function dayLabel(iso: string, todayKey: string): string {
  const key = tashkentDayKey(iso);
  const dayDate = new Date(`${key}T12:00:00+05:00`).getTime();
  const todayDate = new Date(`${todayKey}T12:00:00+05:00`).getTime();
  const diff = Math.round((dayDate - todayDate) / (24 * 3600 * 1000));
  if (diff === -1) return "Вчера";
  if (diff === 0) return "Сегодня";
  if (diff === 1) return "Завтра";
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    weekday: "long",
    timeZone: "Asia/Tashkent",
  });
}

function StatusPill({
  status,
  minute,
  dateLocal,
}: {
  status: MatchStatus;
  minute?: number;
  dateLocal: string;
}) {
  if (status === "finished") {
    return (
      <span className="text-[9px] uppercase tracking-wider text-neutral-500">
        завершён
      </span>
    );
  }
  if (status === "live") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400">
        <span className="relative inline-flex h-1.5 w-1.5">
          <span className="absolute inset-0 animate-ping rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
        </span>
        {minute ? `${minute}'` : "live"}
      </span>
    );
  }
  return (
    <span className="text-[10px] font-bold tabular-nums text-brand">
      {timeTashkent(dateLocal)}
    </span>
  );
}

function MatchRow({ item }: { item: LiveMatchItem }) {
  const { m, status, minute } = item;
  const home = readableRef(m.homeRef);
  const away = readableRef(m.awayRef);
  const isUz = m.homeRef === "UZB" || m.awayRef === "UZB";
  const score =
    (status === "finished" || status === "live") && m.score
      ? `${m.score.home}:${m.score.away}`
      : "—:—";

  return (
    <Link
      href={`/wc2026/match/${m.id}`}
      className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs transition-colors hover:border-white/25 hover:bg-white/10 ${
        isUz ? "border-brand/40 bg-brand/5 hover:border-brand/60" : "border-white/10 bg-white/5"
      }`}
    >
      <div className="w-10 shrink-0">
        <StatusPill status={status} minute={minute} dateLocal={m.dateLocal} />
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
        <span
          className="truncate text-right font-semibold text-white"
          title={home.long}
        >
          {home.team?.name ?? home.short}
        </span>
        <Flag code={home.team?.code ?? "_tbd"} size={16} />
      </div>
      <div
        className={`min-w-[34px] shrink-0 text-center font-mono font-bold tabular-nums ${
          status === "finished"
            ? "text-white"
            : status === "live"
              ? "text-red-300"
              : "text-neutral-500"
        }`}
      >
        {score}
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <Flag code={away.team?.code ?? "_tbd"} size={16} />
        <span
          className="truncate font-semibold text-white"
          title={away.long}
        >
          {away.team?.name ?? away.short}
        </span>
      </div>
    </Link>
  );
}

export function LiveMatchCenter({
  initialItems,
  lookup,
  todayKey,
}: {
  initialItems: LiveMatchItem[];
  lookup: Record<string, string>; // "HOME|AWAY|UTC" -> match.id
  todayKey: string;
}) {
  const [items, setItems] = useState<LiveMatchItem[]>(initialItems);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      try {
        const res = await fetch("/api/wc-live", { cache: "no-store" });
        if (!res.ok) return;
        const data: LiveResponse = await res.json();
        if (!alive) return;
        const updates = new Map<string, LiveEntry>();
        for (const [key, entry] of Object.entries(data.matches ?? {})) {
          const id = lookup[key];
          if (id) updates.set(id, entry);
        }
        const now = Date.now();
        setItems((prev) =>
          prev.map((item) => {
            const u = updates.get(item.m.id);
            if (!u) {
              // нет данных от API — пересчитаем только минуту лайва
              const status = recomputeStatus(item.m, now);
              if (
                status.status === item.status &&
                status.minute === item.minute
              )
                return item;
              return { ...item, ...status };
            }
            // halftime — это live с фиксированной минутой 45'
            const apiStatus =
              u.status === "halftime" ? "live" : u.status;
            const nextScore =
              typeof u.home === "number" && typeof u.away === "number"
                ? { home: u.home, away: u.away, status: apiStatus }
                : item.m.score;
            const nextMatch: WCMatch = { ...item.m, score: nextScore };
            const status = recomputeStatus(nextMatch, now);
            // Если API явно сказал «перерыв» — фиксируем 45', не расчётом.
            if (u.status === "halftime") {
              return { ...item, m: nextMatch, status: "live", minute: 45 };
            }
            // Если API отдал минуту — пересиливаем расчёт.
            if (typeof u.minute === "number" && status.status === "live") {
              return { ...item, m: nextMatch, status: "live", minute: u.minute };
            }
            return { ...item, m: nextMatch, ...status };
          }),
        );
        setUpdatedAt(now);
      } catch {
        // молча — следующий tick попробует снова
      }
    }

    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    timer = id as unknown as ReturnType<typeof setTimeout>;

    return () => {
      alive = false;
      if (timer) clearInterval(timer as unknown as number);
    };
  }, [lookup]);

  const dayMap = new Map<string, LiveMatchItem[]>();
  for (const item of items) {
    const key = tashkentDayKey(item.m.dateLocal);
    const list = dayMap.get(key) ?? [];
    list.push(item);
    dayMap.set(key, list);
  }
  const byDay = [...dayMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dayKey, list]) => ({
      dayKey,
      label: dayLabel(list[0].m.dateLocal, todayKey),
      items: list.sort((a, b) => a.when - b.when),
    }));

  return (
    <div className="space-y-4">
      {byDay.map(({ dayKey, label, items }) => (
        <div key={dayKey}>
          <div className="mb-1.5 flex items-baseline gap-2 border-b border-white/10 pb-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              {label}
            </h3>
            <span className="text-[10px] text-neutral-500">
              {new Date(items[0].m.dateLocal).toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "long",
                timeZone: "Asia/Tashkent",
              })}
            </span>
          </div>
          <div className="grid gap-1.5 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <MatchRow key={item.m.id} item={item} />
            ))}
          </div>
        </div>
      ))}
      {updatedAt && (
        <div className="text-right text-[10px] text-neutral-600">
          обновлено{" "}
          {new Date(updatedAt).toLocaleTimeString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </div>
      )}
    </div>
  );
}
