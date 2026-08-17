// Что готово к отправке в Instagram и Facebook.
//
// Один список на два потребителя: scripts/render-social-cards.mjs (рисует
// карточки) и scripts/post-to-social.mjs (публикует). Оба обязаны видеть
// ОДИН И ТОТ ЖЕ набор материалов, иначе постер будет ждать карточку, которую
// рендер не собирается делать.
//
// Гейты повторяют телеграмные и по тем же причинам — все они fail-closed,
// то есть при неполных данных материал НЕ уходит:
//
//   awaitingEditor  — ждёт решения владельца. 02.08.2026 такой материал
//                     ушёл в Telegram, потому что проверка стояла только
//                     в сборщике сайта, а постер обходит content/posts сам.
//   broadcast       — «не всё, что на сайте, идёт в рассылку». Отсутствие
//                     поля считается запретом: поле проставляет SEO-агент
//                     в конце цикла, значит его отсутствие означает
//                     недоделанный материал.
//   картинка        — без неё карточку не из чего собрать. Ждём bild,
//                     в реестр не пишем: придёт картинка — материал
//                     подхватится следующим прогоном.
//   startAt         — отсечка архива. Без неё первый прогон вывалил бы
//                     в новый аккаунт сотни статей за август.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import { parseFrontmatter } from "./frontmatter.mjs";
import {
  articleUrl,
  dateFromPath,
  langFromPath,
  monthFromDate,
  slugFromPath,
} from "./article-paths.mjs";

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

/** Абсолютный путь к картинке статьи из frontmatter.image.url. */
export function articleImagePath(root, fm) {
  if (!fm?.image?.url) return null;
  return join(root, "public", String(fm.image.url).replace(/^\/+/, ""));
}

// Отпечатки карточек, которые пишет scripts/render-social-cards.mjs.
// Читаются один раз: у постера они нужны на каждый материал.
let cardStamps = null;
function stampFor(root, rel) {
  if (cardStamps === null) {
    const p = join(root, "content/state/social-cards.json");
    try {
      cardStamps = existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : {};
    } catch {
      cardStamps = {};
    }
  }
  return cardStamps[rel] ?? null;
}

/**
 * Путь и публичный адрес карточки 1080×1350.
 *
 * У каждого языка своя карточка: заголовок на ней — на языке материала.
 * Русская и узбекская версии одного слага не могут делить один файл.
 *
 * АДРЕС НЕСЁТ ОТПЕЧАТОК СОДЕРЖИМОГО (?v=…). Instagram забирает карточку
 * по URL, и имя файла у исправленной карточки то же самое: между правкой
 * и публикацией на границе Cloudflare спокойно лежат старые байты, а по
 * подписи это не видно вовсе — текст верный, картинка прежняя. Отпечаток
 * в запросе делает исправленную карточку другим адресом: ни CDN, ни Meta
 * подсунуть прежнюю копию уже не могут. Для статики Cloudflare запрос
 * ничего не меняет — файл отдаётся тот же.
 */
export function cardPaths(root, config, { date, slug, lang, siteUrl }) {
  const month = monthFromDate(date) ?? "undated";
  const name = lang === "ru" ? `${slug}.jpg` : `${slug}.${lang}.jpg`;
  const rel = `${config.cards.dir}/${month}/${name}`;
  const publicPath = `${config.cards.publicPrefix}/${month}/${name}`;
  const stamp = stampFor(root, rel);
  return {
    abs: join(root, rel),
    rel,
    publicPath,
    publicUrl: `${String(siteUrl).replace(/\/$/, "")}${publicPath}${stamp ? `?v=${stamp}` : ""}`,
  };
}

/**
 * Материалы, которые должны быть в соцсетях.
 *
 * Возвращает { items, skipped }. skipped — не мусор, а объяснение: по нему
 * видно, ждём мы картинку от bild или материал вообще не предназначен
 * к рассылке. Прогон без единого поста — законный исход.
 */
export function collectPublishable(root, config, { siteUrl, now = new Date() } = {}) {
  const postsDir = join(root, "content/posts");
  const items = [];
  const skipped = [];

  for (const mdxPath of collectMdx(postsDir).sort()) {
    const rel = relative(root, mdxPath);
    const raw = readFileSync(mdxPath, "utf8");
    const fm = parseFrontmatter(raw);

    if (!fm.title) {
      skipped.push({ rel, why: "нет заголовка" });
      continue;
    }
    if (fm.awaitingEditor === true || fm.awaitingEditor === "true") {
      skipped.push({ rel, why: "awaitingEditor — ждёт решения владельца" });
      continue;
    }

    const broadcast = fm.broadcast === true || fm.broadcast === "true";
    if (!broadcast) {
      const why = fm.broadcast === undefined ? "поля broadcast нет" : "broadcast:false";
      skipped.push({ rel, why: `${why} — только сайт` });
      continue;
    }

    const lang = langFromPath(mdxPath);
    const account = config.accounts?.[lang];
    if (!account) {
      // Язык без аккаунта (сейчас — английский) не трогаем вовсе: ни
      // отправки, ни записи в реестр. Заведут — поедет отсюда же.
      skipped.push({ rel, why: `аккаунта для языка ${lang} нет` });
      continue;
    }

    const startAtRaw = config.startAt?.[lang] ?? null;
    if (!startAtRaw) {
      skipped.push({
        rel,
        why: `startAt для ${lang} не заполнен — постинг выключен (config/social.json)`,
      });
      continue;
    }
    const startAt = Date.parse(startAtRaw);
    const publishedTs = Date.parse(fm.publishedAt ?? "");
    if (Number.isFinite(startAt) && Number.isFinite(publishedTs) && publishedTs < startAt) {
      skipped.push({ rel, why: "старше даты запуска аккаунта" });
      continue;
    }
    // Материал из будущего в ленту не уходит: очередь публикации ставит
    // publishedAt вперёд, и до этого момента статьи ещё нет на сайте.
    if (Number.isFinite(publishedTs) && publishedTs > now.getTime()) {
      skipped.push({ rel, why: "publishedAt в будущем — ждём своего часа" });
      continue;
    }

    const imageAbs = articleImagePath(root, fm);
    if (!imageAbs || !existsSync(imageAbs)) {
      skipped.push({ rel, why: "нет картинки — ждём bild, без фото не постим" });
      continue;
    }

    const date = dateFromPath(mdxPath);
    const slug = slugFromPath(mdxPath);
    const card = cardPaths(root, config, { date, slug, lang, siteUrl });

    items.push({
      mdxPath,
      rel,
      raw,
      fm,
      lang,
      slug,
      date,
      account,
      imageAbs,
      card,
      url: articleUrl(siteUrl, date, slug, lang),
      category: fm.category ?? null,
    });
  }

  return { items, skipped };
}

/** Надпись-рубрика для карточки. Словарь, не генерация. */
export function kickerFor(config, lang, category) {
  return config.kicker?.[lang]?.[category] ?? "";
}

/** Тег редакции → хештег: строчные, без пробелов, знаков и апострофов. */
export function tagToHashtag(tag) {
  const s = String(tag)
    .toLowerCase()
    .replace(/[ʻʼ‘’'`]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");
  return s ? `#${s}` : null;
}

/**
 * Есть ли в материале узбекская привязка.
 *
 * Нужна, чтобы #узбекистан и #ташкент не ставились подряд всему. Раньше
 * они шли из справочника по рубрике, и материал про португальца
 * в саудовском клубе выходил с «#узбекистан #новостиузбекистана»,
 * а реконструкция аэропорта Ургенча — с «#ташкент», хотя Хорезм от
 * столицы в девятистах километрах.
 */
function geoSignals(config, fm, lang) {
  const hay = [fm?.title, fm?.description, ...(Array.isArray(fm?.tags) ? fm.tags : [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/[ʻʼ‘’'`]/g, "");
  const has = (list) => (list ?? []).some((m) => hay.includes(String(m).toLowerCase()));
  const geo = config.hashtags?.geo?.[lang] ?? {};
  return {
    country: has(geo.countryMarkers) ? geo.country ?? null : null,
    capital: has(geo.capitalMarkers) ? geo.capital ?? null : null,
  };
}

/**
 * Хештеги поста: пять слотов, заполненных темой самого материала.
 *
 * ПОТОЛОК — hashtags.maxPerPost (пять). Instagram больше не принимает,
 * владелец наткнулся на это 17.08.2026 при ручной публикации. Режем здесь,
 * а не полагаемся на аккуратность справочника: добавленный через полгода
 * шестой хештег иначе сломал бы публикацию молча.
 *
 * ОТКУДА БЕРУТСЯ. До 17.08.2026 — целиком из справочника по рубрике,
 * и пять слотов уходили на одни и те же слова: все экономические посты
 * получали «#leapnews #узбекистан #экономика #новостиузбекистана #ташкент»
 * независимо от того, о чём материал. Теги статьи при этом лежали
 * во frontmatter готовыми — их проставляет seo, они уже выверены
 * по словарю репозитория, и они про тему, а не про рубрику.
 *
 * Порядок слотов: марка издания, рубрика, до двух тем из статьи, гео —
 * и только если привязка настоящая. Не набралось тем — слот добирается
 * из справочника, чтобы пост не остался с двумя хештегами.
 */
export function hashtagsFor(config, lang, category, fm = null) {
  const max = config.hashtags?.maxPerPost ?? 5;
  const base = config.hashtags?.base?.[lang] ?? [];
  const byCat = config.hashtags?.byCategory?.[lang]?.[category] ?? [];
  const stop = new Set((config.hashtags?.stopList?.[lang] ?? []).map((s) => s.toLowerCase()));

  // Без frontmatter (старые вызовы, регрессии на голом конфиге) — прежнее
  // поведение: справочник как есть.
  if (!fm) return [...new Set([...base, ...byCat])].slice(0, max);

  const brand = base[0] ? [base[0]] : [];
  const rubric = byCat[0] ? [byCat[0]] : [];

  const topical = [];
  for (const tag of Array.isArray(fm.tags) ? fm.tags : []) {
    if (stop.has(String(tag).toLowerCase())) continue;
    const h = tagToHashtag(tag);
    if (!h || h.length < 4 || h.length > 31) continue;
    topical.push(h);
  }

  const { country, capital } = geoSignals(config, fm, lang);
  const geo = [capital, country].filter(Boolean);

  const picked = [];
  const add = (list, n) => {
    for (const h of list) {
      if (picked.length >= max || n <= 0) break;
      if (picked.includes(h)) continue;
      picked.push(h);
      n--;
    }
  };
  add(brand, 1);
  add(rubric, 1);
  add(topical, 2);
  add(geo, 1);
  // Слоты, оставшиеся пустыми: сначала прочие темы статьи, потом справочник.
  add(topical, max);
  add([...base, ...byCat], max);
  return picked.slice(0, max);
}
