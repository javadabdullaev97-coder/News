#!/usr/bin/env node
// Строит список материалов за нужные недели для изданий, у которых sitemap
// непригоден: UzNews и Qalampir.
//
// Почему не хватило карт. У обоих <lastmod> равен дню скачивания для всей
// карты сразу, а даты в URL нет. Но хуже другое: карта UzNews неполна. В
// диапазоне id 109000-111745 в ней 1667 записей и отсутствует 1079, причём
// отсутствующие — не удалённые материалы: страницы открываются и отдают
// нормальную дату. То есть сузить карту недостаточно, надо идти по id.
//
// Идентификаторы в свежей части выдаются подряд и по возрастанию времени,
// поэтому границы недели находятся двоичным поиском по пространству id
// (а не по записям карты), после чего диапазон выписывается целиком.
//
// Про монотонность: она держится только в новой части. У UzNews id 3862 —
// это 2021 год, 23054 — 2018, 50209 — 2016, а начиная примерно с 57862 даты
// снова растут. Поиск ведётся от верхней границы вниз и в древнюю часть не
// заходит, так что этот излом ему не мешает.
//
// CLI:
//   node research/enumerate-ids.mjs --outlet=uznews
//   node research/enumerate-ids.mjs --weeks=2026-05-11,2026-06-15,2026-07-13
//
// Выход: перезаписывает research/raw/sitemap-<outlet>.jsonl списком адресов
// нужных диапазонов (без дат — они придут со страниц в collect-articles).

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { USER_AGENT } from "./lib/outlets.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = join(HERE, "raw");

const argv = process.argv.slice(2);
const arg = (flag, fallback) => {
  const hit = argv.find((a) => a.startsWith(`${flag}=`));
  return hit ? hit.slice(flag.length + 1) : fallback;
};

const weeks = arg("--weeks", "2026-05-11,2026-06-15,2026-07-13").split(",");
const outletIds = arg("--outlet", "uznews,qalampir").split(",");

const TIMEOUT_MS = 25_000;
const PROBE_DELAY_MS = 120;
// Запас по краям каждого диапазона. Порядок id не идеален: соседние материалы
// иногда меняются местами на несколько позиций из-за отложенной публикации.
const MARGIN = 40;

const TARGETS = {
  uznews: {
    name: "UzNews.uz",
    url: (id) => `https://www.uznews.uz/news/${id}`,
    // Верх диапазона берём из карты — она хоть и дырявая, но самый свежий id
    // в ней настоящий.
    seedFrom: "sitemap-uznews.jsonl",
  },
  qalampir: {
    name: "Qalampir.uz",
    // Короткая форма редиректит на полный slug, поэтому знать slug заранее не
    // нужно — это и делает перебор возможным.
    url: (id) => `https://qalampir.uz/n/${id}`,
    seedFrom: "sitemap-qalampir.jsonl",
  },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function publishedAt(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const raw =
      html.match(
        /<meta[^>]+(?:property|name)="article:published_time"[^>]+content="([^"]*)"/i,
      )?.[1] ??
      html.match(/"datePublished"\s*:\s*"([^"]+)"/)?.[1] ??
      null;
    return raw ? raw.slice(0, 10) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Дата id с обходом дыр: если материал не отвечает, пробуем соседние вверх.
// Дыры в нумерации у обоих изданий обычные — черновики, снятые материалы.
async function dateNear(target, id, maxId) {
  for (let step = 0; step < 8 && id + step <= maxId; step += 1) {
    const date = await publishedAt(target.url(id + step));
    await sleep(PROBE_DELAY_MS);
    if (date) return { date, at: id + step };
  }
  return { date: null, at: id };
}

// Первый id, чья дата >= day.
async function boundary(target, lo, hi, day, label) {
  let probes = 0;
  let answer = hi;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const { date, at } = await dateNear(target, mid, hi);
    probes += 1;
    if (!date) {
      lo = mid + 1;
      continue;
    }
    process.stdout.write(`    ${label}: id ${at} → ${date}      \r`);
    if (date >= day) {
      answer = at;
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }
  return { id: answer, probes };
}

function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

for (const outletId of outletIds) {
  const target = TARGETS[outletId];
  if (!target) {
    console.log(`${outletId}: перебор id для этого издания не описан`);
    continue;
  }

  const seedPath = join(RAW_DIR, target.seedFrom);
  if (!existsSync(seedPath)) {
    console.log(`${target.name}: нет ${seedPath}`);
    continue;
  }

  const ids = readFileSync(seedPath, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => Number.parseInt(JSON.parse(l).key, 10))
    .filter(Number.isFinite);

  const maxId = Math.max(...ids);
  // Нижняя отсечка поиска: заведомо раньше окна, но уже в «новой» части
  // нумерации. Год материалов при любой плодовитости укладывается в 40 тысяч.
  const floorId = Math.max(1, maxId - 40_000);

  console.log(`\n${target.name}: id в карте до ${maxId}, поиск от ${floorId}`);

  const ranges = [];
  let probesTotal = 0;

  for (const monday of weeks) {
    const weekEnd = addDays(monday, 7);
    const lo = await boundary(target, floorId, maxId, monday, `${monday} начало`);
    const hi = await boundary(target, lo.id, maxId, weekEnd, `${monday} конец`);
    probesTotal += lo.probes + hi.probes;
    const fromId = Math.max(floorId, lo.id - MARGIN);
    const toId = Math.min(maxId, hi.id + MARGIN);
    process.stdout.write("\n");
    console.log(`  неделя ${monday}: id ${fromId} … ${toId} (${toId - fromId + 1})`);
    ranges.push([fromId, toId]);
  }

  // Диапазоны недель могут наложиться, если запас их сомкнул.
  ranges.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const [lo, hi] of ranges) {
    const last = merged.at(-1);
    if (last && lo <= last[1] + 1) last[1] = Math.max(last[1], hi);
    else merged.push([lo, hi]);
  }

  const rows = [];
  for (const [lo, hi] of merged) {
    for (let id = lo; id <= hi; id += 1) {
      rows.push({
        outlet: outletId,
        lang: null,
        date: null,
        slug: String(id),
        key: String(id),
        url: target.url(id),
        lastmod: null,
      });
    }
  }

  const out = join(RAW_DIR, `sitemap-${outletId}.jsonl`);
  writeFileSync(out, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
  console.log(
    `  итого адресов ${rows.length}, проб ${probesTotal}\n  → ${out}`,
  );
}
