#!/usr/bin/env node
// Постит новые статьи в Telegram-канал @leap_uz после мержа PR в main.
// Запускается GitHub Action-ом при push в main; определяет какие .mdx в
// content/posts/ появились по сравнению с прошлым коммитом, форматирует
// каждую как ТГ-пост и отправляет через Bot API.
//
// Дедупит через content/state/telegram-posted.jsonl (URL статьи → message_id).
//
// ENV:
//   TELEGRAM_BOT_TOKEN — токен бота (secret)
//   TELEGRAM_CHANNEL   — @leap_uz или -1001234567890
//   SITE_URL           — https://leap.uz
//   DRY_RUN            — 1 чтобы только вывести что запостил бы, но не постить

import {
  existsSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadPostedByLangSlug, markPosted } from "../lib/telegram-posted.mjs";

import {
  parseFrontmatter,
  extractLede,
  decodeEntities,
  escapeHTML,
} from "../lib/frontmatter.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(HERE);
const POSTS_DIR = join(ROOT, "content/posts");
const tgConfig = JSON.parse(readFileSync(join(ROOT, "config/telegram-scoring.json"), "utf8"));


const {
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHANNEL,
  TELEGRAM_CHANNEL_UZ,
  SITE_URL = "https://leap.uz",
  DRY_RUN,
} = process.env;

// Канал на каждый язык. Русский — основной, узбекский — @leap_news_uz
// (заведён владельцем 05.08.2026). Английский пойдёт в Twitter, своего
// TG-канала у него нет — материалы на языке без канала просто не постятся
// и в реестр не попадают, так что появятся в нём же, когда канал заведут.
const CHANNEL_BY_LANG = {
  ru: TELEGRAM_CHANNEL,
  uz: TELEGRAM_CHANNEL_UZ,
};

// Дата, с которой канал ведётся. Материал, вышедший раньше, в него не уходит.
//
// Нужна ровно в момент подключения нового канала: 05.08.2026 к появлению
// @leap_news_uz в репозитории уже лежали 37 узбекских переводов архива,
// и без отсечки первый же прогон вывалил бы их залпом — подписчик увидел
// бы позавчерашние новости как свежие. Правила — config/telegram-scoring.json.
function channelStartAt(lang) {
  const v = tgConfig.channels?.[lang]?.startAt;
  const t = v ? Date.parse(v) : NaN;
  return Number.isFinite(t) ? t : null;
}

const dryRun = DRY_RUN === "1" || DRY_RUN === "true";

if (!dryRun && (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHANNEL)) {
  console.error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL. Set DRY_RUN=1 to test without.");
  process.exit(1);
}

// Найти все .mdx во всех днях, включая языковые версии.
//
// Переводы лежат рядом с оригиналом (<slug>.uz.mdx, <slug>.en.mdx), и без
// этой отсечки постер считал их отдельными материалами: 04.08.2026 в русский
// канал ушли 28 постов на узбекском и английском, причём со ссылками вида
// /ru/2026/08/04/<slug>.en — то есть ещё и мёртвыми, потому что суффикс
// языка попадал в слаг.
//
// Каждая версия уходит в канал СВОЕГО языка (CHANNEL_BY_LANG), а не все
// подряд в русский.
function collectMdx(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectMdx(p));
    else if (entry.isFile() && entry.name.endsWith(".mdx")) out.push(p);
  }
  return out;
}

// Язык версии — из суффикса имени файла: <slug>.uz.mdx → uz, <slug>.mdx → ru.
const TRANSLATED_LANGS = new Set(["uz", "en"]);

function langFromPath(p) {
  const m = p.replace(/\.mdx$/, "").split("/").pop().match(/^.+\.([a-z]{2})$/);
  return m && TRANSLATED_LANGS.has(m[1]) ? m[1] : "ru";
}

// parseFrontmatter, extractLede, decodeEntities, escapeHTML — из lib/frontmatter.mjs.
// Единый парсер на базе `yaml` npm-пакета, полное соответствие YAML 1.2.
// До этого здесь жил самодельный regex-парсер с частичной поддержкой
// массивов объектов (sources) и без числовых entity — теперь всё в одном месте.

// Слаг из пути: content/posts/2026-07-31/cb-rate-hike-15pct.mdx → cb-rate-hike-15pct
function slugFromPath(p) {
  const base = p.replace(/\.mdx$/, "").split("/").pop();
  const m = base.match(/^(.+)\.([a-z]{2})$/);
  // Суффикс языка — не часть слага. Пока это не учитывалось, ссылки
  // в постах переводов вели на /ru/…/<slug>.en, то есть в никуда.
  return m && TRANSLATED_LANGS.has(m[2]) ? m[1] : base;
}

// Дата из пути: content/posts/2026-07-31/... → 2026-07-31
function dateFromPath(p) {
  const m = p.match(/content\/posts\/(\d{4}-\d{2}-\d{2})\//);
  return m ? m[1] : null;
}

// Публичный URL статьи. Обязан совпадать с роутером Next.js и с
// articleHref() из lib/data.ts: /<язык>/ГГГГ/ММ/ДД/<slug>.
//
// Дата берётся из каталога content/posts/ГГГГ-ММ-ДД/ — того самого, по
// которому строится маршрут. Если её вдруг нет (файл лежит не в дневной
// папке), падаем на старый адрес: он остаётся рабочим через
// страницу-перенаправление, так что ссылка в канале в любом случае живая.
const DEFAULT_LANG = "ru";

function articleUrl(date, slug, lang = DEFAULT_LANG) {
  const base = SITE_URL.replace(/\/$/, "");
  if (!date) return `${base}/article/${slug}`;
  return `${base}/${lang}/${date.replace(/-/g, "/")}/${slug}`;
}


// ─── Оформление поста ───
//
// Без эмодзи и без хештегов — решение редакции. Пост состоит из заголовка,
// лида и футера со ссылкой. Всё.
//
// ЧТО УБРАНО И ПОЧЕМУ (правка по прямому указанию владельца, 02.08.2026,
// повторному — первое указание было потеряно, поэтому фиксируется здесь,
// в коде, а не только в переписке. НЕ ВОЗВРАЩАТЬ без нового указания):
//
//   1. Кикер «РУБРИКА · дата» («ЭКОНОМИКА · 2 августа»). Занимал первую,
//      самую заметную строку и вытеснял заголовок вниз. Рубрика у нас есть
//      на сайте, дата видна по времени поста в самом Telegram.
//   2. Строка «Источник: …». Задумывалась как брендовый актив «факты из
//      первых рук», но в ленте читалась как служебная сноска и съедала
//      место перед ссылкой. Первоисточник остаётся в статье — со ссылкой,
//      которую можно проверить, а не названием без адреса.
//

// Плашка «СРОЧНО» снята 03.08.2026 по прямому указанию владельца:
// «мне не нужно чтобы была плашка СРОЧНО в новостях просто публикуем
// как обычно». Все статьи выходят в TG в одном формате: заголовок,
// лид, футер. Никаких визуальных отличий по urgency.
//
// frontmatter.urgency продолжаем принимать, но игнорируем на выходе —
// пусть остаётся во внутренней логике планёрки (SLA, quiet hours),
// но читатель канала о нём не знает.
//
// frontmatter.tags не выводим — он нужен сайту для рубрикации и поиска.

// CATEGORY_KICKER, MONTHS_GEN, humanDate и primarySourceName удалены вместе
// с кикером и строкой источника — они больше ничего не обслуживали. Если
// правку когда-нибудь откатывают, восстанавливать нужно и их.

// Подпись-ссылка на языке канала. Русский текст в узбекском канале
// владелец забраковал 05.08.2026: пост целиком на узбекском, а последняя
// строка — по-русски. Стрелка вместо слов «на leap.uz» короче и одинаково
// читается на всех трёх языках.
const READ_MORE = {
  ru: "Читать полностью leap.uz →",
  uz: "Batafsil leap.uz →",
  en: "Read in full leap.uz →",
};

function buildMessage(fm, lede, url, { ledeLimit = 600, lang = "ru" } = {}) {
  const title = escapeHTML(decodeEntities(fm.title || ""));

  const parts = [];

  // Заголовок первой строкой. Никаких плашек перед ним.
  parts.push(`<b>${title}</b>`);

  // Лид
  const plainLede = decodeEntities(lede);
  const shortLede =
    plainLede.length > ledeLimit
      ? plainLede.slice(0, ledeLimit - 1).replace(/\s+\S*$/, "") + "…"
      : plainLede;
  parts.push(escapeHTML(shortLede));

  // Футер
  parts.push(`<a href="${url}">${READ_MORE[lang] ?? READ_MORE.ru}</a>`);

  return parts.join("\n\n");
}

// Telegram режет caption на 1024 символах. Раньше при переполнении код молча
// откатывался на sendMessage — картинка терялась целиком. Вместо этого
// подрезаем лид, пока подпись не влезет: заголовок и первоисточник важнее
// последних двух предложений лида.
const CAPTION_LIMIT = 1024;

function buildCaption(fm, lede, url, lang = "ru") {
  for (const limit of [600, 450, 320, 220, 140]) {
    const text = buildMessage(fm, lede, url, { ledeLimit: limit, lang });
    if (text.length <= CAPTION_LIMIT) return text;
  }
  return null; // даже без лида не влезло — уходим на sendMessage
}

// ─── Беззвучная доставка ночью ───
//
// Планёрки работают круглосуточно, поэтому пост в канал мог прийти в четыре
// утра и разбудить подписчиков ради материала, который спокойно ждёт до
// завтрака. Отписка стоит дороже нескольких часов без звука.
//
// Это НЕ тихие часы публикации: материал выходит как обычно — и на сайт,
// и в канал, — у сообщения снимается только звук и вибрация. Тихих часов
// публикации в системе нет и не планируется, разбор в
// docs/routine-prompts/planyorka-rationale.md.
//
// Ташкент — UTC+5 круглый год, перевода часов нет, поэтому смещение
// константа, а не расчёт по таймзоне.
const TASHKENT_UTC_OFFSET = 5;

function silentNow(now = new Date()) {
  const cfg = tgConfig.silentHoursTashkent;
  if (!cfg || typeof cfg.from !== "number" || typeof cfg.to !== "number") return false;
  const hour = (now.getUTCHours() + TASHKENT_UTC_OFFSET) % 24;
  // Окно может пересекать полночь (например 22→7), поэтому две ветки.
  return cfg.from <= cfg.to
    ? hour >= cfg.from && hour < cfg.to
    : hour >= cfg.from || hour < cfg.to;
}

async function tgApi(method, body) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram API error: ${data.description} (${data.error_code})`);
  return data.result;
}

async function postArticle(mdxPath, fm, channel = TELEGRAM_CHANNEL) {
  const date = dateFromPath(mdxPath);
  const slug = slugFromPath(mdxPath);
  const lang = langFromPath(mdxPath);
  const url = articleUrl(date, slug, lang);
  const raw = readFileSync(mdxPath, "utf8");
  const lede = extractLede(raw);
  const text = buildMessage(fm, lede, url, { lang });
  const imageAbs = fm.image?.url
    ? join(ROOT, "public", fm.image.url.replace(/^\/+/, ""))
    : null;
  const hasImage = imageAbs && existsSync(imageAbs);
  const silent = silentNow();

  if (dryRun) {
    console.log("=".repeat(60));
    console.log("SLUG:", slug);
    console.log("LANG:", lang, "→ канал", channel || "(не заведён — не постим)");
    console.log("URL:", url);
    console.log("IMAGE:", hasImage ? fm.image.url : "(none)");
    console.log("SILENT:", silent ? "да — ночь в Ташкенте, без звука" : "нет");
    console.log("MESSAGE:");
    console.log(text);
    return { messageId: null, url, dryRun: true };
  }

  if (hasImage) {
    // Подпись подрезаем под лимит 1024, а не откатываемся на текстовое
    // сообщение: картинка в ленте стоит дороже двух последних предложений лида.
    const caption = buildCaption(fm, lede, url, lang);
    if (caption) {
      const buf = readFileSync(imageAbs);
      const form = new FormData();
      form.append("chat_id", channel);
      form.append("photo", new Blob([buf]), `${slug}.jpg`);
      form.append("caption", caption);
      form.append("parse_mode", "HTML");
      if (silent) form.append("disable_notification", "true");
      const res = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`,
        { method: "POST", body: form },
      );
      const data = await res.json();
      if (!data.ok) throw new Error(`sendPhoto: ${data.description}`);
      return { messageId: data.result.message_id, url };
    }
  }

  // Fallback: обычное сообщение с превью URL (Telegram сам подтянет og:image)
  const msg = await tgApi("sendMessage", {
    chat_id: channel,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: false,
    disable_notification: silent,
  });
  return { messageId: msg.message_id, url };
}

// ─── main ───
const allMdx = collectMdx(POSTS_DIR).sort();
// Дедуп по паре ЯЗЫК + СЛАГ. По одному слагу нельзя: русская и узбекская
// версии — разные каналы и разные подписчики, вторая отправка не дубль.
// А по URL нельзя тем более: смена формата адреса 04.08.2026 обнулила
// URL-дедуп и вылила в канал 36 старых статей волнами.
const posted = loadPostedByLangSlug(ROOT);
const pending = [];

for (const mdxPath of allMdx) {
  const rel = relative(ROOT, mdxPath);
  const raw = readFileSync(mdxPath, "utf8");
  const fm = parseFrontmatter(raw);
  if (!fm.title) {
    console.error(`[skip] no title in ${rel}`);
    continue;
  }
  // Материал ждёт решения владельца — в канал не уходит НИ ПРИ КАКИХ УСЛОВИЯХ.
  //
  // Раньше этой проверки здесь не было, и блокировка держалась только на
  // build-posts.mjs, который исключает такие статьи из lib/generated-posts.ts.
  // Но постер собирает материалы обходом content/posts/ напрямую, минуя
  // generated-posts.ts, — то есть про блокировку он не знал вовсе. При пустом
  // image.url он просто откатывался на sendMessage и публиковал материал
  // текстом. Так 2 августа в канал ушла заблокированная статья о постановлении
  // № 425 — без картинки и до ответа владельца.
  //
  // Обещание спецификации «не может появиться ни на сайте, ни в Telegram»
  // выполнял только сайт. Теперь выполняют оба.
  if (fm.awaitingEditor === true || fm.awaitingEditor === "true") {
    console.error(`[skip] ${rel}: awaitingEditor — ждёт решения владельца`);
    continue;
  }

  // Не всё что на сайте — в TG. SEO-агент вычисляет tgScore и ставит broadcast.
  //
  // Раньше отсутствующее поле считалось за broadcast:true («legacy default»),
  // чтобы старые статьи без флага не потерялись. Это умолчание дважды отправило
  // в канал материал, который туда не собирался:
  //   2 августа — постановление № 425 о школах, ждало ответа владельца;
  //   3 августа — черновик об Олмазоре, попал в main до конца редакционного цикла.
  // В обоих случаях поля broadcast во frontmatter просто ещё не было: его
  // проставляет SEO-агент в конце цикла, а материал оказывался в content/posts
  // раньше. То есть умолчание срабатывало ровно на недоделанных материалах —
  // на тех, которые рассылать нельзя.
  //
  // Теперь умолчание fail-closed: рассылаем только по явному broadcast:true.
  // Потерять уже опубликованное это не может — вышедшие статьи записаны
  // в content/state/telegram-posted.jsonl и повторно не отправляются, а новые
  // получают флаг от SEO-агента. Цена ошибки несимметрична: не отправить
  // вовремя — досадно, отправить непроверенное — уже случилось дважды.
  const broadcast = fm.broadcast === true || fm.broadcast === "true";
  if (!broadcast) {
    const why = fm.broadcast === undefined ? "поля broadcast нет" : "broadcast:false";
    console.error(`[skip] ${rel}: ${why} (tgScore ${fm.tgScore ?? "?"}) — только сайт`);
    continue;
  }

  // Картинка обязательна для broadcast — та же логика fail-closed, что и
  // для поля broadcast выше. Раньше её отсутствие молча откатывало пост на
  // sendMessage (текст + превью по og:image), и материал сразу же попадал
  // в реестре отправленных — то есть терял картинку навсегда: bild мог
  // прислать её следующим коммитом минуту спустя, но постер это уже не видел,
  // а повторной отправки дедуп не допускает. Так в канал ушли без фото
  // «Жара и пожары в Европе и США» и «Узбекнефтегаз H1 2026» 3 августа —
  // оба на момент прогона имели image.url пустым, картинка появилась в
  // материале позже отдельным коммитом. Теперь ждём: не постим и не
  // отмечаем как отправленное, следующий push (коммит bild с картинкой)
  // подхватит статью автоматически.
  const imageAbs = fm.image?.url
    ? join(ROOT, "public", fm.image.url.replace(/^\/+/, ""))
    : null;
  if (!imageAbs || !existsSync(imageAbs)) {
    console.error(`[skip] ${rel}: broadcast:true, но нет картинки — ждём bild, не постим без фото`);
    continue;
  }

  const date = dateFromPath(mdxPath);
  const slug = slugFromPath(mdxPath);
  const lang = langFromPath(mdxPath);
  const channel = CHANNEL_BY_LANG[lang];
  if (!channel && !dryRun) {
    // Языка без канала (сейчас — английский, он уйдёт в Twitter) просто
    // не касаемся: ни отправки, ни записи в реестр. Заведут канал —
    // материалы уедут туда с этого же места.
    continue;
  }
  const url = articleUrl(date, slug, lang);
  if (posted.has(`${lang} ${slug}`)) {
    continue; // уже постили в канал ЭТОГО языка
  }
  const startAt = channelStartAt(lang);
  const publishedTs = Date.parse(fm.publishedAt ?? "");
  if (startAt && Number.isFinite(publishedTs) && publishedTs < startAt) {
    // Материал старше канала — молча пропускаем и в реестр не пишем:
    // захотят наполнить канал архивом, сдвинут startAt назад.
    continue;
  }
  pending.push({ mdxPath, fm, url, rel, lang, channel });
}

console.error(`[tg] ${pending.length} new post(s) to publish`);

// Интервал между постами ВНУТРИ одного прогона.
//
// Был 15 минут — тогда это была единственная защита от залпа: планёрка
// публиковала пачкой, и без паузы десять постов улетали в канал подряд.
//
// Теперь ритм держит очередь публикации (lib/publish-queue.mjs): она разносит
// материалы по окну до следующей планёрки, и в один прогон автопоста
// приходит, как правило, ровно один материал. Пятнадцатиминутная пауза стала
// не просто лишней, а вредной: когда очередь всё же выпускает двоих разом
// (ЧП плюс просроченный), прогон висел бы полчаса, держал группу concurrency
// и стоил бы тридцать оплаченных минут Actions вместо одной.
//
// Осталась короткая пауза — только чтобы не упереться в лимиты Bot API.
const MIN_GAP_MS = 30 * 1000;

let ok = 0;
let failed = 0;
for (let i = 0; i < pending.length; i++) {
  const p = pending[i];
  try {
    const result = await postArticle(p.mdxPath, p.fm, p.channel);
    if (!dryRun) {
      const rec = markPosted(ROOT, { url: p.url, messageId: result.messageId });
      posted.set(`${p.lang} ${slugFromPath(p.mdxPath)}`, rec);
    }
    ok++;
    console.error(`  ✓ ${p.rel} → ${p.lang}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${p.rel}: ${err.message}`);
  }
  // Между постами MIN_GAP_MS. Между запусками воркфлоу этот sleep не сохраняется —
  // защита от залпов работает только внутри одного прогона post-to-telegram.mjs.
  // Реальная защита от «5 постов за секунду» — в том, что теперь публикация из
  // main идёт по одной статье за коммит, и триггер telegram-autopost срабатывает
  // на каждый push отдельно (см. .github/workflows/telegram-autopost.yml).
  if (i < pending.length - 1 && !dryRun) {
    console.error(`[tg] жду ${MIN_GAP_MS / 1000} с до следующего поста`);
    await new Promise((r) => setTimeout(r, MIN_GAP_MS));
  }
}

console.error(`[tg] posted ${ok}, failed ${failed}`);
if (failed) process.exit(1);
