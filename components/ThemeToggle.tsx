"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = saved ? saved === "dark" : prefersDark;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <button
      onClick={toggle}
      aria-label="Переключить тему"
      className="grid h-9 w-9 place-items-center rounded-full border border-neutral-200 bg-white text-sm shadow-sm transition-all duration-150 hover:border-brand hover:text-brand hover:shadow active:scale-95 dark:border-neutral-800 dark:bg-neutral-900"
    >
      {dark ? "☀" : "☾"}
    </button>
  );
}
