#!/usr/bin/env node
// Разворачивает короткие ссылки Kun.uz из телеграм-постов в канонические
// адреса статей.
//
// Каналы Kun ставят ссылки вида kun.uz/ru/92506138 — числовой идентификатор,
// не совпадающий ни с чем в sitemap. Зато сервер отдаёт на них 301 с
// Location, где лежит нормальный путь /ru/news/2026/05/01/slug. Запрос
// методом HEAD возвращает только заголовки, поэтому четыре тысячи ссылок
// разворачиваются дёшево — страницы Kun весят по 270 КБ, качать их ради
// одного адреса было бы расточительно.
//
// Daryo так развернуть нельзя: у него короткая ссылка и есть канонический
// адрес, страница объявляет сама себя. Там связка идёт по заголовку.
//
// CLI: node research/resolve-kun-links.mjs
// Выход: research/raw/kun-link-map.json  { "<короткая>": "<канонический путь>" }

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { USER_AGENT } from "./lib/outlets.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = join(HERE, "raw");
const OUT = join(RAW_DIR, "kun-link-map.json");

const CHANNELS = ["kunuzofficial", "kunuzru", "kunuzen"];
const CONCURRENCY = 8;
const TIMEOUT_MS = 20_000;
const RETRIES = 3;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const short = new Set();
for (const channel of CHANNELS) {
  const path = join(RAW_DIR, `telegram-${channel}.jsonl`);
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, "utf8").trim().split("\n")) {
    if (!line) continue;
    const post = JSON.parse(line);
    for (const link of post.links ?? []) {
      // Короткая форма — ровно один сегмент из цифр после языка.
      if (/^https?:\/\/kun\.uz\/(?:[a-z]{2}\/)?\d+\/?$/.test(link)) short.add(link);
    }
  }
}

const map = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
const todo = [...short].filter((u) => !(u in map));

console.log(`коротких ссылок ${short.size}, уже развёрнуто ${short.size - todo.length}, к работе ${todo.length}`);

async function resolveOne(url) {
  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: "HEAD",
        redirect: "manual",
        signal: ctrl.signal,
        headers: { "User-Agent": USER_AGENT },
      });
      const loc = res.headers.get("location");
      if (loc) return loc;
      // Без Location считаем ссылку неразрешимой — материал мог быть снят.
      if (res.status < 300 || res.status >= 400) return null;
      return null;
    } catch {
      if (attempt === RETRIES) return null;
      await sleep(1000 * attempt);
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

let done = 0;
let cursor = 0;
let resolved = 0;

await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (cursor < todo.length) {
      const url = todo[cursor];
      cursor += 1;
      const loc = await resolveOne(url);
      map[url] = loc;
      if (loc) resolved += 1;
      done += 1;
      if (done % 100 === 0 || done === todo.length) {
        process.stdout.write(`  ${done}/${todo.length}, развёрнуто ${resolved}\r`);
        writeFileSync(OUT, JSON.stringify(map, null, 0));
      }
    }
  }),
);

writeFileSync(OUT, JSON.stringify(map, null, 0));
const ok = Object.values(map).filter(Boolean).length;
console.log(`\nвсего в карте ${Object.keys(map).length}, с адресом ${ok}\n→ ${OUT}`);
