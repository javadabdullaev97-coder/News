#!/usr/bin/env node
// Публикует статьи в Instagram и на страницу Facebook.
//
// Запускается ПОСЛЕ успешного деплоя сайта (см. .github/workflows/
// social-autopost.yml): Instagram забирает картинку по публичному URL,
// поэтому карточка обязана быть выложена на leap.uz до вызова API.
//
// СТОИМОСТЬ ПОСТА В ТОКЕНАХ — НОЛЬ. Всё, что нужно для публикации, редакция
// уже произвела: заголовок, лид, картинка, рубрика, флаг broadcast. Скрипт их
// читает и отправляет. Модель в цикле публикации не участвует — так же, как
// в scripts/post-to-telegram.mjs. Любая «адаптация текста под соцсеть»
// означала бы вызов модели на каждый пост, то есть постоянную плату за то,
// что редакция уже написала один раз.
//
// Дедуп — content/state/social-posted.jsonl по ключу «сеть + язык + слаг».
// Один материал законно уходит четырьмя постами (два языка × две сети),
// и ни один из них не считается дублем другого.
//
// ENV:
//   META_ACCESS_TOKEN  — токен системного пользователя (бессрочный)
//   IG_USER_ID_RU/UZ   — идентификаторы Instagram-аккаунтов
//   FB_PAGE_ID_RU/UZ   — идентификаторы страниц Facebook
//   FB_PAGE_TOKEN_*    — необязательно: отдельный токен страницы, если
//                        системный не имеет прав на публикацию от её имени
//   SITE_URL           — https://leap.uz
//   GRAPH_VERSION      — версия Graph API, по умолчанию v25.0
//   DRY_RUN            — 1 чтобы показать, что ушло бы, и ничего не отправлять
//   ONLY_NETWORK       — instagram | facebook, ограничить одной сетью

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { decodeEntities, extractLede } from "../lib/frontmatter.mjs";
import { collectPublishable, hashtagsFor } from "../lib/social-queue.mjs";
import { isPosted, markPosted } from "../lib/social-posted.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(HERE);
const config = JSON.parse(readFileSync(join(ROOT, "config/social.json"), "utf8"));

const {
  META_ACCESS_TOKEN,
  SITE_URL = "https://leap.uz",
  GRAPH_VERSION = "v25.0",
  DRY_RUN,
  ONLY_NETWORK,
} = process.env;

const dryRun = DRY_RUN === "1" || DRY_RUN === "true";
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;

if (!dryRun && !META_ACCESS_TOKEN) {
  console.error("Нет META_ACCESS_TOKEN. Для проверки без доступов: DRY_RUN=1.");
  process.exit(1);
}

// ─── Подпись ───
//
// Состав: заголовок, лид, отсылка к статье, хештеги. Без эмодзи — правило
// редполитики, общее для всех каналов.
//
// Разница между сетями ровно одна и она техническая: в Instagram ссылки
// в подписи НЕ кликабельны (ни в посте, ни в Stories через API), поэтому
// там стоит отсылка к шапке профиля. В Facebook ссылки работают, поэтому
// туда идёт полный адрес статьи — Facebook у нас канал трафика, Instagram
// канал охвата.

function trimLede(lede, limit) {
  const plain = decodeEntities(lede).trim();
  if (plain.length <= limit) return plain;
  return plain.slice(0, limit - 1).replace(/\s+\S*$/, "") + "…";
}

function buildCaption(item, network) {
  const title = decodeEntities(String(item.fm.title || "")).trim();
  const lede = trimLede(extractLede(item.raw), config.caption.ledeLimit);
  const tags = hashtagsFor(config, item.lang, item.category);
  const readMore = config.caption.readMore?.[network]?.[item.lang] ?? "";

  const parts = [title, lede];
  if (network === "facebook") {
    parts.push(`${readMore} ${item.url}`.trim());
  } else if (readMore) {
    parts.push(readMore);
  }
  if (tags.length) parts.push(tags.join(" "));

  let caption = parts.filter(Boolean).join("\n\n");

  // Лимит площадки. Режем лид, а не хвост подписи: хештеги и отсылка
  // к статье важнее последних предложений лида, а заголовок — важнее всего.
  const limit = config.networks[network]?.captionLimit ?? 2200;
  if (caption.length > limit) {
    for (const shorter of [600, 400, 250, 120, 0]) {
      const lede2 = shorter ? trimLede(extractLede(item.raw), shorter) : "";
      const p = [title, lede2];
      if (network === "facebook") p.push(`${readMore} ${item.url}`.trim());
      else if (readMore) p.push(readMore);
      if (tags.length) p.push(tags.join(" "));
      caption = p.filter(Boolean).join("\n\n");
      if (caption.length <= limit) break;
    }
  }
  return caption.slice(0, limit);
}

// ─── Graph API ───

async function graph(path, params, method = "POST") {
  const url = new URL(`${GRAPH}/${path}`);
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    if (method === "GET") url.searchParams.set(k, String(v));
    else body.set(k, String(v));
  }
  const res = await fetch(url, method === "GET" ? {} : { method: "POST", body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const e = data.error ?? {};
    throw new Error(
      `Graph ${method} ${path}: ${e.message ?? res.statusText} (code ${e.code ?? res.status}${e.error_subcode ? `/${e.error_subcode}` : ""})`,
    );
  }
  return data;
}

/**
 * Картинка обязана быть доступна Meta по публичному адресу в момент вызова.
 * Проверяем сами, до создания контейнера: иначе Meta вернёт невнятную ошибку
 * загрузки, а материал при этом уже будет считаться попыткой отправки.
 *
 * Не ответила — не ошибка, а «деплой ещё не доехал». Молча пропускаем,
 * следующий прогон подхватит. Ровно та же логика ожидания, что у картинки
 * от bild в очереди.
 */
async function isPubliclyReachable(url) {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    return res.ok;
  } catch {
    return false;
  }
}

const POLL_ATTEMPTS = 12;
const POLL_DELAY_MS = 5000;

async function publishInstagram(igUserId, imageUrl, caption, token) {
  // Шаг 1 — контейнер.
  const container = await graph(`${igUserId}/media`, {
    image_url: imageUrl,
    caption,
    access_token: token,
  });

  // Шаг 2 — дождаться обработки. Для картинок статус обычно FINISHED сразу,
  // но published-состояние не гарантировано мгновенно, а публикация
  // необработанного контейнера возвращает ошибку.
  for (let i = 0; i < POLL_ATTEMPTS; i++) {
    const st = await graph(
      container.id,
      { fields: "status_code,status", access_token: token },
      "GET",
    );
    if (st.status_code === "FINISHED") break;
    if (st.status_code === "ERROR" || st.status_code === "EXPIRED") {
      throw new Error(`контейнер ${container.id}: ${st.status_code} — ${st.status ?? ""}`);
    }
    if (i === POLL_ATTEMPTS - 1) {
      throw new Error(`контейнер ${container.id} не обработался за ${POLL_ATTEMPTS * POLL_DELAY_MS / 1000} с`);
    }
    await new Promise((r) => setTimeout(r, POLL_DELAY_MS));
  }

  // Шаг 3 — публикация.
  const published = await graph(`${igUserId}/media_publish`, {
    creation_id: container.id,
    access_token: token,
  });
  return published.id;
}

async function publishFacebook(pageId, imageUrl, caption, token) {
  // Фотопост, а не ссылочный: карточка 1080×1350 занимает в ленте больше
  // места, чем превью ссылки, а сам адрес остаётся в тексте и в Facebook
  // кликабелен. То есть большая картинка И работающая ссылка одновременно.
  const res = await graph(`${pageId}/photos`, {
    url: imageUrl,
    caption,
    access_token: token,
  });
  return res.post_id ?? res.id;
}

// ─── Сборка списка отправок ───

const { items, skipped } = collectPublishable(ROOT, config, { siteUrl: SITE_URL });

console.error(`[social] кандидатов: ${items.length}, отсеяно очередью: ${skipped.length}`);
for (const s of skipped.slice(0, 15)) console.error(`  – ${s.rel}: ${s.why}`);
if (skipped.length > 15) console.error(`  … и ещё ${skipped.length - 15}`);

const networks = Object.entries(config.networks)
  .filter(([name, cfg]) => cfg.enabled && (!ONLY_NETWORK || ONLY_NETWORK === name))
  .map(([name]) => name);

const jobs = [];
for (const item of items) {
  for (const network of networks) {
    const idEnv =
      network === "instagram"
        ? item.account.instagramUserIdEnv
        : item.account.facebookPageIdEnv;
    const targetId = process.env[idEnv];
    if (!targetId && !dryRun) {
      // Аккаунта в этой сети ещё нет — не трогаем вовсе.
      continue;
    }
    if (isPosted(ROOT, network, item.lang, item.slug)) continue;
    if (!existsSync(item.card.abs)) {
      console.error(
        `  – ${item.rel} → ${network}: карточки нет, ждём render-social-cards`,
      );
      continue;
    }
    const token =
      (network === "facebook" &&
        process.env[`FB_PAGE_TOKEN_${item.lang.toUpperCase()}`]) ||
      META_ACCESS_TOKEN;
    jobs.push({ item, network, targetId: targetId ?? "(dry-run)", token });
  }
}

// Предохранитель от залпа. Остаток не теряется — его заберёт следующий
// прогон, потому что список собирается обходом content/posts заново, а не
// из очереди «что осталось».
const MAX_PER_RUN = config.pacing?.maxPerRun ?? 8;
const overflow = Math.max(0, jobs.length - MAX_PER_RUN);
if (overflow) {
  console.error(
    `[social] потолок прогона ${MAX_PER_RUN}: публикую столько, ${overflow} отложено до следующего запуска`,
  );
  jobs.length = MAX_PER_RUN;
}

console.error(`[social] к публикации: ${jobs.length}`);

const MIN_GAP_MS = (config.pacing?.minGapSeconds ?? 45) * 1000;
let ok = 0;
let failed = 0;
let waiting = 0;

for (let i = 0; i < jobs.length; i++) {
  const { item, network, targetId, token } = jobs[i];
  const caption = buildCaption(item, network);

  if (dryRun) {
    console.log("=".repeat(64));
    console.log(`СЕТЬ: ${network} | ЯЗЫК: ${item.lang} | ${item.rel}`);
    console.log(`КАРТОЧКА: ${item.card.publicUrl}`);
    console.log(`СТАТЬЯ:   ${item.url}`);
    console.log(`ДЛИНА ПОДПИСИ: ${caption.length}`);
    console.log("-".repeat(64));
    console.log(caption);
    ok++;
    continue;
  }

  // Последняя проверка перед отправкой — по журналу с диска, а не по снимку.
  // Между сборкой списка и этим моментом прошли паузы и сетевые ретраи;
  // за это время запись мог дописать параллельный прогон.
  if (isPosted(ROOT, network, item.lang, item.slug)) {
    console.error(`  ⤼ ${item.rel} → ${network}: уже опубликовано, пропуск`);
    continue;
  }

  if (!(await isPubliclyReachable(item.card.publicUrl))) {
    waiting++;
    console.error(
      `  … ${item.rel} → ${network}: карточка ещё не на сайте (${item.card.publicUrl}) — ждём деплой`,
    );
    continue;
  }

  try {
    const postId =
      network === "instagram"
        ? await publishInstagram(targetId, item.card.publicUrl, caption, token)
        : await publishFacebook(targetId, item.card.publicUrl, caption, token);

    markPosted(ROOT, {
      network,
      lang: item.lang,
      slug: item.slug,
      url: item.url,
      postId,
    });
    ok++;
    console.error(`  ✓ ${item.rel} → ${network}/${item.lang} (${postId})`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${item.rel} → ${network}: ${err.message}`);
  }

  if (i < jobs.length - 1) {
    await new Promise((r) => setTimeout(r, MIN_GAP_MS));
  }
}

console.error(
  `[social] опубликовано ${ok}, ждут деплоя ${waiting}, ошибок ${failed}`,
);
if (failed) process.exit(1);
