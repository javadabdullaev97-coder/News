#!/usr/bin/env node
// Фаза 4: масштаб и вовлечённость.
//
// Что здесь меряется точно: подписчики, частота публикаций, медианные
// просмотры и просмотры в долях от базы подписчиков. Всё это берётся из
// публичной ленты канала и проверяется независимо.
//
// Чего здесь нет и не будет: посещаемости сайтов. Доступа к их счётчикам нет
// ни у кого, кроме владельцев, а открытые оценки Similarweb-класса дают
// порядок величины, а не число, и строить на них выводы нельзя. Опорной
// метрикой сравнения поэтому служат просмотры на подписчика — она измеряется
// точно и сравнима между изданиями любого размера.
//
// Про 1194% у @gazetauzspecial. Это не ошибка: у канала 1520 подписчиков и
// 18 тысяч просмотров на пост, потому что лонгриды из него анонсирует
// основной канал Gazeta с его 86 тысячами. То есть просмотры приходят не от
// подписчиков. Такие каналы помечаются отдельно и из средних исключаются —
// иначе одна витрина перекашивает всю картину.
//
// CLI: node research/analyze-scale.mjs
// Выход: research/data/scale.json

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CHANNELS } from "./lib/channels.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = join(HERE, "raw");
const DATA_DIR = join(HERE, "data");

// Выше этого порога просмотры заведомо приходят извне канала, и доля от
// подписчиков перестаёт быть мерой вовлечённости.
const EXTERNAL_REACH_THRESHOLD = 100;

const summaryPath = join(RAW_DIR, "telegram-summary.json");
if (!existsSync(summaryPath)) {
  console.error("Нет telegram-summary.json — прогоните rebuild-telegram-summary.mjs");
  process.exit(1);
}
const summary = JSON.parse(readFileSync(summaryPath, "utf8"));
const meta = new Map(CHANNELS.map((c) => [c.id, c]));

const rows = summary.channels.map((c) => ({
  ...c,
  vertical: meta.get(c.channel)?.vertical ?? null,
  externallyDriven: (c.viewsPerSubscriber ?? 0) > EXTERNAL_REACH_THRESHOLD,
}));

const clean = rows.filter((r) => !r.externallyDriven && r.posts >= 50);

// Округление обязательно: медиана из двух средних значений даёт хвост из
// плавающей арифметики, и «26.549999999999997%» ломает выравнивание колонок.
const median = (nums) => {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  const raw = s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  return Math.round(raw * 10) / 10;
};

function group(by) {
  const out = new Map();
  for (const r of clean) {
    const key = by(r);
    if (key == null) continue;
    if (!out.has(key)) out.set(key, []);
    out.get(key).push(r);
  }
  return out;
}

const report = { generatedAt: new Date().toISOString(), channels: rows, groups: {} };

// ── охват по изданиям ──────────────────────────────────────────────────────

console.log("СОВОКУПНЫЙ ОХВАТ В TELEGRAM ПО ИЗДАНИЯМ\n");
console.log("издание    каналов  подписчиков  постов/день  медиана просмотров  сумма просмотров/день");
const byOutlet = new Map();
for (const r of rows) {
  if (!byOutlet.has(r.outlet)) byOutlet.set(r.outlet, []);
  byOutlet.get(r.outlet).push(r);
}
const outletStats = [];
for (const [outlet, list] of byOutlet) {
  const subs = list.reduce((s, r) => s + (r.subscribers ?? 0), 0);
  const perDay = list.reduce((s, r) => s + (r.perDay ?? 0), 0);
  // Дневной охват: сколько просмотров издание собирает по всем каналам за
  // сутки. Считаем по медианному посту, чтобы разовые вирусные не искажали.
  const viewsPerDay = list.reduce((s, r) => s + (r.medianViews ?? 0) * (r.perDay ?? 0), 0);
  outletStats.push({ outlet, channels: list.length, subs, perDay, viewsPerDay });
}
outletStats.sort((a, b) => b.viewsPerDay - a.viewsPerDay);
for (const s of outletStats) {
  console.log(
    s.outlet.padEnd(11) +
      String(s.channels).padStart(6) +
      String(s.subs.toLocaleString("ru")).padStart(13) +
      String(s.perDay.toFixed(1)).padStart(13) +
      String(median(byOutlet.get(s.outlet).map((r) => r.medianViews ?? 0))).padStart(20) +
      String(Math.round(s.viewsPerDay).toLocaleString("ru")).padStart(23),
  );
}
report.groups.byOutlet = outletStats;

// ── язык ───────────────────────────────────────────────────────────────────

console.log("\n\nВОВЛЕЧЁННОСТЬ ПО ЯЗЫКУ (медиана просмотров к подписчикам)\n");
console.log("язык  каналов  медиана ER  разброс         суммарно подписчиков");
const langStats = [];
for (const [lang, list] of group((r) => r.lang)) {
  const ers = list.map((r) => r.viewsPerSubscriber).filter((v) => v != null);
  const stat = {
    lang,
    channels: list.length,
    medianER: median(ers),
    min: Math.min(...ers),
    max: Math.max(...ers),
    subs: list.reduce((s, r) => s + (r.subscribers ?? 0), 0),
  };
  langStats.push(stat);
}
langStats.sort((a, b) => b.medianER - a.medianER);
for (const s of langStats) {
  console.log(
    s.lang.padEnd(6) +
      String(s.channels).padStart(7) +
      `${s.medianER}%`.padStart(12) +
      `${s.min}–${s.max}%`.padStart(16) +
      String(s.subs.toLocaleString("ru")).padStart(22),
  );
}
report.groups.byLang = langStats;

// ── тематические против языковых ───────────────────────────────────────────

console.log("\n\nТЕМАТИЧЕСКИЕ КАНАЛЫ ПРОТИВ ОСНОВНЫХ\n");
const themed = clean.filter((r) => r.vertical);
const main = clean.filter((r) => !r.vertical);
console.log(
  `основные:      ${main.length} каналов, медиана ER ${median(main.map((r) => r.viewsPerSubscriber))}%, ` +
    `подписчиков ${main.reduce((s, r) => s + r.subscribers, 0).toLocaleString("ru")}`,
);
console.log(
  `тематические:  ${themed.length} каналов, медиана ER ${median(themed.map((r) => r.viewsPerSubscriber))}%, ` +
    `подписчиков ${themed.reduce((s, r) => s + r.subscribers, 0).toLocaleString("ru")}`,
);
report.groups.themedVsMain = {
  main: { count: main.length, medianER: median(main.map((r) => r.viewsPerSubscriber)) },
  themed: { count: themed.length, medianER: median(themed.map((r) => r.viewsPerSubscriber)) },
};

// ── частота против вовлечённости ───────────────────────────────────────────

// Ключевой вопрос для нашей политики: правда ли, что частый постинг
// «отписывает» аудиторию. Если бы правда, ER падал бы с ростом частоты.
console.log("\n\nЧАСТОТА ПРОТИВ ВОВЛЕЧЁННОСТИ\n");
console.log("постов в день  каналов  медиана ER");
const buckets = [
  ["до 10", (r) => r.perDay < 10],
  ["10–20", (r) => r.perDay >= 10 && r.perDay < 20],
  ["20–40", (r) => r.perDay >= 20 && r.perDay < 40],
  ["40 и больше", (r) => r.perDay >= 40],
];
const freqStats = [];
for (const [label, test] of buckets) {
  const list = clean.filter(test);
  if (!list.length) continue;
  const er = median(list.map((r) => r.viewsPerSubscriber));
  freqStats.push({ bucket: label, channels: list.length, medianER: er });
  console.log(label.padEnd(15) + String(list.length).padStart(7) + `${er}%`.padStart(12));
}
report.groups.byFrequency = freqStats;

// Ранговая корреляция Спирмена между частотой и вовлечённостью: если частый
// постинг действительно вредит, она будет заметно отрицательной.
const withBoth = clean.filter((r) => r.perDay && r.viewsPerSubscriber != null);
const rank = (values) => {
  const sorted = [...values].map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
  const ranks = new Array(values.length);
  sorted.forEach(([, idx], pos) => {
    ranks[idx] = pos + 1;
  });
  return ranks;
};
const spearman = (a, b) => {
  const ra = rank(a);
  const rb = rank(b);
  const n = a.length;
  if (n < 3) return null;
  const d2 = ra.reduce((s, x, i) => s + (x - rb[i]) ** 2, 0);
  return 1 - (6 * d2) / (n * (n * n - 1));
};

// Простая корреляция частоты и вовлечённости обманывает: крупные каналы
// постят чаще (связь частоты с размером 0,66), а размер сам по себе тянет
// вовлечённость. Нужна частная корреляция — связь частоты и ER при
// фиксированном размере канала.
const freq = withBoth.map((r) => r.perDay);
const eng = withBoth.map((r) => r.viewsPerSubscriber);
const size = withBoth.map((r) => r.subscribers);
const rFE = spearman(freq, eng);
const rFS = spearman(freq, size);
const rES = spearman(eng, size);
const partial =
  rFE != null ? (rFE - rFS * rES) / Math.sqrt((1 - rFS ** 2) * (1 - rES ** 2)) : null;
console.log(
  `\nчастота ↔ вовлечённость: ${rFE?.toFixed(2)} | частота ↔ размер: ${rFS?.toFixed(2)} | ` +
    `размер ↔ вовлечённость: ${rES?.toFixed(2)}`,
);
console.log(`частная (частота ↔ ER при контроле размера): ${partial?.toFixed(2)}`);

// Сколько постов подписчик реально просматривает за сутки. Если бы частый
// постинг «выжигал» аудиторию, эта величина у плодовитых каналов падала бы.
console.log("\nсуточный охват на подписчика:");
for (const r of [...clean].sort((a, b) => b.perDay - a.perDay).slice(0, 6)) {
  const perDayShare = (r.perDay * r.medianViews) / r.subscribers;
  console.log(
    `  @${r.channel.padEnd(20)}${String(r.perDay).padStart(6)} постов/день → ` +
      `${perDayShare.toFixed(1)} просмотра на подписчика в сутки`,
  );
}
report.groups.partialCorrelation = {
  frequencyEngagement: rFE != null ? +rFE.toFixed(3) : null,
  frequencySize: rFS != null ? +rFS.toFixed(3) : null,
  sizeEngagement: rES != null ? +rES.toFixed(3) : null,
  partial: partial != null ? +partial.toFixed(3) : null,
};

const rx = rank(withBoth.map((r) => r.perDay));
const ry = rank(withBoth.map((r) => r.viewsPerSubscriber));
const n = withBoth.length;
const d2 = rx.reduce((s, x, i) => s + (x - ry[i]) ** 2, 0);
const rho = n > 2 ? 1 - (6 * d2) / (n * (n * n - 1)) : null;
console.log(
  `\nранговая корреляция частоты и вовлечённости: ${rho?.toFixed(2)} (каналов ${n})`,
);
report.groups.frequencyCorrelation = { rho: rho != null ? +rho.toFixed(3) : null, channels: n };

// ── исключённые ────────────────────────────────────────────────────────────

const excluded = rows.filter((r) => r.externallyDriven || r.posts < 50);
if (excluded.length) {
  console.log("\n\nИСКЛЮЧЕНЫ ИЗ СРЕДНИХ\n");
  for (const r of excluded) {
    const why = r.externallyDriven
      ? `${r.viewsPerSubscriber}% от подписчиков — просмотры приходят извне канала`
      : `всего ${r.posts} постов за квартал`;
    console.log(`  @${r.channel}: ${why}`);
  }
}

mkdirSync(DATA_DIR, { recursive: true });
const out = join(DATA_DIR, "scale.json");
writeFileSync(out, JSON.stringify(report, null, 2));
console.log(`\n→ ${out}`);
