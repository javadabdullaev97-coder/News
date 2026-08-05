#!/usr/bin/env node
// Пересобирает research/raw/telegram-summary.json из уже скачанных выгрузок
// telegram-<channel>.jsonl.
//
// Нужен потому, что каналы приходится добирать поштучно: Telegram душит темп
// на второй тысяче страниц, и часть каналов доезжает отдельными прогонами.
// Сводка при этом всегда должна описывать все тринадцать, а не последний
// прогон. Здесь она считается по факту лежащих на диске данных, без опоры на
// то, чем закончился какой прогон.
//
// CLI: node research/rebuild-telegram-summary.mjs [--from=…] [--to=…]

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CHANNELS } from "./lib/channels.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = join(HERE, "raw");

const argv = process.argv.slice(2);
const arg = (flag, fallback) => {
  const hit = argv.find((a) => a.startsWith(`${flag}=`));
  return hit ? hit.slice(flag.length + 1) : fallback;
};
const from = arg("--from", "2026-05-01");
const to = arg("--to", "2026-07-31");

const median = (nums) => {
  if (!nums.length) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
};

const channels = [];
const missing = [];

for (const channel of CHANNELS) {
  const path = join(RAW_DIR, `telegram-${channel.id}.jsonl`);
  if (!existsSync(path)) {
    missing.push(channel.id);
    continue;
  }
  const rows = readFileSync(path, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));

  const days = new Set(rows.map((r) => r.postedAt?.slice(0, 10)).filter(Boolean));
  const dayList = [...days].sort();
  const views = rows.map((r) => r.views).filter((v) => v != null);
  const medianViews = median(views);
  const withLinks = rows.filter((r) => r.links?.length).length;

  // Окно считается закрытым, если самый старый пост попадает в первые сутки
  // диапазона. Иначе отмотка оборвалась и цифры — нижняя граница.
  const complete = dayList.length > 0 && dayList[0] <= from;

  channels.push({
    channel: channel.id,
    outlet: channel.outlet,
    lang: channel.lang,
    subscribers: channel.subscribers,
    posts: rows.length,
    days: days.size,
    firstDay: dayList[0] ?? null,
    lastDay: dayList.at(-1) ?? null,
    perDay: days.size ? +(rows.length / days.size).toFixed(1) : 0,
    withLinks,
    linkShare: rows.length ? +((withLinks / rows.length) * 100).toFixed(1) : 0,
    withPhoto: rows.filter((r) => r.hasPhoto).length,
    withVideo: rows.filter((r) => r.hasVideo).length,
    forwards: rows.filter((r) => r.isForward).length,
    medianViews,
    viewsPerSubscriber:
      medianViews && channel.subscribers
        ? +((medianViews / channel.subscribers) * 100).toFixed(1)
        : null,
    complete,
  });
}

channels.sort((a, b) => (b.subscribers ?? 0) - (a.subscribers ?? 0));

const out = join(RAW_DIR, "telegram-summary.json");
writeFileSync(
  out,
  JSON.stringify(
    { window: { from, to }, rebuiltAt: new Date().toISOString(), channels, missing },
    null,
    2,
  ),
);

console.log("канал                яз   постов  /день  дней  ссыл%  фото%  медиана  %подп  подписч  окно");
for (const c of channels) {
  console.log(
    ("@" + c.channel).padEnd(20) +
      " " +
      String(c.lang).padEnd(3) +
      String(c.posts).padStart(7) +
      String(c.perDay).padStart(7) +
      String(c.days).padStart(6) +
      String(c.linkShare).padStart(7) +
      String(+((c.withPhoto / (c.posts || 1)) * 100).toFixed(0)).padStart(7) +
      String(c.medianViews ?? "—").padStart(9) +
      String(c.viewsPerSubscriber ?? "—").padStart(7) +
      String(c.subscribers).padStart(9) +
      "  " +
      (c.complete ? "полно" : `ОБРЫВ с ${c.firstDay}`),
  );
}
if (missing.length) console.log(`\nНет выгрузок: ${missing.join(", ")}`);
console.log(`\n→ ${out}`);
