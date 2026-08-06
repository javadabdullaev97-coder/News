#!/usr/bin/env node
// По каким признакам издание решает, что отправить в Telegram.
//
// Это единственное место исследования, где можно увидеть само решение, а не
// его результат: для выборочных недель известно и что ушло в канал, и что
// осталось на сайте. Дальше — обычная задача «чем отличается отобранное от
// неотобранного».
//
// Считаем не долю, а подъём (lift): во сколько раз материал с признаком чаще
// попадает в канал, чем материал без него. Доля сама по себе обманчива —
// если издание отбирает 45% всего, то рубрика с 50% выглядит выигрышной,
// хотя подъём у неё всего 1,1.
//
// Смысл имеют только издания, которые действительно фильтруют. Gazeta шлёт
// 100% ленты, у неё решения нет и разбирать нечего.
//
// CLI: node research/analyze-selection-rules.mjs
// Выход: research/data/selection-rules.json

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CHANNELS } from "./lib/channels.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = join(HERE, "raw");
const DATA_DIR = join(HERE, "data");

const MIN_GROUP = 15;

function readJsonl(path) {
  if (!existsSync(path)) return null;
  const body = readFileSync(path, "utf8").trim();
  if (!body) return [];
  return body.split("\n").filter(Boolean).map((l) => JSON.parse(l));
}

const canonUrl = (u) =>
  (u ?? "")
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "")
    .toLowerCase();

const normTitle = (t) =>
  (t ?? "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

const kunMap = existsSync(join(RAW_DIR, "kun-link-map.json"))
  ? JSON.parse(readFileSync(join(RAW_DIR, "kun-link-map.json"), "utf8"))
  : {};

function keyFromLink(outlet, link) {
  if (outlet === "gazeta") return link.includes("gazeta.uz/") ? canonUrl(link) : null;
  if (outlet === "spot") return link.includes("spot.uz/") ? canonUrl(link) : null;
  if (outlet === "repost") return link.includes("repost.uz/") ? canonUrl(link) : null;
  if (outlet === "kun") {
    const t = kunMap[link] ?? kunMap[link.replace(/\/$/, "")] ?? null;
    const full = t
      ? canonUrl(t.startsWith("http") ? t : `kun.uz${t}`)
      : /kun\.uz\/.*\/news\//.test(link)
        ? canonUrl(link)
        : null;
    return full ? full.replace(/^kun\.uz\/kr\//, "kun.uz/") : null;
  }
  return null;
}

// ── признаки материала ─────────────────────────────────────────────────────

const CATEGORY = [
  [/o.?zbekiston|узбекистан|uzbekistan|ташкент|toshkent/i, "внутренние"],
  [/jahon|dunyo|world|мир|xalqaro|международ|central asia|afg/i, "мировые"],
  [/sport|спорт|futbol|футбол/i, "спорт"],
  [/jamiyat|society|общество|ijtimoiy|социал/i, "общество"],
  [/politics|siyosat|политик/i, "политика"],
  [/econom|business|biznes|iqtisod|эконом|деньги|moliya|финанс/i, "экономика"],
  [/madaniyat|culture|культур|san.at/i, "культура"],
  [/layfstayl|лайфстайл|lifestyle/i, "лайфстайл"],
  [/texnolog|техно|raqamli|цифров/i, "технологии"],
  [/avto|авто/i, "авто"],
];

const toCategory = (section) => {
  if (!section) return null;
  for (const [re, name] of CATEGORY) if (re.test(section)) return name;
  return "прочее";
};

// Маркеры, которые наш собственный скоринг считает важными. Проверяем, ведут
// ли себя так же чужие редакции.
const MONEY = /\b\d[\d\s.,]*\s*(млрд|млн|тыс|сум|so['’ ]?m|dollar|доллар|%|foiz|процент|mlrd|mln|ming)/i;
const DEADLINE = /(до \d|с \d+ (январ|феврал|март|апрел|ма[йя]|июн|июл|август|сентябр|октябр|ноябр|декабр)|dan boshlab|gacha|срок|muddat)/i;
const OFFICIAL = /(президент|prezident|минист|vazir|хоким|hokim|постановлен|qaror|указ|farmon|кабинет|vazirlar)/i;
const INCIDENT = /(погиб|halok|ДТП|YTH|пожар|yong|задержан|qo['’ ]?lga olin|уголовн|jinoy|авари)/i;

function features(article) {
  const title = article.title ?? "";
  const words = article.words ?? 0;
  const hour = article.publishedAt
    ? (new Date(article.publishedAt).getUTCHours() + 5) % 24
    : null;
  return {
    категория: toCategory(article.section),
    "есть сумма или процент": MONEY.test(title),
    "есть срок": DEADLINE.test(title),
    "упомянут орган власти": OFFICIAL.test(title),
    "происшествие": INCIDENT.test(title),
    "заголовок длиннее 60 знаков": title.length > 60,
    "объём выше медианы": null, // заполняется ниже, нужен весь корпус
    "час публикации": hour == null ? null : hour < 9 ? "до 9" : hour < 13 ? "9–13" : hour < 18 ? "13–18" : "после 18",
    _words: words,
  };
}

// ── сбор ───────────────────────────────────────────────────────────────────

const TARGETS = [
  { outlet: "kun", channel: "kunuzofficial", lang: "uz", join: "link" },
  { outlet: "kun", channel: "kunuzru", lang: "ru", join: "link" },
  { outlet: "daryo", channel: "Daryo", lang: "uz", join: "title" },
  { outlet: "spot", channel: "spotuz_uz", lang: "uz", join: "link" },
  { outlet: "spot", channel: "spotuz", lang: "ru", join: "link" },
  { outlet: "repost", channel: "RepostUZ", lang: "ru", join: "link" },
];

const report = { generatedAt: new Date().toISOString(), targets: [] };

for (const target of TARGETS) {
  const articles = (readJsonl(join(RAW_DIR, `articles-${target.outlet}.jsonl`)) ?? []).filter(
    (a) => a.lang === target.lang && a.publishedAt,
  );
  if (articles.length < 100) continue;

  // Рубрику Gazeta и Spot добираем из обхода лент.
  const rubricPath = join(RAW_DIR, `rubrics-${target.outlet}.json`);
  const rubrics = existsSync(rubricPath)
    ? JSON.parse(readFileSync(rubricPath, "utf8"))
    : null;

  // Множество того, что ушло в канал. Берём все каналы издания на этом языке:
  // материал, ушедший в тематический канал, тоже отобран, просто в другой.
  const posted = new Set();
  for (const channel of CHANNELS.filter((c) => c.outlet === target.outlet)) {
    for (const post of readJsonl(join(RAW_DIR, `telegram-${channel.id}.jsonl`)) ?? []) {
      if (target.join === "title") {
        const first = normTitle((post.text ?? "").split("\n")[0]);
        if (first) posted.add(first);
      } else {
        for (const link of post.links ?? []) {
          const key = keyFromLink(target.outlet, link);
          if (key) posted.add(key);
        }
      }
    }
  }

  const rows = articles.map((a) => {
    const section = a.section ?? rubrics?.[canonUrl(a.url)]?.[0] ?? null;
    const key = target.join === "title" ? normTitle(a.title) : canonUrl(a.url);
    return { ...a, section, selected: posted.has(key), f: features({ ...a, section }) };
  });

  const wordsSorted = rows.map((r) => r.f._words).sort((a, b) => a - b);
  const medianWords = wordsSorted[Math.floor(wordsSorted.length / 2)] ?? 0;
  for (const r of rows) r.f["объём выше медианы"] = r.f._words > medianWords;

  const base = rows.filter((r) => r.selected).length / rows.length;
  if (base > 0.9) {
    report.targets.push({
      ...target,
      articles: rows.length,
      baseRate: +(base * 100).toFixed(1),
      note: "отбора нет — уходит почти всё, разбирать нечего",
    });
    continue;
  }

  // Подъём по каждому значению каждого признака.
  const lifts = [];
  const featureNames = Object.keys(rows[0].f).filter((k) => !k.startsWith("_"));
  for (const name of featureNames) {
    const groups = new Map();
    for (const r of rows) {
      const v = r.f[name];
      if (v == null) continue;
      const key = typeof v === "boolean" ? (v ? "да" : "нет") : String(v);
      if (!groups.has(key)) groups.set(key, { n: 0, sel: 0 });
      const g = groups.get(key);
      g.n += 1;
      if (r.selected) g.sel += 1;
    }
    for (const [value, g] of groups) {
      if (g.n < MIN_GROUP) continue;
      const rate = g.sel / g.n;
      lifts.push({
        feature: name,
        value,
        n: g.n,
        rate: +(rate * 100).toFixed(1),
        lift: +(rate / base).toFixed(2),
      });
    }
  }
  lifts.sort((a, b) => b.lift - a.lift);

  report.targets.push({
    ...target,
    articles: rows.length,
    selected: rows.filter((r) => r.selected).length,
    baseRate: +(base * 100).toFixed(1),
    medianWords,
    lifts,
  });
}

mkdirSync(DATA_DIR, { recursive: true });
writeFileSync(join(DATA_DIR, "selection-rules.json"), JSON.stringify(report, null, 2));

for (const t of report.targets) {
  console.log(`\n@${t.channel} [${t.lang}] — статей ${t.articles}, отобрано ${t.baseRate}%`);
  if (t.note) {
    console.log(`  ${t.note}`);
    continue;
  }
  const top = t.lifts.filter((l) => l.lift >= 1.15).slice(0, 6);
  const bottom = t.lifts.filter((l) => l.lift <= 0.85).slice(-6).reverse();
  if (top.length) {
    console.log("  ПОВЫШАЮТ шанс попасть в канал:");
    for (const l of top)
      console.log(`    ${(l.feature + " = " + l.value).padEnd(42)} ×${l.lift}  (${l.rate}%, n=${l.n})`);
  }
  if (bottom.length) {
    console.log("  ПОНИЖАЮТ:");
    for (const l of bottom)
      console.log(`    ${(l.feature + " = " + l.value).padEnd(42)} ×${l.lift}  (${l.rate}%, n=${l.n})`);
  }
}
console.log(`\n→ ${join(DATA_DIR, "selection-rules.json")}`);
