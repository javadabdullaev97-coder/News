#!/usr/bin/env node
// Снимает посты из Instagram и отмечает записи отозванными.
//
// ЗАЧЕМ. Telegram у нас снимается точечно (scripts/retract-posts.mjs),
// а Instagram снимать было нечем: пост с браком висел, пока владелец
// не удалит его руками. 17.08.2026 таких набралось сразу несколько —
// три карточки с размытой подложкой, обрезанная голова на фото Роналду
// и дубли, ушедшие в ленту дважды.
//
// Graph API удаление поддерживает: DELETE /{ig-media-id}, обычные посты
// (не реклама, не отдельная картинка карусели).
//
// ДВА РЕЖИМА.
//
//   LIST=1 node scripts/retract-social.mjs
//     Показывает последние посты аккаунта: id, время, ссылку и первую
//     строку подписи, плюс помечает совпадающие подписи. Нужен потому,
//     что ссылка вида instagram.com/p/DcI3lcolnBE ничего не говорит
//     о медиа-id, а реестр знает только то, что записал сам: пост,
//     ушедший мимо записи, в нём не значится.
//
//   node scripts/retract-social.mjs
//     Снимает то, что перечислено в заявке
//     content/state/retract-social-request.json:
//       { "posts": ["18609863314018852"], "slugs": ["ronaldo-last-season"],
//         "repost": true, "reason": "…" }
//
// posts — медиа-id напрямую (для постов, которых нет в реестре).
// slugs — по реестру, снимается пост этого материала.
// repost: true — запись помечается отозванной, и очередной прогон
//   постера отправит материал заново, уже с исправленной карточкой.
//   Без него запись остаётся, повторной отправки не будет: так снимают
//   брак, для которого замены пока нет.
//
//   DRY_RUN=1 — показать, ничего не удаляя.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { appendLog } from "../lib/state-log.mjs";
import { loadPosted, SOCIAL_LOG } from "../lib/social-posted.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const {
  META_ACCESS_TOKEN,
  GRAPH_VERSION = "v25.0",
  DRY_RUN,
  LIST,
  POSTS,
  IG_USER_ID_RU,
  IG_USER_ID_UZ,
} = process.env;
const dryRun = DRY_RUN === "1" || DRY_RUN === "true";
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;
const REQUEST = join(ROOT, "content/state/retract-social-request.json");

async function graph(path, params = {}, method = "GET") {
  const url = new URL(`${GRAPH}/${path}`);
  url.searchParams.set("access_token", META_ACCESS_TOKEN);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url, { method });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const e = data.error ?? {};
    throw new Error(`Graph ${method} ${path}: ${e.message ?? res.statusText} (code ${e.code ?? res.status})`);
  }
  return data;
}

function request() {
  if (!existsSync(REQUEST)) return {};
  try {
    return JSON.parse(readFileSync(REQUEST, "utf8"));
  } catch (err) {
    console.error(`[retract-social] заявка не читается: ${err.message}`);
    return {};
  }
}

// ─── Список ───
//
// Печатается и как самостоятельный режим, и перед снятием, если заявка
// просит («list»: true). Второе удобно: в одном прогоне видно и что было
// в ленте до правки, и что снято.
const req0 = existsSync(REQUEST) ? request() : {};
const wantList = LIST === "1" || LIST === "true" || req0.list === true;
if (wantList && !META_ACCESS_TOKEN && !dryRun) {
  console.error("Нужен META_ACCESS_TOKEN для списка.");
  process.exit(1);
}
if (wantList && META_ACCESS_TOKEN) {
  for (const [lang, igUser] of [["ru", IG_USER_ID_RU], ["uz", IG_USER_ID_UZ]]) {
    if (!igUser) continue;
    const data = await graph(`${igUser}/media`, {
      fields: "id,caption,timestamp,permalink",
      limit: 50,
    });
    const items = data.data ?? [];
    console.error(`\n─── ${lang}: постов ${items.length} ───`);
    const byHead = new Map();
    for (const m of items) {
      const head = String(m.caption ?? "").split("\n")[0].trim();
      byHead.set(head, [...(byHead.get(head) ?? []), m.id]);
    }
    for (const m of items) {
      const head = String(m.caption ?? "").split("\n")[0].trim();
      const dupe = (byHead.get(head) ?? []).length > 1 ? "  ← ДУБЛЬ" : "";
      console.error(`${m.id}  ${m.timestamp}  ${m.permalink}`);
      console.error(`    ${head.slice(0, 90)}${dupe}`);
    }
    const dupes = [...byHead.entries()].filter(([, ids]) => ids.length > 1);
    if (dupes.length) {
      console.error(`\n[${lang}] подписей, встретившихся дважды: ${dupes.length}`);
      for (const [head, ids] of dupes) {
        console.error(`  ${ids.join(", ")} — ${head.slice(0, 70)}`);
      }
    }
  }
  // Отдельный режим списка на этом и заканчивается. Если список запрошен
  // заявкой, идём дальше — снимать.
  if (LIST === "1" || LIST === "true") process.exit(0);
}

// ─── Режим снятия ───
const req = request();
const explicit = [
  ...(POSTS ? POSTS.split(",") : []),
  ...(Array.isArray(req.posts) ? req.posts : []),
]
  .map((s) => String(s).trim())
  .filter(Boolean);
const slugs = new Set(Array.isArray(req.slugs) ? req.slugs : []);
const repost = req.repost === true;

const targets = [];
for (const id of explicit) targets.push({ postId: id, key: null, url: null });
if (slugs.size) {
  for (const [key, rec] of loadPosted(ROOT)) {
    const [, , slug] = key.split(" ");
    if (!slugs.has(slug) || rec.revokedAt || !rec.postId) continue;
    targets.push({ postId: rec.postId, key, url: rec.url });
  }
}

if (!targets.length) {
  console.error("[retract-social] нечего снимать");
  process.exit(0);
}
console.error(`[retract-social] к снятию ${targets.length}, отзыв записи: ${repost ? "да" : "нет"}`);
for (const t of targets) console.error(`   ${t.postId} ${t.url ?? "(нет в реестре)"}`);

if (dryRun) {
  console.error("[retract-social] DRY_RUN — ничего не удалено");
  process.exit(0);
}
if (!META_ACCESS_TOKEN) {
  console.error("Нужен META_ACCESS_TOKEN (или DRY_RUN=1).");
  process.exit(1);
}

let removed = 0;
let gone = 0;
let failed = 0;
for (const t of targets) {
  try {
    await graph(t.postId, {}, "DELETE");
    removed++;
  } catch (err) {
    // Пост уже удалён руками — это не сбой, запись всё равно приводим
    // в порядок. Всё остальное — сбой, и запись не трогаем: пост в ленте,
    // а отзыв записи выпустил бы материал повторно.
    if (/does not exist|Unsupported get request|Object with ID/i.test(err.message)) {
      gone++;
    } else {
      failed++;
      console.error(`  ✗ ${t.postId}: ${err.message}`);
      continue;
    }
  }
  if (repost && t.url) {
    appendLog(join(ROOT, SOCIAL_LOG), {
      network: "instagram",
      url: t.url,
      postId: t.postId,
      revokedAt: new Date().toISOString(),
      reason: req.reason ?? "retract",
    });
  }
}

console.error(`[retract-social] удалено ${removed}, уже не было ${gone}, не удалось ${failed}`);
process.exit(failed ? 1 : 0);
