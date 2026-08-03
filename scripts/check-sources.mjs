#!/usr/bin/env node
// Проверяет живость всех лент из config/news-sources.json.
//
// Зачем. 1 августа 2026 выяснилось, что 13 источников из 36 мертвы — и никто
// этого не замечал, потому что фетчер молча пропускает упавшие ленты. Среди
// мёртвых был весь международный слой, на который опирается редполитика:
// Reuters, Eurasianet, Fergana, CABAR, Kazinform. Планёрки месяцами работали
// на одних узбекских сигналах, считая, что видят мировой контекст.
//
// Скрипт не чинит — он показывает. Запускается workflow-ом раз в сутки
// и падает с ненулевым кодом, если поломалось больше порога.
//
// CLI:
//   node scripts/check-sources.mjs              — проверить всё, вывести таблицу
//   node scripts/check-sources.mjs --json       — машиночитаемый вывод
//   node scripts/check-sources.mjs --max-dead=3 — упасть, если мёртвых больше трёх

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CONFIG_PATH = join(ROOT, "config/news-sources.json");

const argv = process.argv.slice(2);
const asJson = argv.includes("--json");
const maxDeadArg = argv.find((a) => a.startsWith("--max-dead="));
const maxDead = maxDeadArg ? Number(maxDeadArg.split("=")[1]) : Infinity;

const TIMEOUT_MS = 30_000;
const CONCURRENCY = 6;

// Тот же UA, что у фетчера. Часть площадок (gazeta.uz) рвёт HTTP/2 на
// кастомном User-Agent, и проверять надо ровно тем, чем ходим в проде.
const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const config = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));

async function check(src) {
  const started = Date.now();
  const base = {
    id: src.id,
    name: src.name,
    type: src.type,
    priority: src.priority,
    url: src.url,
    disabled: Boolean(src.disabled),
    requiresPlaywright: Boolean(src.requiresPlaywright),
  };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(src.url, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: {
        "User-Agent": UA,
        Accept:
          "application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.5",
      },
    });
    const body = await res.text();
    const items =
      (body.match(/<item[\s>]/g) || []).length +
      (body.match(/<entry[\s>]/g) || []).length;
    clearTimeout(timer);
    return {
      ...base,
      status: res.status,
      items,
      ms: Date.now() - started,
      // 200 с нулём items — тоже поломка: обычно значит, что фид рендерится
      // на JS и отдаёт пустую оболочку.
      healthy: res.ok && items > 0,
    };
  } catch (err) {
    clearTimeout(timer);
    return {
      ...base,
      status: err.name === "AbortError" ? "timeout" : "error",
      items: 0,
      ms: Date.now() - started,
      healthy: false,
      error: err.message,
    };
  }
}

async function pool(items, worker, limit) {
  const out = [];
  let i = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await worker(items[idx]);
    }
  });
  await Promise.all(runners);
  return out;
}

// Проверяем и отключённые тоже: если у Reuters снова появится фид, мы должны
// об этом узнать, а не держать запись отключённой вечно.
const results = await pool(config.rss, check, CONCURRENCY);

// ─── Сайты без RSS, которые разбирает pull-scrape-inbox.mjs ───
//
// Их отказ выглядит иначе, чем у ленты: страница открывается, но шаблон
// адреса перестаёт находить ссылки. Снаружи это неотличимо от «сегодня
// новостей нет», поэтому в ежедневный отчёт они обязаны попадать наравне
// с фидами — иначе рубрика тихо опустеет и заметят это через неделю.
//
// Проверяем упрощённо: сколько ссылок на странице подходит под шаблон.
// Полный разбор (заголовки, дедуп, потолки) — забота самого скрейпера;
// здесь важен один вопрос, ломающийся первым: находит ли шаблон хоть что-то.
async function checkScrape(rule) {
  const base = {
    id: rule.id,
    name: rule.name,
    url: rule.apiUrl || rule.listUrl,
    kind: rule.apiUrl ? "api" : "scrape",
  };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(rule.apiUrl || rule.listUrl, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": UA, "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8" },
    });

    // Источник с JSON-API проверяется по своим правилам: считаем записи
    // в массиве, а не ссылки в разметке. Без этой ветки проверка падала
    // на отсутствующем listUrl и каждый день докладывала о поломке живого
    // источника — ровно та ложная тревога, из-за которой перестают
    // смотреть на отчёт вообще.
    if (rule.apiUrl) {
      let data;
      try {
        data = JSON.parse(await res.text());
      } catch {
        return { ...base, status: res.status, items: 0, healthy: false, error: "ответ не JSON" };
      }
      let arr = data;
      for (const key of (rule.itemsPath ?? "").split(".").filter(Boolean)) arr = arr?.[key];
      const n = Array.isArray(arr) ? arr.length : 0;
      return { ...base, status: res.status, items: n, healthy: res.ok && n > 0 };
    }

    const html = await res.text();
    const origin = new URL(rule.listUrl).origin;
    const linkRe = new RegExp(rule.linkPattern);
    const excludeRe = rule.excludePattern ? new RegExp(rule.excludePattern) : null;
    const hits = new Set();
    for (const m of html.matchAll(/href="([^"]+)"/g)) {
      let abs;
      try { abs = new URL(m[1], rule.listUrl); } catch { continue; }
      if (abs.origin !== origin) continue;
      const path = abs.pathname.replace(/\/+$/, "") || "/";
      if (!linkRe.test(path)) continue;
      if (excludeRe && excludeRe.test(path)) continue;
      hits.add(path);
    }
    return { ...base, status: res.status, items: hits.size, healthy: res.ok && hits.size > 0 };
  } catch (err) {
    return { ...base, status: "error", items: 0, healthy: false, error: err.message };
  } finally {
    clearTimeout(timer);
  }
}

const scrapeRules = (config.htmlScrape ?? []).filter((r) => !r.disabled);
const scrapeResults = scrapeRules.length
  ? await pool(scrapeRules, checkScrape, CONCURRENCY)
  : [];
const scrapeBroken = scrapeResults.filter((r) => !r.healthy);

const active = results.filter((r) => !r.disabled && !r.requiresPlaywright);
const broken = active.filter((r) => !r.healthy);
const revived = results.filter((r) => r.disabled && r.healthy);
const neverFetched = results.filter((r) => r.requiresPlaywright && !r.disabled);

if (asJson) {
  console.log(JSON.stringify({ results, broken, revived, neverFetched, scrapeResults, scrapeBroken }, null, 2));
} else {
  console.log(
    `Проверено ${results.length} лент · активных ${active.length} · сломано ${broken.length}`,
  );
  if (scrapeResults.length) {
    console.log(
      `Источников без RSS ${scrapeResults.length} · сломано ${scrapeBroken.length}`,
    );
    for (const r of scrapeResults) {
      const mark = r.healthy ? "  ok  " : "  ✗   ";
      console.log(
        `${mark}${r.id.padEnd(16)} ${String(r.status).padEnd(8)} ссылок по шаблону: ${r.items}` +
          (r.healthy
            ? ""
            : r.kind === "api"
              ? "  ← API отвечает, но записей нет: проверь itemsPath"
              : "  ← шаблон адреса перестал находить статьи"),
      );
    }
  }

  if (broken.length) {
    console.log("\nСЛОМАНЫ (идут в фетч, но ничего не отдают):");
    for (const r of broken) {
      console.log(
        `  ${r.id.padEnd(16)} ${String(r.status).padEnd(8)} items=${String(r.items).padEnd(4)} ${r.url}`,
      );
    }
  }

  if (revived.length) {
    console.log("\nОЖИЛИ (помечены disabled, но фид отвечает — снять флаг):");
    for (const r of revived) {
      console.log(`  ${r.id.padEnd(16)} items=${String(r.items).padEnd(4)} ${r.url}`);
    }
  }

  if (neverFetched.length) {
    console.log(
      `\nНИКОГДА НЕ ФЕТЧАТСЯ (${neverFetched.length}): помечены requiresPlaywright,` +
        " а Playwright-раннера в CI нет — эти источники невидимы для планёрки:",
    );
    for (const r of neverFetched) console.log(`  ${r.id.padEnd(16)} ${r.url}`);
  }
}

// Массовые 403 — почти всегда не поломка источников, а окружение. Node fetch
// не читает HTTPS_PROXY сам: без NODE_USE_ENV_PROXY=1 в песочнице разработки
// Guardian, DW, FT и BBC дружно отдают 403, а с ним — 200 и полный фид.
// В GitHub Actions прокси нет и переменная не нужна.
if (broken.filter((r) => r.status === 403).length >= 3 && !process.env.NODE_USE_ENV_PROXY) {
  console.warn(
    "\n[check-sources] Три и больше лент отдали 403. Похоже на окружение, а не\n" +
      "  на источники. Перезапусти с NODE_USE_ENV_PROXY=1 перед тем, как править конфиг.",
  );
}

if (broken.length > maxDead) {
  console.error(
    `\n[check-sources] сломанных лент ${broken.length}, порог ${maxDead} — падаю`,
  );
  process.exit(1);
}
