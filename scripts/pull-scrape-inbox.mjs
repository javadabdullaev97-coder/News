#!/usr/bin/env node
// Сбор новостей с сайтов, у которых нет работающего RSS.
//
// ЗАЧЕМ. Шесть источников числились в конфиге и не фетчились НИКОГДА:
// у daryo.uz и digital.uz RSS отдаёт HTML вместо ленты, у repost.uz адрес
// фида отвечает 404, у tribuna.uz, turkmenportal и eurasianet — 403.
// Они были помечены requiresPlaywright, а Playwright-раннера в CI нет,
// поэтому пометка означала просто «никогда». Среди них Daryo — крупное
// узбекское издание, и Eurasianet — единственная у нас аналитика по
// Центральной Азии.
//
// Проверка 03.08.2026 показала, что браузер нужен не всем: четыре сайта
// из шести отдают страницы обычным HTTP-запросом, у них просто нет ленты.
// Их и разбирает этот скрипт. Оставшиеся два действительно требуют браузера:
// tribuna.uz закрыта Cloudflare-заглушкой, а digital.uz рисует новости
// скриптом, и в HTML статических ссылок на них нет.
//
// ОПОРА НА ФОРМУ АДРЕСА, А НЕ НА CSS-КЛАССЫ. Это главное решение, от которого
// зависит, сколько скрейпер проживёт без ремонта. Классы вида `.article-card__
// title` меняются при каждом редизайне и ломаются молча. Структура адресов
// («/2026/08/03/слаг») живёт годами и меняется вместе с переездом всего сайта,
// то есть заметно.
//
// МОЛЧАЛИВАЯ ПОЛОМКА — ГЛАВНАЯ ОПАСНОСТЬ. Если сайт сменит адреса, скрипт
// будет исправно возвращать ноль ссылок, и рубрика тихо опустеет. Поэтому
// источник, отдавший ноль, — это ошибка в отчёте, а не «сегодня новостей нет».
//
// CLI:
//   node scripts/pull-scrape-inbox.mjs              — собрать и дописать в инбокс
//   node scripts/pull-scrape-inbox.mjs --seed       — только запомнить ссылки, ничего не отдать
//   node scripts/pull-scrape-inbox.mjs --dry-run    — показать, что взял бы
//   node scripts/pull-scrape-inbox.mjs --id=daryo-uz
//   node scripts/pull-scrape-inbox.mjs --no-snippets — не догружать статьи ради описания

import { parse as parseHTML } from "node-html-parser";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSeenLinks, saveSeenLinks } from "../lib/inbox-core.mjs";
import { collectChannelCandidates } from "../lib/channel-candidates.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CONFIG_PATH = join(ROOT, "config/news-sources.json");
const INBOX_DIR = join(ROOT, "content/inbox");

// Тот же браузерный UA, что у RSS-фетчера. Расхождение здесь стоило бы дорого:
// сегодня NPR и ESPN прошли проверку одним агентом и провалились на другом.
const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const TIMEOUT_MS = 20_000;
const SNIPPET_MAX = 500;
// Пауза между запросами к одному сайту. Crawl-delay ни у кого не задан, но
// брать по десятку страниц в секунду с чужого сервера некрасиво независимо
// от формальных разрешений.
const POLITE_DELAY_MS = 700;
// Сколько статей догружать ради описания. Описание — половина того, по чему
// планёрка кластеризует и оценивает темы, но платить за него запросом к каждой
// ссылке не стоит: берём только у действительно новых и не больше горсти.
const SNIPPET_BUDGET = 8;

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const opt = (n) => {
  const p = argv.find((a) => a.startsWith(`--${n}=`));
  return p ? p.slice(n.length + 3) : null;
};

const seedMode = flag("seed");
const dryRun = flag("dry-run");
const noSnippets = flag("no-snippets");
const onlyId = opt("id");

const config = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
const rules = (config.htmlScrape ?? []).filter(
  (r) => !r.disabled && (!onlyId || r.id === onlyId),
);

if (!rules.length) {
  console.error("[scrape] нет правил под фильтр — делать нечего");
  process.exit(0);
}

mkdirSync(INBOX_DIR, { recursive: true });
const seen = loadSeenLinks(ROOT);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getText(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8,uz;q=0.7",
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function clean(s) {
  return String(s ?? "").replace(/\s+/g, " ").trim();
}

/** Возраст статьи по дате в адресе — там, где сайт её туда кладёт. */
function ageDaysFromUrl(path, pattern) {
  if (!pattern) return null;
  const m = path.match(new RegExp(pattern));
  if (!m) return null;
  const [, y, mo, d] = m;
  const t = Date.parse(`${y}-${mo}-${d}T00:00:00Z`);
  if (!Number.isFinite(t)) return null;
  return (Date.now() - t) / 86400000;
}

/**
 * Описание статьи из мета-тегов.
 *
 * Берём og:description или description — они есть почти везде и, в отличие
 * от вёрстки, не меняются при редизайне: их читают соцсети и поисковики,
 * поэтому сайты их берегут.
 */
function metaDescription(html) {
  const root = parseHTML(html);
  for (const sel of [
    'meta[property="og:description"]',
    'meta[name="description"]',
    'meta[name="twitter:description"]',
  ]) {
    const el = root.querySelector(sel);
    const c = el?.getAttribute("content");
    if (c && clean(c).length > 20) return clean(c).slice(0, SNIPPET_MAX);
  }
  return "";
}

/**
 * Заголовок из карточки новости — каскадом от семантичного к запасному.
 *
 * Текст ссылки целиком брать нельзя: в карточке рядом с заголовком лежат
 * рубрика и время, и они склеиваются в одну строку. У daryo это давало
 * «Pokistonda ... halok boʻldi (video) DunyoKecha, 23:10» и
 * «...shamol elektr stansiyasi Реклама19:58 / 01.08.2026».
 *
 * Резать это регулярками по хвосту — гадание: у каждого сайта свой набор
 * рубрик и форматов времени, и любая новая рубрика ломает шаблон молча.
 * Поэтому сначала спрашиваем разметку там, где заголовок лежит отдельно
 * от оформления:
 *   1. заголовочный тег внутри ссылки — самое надёжное;
 *   2. атрибут title у самой ссылки;
 *   3. alt у картинки внутри — подпись к иллюстрации новости и есть её
 *      заголовок; именно так устроен daryo;
 *   4. и только потом — текст ссылки, уже с отсечкой хвоста по времени.
 *
 * Каскад опирается на семантику HTML, а не на имена классов, и потому
 * переживает редизайн так же, как шаблон адреса.
 */
const DEFAULT_TITLE_ORDER = ["heading", "title-attr", "text", "img-alt"];

function extractTitle(a, rule) {
  const order = rule.titleFrom ?? DEFAULT_TITLE_ORDER;
  for (let rank = 0; rank < order.length; rank++) {
    const how = order[rank];
    let s = "";
    if (how === "heading") {
      for (const sel of ["h1", "h2", "h3", "h4"]) {
        const h = a.querySelector(sel);
        if (h) { s = clean(h.text); break; }
      }
    } else if (how === "title-attr") {
      s = clean(a.getAttribute("title"));
    } else if (how === "img-alt") {
      s = clean(a.querySelector("img[alt]")?.getAttribute("alt"));
    } else if (how === "text") {
      s = stripListingMeta(clean(a.text));
    }
    s = stripLeadingTime(s);
    if (s.length >= 20) return { title: s, rank };
  }
  return { title: "", rank: 99 };
}

/** Время публикации слева от заголовка — так устроены карточки repost.uz. */
function stripLeadingTime(s) {
  return s.replace(/^\s*\d{1,2}:\d{2}\s+/, "").trim();
}

/**
 * Запасной путь: отрезать от текста ссылки хвост с временем публикации.
 *
 * Работает грубо и намеренно: режем всё начиная со слова, внутри которого
 * встретились «часы:минуты», но только если этот хвост в конце строки.
 * Заголовок со временем в середине («Матч начнётся в 19:00 по Ташкенту»)
 * при этом не пострадает.
 */
function stripListingMeta(s) {
  const m = s.match(/\s*\S*\d{1,2}:\d{2}[^]{0,24}$/);
  return m ? s.slice(0, m.index).trim() : s;
}

/**
 * Источник с открытым JSON-API.
 *
 * Отдельная ветка, а не разбор HTML, потому что так надёжнее во всём:
 * сайт отдаёт заголовок, дату и слаг готовыми полями, и они не зависят
 * ни от вёрстки, ни от классов, ни от того, где на карточке лежит время.
 * Разбирать HTML там, где есть API, — значит выбирать более хрупкий путь
 * из двух доступных.
 *
 * Так устроен ifs.imv.uz: список новостей на странице рисуется скриптом,
 * в разметке ссылок нет вообще, и HTML-скрейпер нашёл бы ноль. Зато
 * /api/v1/news отдаёт двадцать записей с title_ru и published_date.
 */
async function fetchJsonApi(rule) {
  let data;
  try {
    data = JSON.parse(await getText(rule.apiUrl));
  } catch (err) {
    return { rule, ok: false, error: err.message, items: [] };
  }

  // itemsPath — путь до массива внутри ответа, точками: "items", "data.list".
  let arr = data;
  for (const key of (rule.itemsPath ?? "").split(".").filter(Boolean)) {
    arr = arr?.[key];
  }
  if (!Array.isArray(arr)) {
    return { rule, ok: true, found: 0, freshCount: 0, items: [] };
  }

  const f = rule.fields ?? {};
  const candidates = [];
  for (const raw of arr) {
    const slug = raw?.[f.slug ?? "slug"];
    const title = clean(raw?.[f.title ?? "title"]);
    if (!slug || title.length < (rule.minTitleLength ?? 20)) continue;
    const link = rule.linkTemplate.replace("{slug}", slug);

    // Дата у API есть — значит и отсечка по возрасту возможна, в отличие
    // от HTML-списков, где её приходится брать из адреса или не брать вовсе.
    const dateRaw = f.date ? raw?.[f.date] : null;
    const ts = dateRaw ? Date.parse(dateRaw) : NaN;
    if (Number.isFinite(ts) && rule.maxAgeDays) {
      if ((Date.now() - ts) / 86400000 > rule.maxAgeDays) continue;
    }
    candidates.push({
      link,
      title,
      snippet: clean(f.snippet ? raw?.[f.snippet] : "").slice(0, SNIPPET_MAX),
      pubDate: Number.isFinite(ts) ? new Date(ts).toISOString() : null,
    });
  }

  const fresh = dryRun ? candidates : candidates.filter((c) => !seen.has(c.link));
  const capped = seedMode ? fresh : fresh.slice(0, rule.maxPerRun ?? 25);
  return {
    rule,
    ok: true,
    found: candidates.length,
    freshCount: fresh.length,
    items: capped.map((c) => ({
      sourceId: rule.id,
      sourceName: rule.name,
      sourceType: rule.type,
      sourcePriority: rule.priority,
      sourceKind: "api",
      title: c.title,
      link: c.link,
      pubDate: c.pubDate,
      snippet: c.snippet,
      fetchedAt: new Date().toISOString(),
    })),
  };
}

async function scrapeOne(rule) {
  if (rule.apiUrl) return fetchJsonApi(rule);
  const origin = new URL(rule.listUrl).origin;
  let html;
  try {
    html = await getText(rule.listUrl);
  } catch (err) {
    return { rule, ok: false, error: err.message, items: [] };
  }

  const root = parseHTML(html);
  const linkRe = new RegExp(rule.linkPattern);
  const excludeRe = rule.excludePattern ? new RegExp(rule.excludePattern) : null;

  const candidates = new Map(); // абсолютная ссылка → заголовок
  for (const a of root.querySelectorAll("a[href]")) {
    const href = a.getAttribute("href");
    if (!href) continue;
    let abs;
    try {
      abs = new URL(href, rule.listUrl);
    } catch {
      continue;
    }
    // Только свой домен: внешние ссылки — это чужие материалы.
    if (abs.origin !== origin) continue;
    const path = abs.pathname.replace(/\/+$/, "") || "/";
    if (!linkRe.test(path)) continue;
    if (excludeRe && excludeRe.test(path)) continue;

    const age = ageDaysFromUrl(path, rule.dateFromUrl);
    if (age !== null && rule.maxAgeDays && age > rule.maxAgeDays) continue;

    const { title, rank } = extractTitle(a, rule);
    // Слишком короткий текст ссылки — это не заголовок, а «Читать далее»
    // или картинка-обёртка. Такие ссылки дублируют настоящие, и берём мы
    // ту из них, у которой есть текст.
    if (title.length < (rule.minTitleLength ?? 20)) continue;

    // На одну статью в карточке обычно ДВЕ ссылки: обёртка вокруг картинки
    // и сам заголовок. Раньше побеждала та, у которой текст длиннее, — и на
    // eurasianet это давало подпись к фотографии вместо заголовка
    // («A woman in Russia watches a Wildberries warehouse burn…» вместо
    // «Wildberries wants to turn Kazakhstan into safe haven for its goods»).
    // Теперь побеждает добытая более надёжным способом: заголовочный тег
    // важнее текста ссылки, текст важнее alt картинки. Длина решает только
    // при равном способе.
    const url = origin + path;
    const prev = candidates.get(url);
    if (!prev || rank < prev.rank || (rank === prev.rank && prev.title.length < title.length)) {
      candidates.set(url, { title, rank });
    }
  }

  const found = candidates.size;
  // В холостом прогоне журнал не учитываем: смысл --dry-run в том, чтобы
  // увидеть, что шаблон извлекает со страницы ПРЯМО СЕЙЧАС. С фильтром по
  // журналу он показывал бы пустоту сразу после боевого запуска — то есть
  // именно тогда, когда правило чаще всего и проверяют после правки.
  const flat = [...candidates.entries()].map(([url, v]) => [url, v.title]);
  const fresh = dryRun ? flat : flat.filter(([url]) => !seen.has(url));
  // Потолок ограничивает ВЫДАЧУ, а не память. В режиме --seed берём все
  // найденные: смысл сева в том, чтобы разом забыть всё, что уже висит на
  // странице. Урезанный сев оставил бы хвост, и он вылез бы в инбокс
  // следующим прогоном — то есть ровно тот наплыв, ради предотвращения
  // которого сев и делается.
  const capped = seedMode ? fresh : fresh.slice(0, rule.maxPerRun ?? 25);

  const items = [];
  let snippetsLeft = noSnippets || seedMode ? 0 : SNIPPET_BUDGET;
  for (const [url, title] of capped) {
    let snippet = "";
    if (snippetsLeft > 0) {
      await sleep(POLITE_DELAY_MS);
      try {
        snippet = metaDescription(await getText(url));
      } catch {
        // Описание — приятное дополнение, а не условие. Молча остаёмся
        // без него: терять заголовок из-за недоступной страницы глупо.
      }
      snippetsLeft--;
    }
    items.push({
      sourceId: rule.id,
      sourceName: rule.name,
      sourceType: rule.type,
      sourcePriority: rule.priority,
      sourceKind: "scrape",
      title,
      link: url,
      pubDate: null,
      snippet,
      fetchedAt: new Date().toISOString(),
    });
  }

  return { rule, ok: true, found, freshCount: fresh.length, items };
}

// Последовательно, а не параллельно: четыре сайта, спешить некуда,
// а одновременная долбёжка чужих серверов — верный способ получить блокировку.
const results = [];
for (const rule of rules) {
  results.push(await scrapeOne(rule));
  await sleep(POLITE_DELAY_MS);
}

// ─── отчёт ───

let broken = 0;
for (const r of results) {
  if (!r.ok) {
    console.error(`  ✗ ${r.rule.id.padEnd(16)} не открылся: ${r.error}`);
    broken++;
    continue;
  }
  if (r.found === 0) {
    // Не «сегодня новостей нет», а сломанное правило: у живого источника
    // на странице списка всегда есть материалы.
    console.error(
      `  ✗ ${r.rule.id.padEnd(16)} НИ ОДНОЙ ЗАПИСИ — ` +
        (r.rule.apiUrl
          ? `API ${r.rule.apiUrl} ответил, но нужных полей нет: проверь itemsPath и fields`
          : `шаблон ${r.rule.linkPattern} ничего не нашёл: похоже, сайт сменил структуру адресов`),
    );
    broken++;
    continue;
  }
  console.error(
    `  ✓ ${r.rule.id.padEnd(16)} на странице ${r.found}, новых ${r.freshCount}, взято ${r.items.length}`,
  );
}

const allItems = results.flatMap((r) => r.items);

if (dryRun) {
  for (const it of allItems.slice(0, 15)) {
    console.log(`  ${it.sourceId.padEnd(14)} ${it.title.slice(0, 70)}`);
    console.log(`  ${"".padEnd(14)} ${it.link}`);
  }
  console.error(`[scrape] dry-run: взял бы ${allItems.length} материал(ов)`);
  process.exit(broken ? 1 : 0);
}

const today = new Date(Date.now() + 5 * 3600 * 1000).toISOString().slice(0, 10);

if (seedMode) {
  // Первый прогон: на главных страницах висят статьи месячной давности,
  // и отдать их все значит завалить планёрку протухшими темами. Поэтому
  // первый заход только запоминает увиденное.
  for (const r of results) for (const it of r.items) seen.add(it.link);
  saveSeenLinks(seen, ROOT);
  console.error(`[scrape] seed: запомнено ${allItems.length} ссылок, в инбокс ничего не отдано`);
  process.exit(broken ? 1 : 0);
}

if (allItems.length) {
  appendFileSync(
    join(INBOX_DIR, `${today}.jsonl`),
    allItems.map((x) => JSON.stringify(x)).join("\n") + "\n",
  );
  for (const it of allItems) seen.add(it.link);
  saveSeenLinks(seen, ROOT);

  // Кандидаты в источники из сниппетов конкурентов (правило 04.08.2026).
  const cand = collectChannelCandidates(ROOT, allItems);
  if (cand.appended) {
    console.error(`[scrape] кандидаты в источники: +${cand.appended} (${cand.handles.join(", ")})`);
  }
}

console.error(
  `[scrape] источников ${results.length}, добавлено ${allItems.length} items, сломано ${broken}, day=${today}`,
);
process.exit(broken ? 1 : 0);
