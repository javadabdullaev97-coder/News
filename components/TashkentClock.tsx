"use client";

import { useEffect, useState } from "react";

function tashkentTime() {
  return new Date().toLocaleString("ru-RU", {
    timeZone: "Asia/Tashkent",
    weekday: "short",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TashkentClock() {
  const [now, setNow] = useState<string | null>(null);

  useEffect(() => {
    setNow(tashkentTime());
    const id = setInterval(() => setNow(tashkentTime()), 30_000);
    return () => clearInterval(id);
  }, []);

  return <span className="tabular-nums">{now ?? ""}</span>;
}
