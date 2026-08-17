#!/usr/bin/env node
// Считает tgScore и решает, идёт ли материал в Telegram-канал.
//
// ЗАЧЕМ СКРИПТОМ. Балл складывается по таблице из config/telegram-scoring.json:
// баллы за рубрику, за приоритет первоисточника, за упоминание имени
// из config/named-actors/*, минус штрафы, потом сравнение с порогом своей
// категории. Это арифметика по данным, которые уже лежат в конфигах, —
// и до 17.08.2026 её выполняла модель, каждый раз перечитывая полторы
// сотни имён и таблицу порогов.
//
// Модель по-прежнему решает то, что решить может только она: какие
// качественные модификаторы применимы (тариф ли это, который почувствует
// каждый; нужно ли читателю что-то сделать в срок) и каким воротом
// технологический материал заходит в основной канал. Всё остальное —
// сложение, сравнение и запись поля — здесь.
//
//   node scripts/tg-score.mjs <draft.mdx>
//   node scripts/tg-score.mjs <draft.mdx> --modifiers affectsEveryone,money
//   node scripts/tg-score.mjs <draft.mdx> --modifiers impactUzbekistan --gate uzbekImpact
//   node scripts/tg-score.mjs <draft.mdx> --modifiers … --write   # проставить поля
//
// Поле broadcast ставится ВСЕГДА, любое значение, — это признак того, что
// материал прошёл финализацию. Материал без поля не уходит никуда, включая
// профильные каналы: правило fail-closed, потому что 2 и 3 августа 2026
// из-за умолчания в канал ушли недоделанные статьи.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { parseFrontmatter, stripFrontmatter } from "../lib/frontmatter.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const argv = process.argv.slice(2);
const flag = (n) => {
  const i = argv.indexOf(`--${n}`);
  return i === -1 ? null : argv[i + 1] ?? "";
};
const has = (n) => argv.includes(`--${n}`);
const file = argv.find((a) => !a.startsWith("--") && a.endsWith(".mdx"));

if (!file || !existsSync(file)) {
  console.error("Использование: node scripts/tg-score.mjs <draft.mdx> [--modifiers a,b] [--gate X] [--write] [--json]");
  process.exit(1);
}

const cfg = JSON.parse(readFileSync(join(ROOT, "config/telegram-scoring.json"), "utf8"));
const tg = JSON.parse(readFileSync(join(ROOT, "config/telegram-channels.json"), "utf8"));
const news = JSON.parse(readFileSync(join(ROOT, "config/news-sources.json"), "utf8"));
const policy = JSON.parse(readFileSync(join(ROOT, "config/newsroom-policy.json"), "utf8"));

const raw = readFileSync(file, "utf8");
const fm = parseFrontmatter(raw);
const body = stripFrontmatter(raw);
const category = String(fm.category ?? "");
const score = cfg.score ?? {};

const parts = [];
const add = (points, why) => {
  if (points) parts.push({ points, why });
};

// ─── Рубрика ───
add(score.byCategory?.[category] ?? 0, `рубрика ${category}`);

// ─── Приоритет первоисточника ───
//
// Берём наивысший среди источников статьи. Приоритет ищем там же, где его
// знает остальная система: каталог лент, каталог каналов, список официальных
// доменов. Официальный сайт ведомства — P0 по определению: это место, где
// лежит сам документ.
const channelPriority = new Map(
  [...(tg.channels ?? []), ...(tg.citableChannels ?? [])].map((c) => [
    String(c.handle ?? "").replace(/^@/, "").toLowerCase(),
    c.priority ?? "P1",
  ]),
);
const feedPriority = new Map(
  (news.rss ?? []).map((r) => {
    try {
      return [new URL(r.url).hostname.replace(/^www\./, "").toLowerCase(), r.priority];
    } catch {
      return ["", null];
    }
  }),
);
const officialDomains = policy.factCheckSkip?.officialDomains ?? [];

function priorityOf(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "t.me" || host === "telegram.me") {
      const handle = u.pathname.replace(/^\/(s\/)?/, "").split("/")[0].toLowerCase();
      return channelPriority.get(handle) ?? null;
    }
    if (officialDomains.some((d) => host === d || host.endsWith(`.${d}`))) return "P0";
    return feedPriority.get(host) ?? null;
  } catch {
    return null;
  }
}

const RANK = { P0: 0, P1: 1, P2: 2, P3: 3 };
const priorities = (Array.isArray(fm.sources) ? fm.sources : [])
  .map((s) => priorityOf(s?.url ?? ""))
  .filter(Boolean)
  .sort((a, b) => (RANK[a] ?? 9) - (RANK[b] ?? 9));
const best = priorities[0] ?? null;
if (best) add(score.byPrimarySource?.[best] ?? 0, `первоисточник ${best}`);

// ─── Имена ───
//
// Читаем только применимые файлы: считая балл технологической заметке,
// незачем тащить полторы сотни спортивных имён.
const actorFiles = ["global", ...(category === "sport" || category === "tech" ? [category] : [])];
const haystack = `${fm.title ?? ""} ${(fm.tags ?? []).join(" ")} ${body}`.toLowerCase();

// Имя ищем по границам слова, а не подстрокой. Иначе «Интер» находится
// в слове «интервью», а «Inter» — в «Incheon International Airport»:
// оба случая нашлись на первом же прогоне 17.08.2026 и дали материалам
// лишние +15. \b в JS работает по латинице, поэтому границы задаём
// явно через класс букв и цифр.
const mentions = (name) => {
  const esc = String(name).toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\p{L}\\p{N}])${esc}(?![\\p{L}\\p{N}])`, "u").test(haystack);
};

// Списки лежат группами внутри групп: sport.json → globalIcons → football.
// Плоский обход верхнего уровня не доставал до них вовсе — весь файл имён
// спорта не читался (найдено при первом прогоне 17.08.2026). Обходим
// рекурсивно, служебные ключи со знаком доллара пропускаем.
function* namesOf(node, path = []) {
  if (Array.isArray(node)) {
    for (const v of node) if (typeof v === "string") yield [v, path.join("/")];
    return;
  }
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      if (k.startsWith("$")) continue;
      yield* namesOf(v, [...path, k]);
    }
  }
}

let actorHit = null;
for (const name of actorFiles) {
  const p = join(ROOT, "config/named-actors", `${name}.json`);
  if (!existsSync(p)) continue;
  for (const [candidate, group] of namesOf(JSON.parse(readFileSync(p, "utf8")))) {
    if (mentions(candidate)) {
      actorHit = `${candidate} (${name}/${group})`;
      break;
    }
  }
  if (actorHit) break;
}
if (actorHit) add(score.namedActorGlobal ?? 15, `имя из списка: ${actorHit}`);

// ─── Модификаторы и штрафы от модели ───
const QUALITATIVE = [
  "affectsEveryone",
  "actionable",
  "money",
  "impactUzbekistan",
  "exclusive",
  "historicalImportance",
  "ephemeral",
  "trulyNiche",
];
const asked = (flag("modifiers") ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const unknown = asked.filter((m) => !QUALITATIVE.includes(m));
if (unknown.length) {
  console.error(`[tg-score] неизвестные модификаторы: ${unknown.join(", ")}`);
  console.error(`  допустимые: ${QUALITATIVE.join(", ")}`);
  process.exit(1);
}
for (const m of asked) add(score[m] ?? 0, m);

const tgScore = parts.reduce((a, p) => a + p.points, 0);

// ─── Порог ───
let threshold;
let thresholdName;
if (category === "world") {
  threshold = cfg.worldBroadcastThreshold ?? 65;
  thresholdName = "worldBroadcastThreshold";
} else if (category === "sport") {
  threshold = cfg.sportToMainChannelBar ?? 50;
  thresholdName = "sportToMainChannelBar";
} else if (category === "tech") {
  threshold = cfg.techToMainChannelBar ?? 70;
  thresholdName = "techToMainChannelBar";
} else {
  threshold = cfg.localBroadcastThreshold ?? 15;
  thresholdName = "localBroadcastThreshold";
}

const gate = flag("gate");
let broadcast = tgScore >= threshold;
const notes = [];

// Ворота для tech: мало набрать балл. uzbekImpact проходит по обычному
// порогу — канал про Узбекистан, местная тема там уместна и без мирового
// масштаба.
if (category === "tech") {
  const gates = Object.keys(cfg.techMainChannelGates ?? {}).filter((k) => !k.startsWith("$"));
  if (gate === "uzbekImpact") {
    broadcast = tgScore >= (cfg.localBroadcastThreshold ?? 15) * 0 + 50;
    notes.push("ворот uzbekImpact: порог 50 вместо высокого");
  } else if (!gate) {
    broadcast = false;
    notes.push(`ворота не указаны (--gate), в основной канал не идёт; допустимые: ${gates.join(", ")}`);
  } else if (!gates.includes(gate)) {
    console.error(`[tg-score] неизвестные ворота «${gate}». Допустимые: ${gates.join(", ")}`);
    process.exit(1);
  }
}

console.error(`[tg-score] ${relative(ROOT, file)} · рубрика ${category || "?"}`);
for (const p of parts) console.error(`  ${p.points > 0 ? "+" : ""}${p.points}  ${p.why}`);
console.error(`  = ${tgScore}, порог ${threshold} (${thresholdName})`);
for (const n of notes) console.error(`  ! ${n}`);
console.error(`→ broadcast: ${broadcast}`);
if (category === "sport" || category === "tech") {
  console.error(
    `  (профильный канал получает материал в любом случае — важно само наличие поля broadcast)`,
  );
}

if (has("json")) {
  console.log(JSON.stringify({ tgScore, threshold, broadcast, gate: gate ?? null, parts }, null, 2));
}

// ─── Запись ───
if (has("write")) {
  const head = raw.slice(0, raw.indexOf("\n---", 3) + 1);
  let next = raw;
  const setField = (name, value) => {
    const re = new RegExp(`^${name}:.*$`, "m");
    if (re.test(head)) next = next.replace(re, `${name}: ${value}`);
    else next = next.replace(/\n---/, `\n${name}: ${value}\n---`);
  };
  setField("tgScore", String(tgScore));
  setField("broadcast", String(broadcast));
  if (gate) setField("mainChannelGate", gate);
  writeFileSync(file, next);
  console.error(`[tg-score] поля проставлены в ${relative(ROOT, file)}`);
}
