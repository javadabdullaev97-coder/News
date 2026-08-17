#!/usr/bin/env node
// Выбирает кадр из фототеки редакции — тот, что дольше всех не выходил.
//
// ЗАЧЕМ. Тем, к которым официального фото не бывает (ставка ЦБ, курс сума,
// инфляция), у нас накопилось много, а кадр к ним ставился один и тот же:
// лента выглядела как повтор одной новости. Ротация «на глаз» не работает —
// бильд не помнит, что ставил вчера, потому что вчера был другой прогон.
// Скрипт помнит за него: смотрит, где какой файл уже стоит во frontmatter,
// и отдаёт самый давно не использованный.
//
//   node scripts/pick-stock.mjs --topic cbu
//   node scripts/pick-stock.mjs --topic sum --hero     # только крупные кадры
//   node scripts/pick-stock.mjs --list                 # вся фототека с датами
//
// Выдача — JSON с url, alt на трёх языках и credit: ровно то, что кладётся
// в frontmatter.image. Нет кадров по теме — код возврата 1 и пустой ответ,
// это законный исход: значит тема не про деньги и нужен обычный поиск фото.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const POSTS = join(ROOT, "content/posts");
const MANIFEST = join(ROOT, "config/stock-photos.json");

// Ниже этой ширины кадр не ставим на герой главной: он растянется
// на 800+ px и будет мыльным. В карточке рубрики тот же файл смотрится
// нормально — там ширина втрое меньше.
const HERO_MIN_WIDTH = 1000;

// Снимок статьи уходит не только на сайт: из него рендерится карточка
// 1080×1350 для Instagram (scripts/render-social-card.py). Кадр фотографии
// там до 900 px высотой, то есть исходник 16:9 должен быть не меньше
// 768×432 — иначе рендер откажется, и материал останется без карточки.
//
// 17.08.2026 из фототеки ушёл снимок 640×360, и в ленте Instagram
// фотография повисла маленьким прямоугольником в размытой подложке.
// Поэтому отдаём только то, что заведомо пройдёт рендер; мелкое лежит
// в манифесте, но выдаётся лишь по явному --any.
const SOCIAL_MIN_WIDTH = 768;

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? null : (args[i + 1] ?? "");
};
const has = (name) => args.includes(`--${name}`);

const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));

/** Когда каждый файл фототеки в последний раз ставили в статью. */
function lastUsed() {
  const seen = new Map();
  if (!existsSync(POSTS)) return seen;
  for (const day of readdirSync(POSTS).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))) {
    for (const f of readdirSync(join(POSTS, day))) {
      if (!f.endsWith(".mdx")) continue;
      // Переводы указывают тот же файл, что и оригинал, — считать их
      // отдельными выходами нельзя, иначе счётчик утроится.
      if (/\.(uz|en)\.mdx$/.test(f)) continue;
      const head = readFileSync(join(POSTS, day, f), "utf8").split(/\n---/, 1)[0];
      const url = (head.match(/^\s*url:\s*"([^"]*)"/m) ?? [])[1];
      if (!url?.startsWith("/images/stock/")) continue;
      const prev = seen.get(url);
      if (!prev || day > prev.day) seen.set(url, { day, slug: f.replace(/\.mdx$/, "") });
      const rec = seen.get(url);
      rec.count = (rec.count ?? 0) + 1;
    }
  }
  return seen;
}

const used = lastUsed();
const withUsage = manifest.photos.map((p) => ({
  ...p,
  lastDay: used.get(p.file)?.day ?? null,
  lastSlug: used.get(p.file)?.slug ?? null,
  timesUsed: used.get(p.file)?.count ?? 0,
}));

if (has("list")) {
  for (const p of withUsage) {
    console.log(
      `${p.file.padEnd(38)} ${String(p.width).padStart(4)}px  ` +
        `выходов ${String(p.timesUsed).padStart(2)}  ` +
        `последний ${p.lastDay ?? "никогда"}  [${p.topics.join(", ")}]`,
    );
  }
  process.exit(0);
}

const topic = flag("topic");
if (!topic) {
  console.error("нужен --topic <тема>. Темы: " + [...new Set(manifest.photos.flatMap((p) => p.topics))].join(", "));
  process.exit(2);
}

let pool = withUsage.filter((p) => p.topics.includes(topic));
const tooSmall = pool.filter((p) => p.width < SOCIAL_MIN_WIDTH).map((p) => p.file);
if (!has("any")) pool = pool.filter((p) => p.width >= SOCIAL_MIN_WIDTH);
if (has("hero")) pool = pool.filter((p) => p.width >= HERO_MIN_WIDTH);
if (tooSmall.length && !has("any")) {
  console.error(
    `[pick-stock] пропущено как мелкое для карточки Instagram (<${SOCIAL_MIN_WIDTH} px): ` +
      tooSmall.join(", "),
  );
}

if (!pool.length) {
  console.error(
    `в фототеке нет кадров по теме «${topic}», годных для карточки` +
      `${has("hero") ? ` и героя (от ${HERO_MIN_WIDTH} px)` : ` (от ${SOCIAL_MIN_WIDTH} px)`}` +
      ". Ищи снимок обычным путём — у первоисточника или в стоке.",
  );
  process.exit(1);
}

// Сначала то, что не выходило вовсе; дальше — по давности; при равенстве
// реже использованное. Порядок детерминированный: одинаковый вход даёт
// одинаковый выбор, и прогон воспроизводим.
pool.sort(
  (a, b) =>
    (a.lastDay ?? "").localeCompare(b.lastDay ?? "") ||
    a.timesUsed - b.timesUsed ||
    a.file.localeCompare(b.file),
);

const pick = pool[0];
console.log(
  JSON.stringify(
    {
      url: pick.file,
      alt: pick.alt,
      credit: pick.credit,
      width: pick.width,
      lastUsed: pick.lastDay,
      lastUsedIn: pick.lastSlug,
      timesUsed: pick.timesUsed,
    },
    null,
    2,
  ),
);
