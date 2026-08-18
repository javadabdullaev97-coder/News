#!/usr/bin/env node
// Ищет дубли ПО САМОМУ КАНАЛУ, а не по реестру отправленного.
//
// ЗАЧЕМ ИМЕННО ТАК. Первая версия этой сверки (18.08.2026) сравнивала записи
// реестра между собой: ключ с двумя номерами сообщений — подозрение. Она
// пропустила ровно тот случай, ради которого затевалась. Дубль в спортивных
// каналах выглядел так: первая отправка ушла и записи о себе НЕ ОСТАВИЛА
// (прогон со старым кодом), вторая ушла и записалась. В реестре один номер,
// значит подозрения нет — а в канале две одинаковые публикации, и владелец
// нашёл их глазами.
//
// Отсюда правило: единственный надёжный источник правды о том, что видит
// подписчик, — сам канал. Реестр может о посте не знать; канал знает всегда.
//
// Читается публичная страница t.me/s/<канал>: последние ~20 публикаций
// с номерами и текстом. Ни токена, ни секретов — работает и в песочнице.
//
//   node scripts/audit-telegram-duplicates.mjs            — все каналы
//   node scripts/audit-telegram-duplicates.mjs --channel tech-ru
//   node scripts/audit-telegram-duplicates.mjs --request  — собрать заявку на снятие
//
// Код возврата 1, если найдены дубли: сверку можно вешать в расписание.

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const argv = process.argv.slice(2);
// indexOf вернёт -1, когда флага нет, и argv[0] превратится в «фильтр»,
// под который не подходит ни один канал: сверка молча проверит ноль
// каналов и отрапортует «дублей нет». Поймано на первом же прогоне
// с --request.
const only = argv.includes("--channel") ? argv[argv.indexOf("--channel") + 1] : null;
const makeRequest = argv.includes("--request");

// Публичные имена каналов. Ключ — то, чем их называет заявка на снятие.
const CHANNELS = {
  "ru": "leap_news",
  "uz": "leap_news_uz",
  "sport-ru": "leap_sports",
  "sport-uz": "leap_sports_uz",
  "tech-ru": "leap_techno",
  "tech-uz": "leap_techno_uz",
};

// Заголовок — первая строка поста. Сравниваем по ней, а не по всему тексту:
// повторная отправка идёт тем же шаблоном, но лид может обрезаться иначе.
// Нормализуем пробелы и регистр — иначе одна и та же публикация разойдётся
// на невидимом неразрывном пробеле.
function headlineOf(text) {
  return text
    .split("\n")[0]
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .slice(0, 120);
}

function parseChannel(html) {
  const posts = [];
  // Блоки идут парами «data-post=…» и следующий за ним текст сообщения.
  const re = /data-post="[^/]+\/(\d+)"[\s\S]*?tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/g;
  for (const m of html.matchAll(re)) {
    const text = m[2]
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&laquo;/g, "«")
      .replace(/&raquo;/g, "»")
      .replace(/&mdash;/g, "—")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&");
    posts.push({ id: Number(m[1]), headline: headlineOf(text), preview: text.split("\n")[0].slice(0, 64) });
  }
  return posts;
}

const found = [];
const unchecked = [];
for (const [key, handle] of Object.entries(CHANNELS)) {
  if (only && only !== key) continue;
  let html;
  try {
    const res = await fetch(`https://t.me/s/${handle}`, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) {
      console.error(`  ? ${key}: страница канала ответила ${res.status}`);
      continue;
    }
    html = await res.text();
  } catch (err) {
    // Сеть подвела — молчать нельзя: «дублей нет» и «я не смотрел» это
    // разные ответы, и путать их в сверке опаснее всего.
    console.error(`  ? ${key}: канал не ответил (${err.message}) — НЕ ПРОВЕРЕН`);
    continue;
  }

  const posts = parseChannel(html);
  if (!posts.length) {
    // У закрытого канала страница t.me/s/ пуста. Это НЕ «дублей нет»:
    // основной русский канал 18.08.2026 отдавал ноль публикаций именно
    // поэтому, и молчаливый ноль в отчёте означал бы проверку, которой
    // не было.
    console.error(`  ! ${key} (${handle}): предпросмотр закрыт — КАНАЛ НЕ ПРОВЕРЕН`);
    unchecked.push(key);
    continue;
  }
  const byHeadline = new Map();
  for (const p of posts) {
    if (!p.headline) continue;
    byHeadline.set(p.headline, [...(byHeadline.get(p.headline) ?? []), p]);
  }
  const dupes = [...byHeadline.values()].filter((v) => v.length > 1);
  console.error(`  ${key}: публикаций ${posts.length}, повторов ${dupes.length}`);
  for (const group of dupes) {
    const ids = group.map((p) => p.id).sort((a, b) => a - b);
    console.error(`    ✗ ${ids.join(", ")} — ${group[0].preview}`);
    found.push({ key, ids, preview: group[0].preview });
  }
}

if (unchecked.length) {
  console.error(`\n[audit] НЕ ПРОВЕРЕНЫ: ${unchecked.join(", ")} — предпросмотр канала закрыт.`);
  console.error("[audit] по таким каналам дубли видны только глазами или по реестру.");
}

if (!found.length) {
  console.error(`[audit] дублей в проверенных каналах нет`);
  process.exit(unchecked.length ? 2 : 0);
}

// Оставляем ПОСЛЕДНЮЮ копию. У неё больше шансов быть записанной в реестре:
// повторы возникают, когда первая отправка не записалась, и снимать надо
// именно её — иначе реестр будет указывать на удалённое сообщение.
const messages = found.flatMap((f) => f.ids.slice(0, -1).map((id) => `${f.key}:${id}`));

console.error(`\n[audit] дублей: ${messages.length}`);
console.error(`[audit] к снятию: ${messages.join(", ")}`);

if (makeRequest) {
  const path = join(ROOT, "content/state/retract-request.json");
  writeFileSync(
    path,
    `${JSON.stringify(
      {
        $comment: [
          "Заявка собрана scripts/audit-telegram-duplicates.mjs --request по самим",
          "каналам: одинаковые заголовки в последних публикациях. Оставлена",
          "последняя копия — у неё больше шансов быть записанной в реестре.",
        ],
        slugs: [],
        messages,
        reason: "сверка каналов: одинаковые заголовки подряд",
        requestedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
  );
  console.error(`[audit] заявка записана в ${path}`);
}

process.exit(1);
