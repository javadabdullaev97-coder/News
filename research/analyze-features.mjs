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
  if (outlet === "gazeta") return link.includes("gazeta.uz/") ? canonUrl(link) : null;
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
// Названия рубрик приходят на трёх языках и в двух алфавитах: у Kun и Daryo
// это узбекские и русские слова из мета-тега, у Gazeta — английские слаги из
// пути рубричной ленты. Первая версия списка знала «society» и «politics», но
// не знала «economy», «world» и «culture», и три рубрики Gazeta молча уходили
// в «прочее» — из-за чего экономика и мировые оставались с одним изданием.
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
  [/ta.?lim|образован/i, "образование"],
  // Авторская колонка Gazeta — отдельный тип материала, не тема. Держим
  // отдельно, чтобы не размазать её по обществу.
  [/^column$/i, "колонка"],
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

for (const outlet of ["kun", "daryo", "repost", "gazeta"]) {
  const articles = readJsonl(join(RAW_DIR, `articles-${outlet}.jsonl`)) ?? [];
  if (!articles.length) continue;

  // Gazeta рубрику на странице статьи не размечает — она добрана обходом
  // рубричных лент (research/collect-rubrics.mjs). Без этого источника Gazeta
  // выпадала из разреза по темам, и политику с обществом отдавал один только
  // Kun, чего для вывода недостаточно.
  const rubricPath = join(RAW_DIR, `rubrics-${outlet}.json`);
  const rubrics = existsSync(rubricPath)
    ? JSON.parse(readFileSync(rubricPath, "utf8"))
    : null;

  const byKey = new Map();
  const byTitle = new Map();
  for (const a of articles) {
    const section = a.section ?? rubrics?.[canonUrl(a.url)]?.[0] ?? null;
    if (!section) continue;
    const withSection = { ...a, section };
    byKey.set(canonUrl(a.url), withSection);
    if (a.title) byTitle.set(normTitle(a.title), withSection);
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

// Складывать рубрики разных изданий в один рейтинг нельзя, и это не
// придирка. Базовая вовлечённость у изданий разная в два с половиной раза
// (Repost 49%, Daryo 18%), а рубрики размечены неравномерно: общество,
// экономику и политику отдаёт только Kun, а внутренние и мировые в основном
// набираются из Repost. Общий рейтинг в такой раскладке сравнивал бы политику
// Kun с внутренними Repost, то есть выдавал разницу изданий за разницу тем.
//
// Поэтому сравниваем только внутри издания: каждая рубрика — в долях от
// лучшей рубрики того же издания. Такие доли уже сопоставимы между собой.
console.log("РУБРИКИ ВНУТРИ ИЗДАНИЯ, % от подписчиков и доля от лучшей рубрики\n");

const normalized = new Map();
for (const outletRow of report.byOutlet) {
  const cats = outletRow.categories.filter((c) => c.n >= MIN_SAMPLE);
  if (cats.length < 2) continue;
  const best = Math.max(...cats.map((c) => c.medianER));
  const worst = Math.min(...cats.map((c) => c.medianER));
  // Насколько вообще тема влияет на прочтение внутри этого издания. Если
  // разброс близок к единице, веса по темам для него бессмысленны — читают
  // всё одинаково.
  const spread = worst ? best / worst : null;
  outletRow.spread = spread ? +spread.toFixed(2) : null;
  console.log(
    `${outletRow.outlet} (лучшая рубрика = 100, разброс лучшая/худшая = ${spread?.toFixed(2)}×):`,
  );
  for (const c of [...cats].sort((a, b) => b.medianER - a.medianER)) {
    const rel = Math.round((c.medianER / best) * 100);
    console.log(
      "  " +
        c.category.padEnd(14) +
        String(c.n).padStart(6) +
        `${c.medianER}%`.padStart(9) +
        String(rel).padStart(6),
    );
    if (!normalized.has(c.category)) normalized.set(c.category, []);
    normalized.get(c.category).push(rel);
  }
  console.log("");
}

// Сводная строится по нормированным долям, а не по сырым процентам, и только
// там, где рубрика встретилась хотя бы у двух изданий — одно издание это
// наблюдение, а не закономерность.
console.log("\nСВОДНО (медиана нормированной доли; в скобках — у скольких изданий)\n");
console.log("категория      изданий  доля от лучшей  наш вес  вывод");
const table = [...normalized.entries()]
  .map(([category, list]) => ({
    category,
    outlets: list.length,
    relative: median(list),
    ourWeight: OUR_WEIGHTS[OUR_EQUIVALENT[category]] ?? null,
  }))
  .sort((a, b) => b.relative - a.relative);

for (const row of table) {
  // Переводим долю в шкалу наших весов: лучшая рубрика = 25.
  const asWeight = Math.round((row.relative / 100) * 25);
  const verdict =
    row.ourWeight == null
      ? "своей категории у нас нет"
      : row.outlets < 2
        ? "только у одного издания — не вывод"
        : asWeight > row.ourWeight + 5
          ? `недооценена (по данным ~${asWeight})`
          : asWeight < row.ourWeight - 5
            ? `переоценена (по данным ~${asWeight})`
            : "совпадает";
  console.log(
    row.category.padEnd(15) +
      String(row.outlets).padStart(6) +
      String(row.relative).padStart(14) +
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
