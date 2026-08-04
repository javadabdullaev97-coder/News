// Кандидаты в источники: Telegram-каналы, которые упоминают конкуренты.
//
// ЗАЧЕМ. Правило владельца 04.08.2026: если у конкурентов в статье указан
// ТГ-канал, которого нет в нашем списке, — накапливать его вместе с тем,
// КАК конкурент на него ссылается. «Официальный канал ведомства» — значит
// и мы относимся как к официальному (type: source). «Канал, близкий к…» /
// «связывают с…» — значит attributed, с той же оговоркой. Накопление идёт
// пассивно на каждом фетче — отдельных походов за этим не делается, поэтому
// впустую фетчи не тратятся: к моменту решения контексты уже собраны.
//
// МЕХАНИКА. Фетчеры после отбора свежих items зовут collectChannelCandidates:
// из title+snippet достаются ссылки t.me/<handle> и упоминания @handle,
// известные каналы (config/telegram-channels.json: channels + excluded)
// отбрасываются, новое дописывается событием в журнал
// content/state/channel-candidates.jsonl (append-only, merge=union):
//
//   {ev:"seen",    handle, at, link, sourceId, context}   — замечен у конкурента
//   {ev:"resolve", handle, at, addedAs}                   — добавлен в конфиг
//   {ev:"dismiss", handle, at, reason}                    — решили не брать
//
// Разбор накопленного — работа планёрки (см. planyorka.md, «Разбор кандидатов
// в источники»): resolve/dismiss пишет она, после чего handle считается
// известным и больше не копится.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { appendLog, readLog } from "./state-log.mjs";

export const CANDIDATES_LOG = "content/state/channel-candidates.jsonl";
const CHANNELS_CONFIG = "config/telegram-channels.json";

// Служебные пути t.me, которые выглядят как handle, но каналом не являются.
const RESERVED = new Set([
  "s", "share", "joinchat", "proxy", "socks", "iv", "addstickers",
  "addtheme", "addemoji", "setlanguage", "confirmphone", "login", "c",
]);

const CONTEXT_RADIUS = 160;
const MAX_EVENTS_PER_CALL = 50;

const norm = (h) => String(h || "").toLowerCase().replace(/^@/, "");

function isPlausibleHandle(h) {
  if (!h || h.length < 4 || h.length > 32) return false;
  if (RESERVED.has(h)) return false;
  if (h.endsWith("bot")) return false; // боты — не источники
  if (/^\d+$/.test(h)) return false;
  return true;
}

/**
 * Достаёт из текста упоминания каналов: ссылки t.me и @handle.
 * Возвращает [{handle, context}] — по одному на handle, контекст вокруг
 * первого вхождения (по нему планёрка судит об атрибуции у конкурента).
 */
export function extractHandles(text) {
  const s = String(text || "");
  const found = new Map();
  const push = (handle, idx) => {
    const h = norm(handle);
    if (!isPlausibleHandle(h) || found.has(h)) return;
    const from = Math.max(0, idx - CONTEXT_RADIUS);
    const context = s
      .slice(from, Math.min(s.length, idx + CONTEXT_RADIUS))
      .replace(/\s+/g, " ")
      .trim();
    found.set(h, { handle: h, context });
  };

  // t.me/handle, t.me/s/handle, t.me/handle/123, telegram.me/…
  const linkRe = /(?:https?:\/\/)?t(?:elegram)?\.me\/(?:s\/)?([A-Za-z0-9_]{2,32})/g;
  for (let m; (m = linkRe.exec(s)); ) push(m[1], m.index);

  // @handle в тексте. Символ перед @ не должен быть буквой/цифрой —
  // отсекает адреса почты вида name@domain.
  const atRe = /(^|[^A-Za-z0-9_])@([A-Za-z0-9_]{4,32})\b/g;
  for (let m; (m = atRe.exec(s)); ) push(m[2], m.index + m[1].length);

  return [...found.values()];
}

/** Все известные handle: рабочий список, исключённые, уже решённые кандидаты. */
export function knownHandles(root) {
  const known = new Set();
  const cfgPath = join(root, CHANNELS_CONFIG);
  if (existsSync(cfgPath)) {
    try {
      const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
      for (const c of cfg.channels ?? []) known.add(norm(c.handle));
      for (const e of cfg.excluded ?? []) known.add(norm(e.handle));
    } catch {
      // битый конфиг не должен ронять фетч — просто соберём чуть больше шума
    }
  }
  for (const e of readLog(join(root, CANDIDATES_LOG)).events) {
    if (e.ev === "resolve" || e.ev === "dismiss") known.add(norm(e.handle));
  }
  return known;
}

/**
 * Пассивный сбор: просматривает свежие items инбокса, дописывает новые
 * наблюдения в журнал. Дедуп по (handle, link) — повторный фетч той же
 * статьи ничего не плодит. Возвращает {appended, handles}.
 */
export function collectChannelCandidates(root, items) {
  const known = knownHandles(root);
  const seenPairs = new Set(
    readLog(join(root, CANDIDATES_LOG))
      .events.filter((e) => e.ev === "seen")
      .map((e) => `${norm(e.handle)} ${e.link ?? ""}`),
  );

  const at = new Date().toISOString();
  const appended = [];
  for (const item of items ?? []) {
    if (appended.length >= MAX_EVENTS_PER_CALL) break;
    const text = `${item?.title ?? ""}\n${item?.snippet ?? ""}`;
    for (const { handle, context } of extractHandles(text)) {
      if (known.has(handle)) continue;
      const pair = `${handle} ${item?.link ?? ""}`;
      if (seenPairs.has(pair)) continue;
      seenPairs.add(pair);
      const ev = {
        ev: "seen",
        handle,
        at,
        link: item?.link ?? null,
        sourceId: item?.sourceId ?? null,
        context,
      };
      appendLog(join(root, CANDIDATES_LOG), ev);
      appended.push(handle);
    }
  }
  return { appended: appended.length, handles: [...new Set(appended)] };
}

/**
 * Свёртка журнала для разбора: handle → наблюдения и статус.
 * resolved/dismissed остаются в выдаче с пометкой — для отчёта, не для работы.
 */
export function foldCandidates(root) {
  const byHandle = new Map();
  for (const e of readLog(join(root, CANDIDATES_LOG)).events) {
    const h = norm(e.handle);
    if (!h) continue;
    const cur =
      byHandle.get(h) ??
      { handle: h, sightings: 0, sources: new Set(), contexts: [], firstAt: null, lastAt: null, status: "open" };
    if (e.ev === "seen") {
      cur.sightings++;
      if (e.sourceId) cur.sources.add(e.sourceId);
      if (e.context) cur.contexts.push(e.context);
      cur.firstAt = cur.firstAt ?? e.at;
      cur.lastAt = e.at;
    } else if (e.ev === "resolve") {
      cur.status = `resolved:${e.addedAs ?? "?"}`;
    } else if (e.ev === "dismiss") {
      cur.status = "dismissed";
    }
    byHandle.set(h, cur);
  }
  for (const c of byHandle.values()) c.sources = [...c.sources];
  return byHandle;
}

/** Планёрка зовёт после добавления канала в конфиг или отказа от него. */
export function markCandidate(root, handle, decision, extra = {}) {
  const at = new Date().toISOString();
  if (decision === "resolve") {
    appendLog(join(root, CANDIDATES_LOG), { ev: "resolve", handle: norm(handle), at, addedAs: extra.addedAs ?? null });
  } else {
    appendLog(join(root, CANDIDATES_LOG), { ev: "dismiss", handle: norm(handle), at, reason: extra.reason ?? null });
  }
}
