#!/usr/bin/env node
// Сверка кандидата с уже вышедшим, стоящим в очереди, ждущим проверки
// и отклонённым. Правило №2 спецификации планёрки, исполняемое машиной.
//
// Зачем. Правило требовало сверять тему с content/queue, журналом и
// content/posts «за последние три дня». Скрипта не было, и оркестратор
// делал это глазами — трое суток это ~420 файлов, с языковыми версиями
// втрое больше. Сравнение строк и множеств — не та работа, ради которой
// стоит открывать четыреста файлов в контекст.
//
// Что скрипт НЕ решает: совпадение темы при полностью разных словах
// («Сенат одобрил» / «Парламент принял») и развитие сюжета. Он отвечает
// фактами — вот совпавшие ссылки, вот близкие заголовки, — а решение
// «дубль или развитие» остаётся за оркестратором. Поэтому вердикт
// `possible` не запрещает производство, а требует посмотреть.
//
// Зависимостей нет, работает в свежем клоне. Индекс собирается сам, если
// его ещё нет или он старше пяти минут.
//
// Использование:
//   node scripts/topic-dupecheck.mjs --title="ЦБ повысил ставку до 15%" \
//        --links="https://t.me/cbu_uz/123,https://cbu.uz/ru/press/456"
//   node scripts/topic-dupecheck.mjs --batch=candidates.json   — пачкой
//
// Формат --batch: [{ "id": "…", "title": "…", "links": ["…"] }, …]
//
// Код возврата всегда 0: это справка, а не сторож. Вердикт — в JSON.

import { existsSync, readFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { ROOT } from "../lib/inbox-core.mjs";
import { titleTokens, titleOverlap, normLink } from "../lib/posts-index.mjs";

const INDEX = join(ROOT, "config/generated/published-index.json");
const MAX_AGE_MS = 5 * 60 * 1000;

// Порог близости заголовков. 0.45 по Жаккару значащих слов — это примерно
// «половина существительных совпала». Ниже начинают срабатывать пары вида
// «Ташкент … тариф» на несвязанных темах, выше — теряются перепечатки,
// переписанные другими словами.
const NEAR = 0.45;

function opt(name, fallback) {
  const p = process.argv.find((a) => a.startsWith(`--${name}=`));
  return p ? p.slice(name.length + 3) : fallback;
}

function loadIndex() {
  const stale =
    !existsSync(INDEX) || Date.now() - statSync(INDEX).mtimeMs > MAX_AGE_MS;
  if (stale) {
    execFileSync(process.execPath, [join(ROOT, "scripts/build-posts-index.mjs")], {
      stdio: ["ignore", "ignore", "inherit"],
    });
  }
  return JSON.parse(readFileSync(INDEX, "utf8"));
}

/** Темы индекса в вид, пригодный для сравнения. Отдельно — чтобы
 *  selftest мог собрать корпус руками, не трогая диск. */
export function prepare(topics) {
  return topics.map((t) => ({
    ...t,
    _tokens: titleTokens(t.title),
    _links: new Set((t.links ?? []).map(normLink)),
  }));
}

export function check({ id, title = "", links = [] }, topics) {
  const want = links.map(normLink).filter(Boolean);
  const byLink = [];
  const byTitle = [];

  for (const t of topics) {
    const shared = want.filter((l) => t._links.has(l));
    if (shared.length) {
      byLink.push({ zone: t.zone, slug: t.slug, path: t.path, day: t.day, sharedLinks: shared });
      continue;
    }
    const score = titleOverlap(titleTokens(title), t._tokens);
    if (score >= NEAR) {
      byTitle.push({
        zone: t.zone,
        slug: t.slug,
        path: t.path,
        day: t.day,
        title: t.title,
        overlap: Number(score.toFixed(2)),
      });
    }
  }

  byTitle.sort((a, b) => b.overlap - a.overlap);

  // Совпадение по ссылке — факт: тот же самый материал уже разобран.
  // Совпадение по заголовку — повод посмотреть: это может быть и дубль,
  // и законное развитие сюжета.
  // Перекрытие 0.6 и выше — это уже не «похожие темы», а почти наверняка
  // тот же материал, переписанный другими словами. Формально это по-прежнему
  // не запрет (развитие сюжета выглядит так же), но совет обязан быть другим:
  // «посмотри» люди пролистывают, «докажи, что это новый факт» — нет.
  const strong = byTitle.filter((t) => t.overlap >= 0.6);
  const verdict = byLink.length ? "duplicate" : byTitle.length ? "possible" : "clear";
  const hint =
    verdict === "duplicate"
      ? "Ссылки уже разобраны — не производи повторно."
      : strong.length
        ? "Заголовок совпадает больше чем наполовину — это тот же сюжет. Брать можно ТОЛЬКО как развитие: назови в первом абзаце новый факт, которого не было в вышедшем материале, и сошлись на него. Нового факта нет — не бери."
        : verdict === "possible"
          ? "Открой совпавшие материалы: дубль — пропусти, развитие сюжета — пиши как развитие со ссылкой на вышедшее."
          : "Совпадений нет.";

  return {
    ...(id ? { id } : {}),
    verdict,
    ...(strong.length ? { strongTitleMatch: true } : {}),
    hint,
    matchedByLink: byLink,
    matchedByTitle: byTitle.slice(0, 5),
  };
}

// ─── CLI ───
//
// Модуль импортируется selftest'ом, поэтому индекс собирается и аргументы
// разбираются только при прямом запуске: иначе тест платил бы за пересборку
// индекса и падал на чужих argv.
const isMain = process.argv[1] && process.argv[1].endsWith("topic-dupecheck.mjs");
if (!isMain) {
  // eslint-disable-next-line no-empty
} else {
const index = loadIndex();
const topics = prepare(index.topics);
const batchPath = opt("batch", null);
if (batchPath) {
  const items = JSON.parse(readFileSync(batchPath, "utf8"));
  const results = items.map((it) => check(it, topics));
  console.log(
    JSON.stringify(
      {
        since: index.since,
        windowDays: index.windowDays,
        checked: results.length,
        clear: results.filter((r) => r.verdict === "clear").length,
        results,
      },
      null,
      2
    )
  );
} else {
  const links = (opt("links", "") || "").split(",").map((s) => s.trim()).filter(Boolean);
  const title = opt("title", "");
  if (!title && !links.length) {
    console.error("нужен --title и/или --links (или --batch=файл.json)");
    process.exit(0);
  }
  console.log(
    JSON.stringify({ since: index.since, ...check({ title, links }, topics) }, null, 2)
  );
}
}
