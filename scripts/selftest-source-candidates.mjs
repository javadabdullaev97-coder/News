#!/usr/bin/env node
// Самотест сбора кандидатов-сайтов (lib/source-candidates.mjs).
//
// Зачем отдельно. Механизм пассивный: он молчит и копит. Ошибка в фильтре не
// падает с трейсбеком — она выглядит как «конкуренты ни на кого не ссылаются»
// (перефильтровали) либо как журнал на тысячу строк facebook.com
// (недофильтровали). Обе беды замечают через недели, поэтому каждое правило
// отсева закреплено проверкой.
//
// Запуск: node scripts/selftest-source-candidates.mjs

import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  SOURCE_CANDIDATES_LOG,
  collectSourceCandidates,
  domainOf,
  foldSourceCandidates,
  isNoiseDomain,
  knownDomains,
  markSourceCandidate,
  registrableDomain,
} from "../lib/source-candidates.mjs";

let passed = 0;
const failures = [];

function check(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failures.push({ name, err });
    console.log(`  ХХ  ${name}: ${err.message}`);
  }
}

function eq(actual, expected, what) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${what}: ожидалось ${e}, получено ${a}`);
}

const roots = [];
function fixture(sources = { rss: [] }) {
  const root = mkdtempSync(join(tmpdir(), "leap-srccand-"));
  roots.push(root);
  mkdirSync(join(root, "config"), { recursive: true });
  mkdirSync(join(root, "content/state"), { recursive: true });
  writeFileSync(join(root, "config/news-sources.json"), JSON.stringify(sources));
  return root;
}

const logOf = (root) => {
  const p = join(root, SOURCE_CANDIDATES_LOG);
  if (!existsSync(p)) return [];
  return readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
};

// ─── Разбор адреса ───

check("регистрируемое имя: поддомен схлопывается к домену", () => {
  eq(registrableDomain("rss.dw.com"), "dw.com", "поддомен");
  eq(registrableDomain("my.sud.uz"), "sud.uz", "два уровня");
  eq(registrableDomain("lex.uz"), "lex.uz", "и так домен");
});

// Британские и турецкие зоны реально встречаются в конфиге (transfermarkt),
// и без списка составных суффиксов co.uk схлопывался бы в «co.uk».
check("составные зоны не схлопываются в суффикс", () => {
  eq(registrableDomain("www.transfermarkt.co.uk"), "transfermarkt.co.uk", "co.uk");
  eq(registrableDomain("a.b.transfermarkt.com.tr"), "transfermarkt.com.tr", "com.tr");
});

check("не-http и мусор отбрасываются", () => {
  eq(domainOf("mailto:a@b.uz"), null, "mailto");
  eq(domainOf("javascript:void(0)"), null, "javascript");
  eq(domainOf("не ссылка"), null, "мусор");
  eq(domainOf("https://lex.uz/ru/docs/1"), "lex.uz", "нормальный адрес");
});

// ─── Отсев ───

check("соцсети и инфраструктура — шум", () => {
  eq(isNoiseDomain("www.facebook.com"), true, "facebook");
  eq(isNoiseDomain("api.whatsapp.com"), true, "поддомен whatsapp");
  eq(isNoiseDomain("t.me"), true, "t.me разбирает channel-candidates");
  eq(isNoiseDomain("lex.uz"), false, "нормальный источник");
});

// Википедия и RFE/RL запрещены §2 редполитики. Копить их как кандидатов
// означало бы каждый раз предлагать планёрке завести запрещённый источник.
check("запрещённые редполитикой не копятся", () => {
  eq(isNoiseDomain("ru.wikipedia.org"), true, "википедия");
  eq(isNoiseDomain("www.ozodlik.org"), true, "Озодлик");
});

// Сокращатель прячет настоящий адрес, а telegra.ph — блокнот без редакции.
// Оба всплыли в первом же живом улове с госканалов 17.08.2026.
check("сокращатели и одноразовые публикаторы — шум", () => {
  eq(isNoiseDomain("bit.ly"), true, "сокращатель");
  eq(isNoiseDomain("telegra.ph"), true, "телеграф");
  eq(isNoiseDomain("teletype.in"), false, "teletype — у нас там живой источник");
});

check("известные домены берутся из конфига по регистрируемому имени", () => {
  const root = fixture({
    rss: [{ id: "dw-ru", url: "https://rss.dw.com/rdf/rss-ru-all" }],
    scrape: [{ id: "gov-uz", listUrl: "https://gov.uz/ru/news" }],
    excluded: [{ domain: "azon.uz" }],
  });
  const known = knownDomains(root);
  eq(known.has("dw.com"), true, "лента на поддомене");
  eq(known.has("gov.uz"), true, "скрейпер");
  eq(known.has("azon.uz"), true, "исключённый");
  eq(known.has("lex.uz"), false, "неизвестный");
});

// ─── Сбор ───

check("новый домен записывается, известный и шумный — нет", () => {
  const root = fixture({ rss: [{ id: "kun", url: "https://kun.uz/news/rss" }] });
  const res = collectSourceCandidates(root, [
    { url: "https://lex.uz/docs/7", foundIn: "a1", sourceId: "gazeta-uz", context: "по данным Минюста" },
    { url: "https://kun.uz/other", foundIn: "a1", sourceId: "gazeta-uz" },
    { url: "https://facebook.com/page", foundIn: "a1", sourceId: "gazeta-uz" },
  ]);
  eq(res.domains, ["lex.uz"], "записан только новый");
  eq(logOf(root).filter((e) => e.ev === "seen").length, 1, "одно событие");
});

// Перелинковка внутри сайта — не источник. Проверяется по регистрируемому
// имени: статья на gazeta.uz ссылается на ru.gazeta.uz, и это тот же сайт.
check("самоссылка конкурента не считается источником", () => {
  const root = fixture();
  const res = collectSourceCandidates(root, [
    { url: "https://ru.gazeta.uz/other", foundIn: "a1", sourceId: "gazeta-uz", sourceDomain: "gazeta.uz" },
  ]);
  eq(res.appended, 0, "ничего не записано");
});

// Одна статья, разобранная дважды, не должна плодить наблюдения; тот же домен
// в ДРУГОЙ статье — должен: по числу наблюдений видно, насколько он ходовой.
check("дедуп по паре (домен, статья)", () => {
  const root = fixture();
  const s = { url: "https://stat.uz/x", foundIn: "a1", sourceId: "kun-uz" };
  collectSourceCandidates(root, [s]);
  collectSourceCandidates(root, [s]);
  eq(logOf(root).filter((e) => e.ev === "seen").length, 1, "повтор той же статьи");
  collectSourceCandidates(root, [{ ...s, foundIn: "a2" }]);
  eq(logOf(root).filter((e) => e.ev === "seen").length, 2, "другая статья");
});

check("решённый кандидат больше не копится", () => {
  const root = fixture();
  collectSourceCandidates(root, [{ url: "https://stat.uz/x", foundIn: "a1", sourceId: "kun-uz" }]);
  markSourceCandidate(root, "stat.uz", "resolve", { addedAs: "rss" });
  const res = collectSourceCandidates(root, [{ url: "https://stat.uz/y", foundIn: "a2", sourceId: "kun-uz" }]);
  eq(res.appended, 0, "после resolve не копится");
});

check("свёртка считает наблюдения и статус", () => {
  const root = fixture();
  collectSourceCandidates(root, [{ url: "https://stat.uz/x", foundIn: "a1", sourceId: "kun-uz", context: "по данным" }]);
  collectSourceCandidates(root, [{ url: "https://stat.uz/y", foundIn: "a2", sourceId: "daryo-uz" }]);
  const folded = foldSourceCandidates(root).get("stat.uz");
  eq(folded.sightings, 2, "наблюдений");
  eq(folded.sources.sort(), ["daryo-uz", "kun-uz"], "разные конкуренты");
  eq(folded.status, "open", "статус");
  markSourceCandidate(root, "stat.uz", "dismiss", { reason: "перепечатка" });
  eq(foldSourceCandidates(root).get("stat.uz").status, "dismissed", "после dismiss");
});

for (const r of roots) rmSync(r, { recursive: true, force: true });

console.log(`\nпройдено ${passed}, провалено ${failures.length}`);
process.exit(failures.length ? 1 : 0);
