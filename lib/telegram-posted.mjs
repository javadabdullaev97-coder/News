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
 * Канал назначения внутри одной записи реестра.
 *
 * До 17.08.2026 запись однозначно означала «ушло в канал своего языка», и
 * свёртка шла по одному url. Со спортивным каналом этого мало: важный
 * спортивный материал уходит ДВАЖДЫ — в основной канал языка и в спортивный
 * канал того же языка (решение владельца 17.08.2026), и обе отправки живут
 * под одним url. Без этого измерения вторая запись затирала бы первую при
 * свёртке, а дедуп считал бы вторую отправку дублем и не выпускал её.
 *
 * Записи без поля target — все, сделанные до этой даты, — читаются как
 * основной канал. Историю это не трогает.
 */
export const MAIN_TARGET = "main";
export const SPORT_TARGET = "sport";

function targetOf(rec) {
  return rec?.target ?? MAIN_TARGET;
}

/**
 * Возвращает Map: url → { messageId, postedAt }.
 *
 * Старый telegram-posted.json читается как основа. Без этого первый же прогон
 * после выката увидел бы пустой реестр и отправил в канал все статьи заново —
 * то есть ровно ту аварию, от которой этот модуль и защищает.
 */
function loadPostedRaw(root) {
  const out = new Map();

  const legacy = join(root, POSTED_LEGACY);
  if (existsSync(legacy)) {
    try {
      const parsed = JSON.parse(readFileSync(legacy, "utf8"));
      for (const [url, rec] of Object.entries(parsed?.posted ?? {})) {
        // Легаси-файл писался до появления второго канала — всё в основной.
        out.set(`${MAIN_TARGET}\u0000${url}`, { ...rec, url, target: MAIN_TARGET });
      }
    } catch {
      // Битый легаси-файл не должен останавливать постинг, но и молча
      // обнулять реестр нельзя — журнал ниже всё равно даст свою часть.
    }
  }

  const { events } = readLog(join(root, POSTED_LOG));
  // Ключ сортировки — postedAt либо revokedAt: отзыв приходит позже отправки
  // и обязан её перекрыть, иначе удалённый пост навсегда числится живым.
  // Ключ свёртки — пара «канал + url»: одна статья может законно лежать
  // в двух каналах, и вторая запись не должна затирать первую.
  const folded = foldByKey(
    events,
    (e) => `${targetOf(e)}\u0000${e.url}`,
    (e) => e.revokedAt ?? e.postedAt,
  );
  for (const [key, e] of folded) {
    out.set(key, {
      url: e.url,
      target: targetOf(e),
      messageId: e.messageId,
      postedAt: e.postedAt,
      revokedAt: e.revokedAt,
    });
  }
  return out;
}

/**
 * Возвращает Map: url → { messageId, postedAt } ПО ОСНОВНОМУ КАНАЛУ.
 *
 * Контракт не изменился с появлением спортивного канала: collect-metrics.mjs
 * строит по этим message_id адреса embed-страниц основного канала, и запись
 * из спортивного дала бы ему чужой идентификатор — метрика молча считалась бы
 * не с того поста. Поэтому здесь только основной канал; полная картина —
 * в loadPostedByLangSlug с явным target.
 */
export function loadPosted(root) {
  const out = new Map();
  for (const rec of loadPostedRaw(root).values()) {
    if (rec.target !== MAIN_TARGET) continue;
    out.set(rec.url, {
      messageId: rec.messageId,
      postedAt: rec.postedAt,
      revokedAt: rec.revokedAt,
    });
  }
  return out;
}

/** Фиксирует отправку. Одна статья — одна строка, дописывание атомарное. */
export function markPosted(root, { url, messageId, postedAt, target = MAIN_TARGET }) {
  const at = postedAt ?? new Date().toISOString();
  const rec = { url, messageId, postedAt: at };
  // Основной канал пишем без поля — строка остаётся байт в байт такой же,
  // какой была весь предыдущий месяц, и диффы реестра не разбухают.
  if (target !== MAIN_TARGET) rec.target = target;
  appendLog(join(root, POSTED_LOG), rec);
  return { ...rec, target };
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
export function loadPostedByLangSlug(root, target = MAIN_TARGET) {
  const byKey = new Map();
  for (const rec of loadPostedRaw(root).values()) {
    if (rec?.revokedAt) continue;
    if (rec.target !== target) continue;
    const url = rec.url;
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
export function isPostedNow(root, lang, slug, target = MAIN_TARGET) {
  const rec = loadPostedByLangSlug(root, target).get(`${lang} ${slug}`);
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
