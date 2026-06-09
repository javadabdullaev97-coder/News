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

export function ShareButtons({
  title,
  size = "md",
}: {
  title: string;
  size?: "md" | "lg";
}) {
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

  const dim = size === "lg" ? "h-10 w-10 text-base" : "h-8 w-8 text-sm";
  const btn = `grid place-items-center rounded-full border border-neutral-200 bg-white shadow-sm transition-all duration-150 hover:border-brand hover:text-brand active:scale-95 dark:border-neutral-800 dark:bg-neutral-900 ${dim}`;

  return (
    <div className="flex items-center gap-1.5">
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
  );
}
