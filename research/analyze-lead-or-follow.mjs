#!/usr/bin/env node
// Идём мы за конкурентами или впереди них.
//
// Вопрос не праздный: в config/newsroom-policy.json тема, которую написали
// пятеро конкурентов, получает +25, а тема с первоисточником, которой у них
// ещё нет, — только +20. То есть скоринг слегка поощряет идти следом. Здесь
// проверяется, во что это выливается на практике.
//
// Метод. Берём наши опубликованные материалы и ищем в конкурентном инбоксе
// (content/inbox — то, что собрано с их RSS и телеграм-каналов) запись про то
// же событие. Сопоставление такое же, как в match-translations: числа плюс
// огрублённые до общей формы слова заголовка, окно ±48 часов. Если у
// конкурента нашлось раньше нашей публикации — мы шли следом; если позже или
// не нашлось вовсе — вели.
//
// Точность сопоставления здесь та же, что была измерена на эталоне Gazeta:
// около 90% на материалах одного языка. Ошибки бьют в обе стороны и общей
// картины не меняют.
//
// CLI: node research/analyze-lead-or-follow.mjs --posts=… --inbox=…
// Выход: research/data/lead-or-follow.json

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(HERE, "data");
const ROOT = dirname(HERE);

const arg = (flag, fallback) =>
  process.argv.find((a) => a.startsWith(`${flag}=`))?.slice(flag.length + 1) ?? fallback;

const POSTS_DIR = arg("--posts", join(ROOT, "content/posts"));
const INBOX_DIR = arg("--inbox", join(ROOT, "content/inbox"));
const WINDOW_HOURS = 48;
const ACCEPT = 0.18;

// ── приведение к сравнимому виду (как в match-translations) ────────────────

const CYR_MAP = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "j", з: "z",
  и: "i", й: "i", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "s", ч: "c", ш: "s", щ: "s",
  ъ: "", ы: "i", ь: "", э: "e", ю: "u", я: "a", ў: "o", қ: "k", ғ: "g", ҳ: "h",
};

function roughen(text) {
  let out = "";
  for (const ch of (text ?? "").toLowerCase()) {
    if (CYR_MAP[ch] !== undefined) out += CYR_MAP[ch];
    else if (/[a-z0-9]/.test(ch)) out += ch;
    else out += " ";
  }
  return out
    .replace(/sh/g, "s").replace(/ch/g, "c").replace(/ya/g, "a")
    .replace(/yu/g, "u").replace(/yo/g, "o").replace(/kh/g, "h").replace(/ts/g, "s")
    .replace(/([a-z])\1+/g, "$1").replace(/\s+/g, " ").trim();
}

const tokens = (t) => new Set(roughen(t).split(" ").filter((w) => w.length >= 4));

function numbers(text) {
  const out = new Set();
  for (const m of (text ?? "").matchAll(/\d[\d\s.,]*/g)) {
    const clean = m[0].replace(/[\s.,]+$/, "").replace(/\s/g, "");
    if (clean.replace(/[.,]/g, "").length >= 2) out.add(clean);
  }
  return out;
}

const jaccard = (a, b) => {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const x of a) if (b.has(x)) shared += 1;
  return shared / (a.size + b.size - shared);
};

// ── данные ─────────────────────────────────────────────────────────────────

function ourPosts() {
  const out = [];
  for (const day of readdirSync(POSTS_DIR)) {
    const dayPath = join(POSTS_DIR, day);
    if (!statSync(dayPath).isDirectory()) continue;
    for (const file of readdirSync(dayPath)) {
      if (!file.endsWith(".mdx") || /\.(uz|en)\.mdx$/.test(file)) continue;
      const body = readFileSync(join(dayPath, file), "utf8");
      const title = body.match(/^title:\s*["']?(.+?)["']?\s*$/m)?.[1];
      const date = body.match(/^publishedAt:\s*["']?([^"'\s]+)["']?\s*$/m)?.[1];
      const category = body.match(/^category:\s*["']?(\w+)["']?\s*$/m)?.[1] ?? null;
      const tgScore = Number(body.match(/^tgScore:\s*(\d+)/m)?.[1] ?? NaN);
      const broadcast = /^broadcast:\s*true/m.test(body);
      if (title && date) out.push({ title, at: new Date(date), category, tgScore, broadcast, day, file });
    }
  }
  return out.filter((p) => !Number.isNaN(p.at.getTime()));
}

function competitorItems() {
  const out = [];
  for (const file of readdirSync(INBOX_DIR)) {
    // seen.jsonl — реестр уже виденных ссылок, не лента.
    if (!file.endsWith(".jsonl") || file.startsWith("seen")) continue;
    for (const line of readFileSync(join(INBOX_DIR, file), "utf8").split("\n")) {
      if (!line.trim()) continue;
      try {
        const item = JSON.parse(line);
        const at = new Date(item.pubDate ?? item.fetchedAt);
        if (!item.title || Number.isNaN(at.getTime())) continue;
        out.push({
          title: item.title,
          at,
          source: item.sourceName ?? item.sourceId,
          type: item.sourceType,
        });
      } catch {
        // Оборванная строка — пропускаем.
      }
    }
  }
  return out;
}

const posts = ourPosts();
const items = competitorItems();
// Конкурентами считаем только те источники, что помечены как signal:
// первоисточники (ведомства, ЦБ) — это не «конкурент написал раньше».
const signals = items.filter((i) => i.type === "signal");

console.log(`наших материалов: ${posts.length} | записей инбокса: ${items.length}, из них конкурентных: ${signals.length}\n`);

const byHourBucket = signals.reduce((m, i) => {
  const k = i.at.toISOString().slice(0, 10);
  (m[k] ??= []).push(i);
  return m;
}, {});

const results = [];
for (const post of posts) {
  const postTokens = tokens(post.title);
  const postNums = numbers(post.title);
  let best = null;

  // Кандидаты — записи за день публикации и соседние.
  const day = post.at.toISOString().slice(0, 10);
  const prev = new Date(post.at.getTime() - 864e5).toISOString().slice(0, 10);
  const next = new Date(post.at.getTime() + 864e5).toISOString().slice(0, 10);
  for (const bucket of [prev, day, next]) {
    for (const item of byHourBucket[bucket] ?? []) {
      const hours = Math.abs(post.at - item.at) / 3.6e6;
      if (hours > WINDOW_HOURS) continue;
      const tok = jaccard(postTokens, tokens(item.title));
      const num = jaccard(postNums, numbers(item.title));
      const score = 0.6 * tok + 0.4 * num;
      if (score >= ACCEPT && (!best || score > best.score)) {
        best = { score, item, hours, lead: post.at < item.at };
      }
    }
  }

  results.push({
    title: post.title,
    category: post.category,
    matched: !!best,
    lead: best ? best.lead : true,
    lagHours: best && !best.lead ? +((post.at - best.item.at) / 3.6e6).toFixed(1) : null,
    source: best?.item.source ?? null,
  });
}

const matched = results.filter((r) => r.matched);
const followed = matched.filter((r) => !r.lead);
const led = results.filter((r) => !r.matched || r.lead);

console.log(`ВЕДЁМ ИЛИ ИДЁМ СЛЕДОМ\n`);
console.log(`  вели или писали то, чего у конкурентов нет: ${led.length} (${((led.length / results.length) * 100).toFixed(0)}%)`);
console.log(`  шли следом за конкурентом:                  ${followed.length} (${((followed.length / results.length) * 100).toFixed(0)}%)`);

if (followed.length) {
  const lags = followed.map((r) => r.lagHours).sort((a, b) => a - b);
  console.log(`\n  отставание, часов: медиана ${lags[Math.floor(lags.length / 2)]}, ` +
    `быстрее часа ${lags.filter((l) => l < 1).length}, дольше суток ${lags.filter((l) => l > 24).length}`);
  const bySource = {};
  for (const r of followed) bySource[r.source] = (bySource[r.source] ?? 0) + 1;
  console.log("\n  за кем идём чаще всего:");
  for (const [s, n] of Object.entries(bySource).sort((a, b) => b[1] - a[1]).slice(0, 6)) {
    console.log(`    ${String(s).padEnd(16)} ${n}`);
  }
}

const byCat = {};
for (const r of results) {
  const c = r.category ?? "—";
  byCat[c] ??= { total: 0, followed: 0 };
  byCat[c].total += 1;
  if (r.matched && !r.lead) byCat[c].followed += 1;
}
console.log("\n  по категориям (доля тем, где мы шли следом):");
for (const [c, s] of Object.entries(byCat).sort((a, b) => b[1].total - a[1].total)) {
  console.log(`    ${c.padEnd(12)} ${String(s.total).padStart(4)} материалов, следом ${((s.followed / s.total) * 100).toFixed(0)}%`);
}

mkdirSync(DATA_DIR, { recursive: true });
writeFileSync(
  join(DATA_DIR, "lead-or-follow.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), total: results.length, led: led.length, followed: followed.length, results }, null, 2),
);
console.log(`\n→ ${join(DATA_DIR, "lead-or-follow.json")}`);
