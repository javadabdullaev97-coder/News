#!/usr/bin/env node
// Рисует недостающие карточки 1080×1350 для Instagram и Facebook.
//
// ПОЧЕМУ ОТДЕЛЬНЫМ ШАГОМ, А НЕ ВНУТРИ ПОСТЕРА. Instagram забирает картинку
// по публичному URL, а не байтами. Значит карточка обязана лежать на leap.uz
// раньше, чем вызывается API. Порядок такой:
//
//   1. bild кладёт картинку статьи         → пуш в content/posts
//   2. ЭТОТ скрипт рисует карточку          → пуш в public/images/social
//   3. deploy-site выкладывает сайт         → карточка доступна по URL
//   4. post-to-social постит                → Meta забирает её по этому URL
//
// Шаги 2 и 4 — разные воркфлоу именно поэтому: между ними обязан пройти
// деплой. Постер это ещё и перепроверяет запросом HEAD, но правильный
// порядок дешевле проверки.
//
// Токенов не стоит: заголовок берётся из frontmatter, рубрика — по словарю
// config/social.json, рисует Pillow.
//
// ENV:
//   SITE_URL — https://leap.uz (только для формирования адресов)
//   FORCE    — 1 чтобы перерисовать карточки, которые уже есть

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { collectPublishable, kickerFor } from "../lib/social-queue.mjs";
import { decodeEntities } from "../lib/frontmatter.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(HERE);
const config = JSON.parse(readFileSync(join(ROOT, "config/social.json"), "utf8"));

const { SITE_URL = "https://leap.uz", FORCE } = process.env;
const force = FORCE === "1" || FORCE === "true";

const { items, skipped } = collectPublishable(ROOT, config, { siteUrl: SITE_URL });

console.error(`[cards] кандидатов: ${items.length}, пропущено: ${skipped.length}`);
for (const s of skipped.slice(0, 20)) console.error(`  – ${s.rel}: ${s.why}`);
if (skipped.length > 20) console.error(`  … и ещё ${skipped.length - 20}`);

let drawn = 0;
let reused = 0;
let failed = 0;

for (const item of items) {
  if (!force && existsSync(item.card.abs)) {
    reused++;
    continue;
  }

  const title = decodeEntities(String(item.fm.title || "")).trim();
  const kicker = kickerFor(config, item.lang, item.category);

  try {
    const out = execFileSync(
      "python3",
      [
        join(ROOT, "scripts/render-social-card.py"),
        "--source",
        item.imageAbs,
        "--title",
        title,
        "--kicker",
        kicker,
        "--out",
        item.card.abs,
      ],
      { encoding: "utf8" },
    );
    const report = JSON.parse(out.trim().split("\n").pop());
    if (report.status !== "ok") {
      failed++;
      console.error(`  ✗ ${item.rel}: ${report.status} ${report.error ?? ""}`);
      continue;
    }
    drawn++;
    console.error(
      `  ✓ ${item.card.rel} — ${report.photo.mode}, срезано ${Math.round(report.photo.cropped * 100)}%, кегль ${report.headlineSize}/${report.headlineLines} стр.`,
    );
  } catch (err) {
    failed++;
    console.error(`  ✗ ${item.rel}: ${err.message}`);
  }
}

console.error(`[cards] нарисовано ${drawn}, уже было ${reused}, ошибок ${failed}`);
// Ненулевой код только на ошибках рендера: «нечего рисовать» — нормальный
// исход тихого дня, воркфлоу не должен от него краснеть.
if (failed) process.exit(1);
