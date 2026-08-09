#!/usr/bin/env node
// Теневой замер отсева. Ничего не фильтрует и ничего не меняет: считает,
// СКОЛЬКО отсеял бы каждый предполагаемый фильтр и ЧТО именно.
//
// Зачем отдельным скриптом, а не флагом в inbox-select. Боевой путь отбора
// трогать нельзя, пока не доказано, что фильтр не режет живое. Замер обязан
// быть безопасным по построению — тогда его можно гонять на проде хоть
// каждым прогоном и накапливать статистику, прежде чем что-то включать.
//
// Два кандидата в фильтры, оба из моей же оценки расхода:
//
//   world  — барьер по числу независимых блоков. ВНИМАНИЕ: пороги берутся
//            из config/newsroom-policy.json (world.tiers.*), а НЕ из прозы
//            спецификации. Они расходятся: спека говорит «три и больше
//            блоков», конфиг — 2 у mustPublish и publishIfQuality, 1 у
//            publishIfQuiet. Спецификация сама объявляет конфиг главным
//            (§Обязательные материалы, п.3). Фильтр на «≥3» вырезал бы весь
//            тир publishIfQuiet целиком, а там, в частности, «спорт с
//            узбекскими игроками за рубежом — ВСЕГДА, независимо от tier».
//
//   local  — потолок балла. Механическую часть selection.score скрипт
//            считает точно; модельная часть (affectsEveryone 20 + actionable
//            15 + money 10 = 45) неизвестна, поэтому берём её максимумом.
//            Кластер, у которого механика + 45 < minScore, не проходит
//            ни при каком решении модели. Это единственный вид отсева,
//            который нельзя оспорить: он арифметический.
//            exclusive (+20) тоже механический: первоисточник есть,
//            сигналов конкурентов нет. reprintOnly (−40) не применяем —
//            игнорировать штраф консервативно, он бы отсеял больше.
//
// Кластеризация здесь та же, что нужна будущему фильтру, — по основам слов
// заголовка. Её слабое место известно и измеряется отдельным пунктом
// отчёта: кросс-языковые сюжеты («Russia strikes Kyiv» / «Россия ударила
// по Киеву») она не сводит, а барьер по блокам считает именно по кластеру.
// Поэтому в отчёте есть crossLingualRisk — доля кластеров, у которых все
// источники одного языкового блока и потому барьер может быть занижен.
//
// Использование:
//   node scripts/inbox-shadow-stats.mjs              — сводка
//   node scripts/inbox-shadow-stats.mjs --json       — машиночитаемо
//   node scripts/inbox-shadow-stats.mjs --examples=5 — с примерами отсеянного

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, loadJournal, readInbox, selectFresh } from "../lib/inbox-core.mjs";
import { titleTokens, titleOverlap } from "../lib/posts-index.mjs";

function opt(name, fallback) {
  const p = process.argv.find((a) => a.startsWith(`--${name}=`));
  return p ? p.slice(name.length + 3) : fallback;
}
const asJson = process.argv.includes("--json");
const examples = Number(opt("examples", 0));

const policy = JSON.parse(readFileSync(join(ROOT, "config/newsroom-policy.json"), "utf8"));
const SCORE = policy.selection.score;
const MIN_SCORE = policy.selection.minScore;

// Модельная часть балла — то, что скрипт знать не может.
const MODEL_MAX = SCORE.affectsEveryone + SCORE.actionable + SCORE.money;

// Российские блоки: сюжет, подтверждённый только ими, барьер не проходит.
const RU_BLOCS = new Set(["ru-state", "ru-business"]);

const at = Date.now();
const journal = loadJournal(ROOT, at);

function fresh(world) {
  const raw = readInbox(ROOT, { world, at });
  return selectFresh(raw.items, {
    seen: journal.blocked,
    claimed: journal.claimed,
    at,
    maxAgeHours: 24,
  }).fresh;
}

/**
 * Жадная кластеризация по основам слов заголовка. Порог тот же, что у
 * сверки дублей: половина значимых основ общая.
 */
const CLUSTER_NEAR = 0.45;

function cluster(items) {
  const out = [];
  for (const it of items) {
    const tokens = titleTokens(it.title ?? "");
    let placed = false;
    for (const c of out) {
      if (titleOverlap(tokens, c.tokens) >= CLUSTER_NEAR) {
        c.items.push(it);
        for (const t of tokens) c.tokens.add(t);
        placed = true;
        break;
      }
    }
    if (!placed) out.push({ tokens, items: [it] });
  }
  return out;
}

// ── Мировой поток: барьер по блокам, по порогам из конфига ────────────────
const worldItems = fresh(true);
const worldClusters = cluster(worldItems);

const tiers = Object.entries(policy.world.tiers)
  .filter(([, v]) => v && typeof v === "object" && "minDistinctBlocs" in v)
  .map(([name, v]) => ({
    name,
    minDistinctBlocs: v.minDistinctBlocs,
    requireNonRussianBloc: v.requireNonRussianBloc === true,
  }));

function clusterBlocs(c) {
  return new Set(c.items.map((i) => i.bloc).filter(Boolean));
}

const worldReport = {
  items: worldItems.length,
  clusters: worldClusters.length,
  blocDistribution: {},
  byTier: {},
  crossLingualRisk: 0,
};

for (const c of worldClusters) {
  const n = clusterBlocs(c).size;
  worldReport.blocDistribution[n] = (worldReport.blocDistribution[n] ?? 0) + 1;
}

for (const t of tiers) {
  const passing = worldClusters.filter((c) => {
    const blocs = clusterBlocs(c);
    if (blocs.size < t.minDistinctBlocs) return false;
    if (t.requireNonRussianBloc && ![...blocs].some((b) => !RU_BLOCS.has(b))) return false;
    return true;
  });
  worldReport.byTier[t.name] = {
    rule: `blocs>=${t.minDistinctBlocs}${t.requireNonRussianBloc ? " + non-ru" : ""}`,
    clustersPassing: passing.length,
    itemsPassing: passing.reduce((s, c) => s + c.items.length, 0),
    itemsDropped: worldItems.length - passing.reduce((s, c) => s + c.items.length, 0),
  };
}

// Сюжет из одного источника не с чем сводить — барьер по нему занижен
// ровно настолько, насколько кластеризация не нашла ему пары.
const singletons = worldClusters.filter((c) => c.items.length === 1).length;
worldReport.crossLingualRisk = worldClusters.length
  ? Number((singletons / worldClusters.length).toFixed(3))
  : 0;
worldReport.$crossLingualNote =
  `${singletons} кластеров из ${worldClusters.length} — одиночные. Часть из них ` +
  "на деле один сюжет на разных языках, который группировка по основам слов " +
  "не свела. Для них барьер по блокам занижен, и фильтр отсеял бы их зря.";

// ── Местный поток: потолок балла ─────────────────────────────────────────
const localItems = fresh(false);
const localClusters = cluster(localItems);

function mechanicalScore(c) {
  const sources = c.items.filter((i) => i.sourceType === "source");
  const signals = c.items.filter((i) => i.sourceType === "signal").length;
  let s = 0;
  const parts = [];

  if (sources.length) {
    s += SCORE.hasPrimarySource;
    parts.push("hasPrimarySource");
    const best = ["P0", "P1", "P2"].find((p) => sources.some((i) => i.sourcePriority === p));
    if (best === "P0") { s += SCORE.primarySourceP0; parts.push("P0"); }
    else if (best === "P1") { s += SCORE.primarySourceP1; parts.push("P1"); }
    else if (best === "P2") { s += SCORE.primarySourceP2; parts.push("P2"); }
    if (!signals) { s += SCORE.exclusive; parts.push("exclusive"); }
  } else {
    s += SCORE.noPrimarySourceFound;
    parts.push("noPrimarySourceFound");
  }

  if (signals >= 5) { s += SCORE.competitorSignals5plus; parts.push("signals5+"); }
  else if (signals >= 3) { s += SCORE.competitorSignals3plus; parts.push("signals3+"); }

  return { score: s, parts };
}

const scored = localClusters.map((c) => {
  const m = mechanicalScore(c);
  return { c, ...m, ceiling: m.score + MODEL_MAX };
});
const impossible = scored.filter((x) => x.ceiling < MIN_SCORE);

const localReport = {
  items: localItems.length,
  clusters: localClusters.length,
  minScore: MIN_SCORE,
  modelMaxBonus: MODEL_MAX,
  clustersImpossible: impossible.length,
  itemsImpossible: impossible.reduce((s, x) => s + x.c.items.length, 0),
  itemsSurviving: localItems.length - impossible.reduce((s, x) => s + x.c.items.length, 0),
  $note:
    `Отсев арифметический: механика + ${MODEL_MAX} (максимум модельной части) < ` +
    `${MIN_SCORE}. Такой кластер не проходит порог ни при каком решении модели.`,
};

const report = { generatedAt: new Date(at).toISOString(), world: worldReport, local: localReport };

if (examples > 0) {
  report.examples = {
    worldDropped: worldClusters
      .filter((c) => clusterBlocs(c).size < 2)
      .slice(0, examples)
      .map((c) => ({ blocs: [...clusterBlocs(c)], title: c.items[0].title })),
    localImpossible: impossible.slice(0, examples).map((x) => ({
      ceiling: x.ceiling,
      parts: x.parts,
      items: x.c.items.length,
      title: x.c.items[0].title,
    })),
  };
}

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);
  console.log(`Теневой замер отсева · ${report.generatedAt}\n`);
  console.log(`МИРОВОЙ  ${worldReport.items} items → ${worldReport.clusters} кластеров`);
  console.log(`  блоков на кластер: ${JSON.stringify(worldReport.blocDistribution)}`);
  for (const [name, r] of Object.entries(worldReport.byTier)) {
    console.log(
      `  ${name.padEnd(17)} ${r.rule.padEnd(22)} прошло ${r.clustersPassing} кластеров / ` +
        `${r.itemsPassing} items · отсеялось ${r.itemsDropped} (${pct(r.itemsDropped, worldReport.items)}%)`
    );
  }
  console.log(`  риск кросс-языкового занижения: ${pct(worldReport.crossLingualRisk, 1)}% одиночных кластеров`);
  console.log(`\nМЕСТНЫЙ  ${localReport.items} items → ${localReport.clusters} кластеров`);
  console.log(
    `  потолок < ${MIN_SCORE}: ${localReport.clustersImpossible} кластеров / ` +
      `${localReport.itemsImpossible} items (${pct(localReport.itemsImpossible, localReport.items)}%) — ` +
      `останется ${localReport.itemsSurviving}`
  );
  if (report.examples) {
    console.log("\nПримеры отсеянного (мировой, <2 блоков):");
    for (const e of report.examples.worldDropped) console.log(`  [${e.blocs}] ${e.title}`);
    console.log("\nПримеры отсеянного (местный, потолок):");
    for (const e of report.examples.localImpossible) {
      console.log(`  потолок ${e.ceiling} (${e.parts.join("+")}) ×${e.items} — ${e.title}`);
    }
  }
}
