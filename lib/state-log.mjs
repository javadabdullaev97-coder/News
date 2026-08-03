// Состояние редакции, которое переживает параллельную запись.
//
// ЗАЧЕМ. В main одновременно пишут news-inbox, telegram-autopost, editor-queue,
// вебхук бота и планёрки. Пока состояние лежит в JSON-файле, который каждый
// процесс переписывает целиком, две одновременные записи дают конфликт по
// одной и той же строке. git-push-with-rebase.sh на конфликте делает abort,
// раннер эфемерный — и коммит исчезает вместе с состоянием.
//
// Для инбокса это стоило потерянных новостей (боевой случай 03.08.2026
// 06:09 UTC). Для telegram-posted.json цена выше: если потеряется запись
// «эту статью уже постили», следующий запуск отправит её в канал повторно.
// Ровно этот риск описан в шапке git-push-with-rebase.sh как известный.
//
// РЕШЕНИЕ. Состояние становится журналом событий: файл только дописывается,
// строка — одно событие, актуальное состояние собирается сворачиванием при
// чтении. Дальше .gitattributes с merge=union склеивает параллельные
// дописывания сам, и конфликта не возникает в принципе.
//
// Побочные эффекты склейки безобидны по построению: дубли строк схлопываются
// при сворачивании, а порядок внутри файла значения не имеет — у каждого
// события есть собственная метка времени.

import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";

/**
 * Читает журнал событий. Битые строки пропускает и считает: журнал, который
 * упал на одной сломанной строке, остановил бы редакцию целиком, а это хуже
 * любого частичного состояния.
 */
export function readLog(path) {
  if (!existsSync(path)) return { events: [], badLines: 0 };
  const events = [];
  let badLines = 0;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const s = line.trim();
    if (!s) continue;
    try {
      events.push(JSON.parse(s));
    } catch {
      badLines++;
    }
  }
  return { events, badLines };
}

/** Дописывает одно событие. Каталог создаётся при необходимости. */
export function appendLog(path, event) {
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, JSON.stringify(event) + "\n");
}

/**
 * Сворачивает журнал в Map по ключу: побеждает событие с самой поздней меткой
 * времени, а при равных метках — последнее в файле. Сравнение по метке, а не
 * по позиции, потому что после merge=union порядок строк уже не отражает
 * порядок событий: склеенные куски двух процессов идут подряд, а не вперемешку
 * по времени.
 */
export function foldByKey(events, keyOf, timeOf = (e) => e.at) {
  const out = new Map();
  for (const e of events) {
    const key = keyOf(e);
    if (key === undefined || key === null) continue;
    const prev = out.get(key);
    if (!prev) {
      out.set(key, e);
      continue;
    }
    const a = Date.parse(timeOf(e) ?? "");
    const b = Date.parse(timeOf(prev) ?? "");
    if (!Number.isFinite(b) || (Number.isFinite(a) && a >= b)) out.set(key, e);
  }
  return out;
}
