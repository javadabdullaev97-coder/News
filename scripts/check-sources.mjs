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

const active = results.filter((r) => !r.disabled && !r.requiresPlaywright);
const broken = active.filter((r) => !r.healthy);
const revived = results.filter((r) => r.disabled && r.healthy);
const neverFetched = results.filter((r) => r.requiresPlaywright && !r.disabled);

if (asJson) {
  console.log(JSON.stringify({ results, broken, revived, neverFetched }, null, 2));
} else {
  console.log(
    `Проверено ${results.length} лент · активных ${active.length} · сломано ${broken.length}`,
  );

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
