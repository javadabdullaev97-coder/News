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
import { execFileSync } from "node:child_process";
import {
  MAIN_TARGET,
  POSTED_LOG,
  SPORT_TARGET,
  TECH_TARGET,
  isPostedNow,
  loadPostedByLangSlug,
  markPosted,
  reservePost,
  releaseReservation,
} from "../lib/telegram-posted.mjs";

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
  TELEGRAM_CHANNEL_SPORT,
  TELEGRAM_CHANNEL_SPORT_UZ,
  TELEGRAM_CHANNEL_TECH,
  TELEGRAM_CHANNEL_TECH_UZ,
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

// Профильные каналы — вторая линия, заведена 17.08.2026 спортом, 17.08.2026
// же расширена технологиями. Материал рубрики уходит в её канал целиком, а в
// основной канал языка — только то, что набрало broadcast:true. Важный сюжет
// попадает в оба канала: странно, если главная новость дня есть в общем
// канале и её нет в профильном (решение владельца 17.08.2026).
//
// Языка без профильного канала постер просто не касается — тот же механизм,
// что и для английского: нет секрета, нет отправки, нет записи в реестр.
//
// Таблица, а не пара if'ов: третья рубрика со своим каналом заводится строкой
// здесь и строкой в config/telegram-scoring.json, без правки маршрутизации.
const PROFILE_TARGETS = [
  {
    target: SPORT_TARGET,
    category: "sport",
    configKey: "sport",
    channelByLang: { ru: TELEGRAM_CHANNEL_SPORT, uz: TELEGRAM_CHANNEL_SPORT_UZ },
  },
  {
    target: TECH_TARGET,
    category: "tech",
    configKey: "tech",
    channelByLang: { ru: TELEGRAM_CHANNEL_TECH, uz: TELEGRAM_CHANNEL_TECH_UZ },
  },
];

const PROFILE_BY_TARGET = new Map(PROFILE_TARGETS.map((p) => [p.target, p]));

// Дата, с которой канал ведётся. Материал, вышедший раньше, в него не уходит.
//
// Нужна ровно в момент подключения нового канала: 05.08.2026 к появлению
// @leap_news_uz в репозитории уже лежали 37 узбекских переводов архива,
// и без отсечки первый же прогон вывалил бы их залпом — подписчик увидел
// бы позавчерашние новости как свежие. Правила — config/telegram-scoring.json.
function channelStartAt(lang, target = MAIN_TARGET) {
  const profile = PROFILE_BY_TARGET.get(target);
  const node = profile
    ? tgConfig.channels?.[profile.configKey]?.[lang]
    : tgConfig.channels?.[lang];
  const v = node?.startAt;
  const t = v ? Date.parse(v) : NaN;
  return Number.isFinite(t) ? t : null;
}

// Профиль материала по рубрике. Категорию ставит SEO-агент, она же решает
// рубрику сайта — одна ошибка в ней уводит материал мимо канала.
function profileOf(fm) {
  const category = String(fm.category ?? "").toLowerCase();
  return PROFILE_TARGETS.find((p) => p.category === category) ?? null;
}

// Повышенный барьер профильной рубрики в ОСНОВНОЙ канал.
//
// ЗАЧЕМ ПРОВЕРКА В КОДЕ, А НЕ ТОЛЬКО В ИНСТРУКЦИИ АГЕНТА. Барьер описан в
// config/telegram-scoring.json и применяется seo-агентом при подсчёте
// tgScore. Замер 17.08.2026 показал, чего стоит держать такое правило на
// одной дисциплине: из 50 технологических статей в основной канал ушли 26 —
// половина, при том что правило «туда только очень важное» действовало с
// самого начала. Причина арифметическая: категория даёт 15 баллов,
// упоминание любого из 180 имён — ещё 15, сумма в тексте — 10, и порог 50
// набирался сам собой на анонсе очередного устройства.
//
// Здесь стоит вторая, механическая проверка того же барьера: балл ниже
// планки — в основной канал не уходит, что бы ни стояло в broadcast.
// В профильный канал материал при этом идёт как обычно: это не отказ от
// публикации, а выбор витрины.
// Узбекская привязка проходит по ОБЫЧНОМУ порогу, а не по повышенному.
// Иначе барьер бьёт ровно по тому, ради чего канал и существует: замер
// 17.08.2026 показал, что планка 70 отсекает «доверенность на авто стала
// самой востребованной услугой my.gov» (65) наравне с раундом
// американского стартапа. Признак ставит seo-агент полем mainChannelGate —
// машина узбекскую привязку в тексте не видит.
function passesProfileBar(fm, profile, rel) {
  if (!profile) return true;
  const bar = tgConfig[`${profile.configKey}ToMainChannelBar`];
  if (!Number.isFinite(bar)) return true;
  const score = Number(fm.tgScore);
  // Балла нет — доверяем решению агента: у старых материалов поля может не
  // быть вовсе, и молча снимать их с рассылки нельзя.
  if (!Number.isFinite(score)) return true;

  const gate = String(fm.mainChannelGate ?? "");
  const localBar = tgConfig.broadcastThreshold ?? 50;
  if (gate === "uzbekImpact" && score >= localBar) return true;
  if (score >= bar) return true;

  console.error(
    `[skip:main] ${rel}: tgScore ${score} ниже барьера ${bar} для рубрики ` +
      `«${profile.category}»${gate ? ` (ворота ${gate})` : " (ворота не проставлены)"}` +
      " — уходит только в профильный канал",
  );
  return false;
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

async function postArticle(mdxPath, fm, channel = TELEGRAM_CHANNEL, target = MAIN_TARGET) {
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
    console.log("TARGET:", target);
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

// ─── Запись о посте становится общей СРАЗУ, а не в конце прогона ───
//
// Реестр — единственная защита от дубля, и работает он только пока запись
// видна другим процессам. До 17.08.2026 её коммитил отдельный шаг воркфлоу
// ПОСЛЕ всего цикла отправки, и это было терпимо, пока цикл длился секунды.
//
// Со вторым каналом цикл вырос до минут: у статьи теперь до четырёх постов
// (ru и uz × основной и профильный), между постами пауза 30 секунд, а очередь
// выпускает по несколько материалов разом. Боевой прогон publish-tick
// 17.08.2026 07:38 держал шаг отправки четырнадцать минут, и всё это время
// шаг «Commit telegram state» стоял в pending.
//
// В это окно попадает editor-queue: у него своя группа concurrency, он читает
// СВОЙ клон репозитория, записи о только что отправленных постах там нет — и
// он отправляет их заново. Так статья про Джоковича ушла в канал дважды.
//
// Поэтому коммитим и пушим после КАЖДОГО поста. Окно уязвимости схлопывается
// с минут до секунд. Цена — push на пост, но между постами и так пауза в 30
// секунд, а content/state/telegram-posted.jsonl не входит ни в один path-фильтр
// воркфлоу, так что лишних запусков это не создаёт.
//
// Ошибку пуша глотаем намеренно: пост уже отправлен, и падать после этого
// значит потерять запись гарантированно вместо «возможно». Файл на диске
// остаётся, шаг воркфлоу в конце прогона доберёт то, что не уехало.
const GIT_IDENTITY = [
  "-c", "user.name=github-actions[bot]",
  "-c", "user.email=41898282+github-actions[bot]@users.noreply.github.com",
];

// Записи, закоммиченные локально, но не доехавшие до main. Проверяется
// в конце прогона: пустой список — единственный признак того, что реестр
// и канал сошлись.
const unpushed = [];

function publishStateRecord(label) {
  // Только в Actions: локальный прогон не должен трогать историю репозитория.
  if (dryRun || process.env.GITHUB_ACTIONS !== "true") return;
  try {
    const dirty = execFileSync("git", ["status", "--porcelain", "--", POSTED_LOG], {
      cwd: ROOT,
      encoding: "utf8",
    }).trim();
    if (!dirty) return;
    execFileSync("git", ["add", "--", POSTED_LOG], { cwd: ROOT, stdio: "pipe" });
    execFileSync(
      "git",
      [...GIT_IDENTITY, "commit", "-m", `state: telegram-posted +${label}`],
      { cwd: ROOT, stdio: "pipe" },
    );
    // Шесть попыток вместо четырёх: этот пуш идёт наперегонки с пачками
    // коммитов планёрки, а цена проигранной гонки — повтор у подписчиков.
    execFileSync("bash", [".github/scripts/git-push-with-rebase.sh"], {
      cwd: ROOT,
      stdio: "pipe",
      env: { ...process.env, GIT_PUSH_ATTEMPTS: "6" },
    });
  } catch (err) {
    // Коммит сделан, пуш не прошёл. САМОЕ ОПАСНОЕ МЕСТО ВО ВСЁМ СКРИПТЕ:
    // запись о посте лежит теперь в локальном коммите, рабочее дерево
    // чистое, и шаг воркфлоу «Commit state changes» скажет «нечего
    // коммитить» и ничего не отправит. Коммит умрёт вместе с раннером,
    // а следующий прогон отправит статью заново.
    //
    // Ровно так 17.08.2026 материал про OpenRouter ушёл в @leap_techno
    // пять раз: прогоны были зелёными, посты уходили, записи оставались
    // в мёртвых коммитах.
    //
    // Поэтому: не глотаем. Помечаем долг и печатаем причину целиком —
    // обрезанные 80 знаков в тот раз скрыли ровно то, что было нужно.
    unpushed.push(label);
    const detail = [err.message, err.stdout?.toString(), err.stderr?.toString()]
      .filter(Boolean)
      .join(" | ")
      .slice(0, 400);
    console.error(`  ⚠ запись «${label}» закоммичена, но не уехала в main: ${detail}`);
  }
}

/**
 * Догоняющий пуш в конце прогона.
 *
 * Проверяет НЕОТПРАВЛЕННЫЕ КОММИТЫ, а не грязное дерево. Разница
 * принципиальная: publishStateRecord коммитит сам, поэтому дерево после
 * него чистое, и проверка «git status» видит пустоту там, где на самом
 * деле висит долг.
 *
 * Не смог отправить — это провал прогона, а не предупреждение. Зелёный
 * прогон, потерявший записи о постах, гарантирует повторную отправку
 * тех же материалов; лучше красный воркфлоу и остановленная лента.
 */
function flushStateCommits() {
  if (dryRun || process.env.GITHUB_ACTIONS !== "true") return true;
  let ahead = "";
  try {
    execFileSync("git", ["fetch", "--quiet", "origin", "main"], { cwd: ROOT, stdio: "pipe" });
    ahead = execFileSync("git", ["log", "--oneline", "origin/main..HEAD"], {
      cwd: ROOT,
      encoding: "utf8",
    }).trim();
  } catch (err) {
    console.error(`[tg] не удалось сверить HEAD с origin/main: ${err.message}`);
  }
  if (!ahead) {
    if (unpushed.length) {
      console.error(`[tg] долг закрыт: записи (${unpushed.length}) уже в main`);
    }
    return true;
  }
  console.error(`[tg] неотправленных коммитов: ${ahead.split("\n").length}, догоняю`);
  try {
    execFileSync("bash", [".github/scripts/git-push-with-rebase.sh"], {
      cwd: ROOT,
      stdio: "inherit",
      env: { ...process.env, GIT_PUSH_ATTEMPTS: "8" },
    });
    console.error("[tg] догоняющий пуш прошёл — записи в main");
    return true;
  } catch {
    console.error(
      `[tg] ✗ ЗАПИСИ О ПОСТАХ НЕ УЕХАЛИ В MAIN. Посты отправлены, реестр их не помнит — ` +
        `следующий прогон отправит те же материалы повторно. Разберись до следующего запуска: ` +
        `${unpushed.join(", ") || ahead.split("\n")[0]}`,
    );
    return false;
  }
}


// ─── Реестр перечитывается из origin/main ПЕРЕД каждой отправкой ───
//
// Дедуп и бронь читают файл из СВОЕГО клона. Пока постящий воркфлоу один,
// этого хватает. Но их три — telegram-autopost, publish-tick и editor-queue, —
// и запуск, начавшийся до чужого пуша, о чужой записи не знает в принципе:
// у него на диске снимок момента checkout.
//
// 17.08.2026 в 14:15 nvidia-3bn-sb-energy-openai-ohio ушла в @leap_techno
// двумя сообщениями подряд (184 и 185), в реестр попало одно. Так же
// сдвоились три соседние статьи в обоих технологических каналах. Общая
// очередь concurrency этого не ловит: она сериализует запуски, но запуск,
// уже стартовавший, продолжает работать со своим клоном.
//
// Поэтому перед каждой отправкой подтягиваем свежий журнал из origin/main
// и сливаем со своим. Журнал append-only, строка = событие, поэтому слияние —
// это объединение множеств строк; порядок и содержимое не страдают.
// Стоимость — один fetch на пост при паузе между постами в 30 секунд.
function refreshRegistryFromOrigin() {
  if (dryRun || process.env.GITHUB_ACTIONS !== "true") return;
  const abs = join(ROOT, POSTED_LOG);
  try {
    execFileSync("git", ["fetch", "--quiet", "origin", "main"], { cwd: ROOT, stdio: "pipe" });
    const remote = execFileSync("git", ["show", `origin/main:${POSTED_LOG}`], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    const local = existsSync(abs) ? readFileSync(abs, "utf8") : "";
    const seen = new Set(local.split("\n").filter(Boolean));
    const extra = remote.split("\n").filter((l) => l && !seen.has(l));
    if (!extra.length) return;
    writeFileSync(abs, (local.endsWith("\n") || !local ? local : local + "\n") + extra.join("\n") + "\n");
    console.error(`[tg] реестр подтянут из origin/main: +${extra.length} записей соседних прогонов`);
  } catch (err) {
    // Нет сети или файла в origin — работаем по своему клону. Хуже, чем
    // со свежим, но не хуже, чем было до этой функции.
    console.error(`  ⚠ реестр не обновился из origin/main (${String(err.message).slice(0, 60)})`);
  }
}

// ─── main ───
const allMdx = collectMdx(POSTS_DIR).sort();
// Дедуп по паре ЯЗЫК + СЛАГ. По одному слагу нельзя: русская и узбекская
// версии — разные каналы и разные подписчики, вторая отправка не дубль.
// А по URL нельзя тем более: смена формата адреса 04.08.2026 обнулила
// URL-дедуп и вылила в канал 36 старых статей волнами.
// Снимок реестра на каждый канал назначения отдельно: одна и та же статья
// может уже лежать в основном канале и ещё не уйти в спортивный.
const posted = {
  [MAIN_TARGET]: loadPostedByLangSlug(ROOT, MAIN_TARGET),
  ...Object.fromEntries(
    PROFILE_TARGETS.map((p) => [p.target, loadPostedByLangSlug(ROOT, p.target)]),
  ),
};
const CHANNELS_BY_TARGET = {
  [MAIN_TARGET]: CHANNEL_BY_LANG,
  ...Object.fromEntries(PROFILE_TARGETS.map((p) => [p.target, p.channelByLang])),
};
const pending = [];
// Что уже поставлено в очередь ЭТИМ прогоном: target + язык + слаг.
const queuedNow = new Set();

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
  // Куда этот материал вообще может уйти.
  //
  // Основной канал — по-прежнему только явный broadcast:true (fail-closed,
  // разбор ниже по тексту).
  //
  // Профильный канал (спорт, технологии) — вся рубрика, закрывшая
  // редакционный цикл. Порог в баллах здесь нулевой (config →
  // sportBroadcastThreshold, techBroadcastThreshold): владелец 17.08.2026 —
  // «туда будем много контента вливать». Но fail-closed остаётся: признаком
  // закрытого цикла считаем НАЛИЧИЕ поля broadcast — любое значение. Его
  // проставляет SEO-агент последним шагом, поэтому материал без поля — это
  // недоделка, ровно та, что 2 и 3 августа уходила в канал по старому
  // умолчанию. broadcast:false у профильной статьи означает «не в основной
  // канал», а не «никуда».
  const broadcast = fm.broadcast === true || fm.broadcast === "true";
  const seoDone = fm.broadcast !== undefined;
  const profile = profileOf(fm);
  const targets = [];
  if (broadcast && passesProfileBar(fm, profile, rel)) targets.push(MAIN_TARGET);
  if (profile && seoDone) targets.push(profile.target);
  if (!targets.length) {
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
  const url = articleUrl(date, slug, lang);
  const publishedTs = Date.parse(fm.publishedAt ?? "");

  for (const target of targets) {
    const channel = CHANNELS_BY_TARGET[target][lang];
    if (!channel && !dryRun) {
      // Языка без канала (английский уходит в Twitter; профильного канала
      // может ещё не быть в секретах) просто не касаемся: ни отправки, ни
      // записи в реестр. Заведут канал — материалы уедут туда с этого места.
      continue;
    }
    if (posted[target].has(`${lang} ${slug}`)) {
      continue; // уже постили в этот канал
    }
    const startAt = channelStartAt(lang, target);
    if (startAt && Number.isFinite(publishedTs) && publishedTs < startAt) {
      // Материал старше канала — молча пропускаем и в реестр не пишем:
      // захотят наполнить канал архивом, сдвинут startAt назад.
      continue;
    }
    // Вторая линия защиты от дубля — внутри одного прогона.
    //
    // Реестр читается снимком на старте, поэтому пара (язык, слаг),
    // попавшая в очередь дважды за один проход, отправится дважды: снимок
    // о первой отправке ещё не знает. Между воркфлоу это лечится общей
    // очередью concurrency (см. .github/workflows), но внутри прогона
    // очередь не помогает, а причина попадания может быть любой — от
    // одинакового слага в двух дневных папках до правки обхода каталога.
    const guard = `${target}\u0000${lang}\u0000${slug}`;
    if (queuedNow.has(guard)) {
      console.error(`[skip] ${rel}: уже в очереди этого прогона (${lang}/${target})`);
      continue;
    }
    queuedNow.add(guard);
    pending.push({ mdxPath, fm, url, rel, lang, channel, target });
  }
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
  const slug = slugFromPath(p.mdxPath);
  // Последняя проверка перед отправкой — по журналу с диска, а не по снимку.
  // Между построением pending и этим моментом прошли паузы между постами и
  // сетевые ретраи; за это время запись мог дописать параллельный прогон.
  refreshRegistryFromOrigin();
  const already = !dryRun && isPostedNow(ROOT, p.lang, slug, p.target);
  if (already) {
    console.error(
      `  ⤼ ${p.rel}: уже в канале ${p.target} (${p.lang}, message ${already.messageId}) — пропуск`,
    );
    continue;
  }
  // Бронь ДО отправки. Разбор — в lib/telegram-posted.mjs: потерянная
  // запись должна означать непосланный пост, а не посланный трижды.
  if (!dryRun) {
    posted[p.target].set(
      `${p.lang} ${slug}`,
      reservePost(ROOT, { url: p.url, target: p.target }),
    );
    publishStateRecord(`бронь ${slug} (${p.lang}/${p.target})`);
  }
  try {
    const result = await postArticle(p.mdxPath, p.fm, p.channel, p.target);
    if (!dryRun) {
      const rec = markPosted(ROOT, {
        url: p.url,
        messageId: result.messageId,
        target: p.target,
      });
      posted[p.target].set(`${p.lang} ${slug}`, rec);
      publishStateRecord(`${slug} (${p.lang}/${p.target})`);
    }
    ok++;
    console.error(`  ✓ ${p.rel} → ${p.lang}/${p.target}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${p.rel}: ${err.message}`);
    if (!dryRun) {
      // Telegram отказал явно — сообщения нет, бронь снимаем, материал
      // уйдёт следующим прогоном. Обрыв связи трактуем в другую сторону:
      // ответ мог не дойти при доставленном сообщении.
      if (/Telegram API error/.test(err.message)) {
        releaseReservation(ROOT, {
          url: p.url,
          target: p.target,
          reason: `send-rejected: ${err.message.slice(0, 80)}`,
        });
        posted[p.target].delete(`${p.lang} ${slug}`);
        publishStateRecord(`снята бронь ${slug} (${p.lang}/${p.target})`);
      } else {
        console.error(
          `  ⚠ бронь оставлена: связь оборвалась, сообщение могло уйти. ` +
            `Проверь канал ${p.target}/${p.lang} и, если поста нет, ` +
            `сними бронь вручную в ${POSTED_LOG}.`,
        );
      }
    }
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

// Реестр обязан догнать канал ДО завершения прогона.
const flushed = flushStateCommits();
if (failed || !flushed) process.exit(1);
