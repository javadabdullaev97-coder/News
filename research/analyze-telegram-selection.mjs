#!/usr/bin/env node
// Фаза 3: что из сайта уходит в Telegram и по какому правилу.
//
// Связка «пост ↔ статья» идёт по исходящей ссылке — это единственное место
// всего исследования, где связь объявлена самими изданиями, а не выведена
// эвристикой. Но форма ссылки у всех своя:
//
//   gazeta, spot   полный адрес статьи — сверяем напрямую
//   repost         полный адрес, слаг без даты
//   uznews         /<язык>/news/<id> — сверяем по числовому id
//   qalampir       /n/<id> — то же
//   kun            короткая форма kun.uz/ru/92506138; развёрнута заранее
//                  скриптом resolve-kun-links.mjs через 301
//   daryo          короткая форма, которая объявляет каноническим адресом
//                  саму себя. Развернуть нечем, поэтому связка по заголовку:
//                  первая строка поста совпадает с заголовком статьи в 84%
//                  случаев точно, остальное добирается нормализацией.
//
// Полнота разная. Для gazeta, spot, repost и kun есть и весь квартал по
// sitemap, и точное время публикации на выборочных неделях. Для daryo связка
// по заголовку работает только там, где заголовки скачаны, то есть на
// выборочных неделях. Это указано в выводе, чтобы доли не сравнивались вслепую.
//
// CLI:
//   node research/analyze-telegram-selection.mjs
//   node research/analyze-telegram-selection.mjs --outlet=gazeta
//
// Выход: research/data/telegram-selection.json

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CHANNELS } from "./lib/channels.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = join(HERE, "raw");
const DATA_DIR = join(HERE, "data");

const argv = process.argv.slice(2);
const arg = (flag, fallback) => {
  const hit = argv.find((a) => a.startsWith(`${flag}=`));
  return hit ? hit.slice(flag.length + 1) : fallback;
};
const only = arg("--outlet", null)?.split(",");
const from = arg("--from", "2026-05-01");
const to = arg("--to", "2026-07-31");

const SAMPLE_WEEKS = ["2026-05-11", "2026-06-15", "2026-07-13"];
const sampleDays = new Set();
for (const monday of SAMPLE_WEEKS) {
  const d = new Date(`${monday}T00:00:00Z`);
  for (let i = 0; i < 7; i += 1) {
    sampleDays.add(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
}

function readJsonl(path) {
  if (!existsSync(path)) return null;
  const body = readFileSync(path, "utf8").trim();
  if (!body) return [];
  return body.split("\n").filter(Boolean).map((l) => JSON.parse(l));
}

// ── нормализация адресов ───────────────────────────────────────────────────

// Один и тот же материал в ленте и в посте пишется по-разному: с www и без,
// со слэшем на конце и без, изредка с параметрами. Приводим к общей форме,
// иначе связка теряет заметную часть пар на пустом месте.
function canonUrl(url) {
  return (url ?? "")
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "")
    .toLowerCase();
}

// Daryo отдаёт article:published_time без часового пояса — «2026-07-19
// 13:12:00». Такая строка разбирается как UTC, хотя это ташкентское время, и
// лаг «сайт → канал» уезжает на пять часов в минус: посты выглядят так, будто
// вышли раньше публикации. У остальных пяти изданий зона в строке есть.
const NAIVE_TZ_OFFSET_HOURS = { daryo: 5 };

// У Kun обратная беда: пояс в строке указан (+05:00), но цифры в него уже
// пересчитаны, то есть смещение применено дважды и момент уезжает на пять
// часов вперёд. Видно по трём независимым признакам: тот же материал, найденный
// по прямой ссылке, уходит в канал за 4,9 часа до заявленной публикации;
// разброс этой величины (±20 минут) равен обычному лагу постинга; и суточный
// пик публикаций у Kun приходится на 14-16 часов при пике постинга в 9-11,
// тогда как у Gazeta и Spot оба пика совпадают.
const DOUBLE_OFFSET_HOURS = { kun: -5 };

function parseMoment(value, outlet) {
  if (!value) return null;
  const naive = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.test(value);
  const offset = NAIVE_TZ_OFFSET_HOURS[outlet];
  const iso = naive && offset != null
    ? `${value.replace(" ", "T")}${offset >= 0 ? "+" : "-"}${String(Math.abs(offset)).padStart(2, "0")}:00`
    : value;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const fix = DOUBLE_OFFSET_HOURS[outlet];
  return fix ? new Date(d.getTime() + fix * 3.6e6) : d;
}

function normTitle(text) {
  return (text ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

const kunMap = existsSync(join(RAW_DIR, "kun-link-map.json"))
  ? JSON.parse(readFileSync(join(RAW_DIR, "kun-link-map.json"), "utf8"))
  : {};

// Каждая стратегия отдаёт ключ, по которому пост сходится со статьёй, либо
// null если ссылка не про статью (соцсети, подпись канала).
const STRATEGY = {
  gazeta: { kind: "url", key: (link) => (link.includes("gazeta.uz/") ? canonUrl(link) : null) },
  spot: { kind: "url", key: (link) => (link.includes("spot.uz/") ? canonUrl(link) : null) },
  repost: { kind: "url", key: (link) => (link.includes("repost.uz/") ? canonUrl(link) : null) },
  uznews: {
    kind: "id",
    key: (link) => link.match(/uznews\.uz\/[a-z]{2}\/news\/(\d+)/)?.[1] ?? null,
  },
  qalampir: {
    kind: "id",
    // Английская версия живёт на /en/n/<id>, а не на /n/<id>: языковой
    // сегмент вклинивается перед коротким путём.
    key: (link) => link.match(/qalampir\.uz\/(?:[a-z]{2}\/)?(?:n|news)\/(?:.*-)?(\d+)/)?.[1] ?? null,
  },
  kun: {
    kind: "url",
    key: (link) => {
      if (!/kun\.uz\//.test(link)) return null;
      // Короткую форму подменяем развёрнутой; длинную берём как есть.
      const target = kunMap[link] ?? kunMap[link.replace(/\/$/, "")] ?? null;
      const full = target
        ? canonUrl(target.startsWith("http") ? target : `kun.uz${target}`)
        : /\/news\//.test(link)
          ? canonUrl(link)
          : null;
      // Узбекский канал Kun ссылается на кириллические адреса /kr/, хотя
      // кириллица — транслитерация латиницы с тем же слагом. Сводим к
      // латинскому адресу, иначе связка ищет материал не в той половине
      // ленты и не находит ничего.
      return full ? full.replace(/^kun\.uz\/kr\//, "kun.uz/") : null;
    },
  },
  daryo: { kind: "title", key: () => null },
};

// Насколько полон список материалов сайта, то есть знаменатель доли отбора:
//
//   quarter — sitemap покрывает весь квартал, доля считается честно
//   sample  — список есть только на выборочные недели, и доля считается по
//             ним: у daryo связка идёт по заголовку, а заголовки скачаны
//             только там; у uznews sitemap оказался дырявым и список собран
//             перебором id тоже только под эти недели
//   none    — списка сайта нет вовсе. Qalampir не отдаёт дату публикации ни
//             в одном виде, она дорисовывается скриптом, поэтому узнать, что
//             вышло на сайте и не попало в канал, нечем. Считаем только то,
//             что в канал попало.
const SCOPE = {
  gazeta: "quarter",
  spot: "quarter",
  repost: "quarter",
  kun: "quarter",
  daryo: "sample",
  uznews: "sample",
  qalampir: "none",
};

// Узбекский у UzNews — кириллица, латиницы у него нет вовсе, и канал
// @uznewsuzb помечен просто как uz. Для сопоставления с материалами, чей язык
// определён по заголовку как uz-cyr, обе формы считаем одним языком. Для
// остальных изданий это безопасно: там кириллица в знаменатель не попадает,
// потому что канала на ней нет.
// Складывать латиницу с кириллицей можно только там, где кириллица и есть
// узбекский язык издания. У Kun, Gazeta и Daryo кириллица — транслитерация
// латиницы, и если её засчитать, знаменатель удваивается: узбекская лента Kun
// превращается из 4031 материала в 8055, а доля отбора вдвое занижается.
const CYRILLIC_IS_UZBEK = new Set(["uznews"]);

function sameLang(articleLang, channelLang, outlet) {
  if (articleLang === channelLang) return true;
  return CYRILLIC_IS_UZBEK.has(outlet) && channelLang === "uz" && articleLang === "uz-cyr";
}

// Ключ статьи под ту же стратегию.
function articleKey(outlet, row) {
  const strategy = STRATEGY[outlet];
  if (strategy.kind === "id") return String(row.key);
  return canonUrl(row.url);
}

// ── разбор ─────────────────────────────────────────────────────────────────

const outlets = [...new Set(CHANNELS.map((c) => c.outlet))].filter(
  (o) => !only || only.includes(o),
);

const report = { window: { from, to }, sampleWeeks: SAMPLE_WEEKS, generatedAt: new Date().toISOString(), outlets: [] };

for (const outlet of outlets) {
  const channels = CHANNELS.filter((c) => c.outlet === outlet);
  const sitemap = readJsonl(join(RAW_DIR, `sitemap-${outlet}.jsonl`)) ?? [];
  const articles = readJsonl(join(RAW_DIR, `articles-${outlet}.jsonl`)) ?? [];
  const strategy = STRATEGY[outlet];

  // Индекс статей: ключ → запись. Для daryo индекс по заголовку.
  const index = new Map();
  if (strategy.kind === "title") {
    for (const a of articles) {
      if (a.title) index.set(normTitle(a.title), a);
    }
  } else {
    for (const row of sitemap) index.set(articleKey(outlet, row), row);
    // Статьи дополняют карту точным временем публикации и рубрикой.
    for (const a of articles) {
      const k = articleKey(outlet, a);
      const base = index.get(k);
      if (base) Object.assign(base, { publishedAt: a.publishedAt, section: a.section, title: a.title, words: a.words });
      else index.set(k, a);
    }
  }

  const outletReport = { outlet, joinKind: strategy.kind, channels: [] };

  for (const channel of channels) {
    const posts = (readJsonl(join(RAW_DIR, `telegram-${channel.id}.jsonl`)) ?? []).filter(
      (p) => p.postedAt && p.postedAt.slice(0, 10) >= from && p.postedAt.slice(0, 10) <= to,
    );
    if (!posts.length) continue;

    const scopeKind = SCOPE[outlet] ?? "quarter";
    // Связку считаем только на тех постах, для которых у нас есть список
    // сайта: иначе доля «связано» падает не потому, что связка плохая, а
    // потому, что сравнивать не с чем.
    const joinable =
      scopeKind === "sample"
        ? posts.filter((p) => sampleDays.has(p.postedAt.slice(0, 10)))
        : posts;

    let joined = 0;
    const matchedKeys = new Set();
    const lags = [];
    const byHour = new Array(24).fill(0);

    // Часы считаем по всем постам окна — сетка вещания от полноты списка
    // сайта не зависит.
    for (const post of posts) {
      const hour = new Date(post.postedAt).getUTCHours();
      // Ташкентское время: сетка привязана к рабочему дню редакции, не к UTC.
      byHour[(hour + 5) % 24] += 1;
    }

    for (const post of joinable) {
      let article = null;
      if (strategy.kind === "title") {
        const first = normTitle((post.text ?? "").split("\n")[0]);
        article = first ? index.get(first) : null;
      } else {
        for (const link of post.links ?? []) {
          const key = strategy.key(link);
          if (key && index.has(key)) {
            article = index.get(key);
            matchedKeys.add(key);
            break;
          }
        }
      }
      if (!article) continue;
      joined += 1;
      if (strategy.kind === "title") matchedKeys.add(normTitle(article.title));

      const published = parseMoment(article.publishedAt, outlet);
      if (published) {
        const lag = (new Date(post.postedAt) - published) / 60000;
        if (Number.isFinite(lag) && lag > -180 && lag < 60 * 72) lags.push(lag);
      }
    }

    // Знаменатель — материалы сайта на языке канала за то же окно, в границах
    // того, насколько полон список (см. SCOPE).
    const source = scopeKind === "quarter" ? sitemap : articles;
    const langRows =
      scopeKind === "none"
        ? []
        : source.filter((r) => {
            // Там, где карта языка не дала, берём определённый по заголовку.
            if (!sameLang(r.lang ?? r.detectedLang, channel.lang, outlet)) return false;
            const day = (r.publishedAt ?? r.date ?? "").slice(0, 10);
            if (!day) return false;
            return scopeKind === "sample"
              ? sampleDays.has(day)
              : day >= from && day <= to;
          });

    lags.sort((a, b) => a - b);
    const median = (a) => (a.length ? a[Math.floor(a.length / 2)] : null);

    outletReport.channels.push({
      channel: channel.id,
      lang: channel.lang,
      posts: joinable.length,
      joined,
      joinRate: joinable.length ? +((joined / joinable.length) * 100).toFixed(1) : null,
      siteArticles: langRows.length,
      distinctPosted: matchedKeys.size,
      selectionRate: langRows.length
        ? +((matchedKeys.size / langRows.length) * 100).toFixed(1)
        : null,
      medianLagMinutes: median(lags) != null ? Math.round(median(lags)) : null,
      lagP90Minutes: lags.length ? Math.round(lags[Math.floor(lags.length * 0.9)]) : null,
      peakHourTashkent: byHour.indexOf(Math.max(...byHour)),
      byHour,
      scope: scopeKind === "quarter" ? "весь квартал" : scopeKind === "sample" ? "выборочные недели" : "списка сайта нет",
    });
  }

  report.outlets.push(outletReport);
}

mkdirSync(DATA_DIR, { recursive: true });
const out = join(DATA_DIR, "telegram-selection.json");
writeFileSync(out, JSON.stringify(report, null, 2));

console.log(
  "канал                яз   постов  связано  статей  в канале  отбор   лаг(мин)  пик  охват",
);
for (const o of report.outlets) {
  for (const c of o.channels) {
    console.log(
      ("@" + c.channel).padEnd(20) +
        " " +
        c.lang.padEnd(3) +
        String(c.posts).padStart(7) +
        String(`${c.joinRate ?? "—"}%`).padStart(9) +
        String(c.siteArticles).padStart(8) +
        String(c.distinctPosted).padStart(10) +
        String(`${c.selectionRate ?? "—"}%`).padStart(8) +
        String(c.medianLagMinutes ?? "—").padStart(10) +
        String(c.peakHourTashkent).padStart(5) +
        "  " +
        c.scope,
    );
  }
}
console.log(`\n→ ${out}`);
