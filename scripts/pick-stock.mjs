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

// Кадр считается занятым не только на сайте, но и во всём, что ещё выйдет.
//
// 21.08.2026 два материала про курс доллара вышли подряд с одним и тем же
// снимком башен ЦБ. Оба брали кадр из фототеки, и оба были правы: первый
// в этот момент лежал в content/queue, а туда ротация не смотрела —
// только в content/posts. Материал, который сегодня в очереди, завтра
// в ленте, и для читателя разницы нет.
const PENDING = ["content/queue", "content/needs-verification", "content/rework"];

function noteUse(seen, url, day, slug) {
  if (!url?.startsWith("/images/stock/")) return;
  const prev = seen.get(url);
  if (!prev || day > prev.day) seen.set(url, { day, slug, count: prev?.count });
  const rec = seen.get(url);
  rec.count = (rec.count ?? 0) + 1;
}

/**
 * Адрес картинки статьи — из блока `image:`, а не первый попавшийся `url:`.
 *
 * Раньше брался именно первый, и это ломало ротацию целиком: во frontmatter
 * выше `image:` стоит список `sources:`, у каждого источника свой `url:`.
 * Скрипт читал ссылку на первоисточник, она не начиналась с /images/stock/,
 * и кадр считался ни разу не выходившим. Ни разу не выходившими были ВСЕ
 * кадры всегда, сортировка «по давности» превращалась в сортировку по имени
 * файла, и по каждой теме выдавался один и тот же снимок. Отсюда две
 * соседние статьи 21.08.2026 с одинаковым фото башен ЦБ.
 */
function stockUrlOf(text) {
  const head = text.split(/\n---/, 1)[0];
  const block = head.match(/^image:\s*\n((?:[ \t]+.*\n?)*)/m);
  if (!block) return undefined;
  return (block[1].match(/^\s*url:\s*"([^"]*)"/m) ?? [])[1];
}

/** Когда каждый файл фототеки в последний раз ставили в статью. */
function lastUsed() {
  const seen = new Map();
  if (existsSync(POSTS)) {
    for (const day of readdirSync(POSTS).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))) {
      for (const f of readdirSync(join(POSTS, day))) {
        if (!f.endsWith(".mdx")) continue;
        // Переводы указывают тот же файл, что и оригинал, — считать их
        // отдельными выходами нельзя, иначе счётчик утроится.
        if (/\.(uz|en)\.mdx$/.test(f)) continue;
        noteUse(seen, stockUrlOf(readFileSync(join(POSTS, day, f), "utf8")), day, f.replace(/\.mdx$/, ""));
      }
    }
  }
  // Ещё не вышедшее датируется завтрашним днём: так оно заведомо новее
  // всего опубликованного и уходит в самый хвост ротации. Настоящей даты
  // выхода у него ещё нет — её поставит публикатор.
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  for (const dir of PENDING) {
    const abs = join(ROOT, dir);
    if (!existsSync(abs)) continue;
    for (const f of readdirSync(abs)) {
      if (!f.endsWith(".mdx") || /\.(uz|en)\.mdx$/.test(f)) continue;
      noteUse(seen, stockUrlOf(readFileSync(join(abs, f), "utf8")), tomorrow, f.replace(/\.mdx$/, ""));
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
  // Мелкие кадры в списке помечаем прямо в строке. Без пометки они выглядят
  // самыми привлекательными: «выходов 0, последний никогда» — то есть свежими.
  // Так 21.08.2026 в материал ушёл кадр 547×360: бильд посмотрел --list
  // глазами вместо --topic, увидел неиспользованный снимок и взял его.
  // Карточка для Instagram по нему не собралась.
  for (const p of withUsage) {
    const verdict =
      p.width < SOCIAL_MIN_WIDTH
        ? "  ✗ МЕЛКИЙ, в статью не ставить"
        : p.width < HERO_MIN_WIDTH
          ? "  — не для героя"
          : "";
    console.log(
      `${p.file.padEnd(38)} ${String(p.width).padStart(4)}px  ` +
        `выходов ${String(p.timesUsed).padStart(2)}  ` +
        `последний ${p.lastDay ?? "никогда"}  [${p.topics.join(", ")}]${verdict}`,
    );
  }
  console.error(
    `\n--list — только чтобы посмотреть, что вообще есть. Выбирать им нельзя: ` +
      `ротацию считает --topic, и он же не отдаст кадр уже ${SOCIAL_MIN_WIDTH} px.`,
  );
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

// Два материала подряд с одним и тем же кадром — брак, который видно
// с первого взгляда на ленту. 21.08.2026 так вышли две соседние статьи
// про курс доллара с одинаковым фото башен ЦБ.
//
// Ротация «самый давно не выходивший» этого не ловит, когда пригодный кадр
// по теме один: он же и самый давний, и самый свежий одновременно. Поэтому
// кадр, уже занятый сегодняшним днём или лежащий в очереди, из выдачи
// убирается совсем.
//
// Именно сутки, а не «предыдущий материал»: библиотека маленькая, и запрет
// на повтор вообще выключил бы её почти целиком — бильд ходил бы к
// первоисточнику за каждым материалом про курс, а это лишние фетчи. Сутки
// разводят соседей по ленте и оставляют кадру право выйти завтра.
const today = new Date(Date.now() + 5 * 3_600_000).toISOString().slice(0, 10);
const busy = pool.filter((p) => p.lastDay && p.lastDay >= today);
if (busy.length && busy.length < pool.length) {
  console.error(
    `[pick-stock] занято сегодняшними материалами, пропускаю: ` +
      busy.map((p) => `${p.file} (${p.lastSlug ?? "?"})`).join(", "),
  );
  pool = pool.filter((p) => !busy.includes(p));
} else if (busy.length) {
  console.error(
    `[pick-stock] все кадры темы «${topic}» уже стоят в сегодняшних материалах ` +
      `(${busy.map((p) => p.file).join(", ")}). Второй раз за день один и тот же ` +
      "снимок в ленту не идёт — возьми фото у первоисточника.",
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
