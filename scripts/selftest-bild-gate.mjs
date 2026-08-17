#!/usr/bin/env node
// Регрессия на гейт бильда.
//
// Ошибка в сторону «зовём агента» стоит одного вызова. Ошибка в другую
// сторону выходит в ленту невнятной картинкой — банкнотами под новостью
// о встрече президента. Поэтому проверок на отказ здесь больше, чем
// на срабатывание, и каждое условие проверено отдельно.

import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

let failed = 0;
const ok = (cond, msg) => {
  console.log((cond ? "  ok   " : "  FAIL ") + msg);
  if (!cond) failed++;
};

const dir = mkdtempSync(join(tmpdir(), "bildgate-"));

function gate({ name, title = "Т", tags = [], category = "economy", body = "Текст.", subject }) {
  const draft = join(dir, `${name}.mdx`);
  const notes = join(dir, `notes-${name}.md`);
  writeFileSync(
    draft,
    `---\ntitle: "${title}"\ncategory: "${category}"\ntags: [${tags.map((t) => `"${t}"`).join(", ")}]\n---\n\n${body}\n`,
  );
  if (subject !== null) {
    writeFileSync(notes, `# Notes\n\n## Main visual subject\n${subject}\n\n## Дальше\nпрочее\n`);
  }
  const out = execFileSync(
    "node",
    ["scripts/bild-gate.mjs", draft, "--json", "--notes", notes],
    { encoding: "utf8" },
  );
  return JSON.parse(out);
}

// ── срабатывает там, где фотографии не бывает ─────────────────────────
{
  const r = gate({
    name: "rate",
    title: "Курс доллара обновил минимум",
    tags: ["курс сума", "валютный рынок"],
    subject: "нет явного субъекта",
  });
  ok(r.skip, "курс валют без субъекта — берём кадр из фототеки");
  ok(r.photo?.url?.startsWith("/images/stock/"), "гейт отдаёт готовый кадр, а не только вердикт");
  ok(r.photo?.width >= 1000, "кадр пригоден и для героя, и для карточки соцсетей");
}

// ── не срабатывает ────────────────────────────────────────────────────
{
  ok(
    !gate({
      name: "subject",
      tags: ["курс сума"],
      subject: "Здание ЦБ РУз или пресс-конференция главы",
    }).skip,
    "репортёр назвал субъект — снимает бильд, а не сток",
  );

  ok(
    !gate({ name: "nonotes", tags: ["курс сума"], subject: null }).skip,
    "нет notes — визуальный субъект неизвестен, зовём бильда",
  );

  ok(
    !gate({
      name: "offtopic",
      title: "В Ташкенте изменят схему движения",
      tags: ["дороги", "транспорт"],
      subject: "нет явного субъекта",
    }).skip,
    "тема вне фототеки — зовём бильда",
  );

  ok(
    !gate({
      name: "official",
      title: "Мирзиёев поручил пересмотреть ставку",
      tags: ["ставка", "ЦБ РУз"],
      subject: "нет явного субъекта",
    }).skip,
    "местное должностное лицо — у темы будет официальное фото",
  );

  ok(
    !gate({
      name: "person",
      title: "Курс сума и пошлины",
      tags: ["курс сума", "валюта"],
      body: "Решение прокомментировал Трамп на брифинге.",
      subject: "нет явного субъекта",
    }).skip,
    "глобальное имя из named-actors — снимок важнее стока",
  );

  ok(
    !gate({ name: "empty", tags: ["курс сума"], subject: "" }).skip,
    "пустая строка Main visual subject — не основание пропускать бильда",
  );
}

console.log(failed ? `\n${failed} проверок упало` : "\nвсе проверки прошли");
process.exit(failed ? 1 : 0);
