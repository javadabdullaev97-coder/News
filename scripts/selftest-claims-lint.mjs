#!/usr/bin/env node
// Регрессия на проверку таблицы цитат.
//
// Смысл таблицы — избавить фактчекера от повторного чтения источников.
// Смысл этой проверки — чтобы экономия не получалась за счёт непроверенных
// утверждений. Поэтому здесь важнее не «не ругается на хорошем», а «ругается
// на дырявом»: пропущенная дырка тише лишнего предупреждения и дороже его.

import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

let failed = 0;
const ok = (cond, msg) => {
  console.log((cond ? "  ok   " : "  FAIL ") + msg);
  if (!cond) failed++;
};

const dir = mkdtempSync(join(tmpdir(), "claims-"));

function lint({ name, sources, body, rows }) {
  const draft = join(dir, `${name}.mdx`);
  const claims = join(dir, `claims-${name}.md`);
  writeFileSync(
    draft,
    `---\ntitle: "Т"\nsources:\n${sources.map((u) => `  - name: "и"\n    url: "${u}"`).join("\n")}\n---\n\n${body}\n`,
  );
  if (rows !== null) {
    writeFileSync(
      claims,
      `| # | Утверждение | Источник | Цитата |\n|---|---|---|---|\n${rows
        .map((r, i) => `| ${i + 1} | ${r[0]} | ${r[1]} | ${r[2]} |`)
        .join("\n")}\n`,
    );
  }
  // Скрипт выходит с кодом 1, когда находки есть, — для execFileSync это
  // исключение, а для нас нормальный исход. Читаем stdout в обоих случаях.
  let out;
  try {
    out = execFileSync("node", ["scripts/claims-lint.mjs", draft, "--claims", claims, "--json"], {
      encoding: "utf8",
    });
  } catch (err) {
    out = err.stdout;
  }
  return JSON.parse(out);
}

const kinds = (r) => r.problems.map((p) => p.kind);

// ── чистая таблица ────────────────────────────────────────────────────
{
  const r = lint({
    name: "clean",
    sources: ["https://cbu.uz/1"],
    body: "Ставка повышена до 15% с 1 сентября 2026 года.",
    rows: [
      ["Ставка 15%", "https://cbu.uz/1", "«основную ставку на уровне 15% годовых»"],
      ["С 1 сентября 2026", "https://cbu.uz/1", "«вступает в силу с 1 сентября 2026 года»"],
    ],
  });
  ok(r.problems.length === 0, "полная таблица проходит без замечаний");
  ok(r.rows === 2, "строки таблицы разобраны");
}

// ── дырки, ради которых всё и затевалось ──────────────────────────────
{
  const num = lint({
    name: "number",
    sources: ["https://cbu.uz/1"],
    body: "Ставка 15%. Инфляция составила 12,3%.",
    rows: [["Ставка 15%", "https://cbu.uz/1", "«ставку на уровне 15% годовых»"]],
  });
  ok(kinds(num).includes("число-без-цитаты"), "цифра без цитаты — находка");

  const orphan = lint({
    name: "orphan",
    sources: ["https://cbu.uz/1", "https://mf.uz/2"],
    body: "Ставка 15%.",
    rows: [["Ставка 15%", "https://cbu.uz/1", "«ставку на уровне 15% годовых»"]],
  });
  ok(
    kinds(orphan).includes("источник-без-строки"),
    "источник, на который не сослалась ни одна строка — находка",
  );

  const alien = lint({
    name: "alien",
    sources: ["https://cbu.uz/1"],
    body: "Ставка 15%.",
    rows: [["Ставка 15%", "https://example.com/x", "«ставку на уровне 15% годовых»"]],
  });
  ok(kinds(alien).includes("чужая-ссылка"), "цитата из ссылки, которой нет в источниках — находка");
}

// ── нормализация чисел ────────────────────────────────────────────────
{
  const r = lint({
    name: "spaces",
    sources: ["https://cbu.uz/1"],
    body: "Курс составил 11 857 сумов.",
    rows: [["Курс 11857", "https://cbu.uz/1", "«11 857,35 сума»"]],
  });
  ok(
    !kinds(r).includes("число-без-цитаты"),
    "неразрывные пробелы внутри числа не делают его другим числом",
  );

  const link = lint({
    name: "link",
    sources: ["https://president.uz/ru/lists/view/9501"],
    body: "Об этом [сообщила](https://president.uz/ru/lists/view/9501) пресс-служба. Рост в 4 раза.",
    rows: [["Рост в 4 раза", "https://president.uz/ru/lists/view/9501", "«более чем в 4 раза»"]],
  });
  ok(
    !kinds(link).includes("число-без-цитаты"),
    "цифры из адресов и markdown-ссылок за утверждения не считаются",
  );
}

// ── таблицы нет — не падаем ───────────────────────────────────────────
{
  const r = lint({ name: "notable", sources: ["https://cbu.uz/1"], body: "Текст.", rows: null });
  ok(r.table === false && r.problems.length === 0, "без таблицы — предупреждение, а не ошибка");
}

console.log(failed ? `\n${failed} проверок упало` : "\nвсе проверки прошли");
process.exit(failed ? 1 : 0);
