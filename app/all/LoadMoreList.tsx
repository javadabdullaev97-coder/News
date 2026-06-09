"use client";

import { useState, type ReactNode } from "react";

export function LoadMoreList({
  items,
  pageSize = 100,
}: {
  items: ReactNode[];
  pageSize?: number;
}) {
  const [visible, setVisible] = useState(pageSize);
  const shown = items.slice(0, visible);
  const remaining = items.length - shown.length;
  const nextChunk = Math.min(remaining, pageSize);

  return (
    <>
      <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
        {shown}
      </div>
      {remaining > 0 && (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={() => setVisible((v) => v + pageSize)}
            className="inline-flex items-center gap-2 rounded-full border border-brand bg-brand/5 px-6 py-3 text-sm font-semibold text-brand transition-colors hover:bg-brand hover:text-white active:scale-95"
          >
            Показать ещё
            <span className="text-xs font-normal opacity-80">
              · {nextChunk} из {remaining}
            </span>
          </button>
        </div>
      )}
    </>
  );
}
