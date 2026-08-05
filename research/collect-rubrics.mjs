#!/usr/bin/env node
// Достаёт рубрику для Gazeta и Spot, которые не размечают её на странице
// статьи — ни article:section, ни JSON-LD, ни гидратационного payload, ни
// keywords в news-карте. У Kun, Daryo и Repost рубрика есть прямо в мета, и
// они сюда не входят.
//
// Единственный оставшийся источник — рубричные ленты вида
// gazeta.uz/ru/economy?page=N. Листаем их назад, пока даты не уйдут за начало
// окна, и запоминаем, в какой ленте встретился каждый адрес.
//
// Материал может стоять в нескольких лентах сразу; запоминаем все и в
// анализе берём первую — она же основная в навигации издания.
//
// CLI:
//   node research/collect-rubrics.mjs
//   node research/collect-rubrics.mjs --outlet=gazeta --from=2026-05-01
//
// Выход: research/raw/rubrics-<outlet>.json  { "<canon-url>": ["economy", …] }

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { USER_AGENT } from "./lib/outlets.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = join(HERE, "raw");

const argv = process.argv.slice(2);
const arg = (flag, fallback) => {
  const hit = argv.find((a) => a.startsWith(`${flag}=`));
  return hit ? hit.slice(flag.length + 1) : fallback;
};
const from = arg("--from", "2026-05-01");
const only = arg("--outlet", null)?.split(",");

const CONCURRENCY = 4;
const DELAY_MS = 150;
const TIMEOUT_MS = 30_000;
// Ограничитель на случай, если пагинация окажется бесконечной или разметка
// поменяется и парсер перестанет видеть даты.
const MAX_PAGES = 120;

const TARGETS = [
  {
    id: "gazeta",
    host: "www.gazeta.uz",
    // «column» — авторская колонка, «reklama» — коммерческие материалы. Обе
    // держим: они отдельные типы контента и в анализе пригодятся.
    rubrics: ["politics", "economy", "society", "culture", "world", "column"],
    langs: ["ru", "oz"],
  },
  {
    id: "spot",
    host: "www.spot.uz",
    rubrics: ["economy", "business", "technologies", "energetics", "articles"],
    langs: ["ru", "oz"],
  },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const canonUrl = (url) =>
  (url ?? "")
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "")
    .toLowerCase();

async function fetchHtml(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Дата зашита в путь статьи, поэтому разбирать карточку ленты не нужно:
// достаточно собрать адреса и посмотреть на самый старый.
function articleLinks(html, host, lang) {
  const re = new RegExp(`href="(?:https://${host.replace(".", "\\.")})?(/${lang}/20\\d\\d/\\d\\d/\\d\\d/[^"]+)"`, "g");
  const out = new Set();
  for (const [, path] of html.matchAll(re)) out.add(`${host}${path}`);
  return [...out];
}

const dateOf = (url) => url.match(/\/(\d{4})\/(\d{2})\/(\d{2})\//)?.slice(1, 4).join("-") ?? null;

mkdirSync(RAW_DIR, { recursive: true });

for (const target of TARGETS) {
  if (only && !only.includes(target.id)) continue;

  const path = join(RAW_DIR, `rubrics-${target.id}.json`);
  const map = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};

  const jobs = [];
  for (const lang of target.langs) {
    for (const rubric of target.rubrics) jobs.push({ lang, rubric });
  }

  console.log(`\n${target.id}: лент к обходу ${jobs.length}`);

  let cursor = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (cursor < jobs.length) {
        const { lang, rubric } = jobs[cursor];
        cursor += 1;

        let page = 1;
        let collected = 0;
        while (page <= MAX_PAGES) {
          const url =
            page === 1
              ? `https://${target.host}/${lang}/${rubric}/`
              : `https://${target.host}/${lang}/${rubric}?page=${page}`;
          const html = await fetchHtml(url);
          if (!html) break;

          const links = articleLinks(html, target.host, lang);
          if (!links.length) break;

          let oldest = "9999";
          for (const link of links) {
            const day = dateOf(link);
            if (day && day < oldest) oldest = day;
            const key = canonUrl(link);
            if (!map[key]) map[key] = [];
            if (!map[key].includes(rubric)) {
              map[key].push(rubric);
              collected += 1;
            }
          }

          // Лента отсортирована по убыванию даты, поэтому как только самый
          // свежий адрес страницы оказался старше начала окна — дальше только
          // архив, и листать незачем.
          if (oldest < from) break;
          page += 1;
          await sleep(DELAY_MS);
        }
        console.log(`  ${lang}/${rubric}: страниц ${page}, новых адресов ${collected}`);
      }
    }),
  );

  writeFileSync(path, JSON.stringify(map, null, 0));
  console.log(`  всего адресов с рубрикой: ${Object.keys(map).length}\n  → ${path}`);
}
