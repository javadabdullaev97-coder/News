// Реестр «что уже ушло в Instagram и на страницу Facebook».
//
// Тот же принцип, что у lib/telegram-posted.mjs, и по той же причине: если
// запись теряется, материал уходит подписчикам повторно. Хранилище журнальное
// (lib/state-log.mjs) — дописывается строкой, сливается merge=union
// (.gitattributes уже покрывает content/state/*.jsonl), потеряться при
// параллельном пуше не может.
//
// ОТЛИЧИЕ ОТ ТЕЛЕГРАМНОГО РЕЕСТРА — третье измерение. Там ключ «язык + слаг»,
// потому что сеть одна. Здесь сетей две, и один материал законно уходит
// четырьмя постами: русский Instagram, русский Facebook, узбекский Instagram,
// узбекский Facebook. Ключ «сеть + язык + слаг» — минимальный, при котором
// ни одна из четырёх отправок не считается дублем другой.
//
// СЛАГ, А НЕ URL. Урок 04.08.2026: дедуп по полному адресу обнулился при
// смене формата URL и вылил в Telegram 36 старых статей. Слаг — единственная
// часть адреса, которая переезд формата переживает.

import { join } from "node:path";
import { appendLog, foldByKey, readLog } from "./state-log.mjs";

export const SOCIAL_LOG = "content/state/social-posted.jsonl";

export const NETWORKS = ["instagram", "facebook"];

function keyOf(network, lang, slug) {
  return `${network} ${lang} ${slug}`;
}

/**
 * Читает журнал: Map «сеть язык слаг» → { postId, postedAt, url, revokedAt }.
 *
 * Отозванные записи (revokedAt) из выдачи не выбрасываются — вызывающий сам
 * решает, что с ними делать. isPosted() их не считает отправкой: пост удалён,
 * материал снова можно опубликовать.
 */
export function loadPosted(root) {
  const { events } = readLog(join(root, SOCIAL_LOG));
  const out = new Map();
  // Ключ сортировки — revokedAt либо postedAt: отзыв приходит позже отправки
  // и обязан её перекрыть, иначе удалённый пост навсегда числится живым.
  for (const [key, e] of foldByKey(
    events,
    (e) => (e.network && e.lang && e.slug ? keyOf(e.network, e.lang, e.slug) : null),
    (e) => e.revokedAt ?? e.postedAt,
  )) {
    out.set(key, {
      network: e.network,
      lang: e.lang,
      slug: e.slug,
      postId: e.postId,
      url: e.url,
      postedAt: e.postedAt,
      revokedAt: e.revokedAt,
    });
  }
  return out;
}

/**
 * Постили уже этот материал в эту сеть на этом языке?
 *
 * Читает журнал с диска, а не снимок. Между решением «отправить» и самой
 * отправкой проходят десятки секунд — пауза между постами, загрузка
 * контейнера, опрос статуса, — и за это время запись мог дописать соседний
 * прогон. Снимок об этом не знает и разрешает вторую отправку: ровно так
 * 05.08.2026 в Telegram дважды ушёл разбор закона об антикоррупции.
 * Одно чтение небольшого файла на пост против дубля у всех подписчиков.
 */
export function isPosted(root, network, lang, slug) {
  const rec = loadPosted(root).get(keyOf(network, lang, slug));
  if (!rec || rec.revokedAt) return null;
  return rec;
}

/** Фиксирует отправку. Одна публикация — одна строка, дописывание атомарное. */
export function markPosted(root, { network, lang, slug, url, postId, postedAt }) {
  const at = postedAt ?? new Date().toISOString();
  const rec = { network, lang, slug, url, postId, postedAt: at };
  appendLog(join(root, SOCIAL_LOG), rec);
  return rec;
}

/**
 * Отмечает публикацию как снятую. Материал после этого снова считается
 * неотправленным — нужно, когда пост удалили руками и хотят переотправить.
 */
export function markRevoked(root, { network, lang, slug, reason }) {
  const at = new Date().toISOString();
  const rec = { network, lang, slug, revokedAt: at, reason };
  appendLog(join(root, SOCIAL_LOG), rec);
  return rec;
}

/** Сводка по сетям и языкам — для метрик и отчётов планёрки. */
export function summarize(root) {
  const out = {};
  for (const rec of loadPosted(root).values()) {
    if (rec.revokedAt) continue;
    const k = `${rec.network}/${rec.lang}`;
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}
