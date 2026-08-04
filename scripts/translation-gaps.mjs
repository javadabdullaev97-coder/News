#!/usr/bin/env node
// Какие материалы ещё не переведены.
//
// ЗАЧЕМ. Свежие материалы переводит планёрка в момент выпуска, но архив
// (104 материала на 05.08.2026) переводится постепенно — по несколько штук
// за прогон, когда у планёрки осталось время после основной работы. Чтобы
// она не тратила его на выяснение «что уже сделано», список считает скрипт.
//
// Порядок выдачи — от свежих к старым: непереведённая вчерашняя новость
// читателю нужнее, чем непереведённая позапрошлой недели.
//
//   node scripts/translation-gaps.mjs             — сводка + первые 10
//   node scripts/translation-gaps.mjs --limit=6   — сколько выдать
//   node scripts/translation-gaps.mjs --lang=uz   — только один язык

import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const POSTS = join(ROOT, "content/posts");
const LANGS = ["uz", "en"];

const arg = (name, dflt) => {
  const p = process.argv.find((a) => a.startsWith(`--${name}=`));
  return p ? p.slice(name.length + 3) : dflt;
};
const limit = Number(arg("limit", 10));
const onlyLang = arg("lang", null);
const langs = onlyLang ? [onlyLang] : LANGS;

const dayRe = /^\d{4}-\d{2}-\d{2}$/;
const gaps = [];
let total = 0;
const done = { uz: 0, en: 0 };

for (const day of (existsSync(POSTS) ? readdirSync(POSTS) : []).filter((d) => dayRe.test(d)).sort().reverse()) {
  const dir = join(POSTS, day);
  const files = readdirSync(dir).filter((f) => f.endsWith(".mdx"));
  const originals = files.filter((f) => !/\.(uz|en)\.mdx$/.test(f));
  for (const f of originals) {
    total++;
    const slug = f.replace(/\.mdx$/, "");
    const missing = [];
    for (const l of LANGS) {
      if (files.includes(`${slug}.${l}.mdx`)) done[l]++;
      else if (langs.includes(l)) missing.push(l);
    }
    if (missing.length) {
      gaps.push({ day, slug, path: `content/posts/${day}/${f}`, missing });
    }
  }
}

console.log(
  JSON.stringify(
    {
      articles: total,
      translated: done,
      pending: gaps.length,
      next: gaps.slice(0, limit),
    },
    null,
    2,
  ),
);
