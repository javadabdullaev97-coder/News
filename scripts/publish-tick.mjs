#!/usr/bin/env node
// Публикатор: выпускает из очереди то, чему пришёл срок.
//
// ЗАЧЕМ ОН ОТДЕЛЬНО ОТ ПЛАНЁРКИ. Планёрка отрабатывает пачкой и уходит.
// Без публикатора её материалы падали на сайт залпом, а следующие полчаса
// не выходило ничего. Публикатор разносит пачку по времени и продолжает
// капать, даже если очередная планёрка вернулась ни с чем или упала.
//
// ЧТО ЗДЕСЬ ПРОИСХОДИТ. Ровно перенос файла из content/queue/ в
// content/posts/ГГГГ-ММ-ДД/. Всё остальное уже висит на этом событии:
//   — сайт пересобирает Cloudflare на любой пуш в main;
//   — telegram-autopost срабатывает на push с путём content/posts/**/*.mdx.
// Отдельной системы публикации не появляется, появляется только управление
// моментом, когда файл попадает в content/posts.
//
// ПОЧЕМУ publishedAt СТАВИТСЯ ЗДЕСЬ. Это единственное место, где известен
// настоящий момент выхода. Раньше дату писал агент, вычисляя смещение
// в уме, — и она разъезжалась на пять часов в обе стороны, а однажды
// материал вышел с датой на семь часов вперёд и встал первым в ленте,
// пока время его не догнало. Теперь дату ставит скрипт по системным часам,
// и агент её не пишет вообще нигде.
//
// Использование:
//   node scripts/publish-tick.mjs             — выпустить созревшее
//   node scripts/publish-tick.mjs --dry-run   — только показать план
//   node scripts/publish-tick.mjs --plan      — показать расписание целиком

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatter } from "../lib/frontmatter.mjs";
import { planReleases, dueNow } from "../lib/publish-queue.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const QUEUE_DIR = join(ROOT, "content/queue");
const POSTS_DIR = join(ROOT, "content/posts");

const flag = (n) => process.argv.includes(`--${n}`);
const dryRun = flag("dry-run");

// Ташкент — UTC+5 круглый год, перевода часов нет.
const TASHKENT_OFFSET_MIN = 5 * 60;

function tashkent(ms) {
  return new Date(ms + TASHKENT_OFFSET_MIN * 60_000);
}

/** Дата и время в формате frontmatter: 2026-08-04T09:12:00+05:00 */
function stampPublishedAt(ms) {
  const d = tashkent(ms);
  const p = (n) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}` +
    `T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:00+05:00`
  );
}

/** Каталог дня по ташкентскому календарю, а не по UTC. */
function dayDir(ms) {
  return stampPublishedAt(ms).slice(0, 10);
}

/**
 * Когда придёт следующая пачка. Планёрки стоят на :00 и :30 ташкентского
 * времени, то есть на тех же минутах и в UTC — смещение кратно часу.
 */
function nextBatchAt(now) {
  const d = new Date(now);
  const m = d.getUTCMinutes();
  const add = m < 30 ? 30 - m : 60 - m;
  return now + add * 60_000 - d.getUTCSeconds() * 1000 - d.getUTCMilliseconds();
}

/**
 * Момент постановки в очередь. Основной источник — frontmatter, запасной —
 * git: время первого коммита файла. Без запасного варианта материал,
 * положенный без queuedAt, считался бы вечно свежим и не выходил никогда.
 */
function queuedAtOf(fm, relPath) {
  if (typeof fm.queuedAt === "string" && Number.isFinite(Date.parse(fm.queuedAt))) {
    return fm.queuedAt;
  }
  try {
    const out = execFileSync(
      "git",
      ["log", "--diff-filter=A", "--format=%cI", "-1", "--", relPath],
      { cwd: ROOT, encoding: "utf8" },
    ).trim();
    if (out) return out;
  } catch {
    // Файл ещё не в гите — значит его положили только что.
  }
  return new Date().toISOString();
}

function readQueue() {
  if (!existsSync(QUEUE_DIR)) return [];
  return readdirSync(QUEUE_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .sort()
    .map((file) => {
      const path = join(QUEUE_DIR, file);
      const raw = readFileSync(path, "utf8");
      const fm = parseFrontmatter(raw);
      return {
        slug: file.replace(/\.mdx$/, ""),
        file,
        path,
        raw,
        fm,
        queuedAt: queuedAtOf(fm, `content/queue/${file}`),
        urgency: typeof fm.urgency === "string" ? fm.urgency : "standard",
        tgScore: Number(fm.tgScore) || 0,
        awaitingEditor: fm.awaitingEditor === true || fm.awaitingEditor === "true",
      };
    })
    // Материал, ждущий ответа владельца, из очереди не выходит: спрашивать
    // и публиковать не дожидаясь ответа — бессмысленно.
    .filter((x) => !x.awaitingEditor);
}

/** Проставляет publishedAt и убирает служебное queuedAt. */
function stamp(raw, publishedAt) {
  let out = raw;
  out = out.replace(/^queuedAt:.*\n/m, "");
  if (/^publishedAt:/m.test(out)) {
    out = out.replace(/^publishedAt:.*$/m, `publishedAt: "${publishedAt}"`);
  } else {
    // Ставим сразу после title — там же, где поле стоит у остальных статей.
    out = out.replace(/^(title:.*\n)/m, `$1publishedAt: "${publishedAt}"\n`);
  }
  return out;
}

const now = Date.now();
const queue = readQueue();

if (!queue.length) {
  console.error("[publish] очередь пуста");
  if (!dryRun) {
    mkdirSync(join(ROOT, "content/state"), { recursive: true });
    writeFileSync(
      join(ROOT, "content/state/publish-plan.json"),
      JSON.stringify({ generatedAt: new Date(now).toISOString(), nextDueAt: null, queued: 0 }, null, 2) + "\n",
    );
  }
  process.stdout.write(JSON.stringify({ released: [], queued: 0, nextDueAt: null }) + "\n");
  process.exit(0);
}

const batchAt = nextBatchAt(now);
const plan = planReleases(queue, { now, nextBatchAt: batchAt });
const ready = dueNow(plan, now);

console.error(
  `[publish] в очереди ${queue.length}, следующая планёрка через ` +
    `${Math.round((batchAt - now) / 60_000)} мин, созрело ${ready.length}`,
);
// Метка берётся из того же признака, по которому принимается решение, а не
// из округлённых минут: иначе строка «СЕЙЧАС» появлялась у материала, до
// которого оставались секунды, и отчёт расходился со счётчиком созревших.
const readySlugs = new Set(ready.map((p) => p.slug));
for (const p of plan) {
  const inMin = Math.round((p.dueAt - now) / 60_000);
  const when = readySlugs.has(p.slug) ? "СЕЙЧАС" : `+${inMin} мин`.padStart(7);
  console.error(`   ${when}  ${p.slug}  (${p.reason})`);
}

if (flag("plan")) process.exit(0);

const released = [];
for (const p of ready) {
  const item = queue.find((q) => q.slug === p.slug);
  if (!item) continue;
  const publishedAt = stampPublishedAt(now);
  const dir = join(POSTS_DIR, dayDir(now));
  const target = join(dir, item.file);

  if (dryRun) {
    console.error(`  [dry] ${item.slug} → ${dayDir(now)}/ publishedAt ${publishedAt}`);
    released.push({ slug: item.slug, publishedAt, reason: p.reason, dryRun: true });
    continue;
  }

  mkdirSync(dir, { recursive: true });
  writeFileSync(item.path, stamp(item.raw, publishedAt));
  renameSync(item.path, target);
  console.error(`  ✓ ${item.slug} → content/posts/${dayDir(now)}/ (${p.reason})`);
  released.push({ slug: item.slug, publishedAt, reason: p.reason });
}

// Подсказка для внешних часов: когда следующему материалу пора выходить.
//
// Без неё воркер дёргал бы выпуск вслепую — раз в несколько минут, пока
// очередь не пуста. Каждый холостой запуск стоит оплаченную минуту Actions
// (GitHub округляет вверх), и на активной очереди это десятки лишних минут
// в сутки. С подсказкой запусков ровно столько, сколько выпусков.
const pending = plan.filter((p) => !released.some((r) => r.slug === p.slug));
const nextDueAt = pending.length ? new Date(Math.min(...pending.map((p) => p.dueAt))).toISOString() : null;

if (!dryRun) {
  mkdirSync(join(ROOT, "content/state"), { recursive: true });
  writeFileSync(
    join(ROOT, "content/state/publish-plan.json"),
    JSON.stringify({ generatedAt: new Date(now).toISOString(), nextDueAt, queued: pending.length }, null, 2) + "\n",
  );
}

process.stdout.write(
  JSON.stringify({
    released,
    queued: pending.length,
    nextDueAt,
    nextDueInMinutes: pending.length
      ? Math.round((Math.min(...pending.map((p) => p.dueAt)) - now) / 60_000)
      : null,
  }) + "\n",
);
