// Общее ядро для preflight.mjs и inbox-select.mjs.
//
// Зачем модуль, а не два независимых скрипта. Preflight отвечает на вопрос
// «есть ли работа», inbox-select — «вот конкретно она». Если они считают
// свежесть по разным правилам, планёрка получает противоречие: preflight
// говорит «21 новая тема», отбор отдаёт три, и никто не понимает почему.
// Поэтому оба зовут одни и те же функции, а не повторяют логику.
//
// ЗАВИСИМОСТЕЙ НЕТ СОЗНАТЕЛЬНО — только node builtins. Preflight должен
// запускаться в свежем клоне до `npm install`: он и нужен затем, чтобы
// на пустом заходе не делать вообще ничего. Пакет `yaml` здесь недоступен,
// поэтому recheckAt из карточек читается регуляркой — frontmatter карточек
// состоит из двух скалярных полей, полный YAML для этого не нужен.

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

// Ташкент — UTC+5 круглый год, перевода часов нет.
const TASHKENT_OFFSET_MS = 5 * 3600 * 1000;

/** Дата по Ташкенту в формате YYYY-MM-DD. */
export function tashkentDay(at = Date.now()) {
  return new Date(at + TASHKENT_OFFSET_MS).toISOString().slice(0, 10);
}

/** Вчерашняя дата по Ташкенту. */
export function tashkentYesterday(at = Date.now()) {
  return tashkentDay(at - 24 * 3600 * 1000);
}

/**
 * Хеш темы. Формат обязан совпадать с тем, что планёрка пишет в
 * content/state/seen-topics.json: sha256 от СЫРОЙ строки link, с префиксом.
 *
 * Проверено на живых данных: при сверке хешей seen-topics с инбоксами
 * 1–3 августа сырой вариант даёт больше совпадений, чем нормализованный
 * (например 300 против 300 на world-03, 27 против 17 на local-03) —
 * то есть планёрка хеширует link как есть, без lowercase и без обрезки.
 * Не «улучшать» нормализацией: это разом обнулит весь накопленный журнал
 * и все уже обработанные темы вернутся в пул.
 */
export function hashLink(link) {
  return "sha256:" + createHash("sha256").update(String(link)).digest("hex");
}

/**
 * Журнал обработанных тем.
 *
 * FAIL-OPEN: если файла нет или он битый — возвращаем пустое множество и
 * поднимаем флаг. Обратное поведение (считать всё виденным) молча
 * остановило бы редакцию целиком, и это было бы неотличимо от тихого дня.
 */
export function loadSeenHashes(root = ROOT) {
  const path = join(root, "content/state/seen-topics.json");
  if (!existsSync(path)) {
    return { hashes: new Set(), ok: true, note: "seen-topics.json не существует — первый запуск" };
  }
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    const list = Array.isArray(parsed?.hashes) ? parsed.hashes : [];
    if (!Array.isArray(parsed?.hashes)) {
      return {
        hashes: new Set(),
        ok: false,
        note: "seen-topics.json без массива hashes — считаю журнал пустым",
      };
    }
    return { hashes: new Set(list), ok: true, note: null };
  } catch (err) {
    return {
      hashes: new Set(),
      ok: false,
      note: `seen-topics.json не читается (${err.message}) — считаю журнал пустым`,
    };
  }
}

/**
 * Журнал тем целиком: что уже сделано и что прямо сейчас в работе у соседа.
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЕ ФАЙЛЫ, А НЕ ОДИН seen-topics.json. Одновременных планёрок
 * теперь несколько. Проверено на модели: две планёрки, дописавшие по хешу
 * в общий JSON, дают конфликт при rebase, а `git-push-with-rebase.sh` на
 * конфликте прерывается с кодом 2. То есть журнал второй планёрки не просто
 * теряется — она об этом даже не узнает, а её темы через час вернутся в пул
 * как новые. Именно так тема ВТО вышла дважды, только по другой причине.
 *
 * Поэтому запись идёт в `content/state/seen/<день>-<runId>.jsonl` — у каждого
 * прогона свой файл. Разные файлы не конфликтуют при rebase никогда.
 * Чтение — объединение всех файлов плюс исторический seen-topics.json,
 * который остаётся и продолжает работать.
 *
 * ДВА СОСТОЯНИЯ ЗАПИСИ:
 *   done    — тема обработана, к ней не возвращаемся;
 *   claimed — тема ВЗЯТА В РАБОТУ прямо сейчас. Ставится в момент отбора,
 *             до производства, и живёт `claimTtlMinutes`. Без этого соседняя
 *             планёрка, стартовавшая через 20 минут, видит журнал без ещё
 *             не дописанной темы и берёт её второй раз.
 *
 * Бронь именно протухает, а не снимается вручную: прогон может умереть, и
 * тогда вечная бронь похоронила бы тему навсегда.
 */
export const CLAIM_TTL_MINUTES = 45;

export function loadJournal(root = ROOT, at = Date.now()) {
  const legacy = loadSeenHashes(root);
  const done = new Set(legacy.hashes);
  const claimed = new Map(); // hash → { slug, expiresAt }
  const released = new Set();
  const files = [];
  let badLines = 0;

  const dir = join(root, "content/state/seen");
  if (existsSync(dir)) {
    for (const name of readdirSync(dir).filter((n) => n.endsWith(".jsonl")).sort()) {
      files.push(`content/state/seen/${name}`);
      for (const line of readFileSync(join(dir, name), "utf8").split("\n")) {
        const s = line.trim();
        if (!s) continue;
        let rec;
        try {
          rec = JSON.parse(s);
        } catch {
          badLines++;
          continue;
        }
        if (!rec?.h) {
          badLines++;
          continue;
        }
        if (rec.st === "done") {
          done.add(rec.h);
          claimed.delete(rec.h);
        } else if (rec.st === "released") {
          released.add(rec.h);
          claimed.delete(rec.h);
        } else if (rec.st === "claimed") {
          if (done.has(rec.h)) continue;
          const exp = Date.parse(rec.exp ?? "");
          if (Number.isFinite(exp) && exp > at) {
            claimed.set(rec.h, { slug: rec.s ?? null, expiresAt: rec.exp });
          }
        }
      }
    }
  }
  for (const h of released) if (!done.has(h)) claimed.delete(h);

  // Заблокировано = сделано или взято соседом и бронь ещё жива.
  const blocked = new Set(done);
  for (const h of claimed.keys()) blocked.add(h);

  return {
    done,
    claimed,
    blocked,
    files,
    badLines,
    legacyCount: legacy.hashes.size,
    ok: legacy.ok,
    note: legacy.note,
  };
}

/**
 * Прочитать один JSONL-инбокс. Битые строки пропускаем поштучно, а не
 * роняем весь файл: один оборванный дописанный item не должен стоить
 * редакции целого прогона.
 */
export function readInboxFile(root, relPath) {
  const abs = join(root, relPath);
  if (!existsSync(abs)) return { file: relPath, exists: false, items: [], badLines: 0 };
  const items = [];
  let badLines = 0;
  for (const line of readFileSync(abs, "utf8").split("\n")) {
    const s = line.trim();
    if (!s) continue;
    try {
      const item = JSON.parse(s);
      if (item && typeof item === "object" && item.link) items.push(item);
      else badLines++;
    } catch {
      badLines++;
    }
  }
  return { file: relPath, exists: true, items, badLines };
}

/**
 * Инбокс за сегодня и вчера сразу.
 *
 * Спецификация раньше говорила «вчерашний — если после полуночи Ташкента
 * и в сегодняшнем ещё мало». Это решение на глазок, и в 00:05 оно каждый
 * раз принималось заново. Читаем оба всегда: отсечку всё равно делает
 * возраст item'а, а не имя файла, и тогда граница суток перестаёт быть
 * особым случаем.
 */
export function readInbox(root = ROOT, { world = false, at = Date.now() } = {}) {
  const prefix = world ? "world-" : "";
  const files = [
    `content/inbox/${prefix}${tashkentDay(at)}.jsonl`,
    `content/inbox/${prefix}${tashkentYesterday(at)}.jsonl`,
  ];
  const parts = files.map((f) => readInboxFile(root, f));
  return {
    files: parts.filter((p) => p.exists).map((p) => p.file),
    items: parts.flatMap((p) => p.items),
    badLines: parts.reduce((s, p) => s + p.badLines, 0),
  };
}

/**
 * Схлопнуть повторы одного link.
 *
 * Фетчер добавляет item заново на каждом проходе, если лента ещё отдаёт
 * запись. На мировом потоке это 217 повторов из 509 за 3 августа — 43%
 * объёма, который иначе уезжает в контекст модели дважды и трижды.
 *
 * Оставляем ПЕРВОЕ вхождение и самый ранний fetchedAt: «когда мы это
 * впервые увидели». Если брать последний, тема, которую лента отдаёт
 * третьи сутки, вечно выглядела бы свежей и никогда не старела.
 */
export function dedupeByLink(items) {
  const byLink = new Map();
  for (const item of items) {
    const prev = byLink.get(item.link);
    if (!prev) {
      byLink.set(item.link, { ...item, seenTimes: 1 });
      continue;
    }
    prev.seenTimes++;
    const prevAt = Date.parse(prev.fetchedAt ?? "");
    const curAt = Date.parse(item.fetchedAt ?? "");
    if (Number.isFinite(curAt) && (!Number.isFinite(prevAt) || curAt < prevAt)) {
      prev.fetchedAt = item.fetchedAt;
    }
    if (Number.isFinite(item.views) && !(prev.views >= item.views)) {
      prev.views = item.views;
    }
  }
  return [...byLink.values()];
}

/**
 * Возраст item'а в часах. Первым берём fetchedAt (когда фетчер забрал),
 * запасным — pubDate.
 *
 * Если обе даты не читаются — возвращаем null, и вызывающая сторона
 * считает item свежим. Fail-open: цена лишней темы в пуле — несколько
 * секунд оценки, цена потерянной — пропущенная новость.
 */
export function itemAgeHours(item, at = Date.now()) {
  for (const raw of [item.fetchedAt, item.pubDate]) {
    const t = Date.parse(raw ?? "");
    if (Number.isFinite(t)) return (at - t) / 3600000;
  }
  return null;
}

/**
 * Отбор кандидатов.
 *
 * Два и только два условия, ровно как в спецификации:
 *   1. хеша link нет в seen-topics;
 *   2. item не старше maxAgeHours.
 *
 * СРАВНЕНИЯ С lastRunAt ЗДЕСЬ НЕТ И БЫТЬ НЕ ДОЛЖНО. Отсечка «fetchedAt
 * позже прошлого запуска» молча теряла темы: fetchedAt ставится в момент
 * забора из ленты, а видимым для планёрки item становится только после
 * коммита инбокса, и между этими моментами проходит до получаса. Всё,
 * что забрано до прошлого запуска и закоммичено после, проваливалось
 * навсегда. Так 3 августа выпали тарифы на отопление и проезд.
 * Дедуп делает журнал хешей, и только он.
 */
export function selectFresh(
  items,
  { seen, claimed = null, at = Date.now(), maxAgeHours = 24 } = {},
) {
  const deduped = dedupeByLink(items);
  const stats = {
    raw: items.length,
    deduped: deduped.length,
    duplicates: items.length - deduped.length,
    alreadySeen: 0,
    claimedByOther: 0,
    stale: 0,
    ageUnknown: 0,
    fresh: 0,
  };
  const fresh = [];
  for (const item of deduped) {
    const h = hashLink(item.link);
    if (seen.has(h)) {
      // Разделяем в статистике, но не в решении: и то и другое значит
      // «не бери». Разница нужна в отчёте — «сосед взял пять тем» и «пять
      // тем уже выходили» это разные новости о состоянии редакции.
      if (claimed?.has(h)) stats.claimedByOther++;
      else stats.alreadySeen++;
      continue;
    }
    const age = itemAgeHours(item, at);
    if (age === null) {
      stats.ageUnknown++;
    } else if (age > maxAgeHours) {
      stats.stale++;
      continue;
    }
    fresh.push(item);
  }
  stats.fresh = fresh.length;
  return { fresh, stats };
}

/** Материалы на переделке — они имеют приоритет над новыми темами. */
export function listRework(root = ROOT) {
  const dir = join(root, "content/rework");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((n) => n.endsWith(".mdx"))
    .map((n) => `content/rework/${n}`)
    .sort();
}

/**
 * Исследовательские карточки, у которых наступил срок перепроверки.
 *
 * Только `.md`. `.mdx` в этой же папке — готовые материалы, ждущие ответа
 * владельца; ими занимается editor-queue, и путать эти два типа нельзя.
 *
 * Карточка без машиночитаемого recheckAt считается созревшей: именно
 * молчаливое «когда-нибудь потом» держало папку два дня на одной записи.
 * Планёрка сама проставит срок при следующем касании.
 */
export function listMaturedCards(root = ROOT, at = Date.now()) {
  const dir = join(root, "content/needs-verification");
  if (!existsSync(dir)) return { matured: [], waiting: [] };
  const matured = [];
  const waiting = [];
  for (const name of readdirSync(dir).filter((n) => n.endsWith(".md")).sort()) {
    const rel = `content/needs-verification/${name}`;
    const text = readFileSync(join(root, rel), "utf8");
    const fm = text.match(/^---\n([\s\S]*?)\n---/);
    const m = fm && fm[1].match(/^recheckAt:\s*["']?([^"'\n]+?)["']?\s*$/m);
    const due = m ? Date.parse(m[1]) : NaN;
    const card = {
      path: rel,
      slug: name.replace(/\.md$/, ""),
      recheckAt: m ? m[1] : null,
    };
    if (!Number.isFinite(due)) {
      card.reason = "нет машиночитаемого recheckAt — считаю созревшей";
      matured.push(card);
    } else if (due <= at) {
      card.overdueHours = Math.round((at - due) / 3600000);
      matured.push(card);
    } else {
      card.inHours = Math.round((due - at) / 3600000);
      waiting.push(card);
    }
  }
  return { matured, waiting };
}
