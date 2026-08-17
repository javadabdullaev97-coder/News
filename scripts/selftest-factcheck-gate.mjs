#!/usr/bin/env node
// Регрессия на гейт фактчека.
//
// Цена ошибки несимметрична, и проверки написаны исходя из этого. Лишний
// вызов фактчекера стоит токенов и минуты. Пропущенный на материале, где
// он был нужен, стоит опровержения — а по уголовным делам и жертвам ещё
// и репутации издания. Поэтому каждое условие «никогда не пропускать»
// проверяется отдельным случаем, а не в связке.

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

let failed = 0;
const ok = (cond, msg) => {
  console.log((cond ? "  ok   " : "  FAIL ") + msg);
  if (!cond) failed++;
};

const dir = mkdtempSync(join(tmpdir(), "fcgate-"));
mkdirSync(dir, { recursive: true });

function gate({ name, sources, category = "economy", body = "Обычный текст материала.", extra = "" }) {
  const list = sources.map((u) => `  - name: "и"\n    url: "${u}"`).join("\n");
  const file = join(dir, `${name}.mdx`);
  writeFileSync(
    file,
    `---\ntitle: "Т"\ncategory: "${category}"\nsources:\n${list}\n${extra}---\n\n${body}\n`,
  );
  const out = execFileSync("node", ["scripts/factcheck-gate.mjs", file, "--json"], {
    encoding: "utf8",
  });
  return JSON.parse(out);
}

// ── пропускаем: пересказ официальных документов ───────────────────────
{
  ok(gate({ name: "one", sources: ["https://lex.uz/docs/123"] }).skip, "один официальный документ — пропуск");

  // Форма материала про аэропорт Ургенча: шесть ссылок, три происхождения.
  // По ссылкам старое правило его заворачивало, по происхождениям — нет.
  const many = gate({
    name: "six-links",
    sources: [
      "https://t.me/shmirziyoyev/35063",
      "https://t.me/shmirziyoyev/35056",
      "https://t.me/Mintrans_uz/28701",
      "https://t.me/Mintrans_uz/28694",
      "https://president.uz/ru/lists/view/8096",
      "https://president.uz/ru/lists/view/9501",
    ],
  });
  ok(many.skip, "шесть ссылок из трёх официальных источников — пропуск");
  ok(many.origins.length === 3, "повторные ссылки на один канал — одно происхождение");

  ok(
    gate({ name: "citable", sources: ["https://t.me/senatuz/1234"] }).skip,
    "канал из citableChannels считается официальным, хотя фетчер его не знает",
  );
}

// ── зовём фактчекера ──────────────────────────────────────────────────
{
  ok(
    !gate({ name: "media", sources: ["https://lex.uz/docs/1", "https://gazeta.uz/x"] }).skip,
    "чужое СМИ среди источников — проверяем",
  );
  ok(
    !gate({ name: "world", category: "world", sources: ["https://lex.uz/docs/1"] }).skip,
    "мировая рубрика — проверяем всегда",
  );
  ok(
    !gate({ name: "attr", sources: ["https://t.me/xavfsizlik_uz/99"] }).skip,
    "канал с неподтверждённой принадлежностью — проверяем всегда",
  );
  ok(
    !gate({
      name: "crime",
      sources: ["https://lex.uz/docs/1"],
      body: "Возбуждено уголовное дело в отношении чиновника.",
    }).skip,
    "уголовное дело — проверяем, даже если источник официальный",
  );
  ok(
    !gate({
      name: "victims",
      sources: ["https://president.uz/x"],
      body: "По данным ведомства, есть пострадавшие.",
    }).skip,
    "пострадавшие — проверяем",
  );
  ok(
    !gate({
      name: "four",
      sources: [
        "https://lex.uz/1",
        "https://cbu.uz/2",
        "https://stat.uz/3",
        "https://president.uz/4",
      ],
    }).skip,
    "четыре разных ведомства — это компиляция, проверяем",
  );
  ok(
    !gate({ name: "rework", sources: ["https://lex.uz/1"], extra: "reworkIteration: 1\n" }).skip,
    "материал в rework — проверяем: владелец уже что-то заметил",
  );
  ok(!gate({ name: "nosrc", sources: [] }).skip, "без источников — проверяем");
}

// ── отказ безопасен ───────────────────────────────────────────────────
{
  const out = execFileSync("node", ["scripts/factcheck-gate.mjs", join(dir, "нет-такого.mdx"), "--json"], {
    encoding: "utf8",
  });
  ok(!JSON.parse(out).skip, "файла нет — зовём фактчекера, а не пропускаем");

  const code = execFileSync("node", ["scripts/factcheck-gate.mjs", join(dir, "нет-такого.mdx")], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  ok(code !== undefined, "код возврата 0 даже на отсутствующем файле — это справка, а не проверка");
}

console.log(failed ? `\n${failed} проверок упало` : "\nвсе проверки прошли");
process.exit(failed ? 1 : 0);
