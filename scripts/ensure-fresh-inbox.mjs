#!/usr/bin/env node
// Гарантия свежего инбокса к началу планёрки.
//
// ЗАЧЕМ. Новости в репозиторий приносит workflow news-inbox.yml, то есть
// планировщик GitHub. Он ненадёжен, и это измерено, а не предположено:
// editor-queue с расписанием «каждые 10 минут» фактически запускался раз
// в час; фетчер отрабатывал два слота из четырёх с опозданием на 7–25 минут;
// 3 августа планировщик молчал три с половиной часа при полностью зелёном
// статусе GitHub и при том, что запуски по событию в те же минуты проходили
// за 19 секунд.
//
// Пока сбор новостей висит на этом планировщике, у редакции одна точка
// отказа: планёрки живы (их расписание на code.claude.com, независимое),
// но приходят к трёхчасовому инбоксу и уходят ни с чем.
//
// ЧТО ДЕЛАЕТ. Смотрит возраст самого свежего item'а. Инбокс свежий —
// не делает ничего и стоит доли секунды. Инбокс протух — собирает новости
// сам, прямо в сессии планёрки.
//
// ПОЧЕМУ НЕ ОТДЕЛЬНОЙ РУТИНОЙ МЕЖДУ ПЛАНЁРКАМИ. Рассматривалось и отклонено.
// Полный фетч занимает около 11 минут, между планёрками 20, и harness ещё
// сдвигает старт на несколько минут — фетч, начатый в :10, финиширует уже
// внутри планёрки :20, которая к тому моменту работает со старыми данными.
// Плюс обе стороны коммитят один и тот же файл инбокса, а конфликт при
// rebase прерывает пуш. Здесь гонки нет по построению: сбор и разбор идут
// в одной сессии, последовательно.
//
// ПОЧЕМУ ТОЛЬКО P0/P1 В АВАРИЙНОМ РЕЖИМЕ. Полный обход стоит 11 минут,
// а планёрке нужно ещё производить материалы до прихода следующей. P0 и P1 —
// это госорганы и ведущие ленты, там появляется всё, ради чего стоит спешить.
// P2 и P3 дождутся воркфлоу: их темы не портятся за полчаса.
//
// Использование:
//   node scripts/ensure-fresh-inbox.mjs                 — проверить и, если надо, собрать
//   node scripts/ensure-fresh-inbox.mjs --max-age=25    — порог свежести, минут
//   node scripts/ensure-fresh-inbox.mjs --priority=P0,P1,P2
//   node scripts/ensure-fresh-inbox.mjs --force         — собрать независимо от возраста
//   node scripts/ensure-fresh-inbox.mjs --check         — только сказать, надо ли; не собирать

import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { ROOT, readInbox, dedupeByLink, itemAgeHours } from "../lib/inbox-core.mjs";

function opt(name, fallback) {
  const p = process.argv.find((a) => a.startsWith(`--${name}=`));
  return p ? p.slice(name.length + 3) : fallback;
}
const flag = (n) => process.argv.includes(`--${n}`);

const maxAgeMin = Number(opt("max-age", 25));
const priority = opt("priority", "P0,P1");
const at = Date.now();

function newestAgeMinutes() {
  const items = dedupeByLink([
    ...readInbox(ROOT, { at }).items,
    ...readInbox(ROOT, { world: true, at }).items,
  ]);
  let best = null;
  for (const it of items) {
    const age = itemAgeHours(it, at);
    if (age === null) continue;
    const min = age * 60;
    if (best === null || min < best) best = min;
  }
  return { age: best === null ? null : Math.round(best), count: items.length };
}

const before = newestAgeMinutes();
const stale = before.age === null || before.age > maxAgeMin;

if (!stale && !flag("force")) {
  console.error(
    `[fresh-inbox] инбокс свежий (${before.age} мин, порог ${maxAgeMin}) — фетч не нужен`,
  );
  process.stdout.write(JSON.stringify({ fetched: false, ageMinutes: before.age }) + "\n");
  process.exit(0);
}

const why =
  before.age === null
    ? "инбокс пуст или без дат"
    : `самому свежему item'у ${before.age} мин при пороге ${maxAgeMin}`;

if (flag("check")) {
  console.error(`[fresh-inbox] НУЖЕН ФЕТЧ: ${why}`);
  process.stdout.write(JSON.stringify({ fetched: false, needed: true, ageMinutes: before.age }) + "\n");
  process.exit(0);
}

console.error(`[fresh-inbox] ${why} — воркфлоу молчит, собираю сама (приоритеты ${priority})`);

// Фетчерам нужен npm-пакет rss-parser. Планёрка работает в свежем клоне,
// где node_modules может не быть: ставим только если действительно нет,
// чтобы не платить установкой на каждом заходе.
if (!existsSync(join(ROOT, "node_modules/rss-parser"))) {
  console.error("[fresh-inbox] ставлю зависимости (rss-parser отсутствует)");
  const r = spawnSync("npm", ["install", "--no-audit", "--no-fund", "--no-save"], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "ignore", "inherit"],
  });
  if (r.status !== 0) {
    console.error("[fresh-inbox] npm install упал — фетч невозможен");
    process.stdout.write(JSON.stringify({ fetched: false, error: "npm install failed" }) + "\n");
    process.exit(0); // не роняем планёрку: пусть работает с тем, что есть
  }
}

// Оба фетчера независимы: падение одного не должно отменять второй.
// RSS и Telegram ломаются по разным причинам — блокировки, таймауты,
// смена вёрстки, — и терять оба потока из-за одного нельзя.
const ran = [];
for (const script of ["pull-news-inbox.mjs", "pull-telegram-inbox.mjs", "pull-scrape-inbox.mjs"]) {
  // Скрейперу приоритеты не передаём: сайтов всего четыре, обход занимает
  // секунды, а daryo и repost — крупные узбекские издания, терять их
  // в аварийном режиме бессмысленно.
  const args = script === "pull-scrape-inbox.mjs"
    ? [join(ROOT, "scripts", script)]
    : [join(ROOT, "scripts", script), `--priority=${priority}`];
  const r = spawnSync("node", args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "ignore", "inherit"],
  });
  ran.push({ script, ok: r.status === 0 });
  if (r.status !== 0) console.error(`[fresh-inbox] ${script} завершился с кодом ${r.status}`);
}

const after = newestAgeMinutes();
console.error(
  `[fresh-inbox] собрано: было ${before.count} items (свежесть ${before.age} мин), ` +
    `стало ${after.count} (свежесть ${after.age} мин)`,
);

process.stdout.write(
  JSON.stringify({
    fetched: true,
    priority,
    before: { items: before.count, ageMinutes: before.age },
    after: { items: after.count, ageMinutes: after.age },
    scripts: ran,
  }) + "\n",
);
