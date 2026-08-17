#!/usr/bin/env node
// Регрессия на публикацию в Instagram и Facebook.
//
// Цена ошибки здесь та же, что в Telegram, и обе аварии в проекте уже были:
// потерянная запись «уже постили» — дубль у всех подписчиков; слишком
// широкий гейт — публикация недоделанного материала. Проверяем ровно те
// места, где это может повториться.

import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { isPosted, loadPosted, markPosted, markRevoked, summarize } from "../lib/social-posted.mjs";
import { cardPaths, collectPublishable, hashtagsFor, kickerFor } from "../lib/social-queue.mjs";
import { langFromPath, slugFromPath, dateFromPath, articleUrl } from "../lib/article-paths.mjs";

let failed = 0;
const ok = (cond, msg) => {
  console.log((cond ? "  ok   " : "  FAIL ") + msg);
  if (!cond) failed++;
};

const fresh = () => {
  const r = mkdtempSync(join(tmpdir(), "social-"));
  mkdirSync(join(r, "content/state"), { recursive: true });
  return r;
};

const CONFIG = {
  startAt: { ru: "2026-08-01T00:00:00Z", uz: "2026-08-01T00:00:00Z" },
  accounts: {
    ru: { instagramUserIdEnv: "IG_USER_ID_RU", facebookPageIdEnv: "FB_PAGE_ID_RU" },
    uz: { instagramUserIdEnv: "IG_USER_ID_UZ", facebookPageIdEnv: "FB_PAGE_ID_UZ" },
  },
  kicker: { ru: { economy: "Экономика" }, uz: { economy: "Iqtisodiyot" } },
  hashtags: {
    base: { ru: ["#leapnews", "#узбекистан"] },
    byCategory: { ru: { economy: ["#экономика", "#узбекистан"] } },
  },
  cards: { dir: "public/images/social", publicPrefix: "/images/social" },
};

// Статья с картинкой на диске.
function writePost(root, { date, name, title, lang, extra = "" }) {
  const dir = join(root, "content/posts", date);
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(root, "public/images/posts", date.slice(0, 7)), { recursive: true });
  const img = `/images/posts/${date.slice(0, 7)}/${name}.jpg`;
  writeFileSync(join(root, "public", img.slice(1)), "not-a-real-jpeg");
  writeFileSync(
    join(dir, name.endsWith(".uz") ? `${name}.mdx` : `${name}.mdx`),
    `---\ntitle: "${title}"\npublishedAt: "${date}T09:00:00Z"\ncategory: "economy"\nbroadcast: true\nimage:\n  url: "${img}"\n${extra}---\n\nЛид материала — первое предложение.\n`,
  );
  return img;
}

// ── разбор путей ──────────────────────────────────────────────────────
{
  ok(langFromPath("content/posts/2026-08-14/a-b.uz.mdx") === "uz", "язык из суффикса файла");
  ok(langFromPath("content/posts/2026-08-14/a-b.mdx") === "ru", "без суффикса — русский");
  ok(
    slugFromPath("content/posts/2026-08-14/a-b.en.mdx") === "a-b",
    "суффикс языка не попадает в слаг (авария 04.08.2026: ссылки вели на /ru/…/<slug>.en)",
  );
  ok(dateFromPath("content/posts/2026-08-14/a-b.mdx") === "2026-08-14", "дата из каталога");
  ok(
    articleUrl("https://leap.uz/", "2026-08-14", "a-b", "uz") ===
      "https://leap.uz/uz/2026/08/14/a-b",
    "адрес совпадает с роутером сайта",
  );
}

// ── реестр: сети и языки не путаются между собой ──────────────────────
{
  const root = fresh();
  markPosted(root, { network: "instagram", lang: "ru", slug: "s", url: "u", postId: "1" });

  ok(!!isPosted(root, "instagram", "ru", "s"), "отправленное числится отправленным");
  ok(
    !isPosted(root, "facebook", "ru", "s"),
    "Facebook не считается отправленным из-за Instagram — это разные подписчики",
  );
  ok(
    !isPosted(root, "instagram", "uz", "s"),
    "узбекская версия не считается отправленной из-за русской",
  );
  ok(!isPosted(root, "instagram", "ru", "other"), "чужой слаг не задевается");
}

// ── отзыв возвращает материал в работу ────────────────────────────────
{
  const root = fresh();
  markPosted(root, { network: "instagram", lang: "ru", slug: "s", url: "u", postId: "1" });
  markRevoked(root, { network: "instagram", lang: "ru", slug: "s", reason: "удалили руками" });
  ok(!isPosted(root, "instagram", "ru", "s"), "после отзыва материал снова можно публиковать");
  ok(loadPosted(root).get("instagram ru s")?.revokedAt, "отзыв виден в журнале");
  ok(Object.keys(summarize(root)).length === 0, "отозванное не попадает в сводку");
}

// ── журнал переживает склейку merge=union ─────────────────────────────
{
  const root = fresh();
  markPosted(root, { network: "instagram", lang: "ru", slug: "a", url: "u", postId: "1" });
  markPosted(root, { network: "facebook", lang: "uz", slug: "b", url: "u", postId: "2" });
  markPosted(root, { network: "instagram", lang: "ru", slug: "a", url: "u", postId: "1" });
  ok(
    summarize(root)["instagram/ru"] === 1,
    "дубль строки после merge=union схлопывается при сворачивании",
  );
}

// ── гейты очереди ─────────────────────────────────────────────────────
{
  const root = fresh();
  const opts = { siteUrl: "https://leap.uz", now: new Date("2026-08-20T00:00:00Z") };

  writePost(root, { date: "2026-08-10", name: "good", title: "Обычная статья" });
  writePost(root, {
    date: "2026-08-10",
    name: "waiting",
    title: "Ждёт владельца",
    extra: "awaitingEditor: true\n",
  });
  writePost(root, { date: "2026-07-20", name: "old", title: "Старее запуска" });
  writePost(root, { date: "2026-08-25", name: "future", title: "Ещё не вышла" });

  const { items, skipped } = collectPublishable(root, CONFIG, opts);
  const slugs = items.map((i) => i.slug);

  ok(slugs.includes("good"), "нормальная статья проходит");
  ok(
    !slugs.includes("waiting"),
    "awaitingEditor не публикуется (02.08.2026 такой материал ушёл в Telegram)",
  );
  ok(!slugs.includes("old"), "материал старше startAt не публикуется");
  ok(!slugs.includes("future"), "publishedAt в будущем ждёт своего часа");
  ok(skipped.length === 3, "каждый отсев объяснён, а не потерян молча");
}

// ── broadcast: умолчание запрещает ────────────────────────────────────
{
  const root = fresh();
  const dir = join(root, "content/posts/2026-08-10");
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(root, "public/images/posts/2026-08"), { recursive: true });
  writeFileSync(join(root, "public/images/posts/2026-08/x.jpg"), "img");
  writeFileSync(
    join(dir, "no-flag.mdx"),
    `---\ntitle: "Без флага"\npublishedAt: "2026-08-10T09:00:00Z"\nimage:\n  url: "/images/posts/2026-08/x.jpg"\n---\n\nЛид.\n`,
  );
  const { items } = collectPublishable(root, CONFIG, {
    siteUrl: "https://leap.uz",
    now: new Date("2026-08-20T00:00:00Z"),
  });
  ok(
    items.length === 0,
    "нет поля broadcast — не публикуем (умолчание fail-closed, как в Telegram)",
  );
}

// ── картинки нет: ждём bild, в реестр не пишем ────────────────────────
{
  const root = fresh();
  const dir = join(root, "content/posts/2026-08-10");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "no-image.mdx"),
    `---\ntitle: "Без картинки"\npublishedAt: "2026-08-10T09:00:00Z"\nbroadcast: true\ncategory: "economy"\n---\n\nЛид.\n`,
  );
  const { items, skipped } = collectPublishable(root, CONFIG, {
    siteUrl: "https://leap.uz",
    now: new Date("2026-08-20T00:00:00Z"),
  });
  ok(items.length === 0 && /картинк/.test(skipped[0].why), "без картинки не публикуем, а ждём");
}

// ── startAt не заполнен: постинг выключен целиком ─────────────────────
{
  const root = fresh();
  writePost(root, { date: "2026-08-10", name: "good", title: "Статья" });
  const { items } = collectPublishable(
    root,
    { ...CONFIG, startAt: { ru: null, uz: null } },
    { siteUrl: "https://leap.uz", now: new Date("2026-08-20T00:00:00Z") },
  );
  ok(
    items.length === 0,
    "startAt пуст — не публикуем ничего (иначе первый прогон вывалил бы весь архив)",
  );
}

// ── карточки: у каждого языка своя ────────────────────────────────────
{
  const ru = cardPaths("/root", CONFIG, {
    date: "2026-08-14",
    slug: "s",
    lang: "ru",
    siteUrl: "https://leap.uz",
  });
  const uz = cardPaths("/root", CONFIG, {
    date: "2026-08-14",
    slug: "s",
    lang: "uz",
    siteUrl: "https://leap.uz",
  });
  ok(ru.publicUrl !== uz.publicUrl, "русская и узбекская карточки — разные файлы");
  ok(
    ru.publicUrl === "https://leap.uz/images/social/2026-08/s.jpg",
    "адрес карточки собирается из месяца и слага",
  );
  ok(uz.rel.endsWith("s.uz.jpg"), "язык в имени файла карточки");
}

// ── словари вместо генерации ──────────────────────────────────────────
{
  ok(kickerFor(CONFIG, "uz", "economy") === "Iqtisodiyot", "рубрика берётся из словаря");
  ok(kickerFor(CONFIG, "ru", "unknown") === "", "неизвестная рубрика — пустой кикер, не падение");
  const tags = hashtagsFor(CONFIG, "ru", "economy");
  ok(tags.length === new Set(tags).size, "хештеги не дублируются при пересечении наборов");
  ok(hashtagsFor(CONFIG, "en", "economy").length === 0, "языка без словаря — без хештегов");
}

// ── потолок в пять хештегов ───────────────────────────────────────────
{
  const fat = {
    hashtags: {
      maxPerPost: 5,
      base: { ru: ["#a", "#b"] },
      byCategory: { ru: { economy: ["#c", "#d", "#e", "#f", "#g"] } },
    },
  };
  const tags = hashtagsFor(fat, "ru", "economy");
  ok(tags.length === 5, "справочник на семь хештегов режется до пяти (лимит Instagram)");
  ok(
    tags[0] === "#a" && tags[1] === "#b",
    "общие хештеги не вытесняются рубричными при обрезке",
  );
}

// ── боевой справочник уложен в лимит ──────────────────────────────────
{
  const real = JSON.parse(readFileSync(new URL("../config/social.json", import.meta.url), "utf8"));
  const over = [];
  for (const lang of Object.keys(real.hashtags.byCategory)) {
    for (const cat of Object.keys(real.hashtags.byCategory[lang])) {
      const n = hashtagsFor(real, lang, cat).length;
      if (n > (real.hashtags.maxPerPost ?? 5)) over.push(`${lang}/${cat}=${n}`);
    }
  }
  ok(over.length === 0, `config/social.json: ни одна рубрика не превышает лимит ${over.join(", ")}`);
}

console.log(failed ? `\n${failed} проверок упало` : "\nвсе проверки прошли");
process.exit(failed ? 1 : 0);
