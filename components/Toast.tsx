"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type Toast = { id: number; message: string; icon?: string };
type Ctx = { show: (message: string, icon?: string) => void };

const ToastCtx = createContext<Ctx>({ show: () => {} });

export function useToast() {
  return useContext(ToastCtx);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, icon?: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, icon }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2400);
  }, []);

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-6 z-[80] flex flex-col gap-2">
        {toasts.map((t) => (
          <ToastItem key={t.id} message={t.message} icon={t.icon} />
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

function ToastItem({ message, icon }: { message: string; icon?: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 10);
    return () => clearTimeout(t);
  }, []);
  return (
    <div
      className={`pointer-events-auto flex min-w-[180px] items-center gap-2.5 rounded-full bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-all duration-200 dark:bg-white dark:text-neutral-900 ${
        show ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      {icon && <span className="text-base">{icon}</span>}
      <span>{message}</span>
    </div>
  );
}
