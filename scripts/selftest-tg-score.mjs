#!/usr/bin/env node
// Регрессия на подсчёт tgScore.
//
// Балл решает, увидят ли материал подписчики канала, поэтому ошибка здесь
// тихая: никто не жалуется на статью, которой не было. Два дефекта уже
// пойманы при первом же прогоне 17.08.2026 — совпадение имени по подстроке
// («Интер» внутри «интервью») и необойдённые вложенные группы списков —
// и оба закреплены проверками ниже.

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

let failed = 0;
const ok = (cond, msg) => {
  console.log((cond ? "  ok   " : "  FAIL ") + msg);
  if (!cond) failed++;
};

const dir = mkdtempSync(join(tmpdir(), "tgscore-"));

function score({ name, category = "economy", body = "Текст.", sources = [], args = [] }) {
  const file = join(dir, `${name}.mdx`);
  const list = sources.length
    ? `sources:\n${sources.map((u) => `  - name: "и"\n    url: "${u}"`).join("\n")}\n`
    : "";
  writeFileSync(file, `---\ntitle: "Т"\ncategory: "${category}"\n${list}---\n\n${body}\n`);
  let out;
  try {
    out = execFileSync("node", ["scripts/tg-score.mjs", file, "--json", ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch (err) {
    return { failedRun: true, stdout: err.stdout };
  }
  return { ...JSON.parse(out), file };
}

// ── имя ищется по границам слова ──────────────────────────────────────
{
  const interview = score({
    name: "interview",
    category: "sport",
    body: "Футболист дал интервью изданию по итогам матча.",
  });
  ok(
    !interview.parts.some((p) => p.why.startsWith("имя из списка")),
    "«Интер» не находится внутри слова «интервью»",
  );

  const airport = score({
    name: "airport",
    body: "Проект ведёт Incheon International Airport Corporation.",
  });
  ok(
    !airport.parts.some((p) => p.why.startsWith("имя из списка")),
    "«Inter» не находится внутри «International»",
  );

  const real = score({
    name: "real",
    category: "sport",
    body: "Криштиану Роналду заявил, что сезон может стать последним.",
  });
  ok(
    real.parts.some((p) => p.why.includes("Криштиану Роналду")),
    "имя из вложенной группы (sport → globalIcons → football) находится",
  );
}

// ── пороги своей категории ────────────────────────────────────────────
{
  ok(score({ name: "loc", category: "economy" }).threshold === 15, "местное сравнивается с 15");
  ok(score({ name: "wld", category: "world" }).threshold === 65, "мировое — с 65");
  ok(score({ name: "spt", category: "sport" }).threshold === 50, "спорт в основной канал — с 50");
  ok(score({ name: "tch", category: "tech" }).threshold === 70, "технологии — с 70");
}

// ── ворота технологического материала ─────────────────────────────────
{
  const noGate = score({
    name: "nogate",
    category: "tech",
    body: "Крупное обновление платформы.",
    args: ["--modifiers", "affectsEveryone,actionable,money,exclusive"],
  });
  ok(!noGate.broadcast, "технологии без ворот в основной канал не идут, какой бы балл ни вышел");

  const uz = score({
    name: "uzgate",
    category: "tech",
    body: "Изменение затрагивает пользователей в Узбекистане.",
    args: ["--modifiers", "affectsEveryone,actionable,money", "--gate", "uzbekImpact"],
  });
  ok(uz.broadcast, "ворот uzbekImpact пропускает по обычному порогу 50");
}

// ── первоисточник и модификаторы ──────────────────────────────────────
{
  const p0 = score({ name: "p0", sources: ["https://lex.uz/docs/1"] });
  ok(p0.parts.some((p) => p.why === "первоисточник P0"), "официальный домен считается P0");

  const bad = score({ name: "bad", args: ["--modifiers", "нетакого"] });
  ok(bad.failedRun, "неизвестный модификатор — отказ, а не молчаливый ноль");
}

// ── запись полей ──────────────────────────────────────────────────────
{
  const r = score({ name: "write", category: "economy", args: ["--modifiers", "money", "--write"] });
  const text = readFileSync(r.file, "utf8");
  ok(/^tgScore: \d+$/m.test(text), "tgScore проставлен во frontmatter");
  ok(/^broadcast: (true|false)$/m.test(text), "broadcast проставлен всегда — правило fail-closed");

  const low = score({ name: "write-low", category: "culture", args: ["--write"] });
  ok(
    /^broadcast: false$/m.test(readFileSync(low.file, "utf8")),
    "не прошедший порог получает broadcast: false, а не отсутствие поля",
  );
}

console.log(failed ? `\n${failed} проверок упало` : "\nвсе проверки прошли");
process.exit(failed ? 1 : 0);
