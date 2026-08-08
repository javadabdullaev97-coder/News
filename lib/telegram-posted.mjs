// Реестр «что уже ушло в Telegram-канал»: URL статьи → message_id.
//
// Единственный источник правды о том, постили мы материал или нет. Если запись
// теряется, статья уходит в канал повторно — подписчик видит дубль. Поэтому
// хранилище журнальное (см. lib/state-log.mjs): дописывается строкой, сливается
// merge=union, потеряться при параллельном пуше не может.
//
// Пишут сюда двое: post-to-telegram.mjs (автопост по пушу в content/posts)
// и он же из очереди редактора после ответа владельца. Читают ещё
// collect-metrics.mjs и editor-queue.mjs.

import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { appendLog, foldByKey, readLog } from "./state-log.mjs";

export const POSTED_LOG = "content/state/telegram-posted.jsonl";
export const POSTED_LEGACY = "content/state/telegram-posted.json";

/**
 * Возвращает Map: url → { messageId, postedAt }.
 *
 * Старый telegram-posted.json читается как основа. Без этого первый же прогон
 * после выката увидел бы пустой реестр и отправил в канал все статьи заново —
 * то есть ровно ту аварию, от которой этот модуль и защищает.
 */
export function loadPosted(root) {
  const out = new Map();

  const legacy = join(root, POSTED_LEGACY);
  if (existsSync(legacy)) {
    try {
      const parsed = JSON.parse(readFileSync(legacy, "utf8"));
      for (const [url, rec] of Object.entries(parsed?.posted ?? {})) {
        out.set(url, rec);
      }
    } catch {
      // Битый легаси-файл не должен останавливать постинг, но и молча
      // обнулять реестр нельзя — журнал ниже всё равно даст свою часть.
    }
  }

  const { events } = readLog(join(root, POSTED_LOG));
  // Ключ сортировки — postedAt либо revokedAt: отзыв приходит позже отправки
  // и обязан её перекрыть, иначе удалённый пост навсегда числится живым.
  for (const [url, e] of foldByKey(events, (e) => e.url, (e) => e.revokedAt ?? e.postedAt)) {
    out.set(url, { messageId: e.messageId, postedAt: e.postedAt, revokedAt: e.revokedAt });
  }
  return out;
}

/** Фиксирует отправку. Одна статья — одна строка, дописывание атомарное. */
export function markPosted(root, { url, messageId, postedAt }) {
  const at = postedAt ?? new Date().toISOString();
  appendLog(join(root, POSTED_LOG), { url, messageId, postedAt: at });
  return { url, messageId, postedAt: at };
}

/**
 * Слаг из адреса статьи — последний сегмент пути. Работает для обоих
 * форматов: и /article/<slug>, и /ru/ГГГГ/ММ/ДД/<slug>.
 */
export function slugOfUrl(url) {
  return String(url).replace(/\/+$/, "").split("/").pop();
}

/**
 * Язык из адреса статьи: /uz/ГГГГ/ММ/ДД/<slug> → "uz".
 *
 * Старый формат /article/<slug> и адреса без языкового префикса считаем
 * русскими — они появились до переезда, когда издание было одноязычным.
 */
export function langOfUrl(url) {
  const m = String(url).match(/^(?:https?:\/\/[^/]+)?\/(ru|uz|en)\//);
  return m ? m[1] : "ru";
}

/**
 * Реестр по паре ЯЗЫК + СЛАГ: "uz slug" → { messageId, postedAt, url }.
 *
 * У каждого языка свой канал (решение владельца 05.08.2026: русский —
 * основной, узбекский — @leap_news_uz), поэтому один и тот же материал
 * уходит подписчикам дважды — и это НЕ дубль. Дедуп только по слагу
 * запретил бы вторую отправку: узбекская версия никогда не вышла бы,
 * потому что русская уже числится отправленной.
 *
 * Отозванные записи (revokedAt) не считаются отправкой: пост удалён
 * из канала, материал снова можно отправить — например, в правильный
 * канал после уборки 05.08.2026.
 */
export function loadPostedByLangSlug(root) {
  const byKey = new Map();
  for (const [url, rec] of loadPosted(root)) {
    if (rec?.revokedAt) continue;
    const key = `${langOfUrl(url)} ${slugOfUrl(url)}`;
    const prev = byKey.get(key);
    if (!prev || String(rec.postedAt) < String(prev.postedAt)) {
      byKey.set(key, { ...rec, url });
    }
  }
  return byKey;
}

/**
 * Свежая проверка перед самой отправкой: постили уже этот язык и слаг?
 *
 * Снимок реестра берётся один раз в начале прогона, а между решением
 * «отправить» и самой отправкой проходят десятки секунд: пауза между постами,
 * загрузка картинки, ретраи Bot API. За это время запись мог дописать другой
 * процесс — параллельный прогон автопоста или repost-telegram. Снимок об этом
 * не знает и разрешает вторую отправку.
 *
 * Так 05.08.2026 в канал дважды ушёл разбор закона об антикоррупции
 * (messageId 127 и 128 с разрывом девять секунд), а 04.08 — семь материалов
 * подряд с разрывом в минуту.
 *
 * Функция перечитывает журнал с диска непосредственно перед send. Это одно
 * чтение небольшого файла на пост — против дубля у всех подписчиков.
 */
export function isPostedNow(root, lang, slug) {
  const rec = loadPostedByLangSlug(root).get(`${lang} ${slug}`);
  return rec ? { messageId: rec.messageId, postedAt: rec.postedAt, url: rec.url } : null;
}

/**
 * Реестр по СЛАГУ, а не по URL: slug → { messageId, postedAt, url }.
 *
 * Появился 04.08.2026 после аварии. Дедуп сравнивал полные адреса, и когда
 * сайт переехал с /article/<slug> на /ru/ГГГГ/ММ/ДД/<slug>, все 36 ранее
 * отправленных статей перестали находиться в реестре — постер счёл их
 * новыми и вылил в канал заново, волнами, по несколько раз в минуту
 * (параллельные прогоны очереди редактора работали каждый со своей копией
 * реестра). Слаг — единственная часть адреса, которая не меняется при
 * смене формата URL, поэтому дедуп обязан опираться на него.
 *
 * При нескольких записях об одном слаге побеждает САМАЯ РАННЯЯ: это
 * оригинальный пост в канале. Поздние — дубли той самой аварии, их
 * messageId нужны только чистильщику.
 */
export function loadPostedBySlug(root) {
  const bySlug = new Map();
  for (const [url, rec] of loadPosted(root)) {
    const slug = slugOfUrl(url);
    const prev = bySlug.get(slug);
    if (!prev || String(rec.postedAt) < String(prev.postedAt)) {
      bySlug.set(slug, { ...rec, url });
    }
  }
  return bySlug;
}
