"use client";

import { useState } from "react";
import { useToast } from "./Toast";

export function InlineSubscribe() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const { show } = useToast();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) {
      show("Введите корректный email", "⚠");
      return;
    }
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setEmail("");
      show("Подписка оформлена. До встречи в рассылке!", "📩");
    }, 600);
  }

  return (
    <aside className="mt-12 rounded-2xl border border-brand/20 bg-gradient-to-br from-brand-50 to-white p-6 dark:from-brand/10 dark:to-neutral-950">
      <div className="flex items-start gap-4">
        <div className="hidden h-12 w-12 shrink-0 place-items-center rounded-full bg-brand text-2xl text-white sm:grid">
          📩
        </div>
        <div className="flex-1">
          <h3 className="font-serif text-xl font-bold">
            Получайте главное за день одним письмом
          </h3>
          <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">
            Краткая выжимка из 5–7 материалов LEAP, без спама и автоматики.
            Можно отписаться в любой момент.
          </p>
          <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ваш@email.com"
              className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-brand dark:border-neutral-700 dark:bg-neutral-950"
            />
            <button
              type="submit"
              disabled={sending}
              className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-brand-600 hover:shadow active:scale-95 disabled:opacity-60"
            >
              {sending ? "..." : "Подписаться"}
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
