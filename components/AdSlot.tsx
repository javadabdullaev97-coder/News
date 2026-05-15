"use client";

import { useState } from "react";

type Size = "970x250" | "970x90" | "300x250" | "300x600" | "320x50";

const sizeClasses: Record<Size, string> = {
  "970x250": "min-h-[250px] w-full max-w-[970px] mx-auto",
  "970x90": "min-h-[90px] w-full max-w-[970px] mx-auto",
  "300x250": "h-[250px] w-full max-w-[300px] mx-auto",
  "300x600": "h-[600px] w-full max-w-[300px] mx-auto",
  "320x50": "h-[50px] w-full max-w-[320px] mx-auto",
};

export function AdSlot({
  id,
  size,
  label,
  className = "",
}: {
  id: string;
  size: Size;
  label?: string;
  className?: string;
}) {
  return (
    <div
      data-ad-slot={id}
      data-ad-size={size}
      className={`relative grid place-items-center rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900/40 ${sizeClasses[size]} ${className}`}
    >
      <span className="absolute left-2 top-2 rounded bg-neutral-900 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white dark:bg-neutral-100 dark:text-neutral-900">
        реклама
      </span>
      <div className="text-center text-xs text-neutral-500">
        <div className="font-mono text-sm font-semibold">{size}</div>
        {label && <div className="mt-1">{label}</div>}
        <div className="mt-1 text-[10px] opacity-60">slot: {id}</div>
      </div>
    </div>
  );
}

export function NativeAdCard({
  id,
  brand = "Партнёр LEAP",
  title = "Здесь будет заголовок партнёрского материала",
  lead = "Краткое описание спонсорского контента, выглядит как обычная карточка новости, но с пометкой.",
}: {
  id: string;
  brand?: string;
  title?: string;
  lead?: string;
}) {
  return (
    <div data-ad-slot={id} className="block">
      <div className="relative aspect-[16/10] overflow-hidden rounded-lg border-2 border-dashed border-amber-400 bg-amber-50 dark:border-amber-600/60 dark:bg-amber-950/20">
        <span className="absolute left-2 top-2 z-10 rounded bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
          партнёрский материал
        </span>
        <div className="grid h-full place-items-center text-xs text-amber-700 dark:text-amber-300">
          NATIVE IN-FEED
        </div>
      </div>
      <div className="mt-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">
          {brand}
        </span>
        <h3 className="mt-1 font-serif text-lg font-bold leading-snug">{title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">
          {lead}
        </p>
        <div className="mt-2 text-xs text-neutral-500">
          slot: {id} · sponsored
        </div>
      </div>
    </div>
  );
}

export function MobileStickyAd() {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 md:hidden">
      <div className="relative mx-auto flex h-[60px] w-full items-center justify-center border-t-2 border-dashed border-neutral-400 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900">
        <span className="absolute left-2 top-1 rounded bg-neutral-900 px-1 py-0.5 text-[8px] font-bold uppercase text-white dark:bg-white dark:text-neutral-900">
          реклама
        </span>
        <div className="text-center text-xs text-neutral-500">
          <div className="font-mono text-sm font-semibold">320×50</div>
          <div className="text-[9px]">sticky mobile</div>
        </div>
        <button
          onClick={() => setOpen(false)}
          aria-label="Закрыть"
          className="absolute right-2 top-1/2 -translate-y-1/2 grid h-6 w-6 place-items-center rounded-full border border-neutral-400 bg-white text-sm leading-none text-neutral-700 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
        >
          ×
        </button>
      </div>
    </div>
  );
}
