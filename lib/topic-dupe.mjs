// Сверка материала с тем, что уже вышло: один ли это сюжет.
//
// Живёт отдельно от публикатора, потому что нужна дважды:
//   scripts/publish-tick.mjs   — последний рубеж перед выходом;
//   scripts/topic-dupecheck.mjs --draft — сразу после корреспондента,
//                                чтобы дубль не проходил фактчек, редактора,
//                                бильда и переводчика впустую.
//
// 21.08.2026 в очереди стояли 35 материалов, задержанных этой сверкой.
// Каждый из них прошёл ПОЛНУЮ цепочку — около двенадцати минут работы
// агентов и полтораста тысяч токенов — и не выйдет никогда. Проверка стоит
// миллисекунды и не ходит в сеть; место ей — сразу после драфта.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Общая ссылка на первоисточник = то же событие.
//
// 15.08.2026 один удар по югу Ливана вышел тремя статьями за семь часов:
// три планёрки подряд увидели его в инбоксе с разных агентств и завели
// как новую тему. Две ушли в оба Telegram-канала. Сверка тем у нас есть
// (scripts/topic-dupecheck.mjs) и дубль ловит — заголовки совпали на 0,5
// при пороге 0,45, а у двух материалов вообще стояла одна и та же ссылка
// на Al Jazeera, — но у неё в шапке написано «это справка, а не сторож»:
// код возврата всегда 0, решение за оркестратором. Трижды подряд решение
// было «выпускаем».
//
// Совпадение URL первоисточника — не догадка по словам, а доказательство:
// две статьи пересказывают один и тот же материал. Законного случая
// выпустить по нему второй самостоятельный текст в пределах трёх суток
// не существует; развитие сюжета оформляется правкой вышедшего.
const DUPE_WINDOW_DAYS = 3;
const SOURCE_URL = /^\s*url:\s*"(https?:\/\/[^"]+)"/gm;

/** Ссылки на первоисточники → где уже выходили, за окно сверки. */
export function recentSourceUrls(POSTS_DIR) {
  const byUrl = new Map();
  if (!existsSync(POSTS_DIR)) return byUrl;
  const since = new Date(Date.now() - DUPE_WINDOW_DAYS * 86400_000)
    .toISOString()
    .slice(0, 10);
  for (const day of readdirSync(POSTS_DIR)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day < since) continue;
    for (const f of readdirSync(join(POSTS_DIR, day))) {
      // Переводы несут те же ссылки, что и оригинал, — считать их
      // отдельными выходами нельзя.
      if (!f.endsWith(".mdx") || /\.(uz|en)\.mdx$/.test(f)) continue;
      const head = readFileSync(join(POSTS_DIR, day, f), "utf8").split(/\n---/, 1)[0];
      for (const m of head.matchAll(SOURCE_URL)) {
        // Ссылка на самих себя — законная перелинковка, а не первоисточник.
        if (m[1].includes("leap.uz")) continue;
        if (!byUrl.has(m[1])) byUrl.set(m[1], { slug: f.replace(/\.mdx$/, ""), day });
      }
    }
  }
  return byUrl;
}

/**
 * Тот же сюжет под другим адресом.
 *
 * Точного совпадения ссылок не хватает. 17.08.2026 материал про покупку
 * OpenRouter вышел дважды, и первоисточники были такие:
 *
 *   bloomberg.com/news/articles/2026-08-16/stripe-nears-deal-to-buy-ai-firm-openrouter-for-over-7-billion
 *   bloomberg.com/news/videos/2026-08-17/stripe-to-buy-ai-firm-openrouter-in-7-billion-deal-video
 *
 * Один материал издания — заметка и видео. Строки разные, гейт молчал,
 * статья ушла в канал вторым слагом, и подписчик увидел одну новость дважды.
 *
 * СОВПАДЕНИЕ ИЩЕТСЯ ПО ТРЁМ УСЛОВИЯМ СРАЗУ, и каждое отсекает свой класс
 * ложных срабатываний (замер на 122 материалах за 14–18.08):
 *
 *   1. только последний сегмент пути. Без этого «politics/international/
 *      relations» роднило визит Путина на Итуруп с пошлинами Трампа;
 *   2. только редкие слова — те, что встречаются не более чем у трёх
 *      материалов окна. Иначе «press», «news» и «2026» роднят всё подряд;
 *   3. у слагов статей обязано быть общее слово. Это отсекает законный
 *      случай «две статьи про разные законы одного пленарного заседания»:
 *      источник общий, сюжеты разные — и слаги ничего общего не имеют.
 *
 * На тех же 122 материалах правило даёт пять пар, и все пять — настоящие
 * повторы сюжета.
 */
function lastSegmentWords(url) {
  try {
    const u = new URL(url);
    const segs = u.pathname.toLowerCase().split("/").filter(Boolean);
    return {
      host: u.hostname.replace(/^www\./, "").toLowerCase(),
      words: new Set(
        (segs.at(-1) ?? "")
          .split(/[^a-z0-9а-яё]+/i)
          .filter((w) => w.length >= 4 && !/^\d+$/.test(w)),
      ),
    };
  } catch {
    return null;
  }
}

const slugWords = (slug) =>
  new Set(String(slug).split("-").filter((w) => w.length >= 4 && !/^\d/.test(w)));

/**
 * Адрес-справочник: не публикация, а место, куда ходят за данными.
 * Главная страница, языковая главная, датасет, ежедневный курс, документ
 * в PDF/XLSX. Такой адрес цитируют разные сюжеты, и одного совпадения
 * по нему мало.
 */
function isReferenceUrl(url) {
  try {
    const u = new URL(url);
    const segs = u.pathname.split("/").filter(Boolean);
    if (segs.length === 0) return true;
    if (segs.length === 1 && /^(ru|uz|en|oz)$/i.test(segs[0])) return true;
    if (/\.(pdf|xlsx?|csv|json)$/i.test(u.pathname)) return true;
    if (/arkhiv-kursov-valyut|\/json\//i.test(u.pathname)) return true;
    return false;
  } catch {
    return false;
  }
}

/** Есть ли у слагов общее значащее слово. */
function sharesSlugWord(a, b) {
  const wa = new Set(String(a).split("-").filter((w) => w.length >= 4 && !/^\d/.test(w)));
  return String(b)
    .split("-")
    .some((w) => w.length >= 4 && !/^\d/.test(w) && wa.has(w));
}

const RARE_MAX_ARTICLES = 3;
const SHARED_WORDS_FOR_DUPE = 3;

export function duplicateOfPublished(item, POSTS_DIR) {
  const recent = recentSourceUrls(POSTS_DIR);
  const head = item.raw.split(/\n---/, 1)[0];
  const mine = [...head.matchAll(SOURCE_URL)]
    .map((m) => m[1])
    .filter((u) => !u.includes("leap.uz"));

  for (const url of mine) {
    const hit = recent.get(url);
    if (!hit || hit.slug === item.slug) continue;
    // Ссылка-справочник — не доказательство одного сюжета.
    //
    // 21.08.2026 в очереди застряли 35 материалов, и среди оснований были
    // главная страница cbu.uz/ru/ и ежедневный курсовой JSON: их цитируют
    // все денежные заметки подряд. Обзор ЦБ в PDF так же роднил статистику
    // трудовой миграции с переводами из Британии — разные сюжеты, один
    // документ.
    //
    // Для таких адресов совпадения мало: нужно, чтобы у слагов было общее
    // слово. Для обычной публикации (заметка агентства, пост ведомства)
    // правило прежнее и жёсткое — именно оно ловит три статьи об одном
    // ударе по Ливану.
    if (isReferenceUrl(url) && !sharesSlugWord(item.slug, hit.slug)) continue;
    return `тот же первоисточник, что у «${hit.slug}» (${hit.day}): ${url}`;
  }

  // Насколько слово редкое: у скольких материалов окна оно встречается.
  const df = new Map();
  const byArticle = new Map();
  for (const [url, hit] of recent) {
    const fp = lastSegmentWords(url);
    if (!fp) continue;
    byArticle.set(hit.slug, [...(byArticle.get(hit.slug) ?? []), { ...fp, hit }]);
  }
  for (const [, fps] of byArticle) {
    const seen = new Set();
    for (const fp of fps) for (const w of fp.words) seen.add(w);
    for (const w of seen) df.set(w, (df.get(w) ?? 0) + 1);
  }

  const myWords = slugWords(item.slug);
  for (const url of mine) {
    const a = lastSegmentWords(url);
    if (!a) continue;
    for (const [slug, fps] of byArticle) {
      if (slug === item.slug) continue;
      const slugShared = [...myWords].filter((w) => slugWords(slug).has(w));
      if (!slugShared.length) continue;
      for (const b of fps) {
        if (b.host !== a.host) continue;
        const shared = [...a.words].filter(
          (w) => b.words.has(w) && (df.get(w) ?? 0) <= RARE_MAX_ARTICLES,
        );
        if (shared.length >= SHARED_WORDS_FOR_DUPE) {
          return (
            `тот же сюжет, что у «${slug}» (${b.hit.day}): ${a.host}, ` +
            `общее в слагах — ${slugShared.join(", ")}; ` +
            `в адресах — ${shared.slice(0, 6).join(", ")}`
          );
        }
      }
    }
  }
  return null;
}
