#!/usr/bin/env node
// Находит границы окна по числовому id для изданий, чьи sitemap не отдают
// даты: UzNews (URL вида /news/10001) и Qalampir (id в хвосте slug'а). У обоих
// <lastmod> равен дню скачивания для всей карты сразу, то есть бесполезен.
//
// Идея: id выдаются по возрастанию во времени, поэтому границу мая и границу
// июля можно найти двоичным поиском, потрогав несколько десятков статей вместо
// ста двадцати тысяч.
//
// Монотонность id по времени — предположение, а не гарантия: правки,
// отложенные публикации и перенос архивов её ломают. Поэтому:
//   1. Перед поиском монотонность проверяется на случайной выборке.
//   2. Найденные границы раздвигаются запасом MARGIN, чтобы локальные
//      перестановки не срезали край окна.
//   3. Точная дата всё равно берётся со страницы статьи в collect-articles —
//      здесь мы только сужаем диапазон, а не выносим вердикт.
//
// CLI:
//   node research/resolve-id-window.mjs --outlet=uznews
//   node research/resolve-id-window.mjs --outlet=uznews,qalampir --from=… --to=…
//
// Выход: переписывает research/raw/sitemap-<outlet>.jsonl, оставив только
// материалы диапазона и проставив им дату там, где она была получена.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
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

const from = arg("--from", "2026-05-01");
const to = arg("--to", "2026-07-31");
const outlets = arg("--outlet", "uznews,qalampir").split(",");

// Запас по обе стороны найденной границы, в записях. Двести материалов это
// пара дней у самого плодовитого из этих двух — достаточно, чтобы пережить
// локальную перестановку id, и дёшево на выкачке.
const MARGIN = 200;
const PROBE_SAMPLE = 12;
const TIMEOUT_MS = 25_000;

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
      html.match(
        /<meta[^>]+content="([^"]*)"[^>]+(?:property|name)="article:published_time"/i,
      )?.[1] ??
      // Пробелы вокруг двоеточия обязательны в шаблоне: UzNews отдаёт
      // JSON-LD с отступами, и вариант без пробела там не встречается вовсе.
      html.match(/"datePublished"\s*:\s*"([^"]+)"/)?.[1] ??
      null;
    if (!raw) return null;
    // Форматы разъезжаются: где-то ISO с зоной, где-то «2026-08-04 23:55:00».
    return raw.slice(0, 10);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function numericId(row) {
  const n = Number.parseInt(row.key, 10);
  return Number.isFinite(n) ? n : null;
}

// Двоичный поиск первой записи с датой >= target. Записи без даты (удалённые,
// закрытые, сменившие адрес) просто пропускаем, сдвигаясь вправо: иначе одна
// битая ссылка уводит весь поиск.
async function findBoundary(rows, target, label) {
  let lo = 0;
  let hi = rows.length - 1;
  let answer = rows.length;
  let probes = 0;

  while (lo <= hi) {
    let mid = Math.floor((lo + hi) / 2);
    let date = null;

    for (let step = 0; step < 6 && mid + step <= hi; step += 1) {
      date = await publishedAt(rows[mid + step].url);
      probes += 1;
      await sleep(150);
      if (date) {
        mid += step;
        break;
      }
    }

    if (!date) {
      // Целый участок не отвечает — считаем его дореволюционным и идём вправо.
      lo = mid + 1;
      continue;
    }

    process.stdout.write(`    ${label}: проба ${probes}, id ${rows[mid].key} → ${date}   \r`);

    if (date >= target) {
      answer = mid;
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }

  process.stdout.write("\n");
  return { index: answer, probes };
}

// Монотонность по всему архиву не выполняется и проверять её бессмысленно. У
// UzNews видно два режима: id 3862 — это 2021 год, 23054 — 2018, 50209 — 2016
// (то есть старый архив залит в обратном порядке), а начиная примерно с 57862
// даты снова растут: 69363 — 2023, 111700 — 2026. Похоже на миграцию, при
// которой историю импортировали задом наперёд, а новые материалы стали
// дописывать по возрастанию.
//
// Нам древняя часть не нужна вовсе — окно лежит в самом хвосте. Поэтому вместо
// глобальной проверки растим хвост от конца списка, пока его первая запись не
// окажется старше начала окна, и монотонность проверяем только внутри хвоста.
async function growTail(rows, target) {
  let size = 512;
  const probed = [];

  while (size < rows.length) {
    const start = rows.length - size;
    const date = await publishedAt(rows[start].url);
    await sleep(150);
    probed.push({ id: numericId(rows[start]), date });
    process.stdout.write(`    хвост ${size}: id ${rows[start].key} → ${date ?? "нет даты"}   \r`);
    // Дата не читается — не считаем это достижением цели, просто растём
    // дальше: иначе одна битая страница обрежет хвост раньше времени.
    if (date && date < target) {
      process.stdout.write("\n");
      return { start, size, probed };
    }
    size *= 2;
  }

  process.stdout.write("\n");
  return { start: 0, size: rows.length, probed };
}

async function checkMonotonic(rows) {
  const step = Math.max(1, Math.floor(rows.length / (PROBE_SAMPLE + 1)));
  const points = [];
  for (let i = 1; i <= PROBE_SAMPLE; i += 1) {
    const row = rows[i * step];
    if (!row) continue;
    const date = await publishedAt(row.url);
    await sleep(150);
    if (date) points.push({ id: numericId(row), date });
  }
  let inversions = 0;
  for (let i = 1; i < points.length; i += 1) {
    if (points[i].date < points[i - 1].date) inversions += 1;
  }
  return { points, inversions };
}

for (const outletId of outlets) {
  const path = join(RAW_DIR, `sitemap-${outletId}.jsonl`);
  if (!existsSync(path)) {
    console.log(`${outletId}: нет ${path}`);
    continue;
  }

  const all = readFileSync(path, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));

  const rows = all
    .map((r) => ({ ...r, num: numericId(r) }))
    .filter((r) => r.num != null)
    .sort((a, b) => a.num - b.num);

  console.log(`\n${outletId}: записей с числовым id ${rows.length} из ${all.length}`);
  console.log(`  id от ${rows[0].num} до ${rows.at(-1).num}`);

  const tail = await growTail(rows, from);
  const region = rows.slice(tail.start);
  console.log(
    `  хвост: ${region.length} записей, id от ${region[0].key} (проб ${tail.probed.length})`,
  );

  const { points, inversions } = await checkMonotonic(region);
  console.log(
    `  монотонность хвоста: ${points.length} точек, инверсий ${inversions}` +
      (points.length ? ` (${points[0].date} … ${points.at(-1).date})` : ""),
  );
  if (inversions > 1) {
    console.log(
      "  id не монотонны даже в хвосте — двоичный поиск неприменим, нужен сплошной обход",
    );
    continue;
  }

  const lo = await findBoundary(region, from, "нижняя");
  // Верхняя граница — первая запись, вышедшая уже за окном, то есть на
  // следующий день после его конца.
  const hi = await findBoundary(region, nextDay(to), "верхняя");

  const start = Math.max(0, lo.index - MARGIN);
  const end = Math.min(region.length, hi.index + MARGIN);
  const slice = region.slice(start, end).map(({ num, ...rest }) => rest);

  console.log(
    `  окно: индексы ${start}…${end} хвоста (${slice.length} записей), ` +
      `id ${region[start]?.key} … ${region[Math.min(end, region.length) - 1]?.key}, ` +
      `проб ${lo.probes + hi.probes}`,
  );

  writeFileSync(path, slice.map((r) => JSON.stringify(r)).join("\n") + "\n");
  console.log(`  → ${path} сужен до диапазона`);
}

function nextDay(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
