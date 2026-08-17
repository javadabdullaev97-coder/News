#!/usr/bin/env node
// Тянет посты из Telegram-каналов через публичный HTML-эндпоинт t.me/s/<slug>.
// Дедупит по permalink в общий content/inbox/seen.json (тот же файл что и RSS),
// пишет свежее в content/inbox/YYYY-MM-DD.jsonl.
//
// CLI:
//   node scripts/pull-telegram-inbox.mjs
//   node scripts/pull-telegram-inbox.mjs --priority=P0
//   node scripts/pull-telegram-inbox.mjs --type=source
//   node scripts/pull-telegram-inbox.mjs --id=huquqiyaxborot
//
// Формат строки (совпадает с pull-news-inbox.mjs плюс sourceKind + views):
//   {sourceId, sourceName, sourceType, sourcePriority, sourceKind: "telegram",
//    title, link, pubDate, snippet, views, fetchedAt}

import { parse as parseHTML } from "node-html-parser";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSeenLinks, saveSeenLinks } from "../lib/inbox-core.mjs";
import { collectChannelCandidates } from "../lib/channel-candidates.mjs";
import { collectSourceCandidates } from "../lib/source-candidates.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(HERE);
const CONFIG_PATH = join(ROOT, "config/telegram-channels.json");
const INBOX_DIR = join(ROOT, "content/inbox");

const CONCURRENCY = 6; // мягче чем на RSS, чтобы Telegram не начал 429
const FETCH_TIMEOUT_MS = 20_000;
const SNIPPET_MAX = 800;
const TITLE_MAX = 140;

const argv = process.argv.slice(2);
const filters = {
  priority: findArg("--priority"),
  type: findArg("--type"),
  id: findArg("--id"),
};

function findArg(flag) {
  const p = argv.find((a) => a.startsWith(`${flag}=`));
  return p ? p.slice(flag.length + 1).split(",") : null;
}

function matches(ch) {
  if (filters.priority && !filters.priority.includes(ch.priority)) return false;
  if (filters.type && !filters.type.includes(ch.type)) return false;
  if (filters.id && !filters.id.includes(ch.id)) return false;
  return true;
}

const config = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
const channels = config.channels.filter(matches);

if (!channels.length) {
  console.error("No channels matched filters — nothing to do.");
  process.exit(0);
}

mkdirSync(INBOX_DIR, { recursive: true });
const seen = loadSeenLinks(ROOT);

function normalizeText(s) {
  if (!s) return "";
  return s
    .replace(/ /g, " ")
    .replace(/[\r\t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function firstLine(text) {
  const t = text.trim();
  const nl = t.indexOf("\n");
  const line = nl === -1 ? t : t.slice(0, nl);
  return line.slice(0, TITLE_MAX).trim();
}

function parseViews(raw) {
  if (!raw) return null;
  const s = raw.trim().toUpperCase();
  const m = s.match(/^([\d.,]+)\s*([KM]?)$/);
  if (!m) return null;
  const num = Number(m[1].replace(",", "."));
  if (!Number.isFinite(num)) return null;
  const mult = m[2] === "K" ? 1000 : m[2] === "M" ? 1_000_000 : 1;
  return Math.round(num * mult);
}

async function fetchWithTimeout(url, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent":
          "LEAP-News-Aggregator/1.0 (+https://leap.uz; contact: team@leap.uz)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "ru,en;q=0.8,uz;q=0.5",
      },
      redirect: "follow",
    });
  } finally {
    clearTimeout(timer);
  }
}

// Ссылки, найденные в постах этого прогона: permalink → [url]. Наполняется
// в fetchChannel, разбирается один раз в конце — см. сбор кандидатов ниже.
const linksByPost = new Map();

async function fetchChannel(ch) {
  try {
    const res = await fetchWithTimeout(ch.url, FETCH_TIMEOUT_MS);
    if (!res.ok) {
      return { ok: false, ch, error: `HTTP ${res.status}` };
    }
    const html = await res.text();
    const root = parseHTML(html);
    const posts = root.querySelectorAll(".tgme_widget_message_wrap");

    const items = [];
    for (const wrap of posts) {
      // permalink
      const dateLink = wrap.querySelector(".tgme_widget_message_date");
      const permalink = dateLink?.getAttribute("href") || null;
      if (!permalink) continue;

      // pubDate из <time datetime="...">
      const timeEl = wrap.querySelector("time");
      const pubDate = timeEl?.getAttribute("datetime") || null;

      // Текст поста
      const textEl = wrap.querySelector(".tgme_widget_message_text");
      const rawText = textEl ? textEl.innerHTML : "";

      // Ссылки поста — ДО того, как ниже вырежутся теги. Иначе href пропадает
      // вместе с разметкой, и наводка на источник теряется бесплатно: канал
      // ведомства, ссылающийся на lex.uz или сайт другого ведомства, — это
      // ровно то, что просил собирать владелец 17.08.2026. Отдельных запросов
      // здесь не делается, разбирается уже скачанная страница.
      const outboundLinks = textEl
        ? textEl
            .querySelectorAll("a[href]")
            .map((a) => a.getAttribute("href"))
            .filter((h) => h && /^https?:\/\//i.test(h))
        : [];
      // Заменим <br> на \n, потом стрипнем теги
      const text = normalizeText(
        rawText
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/<[^>]+>/g, "")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))),
      );

      // Пропускаем сервисные посты без текста и без фото/видео.
      // Медиа-only посты (фото без подписи) тоже пропускаем — они бесполезны
      // для агрегатора без картинки, а картинку не тянем.
      if (!text || text.length < 3) continue;

      // Просмотры
      const viewsEl = wrap.querySelector(".tgme_widget_message_views");
      const views = parseViews(viewsEl?.text || null);

      const title = firstLine(text);
      const snippet = text.slice(0, SNIPPET_MAX);

      items.push({
        sourceId: ch.id,
        sourceName: ch.name,
        sourceType: ch.type,
        sourcePriority: ch.priority,
        sourceKind: "telegram",
        title,
        link: permalink,
        pubDate,
        snippet,
        views,
        fetchedAt: new Date().toISOString(),
      });

      // В сам item ссылки не кладём: инбокс коммитится в репозиторий, а поле
      // на десяток адресов в каждой записи — это рост файла ради данных,
      // которые нужны ровно один раз и одному потребителю. Держим их рядом,
      // до конца прогона.
      if (outboundLinks.length) linksByPost.set(permalink, outboundLinks);
    }

    return { ok: true, ch, items };
  } catch (err) {
    return { ok: false, ch, error: err.message || String(err) };
  }
}

async function runLimited(items, limit, fn) {
  const results = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (true) {
      const i = idx++;
      if (i >= items.length) return;
      results[i] = await fn(items[i]);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}

console.error(
  `[tg-inbox] ${channels.length} channels, concurrency ${CONCURRENCY}`,
);
const results = await runLimited(channels, CONCURRENCY, fetchChannel);

const failed = results.filter((r) => !r.ok);
const ok = results.filter((r) => r.ok);

const allItems = ok.flatMap((r) => r.items);
const fresh = allItems.filter((it) => it.link && !seen.has(it.link));

const nowTashkent = new Date(Date.now() + 5 * 3600 * 1000);
const today = nowTashkent.toISOString().slice(0, 10);
const dayFile = join(INBOX_DIR, `${today}.jsonl`);

// Канал с полем stream уходит в профильную линию, как и лента с тем же полем
// в config/news-sources.json. Заведено 17.08.2026 под @durov и @telegram:
// платформа Telegram — тема технологической рубрики, а не местной повестки,
// и в местном инбоксе посты Дурова оказались бы среди тарифов и НПА.
//
// Фильтр региона здесь не нужен и не применяется: каналов в конфиге сотня,
// стрим стоит у единиц, и стоит он там осознанно.
const streamOfChannel = new Map(channels.map((ch) => [ch.id, ch.stream || null]));
const byStream = new Map();
const freshLocal = [];
for (const it of fresh) {
  const stream = streamOfChannel.get(it.sourceId);
  if (!stream) {
    freshLocal.push(it);
    continue;
  }
  if (!byStream.has(stream)) byStream.set(stream, []);
  byStream.get(stream).push(it);
}

for (const [stream, items] of byStream) {
  appendFileSync(
    join(INBOX_DIR, `${stream}-${today}.jsonl`),
    items.map((x) => JSON.stringify(x)).join("\n") + "\n",
  );
}

if (freshLocal.length) {
  const lines = freshLocal.map((x) => JSON.stringify(x)).join("\n") + "\n";
  appendFileSync(dayFile, lines);
}

if (fresh.length) {
  for (const it of fresh) seen.add(it.link);
  saveSeenLinks(seen, ROOT);

  // Каналы часто репостят и цитируют друг друга — упоминания незнакомых
  // handle копятся как кандидаты в источники (правило владельца 04.08.2026).
  const cand = collectChannelCandidates(ROOT, fresh);
  if (cand.appended) {
    console.error(`[tg] кандидаты в источники: +${cand.appended} (${cand.handles.join(", ")})`);
  }

  // Сайты, на которые ссылаются каналы. Правило владельца 17.08.2026: смотреть,
  // на кого ссылаются те, кого мы читаем, и так постепенно собрать все
  // источники по Узбекистану. Здесь это бесплатно — страницы уже скачаны.
  const sightings = [];
  for (const it of fresh) {
    for (const url of linksByPost.get(it.link) ?? []) {
      sightings.push({
        url,
        foundIn: it.link,
        sourceId: it.sourceId,
        context: it.snippet,
      });
    }
  }
  const web = collectSourceCandidates(ROOT, sightings);
  if (web.appended) {
    console.error(`[tg] кандидаты-сайты: +${web.appended} (${web.domains.join(", ")})`);
  }
}

const tgStreamReport = [...byStream.entries()]
  .map(([stream, items]) => `${stream} ${items.length}`)
  .join(", ");
console.error(
  `[tg-inbox] fetched ${allItems.length}, fresh ${fresh.length} ` +
    `(в местный ${freshLocal.length}` +
    (tgStreamReport ? `, по профильным: ${tgStreamReport}` : "") +
    `), failed ${failed.length}/${channels.length}, day=${today}`,
);

if (fresh.length) {
  const byId = new Map();
  for (const it of fresh) byId.set(it.sourceId, (byId.get(it.sourceId) || 0) + 1);
  for (const [id, cnt] of [...byId.entries()].sort((a, b) => b[1] - a[1])) {
    console.error(`  +${String(cnt).padStart(3)}  ${id}`);
  }
}

if (failed.length) {
  console.error("[tg-inbox] failed channels:");
  for (const f of failed) console.error(`  ✗  ${f.ch.id}: ${f.error}`);
}

if (failed.length === channels.length) process.exit(1);
