#!/usr/bin/env node
// Звать ли fact-checker'а на этот материал.
//
// ЗАЧЕМ ОТДЕЛЬНЫМ СКРИПТОМ. Правило пропуска существует с 04.08.2026, но
// живёт прозой в спецификации: семь условий, которые планёрка должна
// проверять на глаз посреди прогона. Так оно и не срабатывало. Замер
// 17.08.2026: по профилю источников под правило подпадает 19% материалов
// (22 из 117 за 14–17 августа), а отметка «пропущен» встречается в одном
// отчёте фактчекера из 26 — около 4%. Пятикратный разрыв между тем, что
// правило разрешает, и тем, что происходит.
//
// Решение здесь детерминированное: те же входные данные — тот же ответ,
// и его видно в логе прогона. Спорить с ним можно, но не «забыть».
//
// ЧТО ЗА ЭТИМ СТОИТ. Смысл пропуска в том, что репортёр уже прочитал
// первоисточник целиком. Второй проход по тому же указу на lex.uz ничего
// не находит — проверено на 27 статьях аудита, 0 CONTRADICTED. Риск живёт
// не в официальном документе, а в СКЛЕЙКЕ: когда материал собран из разных
// документов, автор может приписать факт не тому событию. Ровно это
// фактчекер и ловил в разборе про Кушнера — трое участников оказались
// приписаны не той встрече.
//
// Поэтому гейт считает не ссылки, а ПРОИСХОЖДЕНИЯ. Четыре поста одного
// официального канала — это один документ, процитированный четырежды,
// склеивать там нечего. Четыре разных ведомства — уже компиляция.
//
//   node scripts/factcheck-gate.mjs content/drafts/2026-08-17/<slug>.mdx
//   node scripts/factcheck-gate.mjs <файл> --json
//
// Код возврата всегда 0: это справка для планёрки, а не проверка качества.
// Решение — в поле skip.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { parseFrontmatter } from "../lib/frontmatter.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const asJson = args.includes("--json");
const file = args.find((a) => !a.startsWith("--"));

if (!file) {
  console.error("Использование: node scripts/factcheck-gate.mjs <draft.mdx> [--json]");
  process.exit(0);
}
if (!existsSync(file)) {
  console.error(`[factcheck-gate] файла нет: ${file} — зову фактчекера`);
  if (asJson) console.log(JSON.stringify({ skip: false, reason: "файл не найден" }));
  process.exit(0);
}

const policy = JSON.parse(readFileSync(join(ROOT, "config/newsroom-policy.json"), "utf8"));
const gate = policy.factCheckSkip ?? {};
const tg = JSON.parse(readFileSync(join(ROOT, "config/telegram-channels.json"), "utf8"));

// Каналы фетчера плюс те, что мы только цитируем (citableChannels): право
// сослаться не зависит от того, опрашивает канал наш скрипт или нет. Иначе
// @senatuz, которого в каталоге фетчера нет, считался бы неофициальным.
const channelType = new Map(
  [...(tg.channels ?? []), ...(tg.citableChannels ?? [])].map((c) => [
    String(c.handle ?? "").replace(/^@/, "").toLowerCase(),
    c.type,
  ]),
);

const raw = readFileSync(file, "utf8");
const fm = parseFrontmatter(raw);

/**
 * Происхождение ссылки: домен либо конкретный Telegram-канал.
 *
 * Именно канал, а не «t.me»: @shmirziyoyev и @xavfsizlik_uz — разные
 * инстанции доверия, складывать их в одно происхождение нельзя.
 */
function originOf(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "t.me" || host === "telegram.me") {
      const handle = u.pathname.replace(/^\/(s\/)?/, "").split("/")[0].toLowerCase();
      return handle ? `t.me/${handle}` : "t.me";
    }
    return host;
  } catch {
    return null;
  }
}

function isOfficial(origin) {
  if (!origin) return false;
  if (origin.startsWith("t.me/")) {
    return channelType.get(origin.slice(5)) === "source";
  }
  const list = gate.officialDomains ?? [];
  return list.some((d) => origin === d || origin.endsWith(`.${d}`));
}

function isAttributed(origin) {
  return origin?.startsWith("t.me/") && channelType.get(origin.slice(5)) === "attributed";
}

const sources = Array.isArray(fm.sources) ? fm.sources.filter((s) => s?.url) : [];
const origins = [...new Set(sources.map((s) => originOf(s.url)).filter(Boolean))];
const foreign = origins.filter((o) => !isOfficial(o));

// Запретные темы ищем по всему файлу, а не только по frontmatter: уголовное
// дело, жертвы и обвинения могут не попасть ни в теги, ни в заголовок,
// а проверять их надо всегда — цена ошибки здесь не редакционная.
const haystack = raw.toLowerCase();
const forbiddenHit = (gate.forbiddenMarkers ?? []).find((m) => haystack.includes(m.toLowerCase()));

const checks = [
  { name: "правило включено", pass: gate.enabled !== false, detail: "factCheckSkip.enabled" },
  { name: "источники есть", pass: sources.length > 0, detail: `${sources.length} ссылок` },
  {
    name: `происхождений не больше ${gate.maxOrigins ?? 3}`,
    pass: origins.length > 0 && origins.length <= (gate.maxOrigins ?? 3),
    detail: origins.join(", ") || "нет",
  },
  {
    name: "все источники официальные",
    pass: origins.length > 0 && foreign.length === 0,
    detail: foreign.length ? `неофициальные: ${foreign.join(", ")}` : "да",
  },
  {
    name: "нет каналов с неподтверждённой принадлежностью",
    pass: !origins.some(isAttributed),
    detail: origins.filter(isAttributed).join(", ") || "нет",
  },
  { name: "рубрика не world", pass: fm.category !== "world", detail: fm.category ?? "?" },
  {
    name: "нет запретных тем",
    pass: !forbiddenHit,
    detail: forbiddenHit ? `найдено «${forbiddenHit}»` : "нет",
  },
  {
    name: "материал не в rework",
    pass: !(Number(fm.reworkIteration ?? 0) > 0 || fm.rework === true),
    detail: fm.reworkIteration ? `итерация ${fm.reworkIteration}` : "нет",
  },
];

const failed = checks.filter((c) => !c.pass);
const skip = failed.length === 0;
const reason = skip
  ? `пересказ официальных документов (${origins.join(", ")}) — репортёр читал их целиком`
  : failed.map((c) => `${c.name}: ${c.detail}`).join("; ");

if (asJson) {
  console.log(JSON.stringify({ file: relative(ROOT, file), skip, reason, origins, checks }, null, 2));
} else {
  console.error(`[factcheck-gate] ${relative(ROOT, file)}`);
  for (const c of checks) console.error(`  ${c.pass ? "✓" : "✗"} ${c.name} — ${c.detail}`);
  console.error(skip ? `→ ФАКТЧЕК МОЖНО ПРОПУСТИТЬ: ${reason}` : `→ звать фактчекера: ${reason}`);
}
process.exit(0);
