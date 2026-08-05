#!/usr/bin/env node
// Фаза 5: что на самом деле собирает просмотры.
//
// Связываем пост канала со статьёй (как в Фазе 3), берём у статьи рубрику и
// признаки, у поста — просмотры, и смотрим, какие темы читают, а какие нет.
// Это прямая проверка весов byCategory из config/telegram-scoring.json:
// у нас там политика и экономика стоят 25, спорт и культура 5, и эти числа
// назначены умозрительно, без данных.
//
// Считаем медиану, а не среднее: у просмотров тяжёлый правый хвост — один
// вирусный пост поднимает среднее по рубрике вдвое и создаёт видимость,
// которой нет. И нормируем на подписчиков канала, иначе рубрики Kun с его
// миллионом подписчиков несравнимы с рубриками Spot.
//
// Рубрика есть только у Kun, Daryo, Repost и Qalampir. Gazeta и Spot её не
// размечают вовсе, поэтому в разрез по темам не попадают.
//
// CLI: node research/analyze-features.mjs
// Выход: research/data/features.json

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CHANNELS } from "./lib/channels.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = join(HERE, "raw");
const DATA_DIR = join(HERE, "data");

const MIN_SAMPLE = 8;

function readJsonl(path) {
  if (!existsSync(path)) return null;
  const body = readFileSync(path, "utf8").trim();
  if (!body) return [];
  return body.split("\n").filter(Boolean).map((l) => JSON.parse(l));
}

const canonUrl = (url) =>
  (url ?? "")
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "")
    .toLowerCase();

const normTitle = (t) =>
  (t ?? "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

const median = (nums) => {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  const raw = s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  return Math.round(raw);
};

const kunMap = existsSync(join(RAW_DIR, "kun-link-map.json"))
  ? JSON.parse(readFileSync(join(RAW_DIR, "kun-link-map.json"), "utf8"))
  : {};

function keyFromLink(outlet, link) {
  if (outlet === "kun") {
    const t = kunMap[link] ?? kunMap[link.replace(/\/$/, "")] ?? null;
    const full = t
      ? canonUrl(t.startsWith("http") ? t : `kun.uz${t}`)
      : /kun\.uz\/.*\/news\//.test(link)
        ? canonUrl(link)
        : null;
    return full ? full.replace(/^kun\.uz\/kr\//, "kun.uz/") : null;
  }
  if (outlet === "repost") return link.includes("repost.uz/") ? canonUrl(link) : null;
  return null;
}

// Главное открытие этого разреза: рубрики у конкурентов географические, а не
// тематические. Крупнейшие — «O‘zbekiston», «Узбекистан», «Uzbekistan» (около
// двух тысяч материалов) и «Jahon», «Dunyo», «Мир». Тематических рубрик у них
// либо нет вовсе, либо они второстепенны.
//
// Наш telegram-scoring.json устроен наоборот: веса раздаются темам (политика
// 25, экономика 25, спорт 5). Свести одно к другому напрямую нельзя, поэтому
// разрез строится по их таксономии, а сравнение с нашими весами делается
// только там, где рубрика действительно тематическая.
const CATEGORY = [
  [/o.?zbekiston|узбекистан|uzbekistan|ташкент|toshkent/i, "внутренние"],
  [/jahon|dunyo|мир|xalqaro|международ|central asia|afg/i, "мировые"],
  [/sport|спорт|futbol|футбол/i, "спорт"],
  [/jamiyat|society|общество|ijtimoiy|социал/i, "общество"],
  [/politics|siyosat|политик/i, "политика"],
  [/business|biznes|iqtisod|эконом|деньги|moliya|финанс/i, "экономика"],
  [/madaniyat|культур|san.at/i, "культура"],
  [/layfstayl|лайфстайл|lifestyle/i, "лайфстайл"],
  [/texnolog|техно|raqamli|цифров/i, "технологии"],
  [/avto|авто/i, "авто"],
  [/ta.?lim|образован/i, "образование"],
];

// Соответствие нашим весам там, где оно осмысленно.
const OUR_EQUIVALENT = {
  мировые: "world",
  спорт: "sport",
  общество: "society",
  политика: "politics",
  экономика: "economy",
  культура: "culture",
  технологии: "tech",
};

function toCategory(section) {
  if (!section) return null;
  for (const [re, name] of CATEGORY) if (re.test(section)) return name;
  return "прочее";
}

// Наши веса — для сравнения.
const OUR_WEIGHTS = {
  politics: 25, economy: 25, world: 25, tech: 15,
  business: 15, society: 10, culture: 5, sport: 5,
};

const report = { generatedAt: new Date().toISOString(), byCategory: {}, byOutlet: [] };
const pooled = new Map();

for (const outlet of ["kun", "daryo", "repost"]) {
  const articles = readJsonl(join(RAW_DIR, `articles-${outlet}.jsonl`)) ?? [];
  if (!articles.length) continue;

  const byKey = new Map();
  const byTitle = new Map();
  for (const a of articles) {
    if (a.section) {
      byKey.set(canonUrl(a.url), a);
      if (a.title) byTitle.set(normTitle(a.title), a);
    }
  }

  const channels = CHANNELS.filter((c) => c.outlet === outlet);
  const rowsForOutlet = [];

  for (const channel of channels) {
    const posts = readJsonl(join(RAW_DIR, `telegram-${channel.id}.jsonl`)) ?? [];
    for (const post of posts) {
      if (post.views == null) continue;
      let article = null;
      if (outlet === "daryo") {
        article = byTitle.get(normTitle((post.text ?? "").split("\n")[0])) ?? null;
      } else {
        for (const link of post.links ?? []) {
          const key = keyFromLink(outlet, link);
          if (key && byKey.has(key)) {
            article = byKey.get(key);
            break;
          }
        }
      }
      if (!article) continue;
      const category = toCategory(article.section);
      if (!category || category === "прочее") continue;
      // Нормируем на подписчиков: рубрики канала с миллионом подписчиков и
      // канала с десятью тысячами иначе несравнимы.
      const share = channel.subscribers ? (post.views / channel.subscribers) * 100 : null;
      if (share == null) continue;
      rowsForOutlet.push({ category, share, views: post.views, channel: channel.id });
      if (!pooled.has(category)) pooled.set(category, []);
      pooled.get(category).push(share);
    }
  }

  if (!rowsForOutlet.length) continue;
  const perCat = new Map();
  for (const r of rowsForOutlet) {
    if (!perCat.has(r.category)) perCat.set(r.category, []);
    perCat.get(r.category).push(r.share);
  }
  report.byOutlet.push({
    outlet,
    matched: rowsForOutlet.length,
    categories: [...perCat.entries()].map(([category, list]) => ({
      category,
      n: list.length,
      medianER: median(list.map((v) => v * 10)) / 10,
    })),
  });
}

console.log("МЕДИАННЫЕ ПРОСМОТРЫ ПО РУБРИКАМ, % от подписчиков канала\n");
console.log("категория   постов  медиана ER  наш вес  вывод");

const table = [...pooled.entries()]
  .filter(([, list]) => list.length >= MIN_SAMPLE)
  .map(([category, list]) => ({
    category,
    n: list.length,
    medianER: median(list.map((v) => v * 10)) / 10,
    ourWeight: OUR_WEIGHTS[OUR_EQUIVALENT[category]] ?? null,
  }))
  .sort((a, b) => b.medianER - a.medianER);

const best = table[0]?.medianER ?? 1;
for (const row of table) {
  // Во сколько раз рубрика хуже лучшей — это и есть эмпирический вес.
  const relative = Math.round((row.medianER / best) * 25);
  const verdict =
    row.ourWeight == null
      ? ""
      : relative > row.ourWeight + 5
        ? `недооценена (по данным ~${relative})`
        : relative < row.ourWeight - 5
          ? `переоценена (по данным ~${relative})`
          : "совпадает";
  console.log(
    row.category.padEnd(12) +
      String(row.n).padStart(6) +
      `${row.medianER}%`.padStart(12) +
      String(row.ourWeight ?? "—").padStart(9) +
      "  " +
      verdict,
  );
}

report.byCategory = table;

mkdirSync(DATA_DIR, { recursive: true });
const out = join(DATA_DIR, "features.json");
writeFileSync(out, JSON.stringify(report, null, 2));
console.log(`\n→ ${out}`);
