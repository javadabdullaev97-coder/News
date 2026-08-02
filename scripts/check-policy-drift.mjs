#!/usr/bin/env node
// Проверяет соответствие опубликованных статей за N дней актуальному
// config/newsroom-policy.json. Ловит дрейф: policy декларирует одно,
// реальность идёт другим путём, и никто этого не замечает пока не
// открыть выпуски руками.
//
// Что проверяем (пока):
//   1. Категория из frontmatter входит в известный список
//   2. urgency если проставлен — валиден (breaking/standard/deferred).
//      Отсутствие urgency НЕ считается ошибкой: 03.08.2026 плашка «СРОЧНО»
//      в TG-посте убрана, читатель уровня срочности не видит, а планёрка
//      публикует всё через один PR-поток — заполнять поле необязательно.
//   3. Дневной кап по категории (diversity.maxPerCategory сегодня)
//   4. Все sources из frontmatter реально цитируются в теле статьи
//      (балластные записи — сигнал, что fact-checker не проверял их)
//   5. Все ссылки на чёрный список источников из редполитики §2
//
// Отчёт печатается в stdout и в content/state/policy-drift.md.
// Exit code 1 если найдены ошибки уровня error, 0 если только warn.
//
// CLI: node scripts/check-policy-drift.mjs [--days=7] [--verbose]

import { readdirSync, readFileSync, existsSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatter } from "../lib/frontmatter.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const POLICY_PATH = join(ROOT, "config/newsroom-policy.json");
const POSTS_DIR = join(ROOT, "content/posts");
const OUT_PATH = join(ROOT, "content/state/policy-drift.md");

const argv = process.argv.slice(2);
const days = Number((argv.find((a) => a.startsWith("--days=")) || "--days=7").slice(7));
const verbose = argv.includes("--verbose");

// Список запрещённых доменов, скопирован из SKILL.md §2. Держим здесь
// отдельно, чтобы валидатор мог работать без парсинга MD.
const BLACKLIST_DOMAINS = [
  "gazeta.uz", "kun.uz", "spot.uz", "daryo.uz", "repost.uz", "podrobno.uz",
  "kapital.uz", "tribuna.uz", "nuz.uz", "anhor.uz", "uznews.uz", "yuz.uz",
  "afisha.uz", "hook.report", "mover.uz", "tazabay.uz",
  "ozodlik.org", "currenttime.tv", "azon.uz",
  "wikipedia.org",
];

const policy = JSON.parse(readFileSync(POLICY_PATH, "utf8"));
const maxPerCategoryPerRun = policy?.selection?.diversity?.maxPerCategory ?? 3;
const knownUrgency = new Set(
  Object.keys(policy?.urgency?.tiers ?? { breaking: 1, standard: 1, deferred: 1 })
);

// Список рубрик — синхронизирован с scripts/build-posts.mjs. Дублируется
// сознательно: политика хранит только веса, рубрики — атрибут сайта.
const KNOWN_RUBRICS = new Set([
  "politics", "economy", "business", "society",
  "sport", "world", "tech", "culture",
]);

function collectMdx(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...collectMdx(p));
    else if (e.isFile() && e.name.endsWith(".mdx")) out.push(p);
  }
  return out;
}

function dayFromPath(p) {
  const m = p.match(/content\/posts\/(\d{4}-\d{2}-\d{2})\//);
  return m ? m[1] : null;
}

function isWithinDays(fileMs, days) {
  const age = (Date.now() - fileMs) / 86400_000;
  return age <= days;
}

function extractUrls(text) {
  // Все URL из тела статьи (mdx-ссылки [текст](url) + голые https://).
  const urls = [];
  const re1 = /\[[^\]]+\]\((https?:\/\/[^)\s]+)\)/g;
  const re2 = /(?<![("])https?:\/\/[^\s)"]+/g;
  let m;
  while ((m = re1.exec(text))) urls.push(m[1]);
  while ((m = re2.exec(text))) urls.push(m[0]);
  return urls;
}

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return null; }
}

const errors = [];
const warns = [];
const perDayCategory = {}; // day → category → count
const files = collectMdx(POSTS_DIR).filter((f) => {
  return isWithinDays(statSync(f).mtimeMs, days);
});

for (const file of files) {
  const rel = file.replace(ROOT + "/", "");
  const raw = readFileSync(file, "utf8");
  const fm = parseFrontmatter(raw);
  const body = raw.replace(/^---\n[\s\S]*?\n---\n?/, "");
  const day = dayFromPath(file);

  // 1. Категория
  if (!fm.category) {
    errors.push({ rel, msg: "нет category во frontmatter" });
  } else if (!KNOWN_RUBRICS.has(fm.category)) {
    errors.push({ rel, msg: `неизвестная category "${fm.category}"` });
  } else if (day) {
    perDayCategory[day] ??= {};
    perDayCategory[day][fm.category] = (perDayCategory[day][fm.category] || 0) + 1;
  }

  // 2. urgency: заполнять необязательно. Если поле есть — оно должно быть
  // из известного списка. Пусто — норма, публикуется как обычная новость.
  if (fm.urgency && !knownUrgency.has(fm.urgency)) {
    errors.push({ rel, msg: `urgency "${fm.urgency}" не из ${[...knownUrgency].join("|")}` });
  }

  // 3. Черный список ссылок
  const urls = extractUrls(raw);
  for (const u of urls) {
    const host = hostOf(u);
    if (!host) continue;
    if (BLACKLIST_DOMAINS.some((d) => host === d || host.endsWith("." + d))) {
      errors.push({ rel, msg: `запрещённый источник в тексте: ${host}` });
    }
  }
  for (const s of fm.sources || []) {
    const host = hostOf(s.url);
    if (host && BLACKLIST_DOMAINS.some((d) => host === d || host.endsWith("." + d))) {
      errors.push({ rel, msg: `запрещённый источник во frontmatter.sources: ${host}` });
    }
  }

  // 4. Балласт в sources: URL из frontmatter, которого нет в теле статьи
  const bodyUrls = new Set(extractUrls(body));
  for (const s of fm.sources || []) {
    if (s.url && !bodyUrls.has(s.url)) {
      warns.push({
        rel,
        msg: `sources[].url «${s.url}» не цитируется в теле — балласт`,
      });
    }
  }
}

// Дневной кап по категориям — превышение регистрируем как warn, не error
// (спецификация допускает превышение при 80+ баллах, но эти баллы нам
// с уровня файла не видны — только пометка «странно, посмотри»).
const dailyCap = maxPerCategoryPerRun * 3; // условный ×3 = 3 планёрки/день
for (const [day, byCat] of Object.entries(perDayCategory)) {
  for (const [cat, count] of Object.entries(byCat)) {
    if (count > dailyCap) {
      warns.push({
        rel: `content/posts/${day}/`,
        msg: `категория "${cat}": ${count} материалов за день (порог ${dailyCap})`,
      });
    }
  }
}

// ─── Отчёт ───
const now = new Date().toISOString();
const lines = [
  `# Policy drift check — ${now}`,
  ``,
  `Проверено: ${files.length} .mdx за последние ${days} дней`,
  `Ошибок: ${errors.length}, предупреждений: ${warns.length}`,
  ``,
];

if (errors.length) {
  lines.push("## ❌ Ошибки", "");
  for (const e of errors) lines.push(`- **${e.rel}** — ${e.msg}`);
  lines.push("");
}
if (warns.length) {
  lines.push("## ⚠️ Предупреждения", "");
  for (const w of warns) lines.push(`- **${w.rel}** — ${w.msg}`);
  lines.push("");
}
if (!errors.length && !warns.length) {
  lines.push("Всё чисто.");
}

if (Object.keys(perDayCategory).length) {
  lines.push("## Распределение по дням и категориям", "");
  for (const [day, byCat] of Object.entries(perDayCategory).sort()) {
    const total = Object.values(byCat).reduce((a, b) => a + b, 0);
    lines.push(
      `- **${day}** (${total}): ` +
        Object.entries(byCat).map(([c, n]) => `${c} ${n}`).join(", "),
    );
  }
}

const report = lines.join("\n") + "\n";
if (verbose) console.log(report);
else {
  console.log(`errors=${errors.length} warns=${warns.length}`);
  if (errors.length) errors.forEach((e) => console.log(`ERR ${e.rel}: ${e.msg}`));
}

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, report);

process.exit(errors.length ? 1 : 0);
