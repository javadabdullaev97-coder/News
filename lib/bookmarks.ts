"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

const STORAGE_KEY = "leap.bookmarks.v1";

function readStore(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeStore(slugs: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
    window.dispatchEvent(new Event("leap:bookmarks"));
  } catch {}
}

const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onEvt = () => cb();
  window.addEventListener("leap:bookmarks", onEvt);
  window.addEventListener("storage", onEvt);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("leap:bookmarks", onEvt);
    window.removeEventListener("storage", onEvt);
  };
}

let cachedSnapshot: string[] = [];
let lastRead = "";

function getSnapshot(): string[] {
  if (typeof window === "undefined") return cachedSnapshot;
  const raw = localStorage.getItem(STORAGE_KEY) ?? "";
  if (raw !== lastRead) {
    lastRead = raw;
    try {
      cachedSnapshot = raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      cachedSnapshot = [];
    }
  }
  return cachedSnapshot;
}

function getServerSnapshot(): string[] {
  return [];
}

export function useBookmarks() {
  const bookmarks = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback((slug: string) => {
    const current = readStore();
    const exists = current.includes(slug);
    const next = exists ? current.filter((s) => s !== slug) : [slug, ...current];
    writeStore(next);
    return !exists;
  }, []);

  const isSaved = useCallback((slug: string) => bookmarks.includes(slug), [bookmarks]);

  return { bookmarks, toggle, isSaved };
}
