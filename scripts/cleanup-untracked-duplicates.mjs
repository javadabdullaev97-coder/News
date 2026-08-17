#!/usr/bin/env node
// Убирает дубли, которых НЕТ в реестре.
//
// ЗАЧЕМ ОТДЕЛЬНЫЙ СКРИПТ. cleanup-telegram-duplicates.mjs работает по
// content/state/telegram-posted.jsonl: он видит ровно то, что реестр успел
// записать. 17.08.2026 выяснилось, что это не всегда всё.
//
// Реестр коммитился одним шагом ПОСЛЕ всего цикла отправки, а цикл со вторым
// каналом вырос до двадцати минут. Прогон, оборвавшийся или обогнанный
// соседним воркфлоу, отправлял посты и терял записи о них. В итоге материалы
// про Джоковича, Лукуми и Маккенну ушли в спортивный канал по пять-шесть раз,
// а в реестре осталось по ОДНОЙ записи на каждый — последняя. Остальные копии
// для системы не существуют: удалить их по реестру нельзя, потому что там их
// нет, а Bot API не умеет перечислять сообщения канала.
//
// КАК РЕШАЕТСЯ. Публичный канал отдаёт свою ленту страницей t.me/s/<канал> —
// тем же способом, которым фетчер читает чужие каналы (pull-telegram-inbox).
// Идём по ленте, собираем пары «идентификатор сообщения → первая строка
// текста», группируем по заголовку. Заголовок статьи уникален, поэтому
// повтор заголовка — это повторная отправка. Оставляем САМОЕ РАННЕЕ сообщение,
// остальные удаляем через Bot API и отзываем в реестре.
//
// ОГРАНИЧЕНИЯ, О КОТОРЫХ НАДО ЗНАТЬ:
//   - канал обязан быть публичным: у приватного страницы t.me/s/ нет;
//   - Bot API удаляет сообщения не старше 48 часов, для старого дубля
//     ответ будет «message can't be deleted» — это не сбой скрипта;
//   - группируем по СЛАГУ из ссылки на leap.uz, а не по заголовку. Проверка
//     на живом канале показала, почему: у @tribunauznews шесть постов
//     с заголовком «Кун ўйинлари натижалари» — это ежедневная рубрика, а не
//     дубли. Заголовок повторяется законно, слаг статьи — нет. Посты без
//     нашей ссылки в разбор не попадают вовсе;
//   - по умолчанию скрипт ничего не удаляет: сначала смотрим список.
//
// Использование:
//   node scripts/cleanup-untracked-duplicates.mjs              — только показать
//   APPLY=1 node scripts/cleanup-untracked-duplicates.mjs      — удалить
//   SLUGS=a,b node scripts/cleanup-untracked-duplicates.mjs    — сузить до тем
//   TARGETS=sport node scripts/cleanup-untracked-duplicates.mjs — сузить до канала

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { appendLog } from "../lib/state-log.mjs";
import {
  ALL_TARGETS,
  POSTED_LOG,
  loadPostedAll,
  resolveChannels,
} from "../lib/telegram-posted.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const { TELEGRAM_BOT_TOKEN, APPLY, SLUGS, TARGETS } = process.env;
const apply = APPLY === "1" || APPLY === "true";
const wantSlugs = SLUGS ? new Set(SLUGS.split(",").map((s) => s.trim()).filter(Boolean)) : null;
const wantTargets = TARGETS
  ? new Set(TARGETS.split(",").map((s) => s.trim()).filter(Boolean))
  : null;

const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const PAGE_LIMIT = 12; // страниц назад по ленте; на странице до 20 сообщений

const CHANNELS = resolveChannels();

/** Первая строка текста сообщения — она же заголовок статьи в нашем формате. */
function firstLine(html) {
  const text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
  return text.split("\n")[0].trim();
}

/** Ссылка на статью внутри поста — по ней достаём слаг. */
function slugFromPost(html) {
  const m = html.match(/https?:\/\/leap\.uz\/(?:ru|uz|en)\/\d{4}\/\d{2}\/\d{2}\/([a-z0-9-]+)/i);
  return m ? m[1] : null;
}

async function readChannel(handle) {
  const slug = String(handle).replace(/^@/, "");
  const seen = new Map(); // messageId → { title, slug }
  let before = null;

  for (let page = 0; page < PAGE_LIMIT; page++) {
    const url = `https://t.me/s/${slug}${before ? `?before=${before}` : ""}`;
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(`t.me/s/${slug}: HTTP ${res.status}`);
    const html = await res.text();

    const wraps = html.split('class="tgme_widget_message_wrap');
    let lowest = null;
    for (const w of wraps.slice(1)) {
      const idm = w.match(/data-post="[^/"]+\/(\d+)"/);
      if (!idm) continue;
      const id = Number(idm[1]);
      const tm = w.match(/class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/);
      if (!tm) continue;
      const title = firstLine(tm[1]);
      if (!title) continue;
      if (!seen.has(id)) seen.set(id, { title, slug: slugFromPost(w) });
      lowest = lowest === null ? id : Math.min(lowest, id);
    }
    if (lowest === null || lowest <= 1) break;
    if (before !== null && lowest >= before) break; // лента не двигается — выходим
    before = lowest;
  }
  return seen;
}

const plan = [];
const problems = [];

for (const target of ALL_TARGETS) {
  if (wantTargets && !wantTargets.has(target)) continue;
  for (const [lang, handle] of Object.entries(CHANNELS[target] ?? {})) {
    if (!handle) continue;
    let messages;
    try {
      messages = await readChannel(handle);
    } catch (err) {
      problems.push(`${target}/${lang} (${handle}): ${err.message}`);
      continue;
    }
    console.error(`[untracked] ${target}/${lang} ${handle}: прочитано ${messages.size} сообщений`);

    // Ключ группировки — слаг статьи. Пост без ссылки на leap.uz (репост,
    // объявление, чужой материал) в разбор не попадает: мы не знаем, что это,
    // и трогать его нельзя.
    const bySlug = new Map();
    let withoutLink = 0;
    for (const [id, info] of messages) {
      if (!info.slug) {
        withoutLink++;
        continue;
      }
      if (!bySlug.has(info.slug)) bySlug.set(info.slug, []);
      bySlug.get(info.slug).push({ id, ...info });
    }
    if (withoutLink) {
      console.error(`   ${withoutLink} сообщений без ссылки на leap.uz — пропущены`);
    }
    for (const [, list] of bySlug) {
      if (list.length < 2) continue;
      list.sort((a, b) => a.id - b.id);
      const keep = list[0];
      if (wantSlugs && !wantSlugs.has(keep.slug)) continue;
      for (const dup of list.slice(1)) {
        plan.push({
          target,
          lang,
          chat: handle,
          messageId: dup.id,
          keep: keep.id,
          title: keep.title,
          slug: keep.slug,
        });
      }
    }
  }
}

if (problems.length) {
  console.error("[untracked] каналы, которые не прочитались:");
  for (const p of problems) console.error(`  ✗ ${p}`);
}

console.error(`\n[untracked] дублей найдено: ${plan.length}`);
for (const d of plan) {
  console.error(`   ${d.target}/${d.lang} #${d.messageId} (оригинал #${d.keep}) — ${d.title.slice(0, 60)}`);
}

if (!plan.length) process.exit(problems.length ? 1 : 0);

if (!apply) {
  console.error("\n[untracked] это разбор без удаления. Запусти с APPLY=1, чтобы снять.");
  process.exit(0);
}
if (!TELEGRAM_BOT_TOKEN) {
  console.error("Нужен TELEGRAM_BOT_TOKEN.");
  process.exit(1);
}

// Ссылки на статью для отзыва в реестре: берём из уже известных записей,
// чтобы отзыв лёг на тот же url, которым материал записан.
const known = loadPostedAll(ROOT);
function urlFor(target, lang, slug) {
  for (const [key, recs] of known) {
    const [t, l, s] = key.split(" ");
    if (t === target && l === lang && s === slug) return recs[0]?.url ?? null;
  }
  return null;
}

let removed = 0;
let gone = 0;
let failed = 0;
for (const d of plan) {
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: d.chat, message_id: d.messageId }),
  });
  const data = await res.json();
  if (data.ok) {
    removed++;
    console.error(`  ✓ ${d.target}/${d.lang} #${d.messageId}`);
  } else if (/not found|to delete|can't be deleted/i.test(data.description ?? "")) {
    gone++;
    console.error(`  – ${d.target}/${d.lang} #${d.messageId}: ${data.description}`);
    continue;
  } else {
    failed++;
    console.error(`  ✗ ${d.target}/${d.lang} #${d.messageId}: ${data.description}`);
    continue;
  }
  const url = d.slug ? urlFor(d.target, d.lang, d.slug) : null;
  if (url) {
    const revoke = {
      url,
      messageId: d.messageId,
      revokedAt: new Date().toISOString(),
      reason: "untracked-duplicate",
    };
    if (d.target !== "main") revoke.target = d.target;
    appendLog(join(ROOT, POSTED_LOG), revoke);
  }
  await new Promise((r) => setTimeout(r, 300));
}

console.error(`\n[untracked] удалено ${removed}, не удалось снять ${gone}, ошибок ${failed}`);
process.exit(failed ? 1 : 0);
