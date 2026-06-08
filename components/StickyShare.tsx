"use client";

import { useEffect, useState } from "react";
import { useToast } from "./Toast";

function shareUrl(platform: "tg" | "fb" | "x", url: string, title: string) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  if (platform === "tg") return `https://t.me/share/url?url=${u}&text=${t}`;
  if (platform === "fb") return `https://www.facebook.com/sharer/sharer.php?u=${u}`;
  return `https://twitter.com/intent/tweet?url=${u}&text=${t}`;
}

export function StickyShare({ title }: { title: string }) {
  const [url, setUrl] = useState("");
  const { show } = useToast();

  useEffect(() => {
    setUrl(window.location.href);
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      show("Ссылка скопирована", "🔗");
    } catch {
      show("Не получилось скопировать", "⚠");
    }
  }

  const btn =
    "grid h-10 w-10 place-items-center rounded-full border border-neutral-200 bg-white text-base shadow-sm transition-all duration-150 hover:border-brand hover:text-brand hover:shadow active:scale-95 dark:border-neutral-800 dark:bg-neutral-900";

  return (
    <div className="pointer-events-none fixed left-4 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-2 lg:flex">
      <div className="pointer-events-auto flex flex-col gap-2 rounded-full border border-neutral-200/70 bg-white/80 p-1.5 shadow-sm backdrop-blur dark:border-neutral-800/70 dark:bg-neutral-950/80">
        <a
          href={shareUrl("tg", url, title)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Поделиться в Telegram"
          className={btn}
        >
          ✈
        </a>
        <a
          href={shareUrl("fb", url, title)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Поделиться в Facebook"
          className={btn}
        >
          f
        </a>
        <a
          href={shareUrl("x", url, title)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Поделиться в X"
          className={btn}
        >
          𝕏
        </a>
        <button onClick={copy} aria-label="Скопировать ссылку" className={btn}>
          🔗
        </button>
      </div>
    </div>
  );
}
