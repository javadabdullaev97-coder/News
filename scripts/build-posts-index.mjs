#!/usr/bin/env node
// Два производных артефакта из корпуса вышедших материалов, один проход.
//
//   config/generated/tag-vocabulary.json  — словарь тегов и категорий для seo
//   config/generated/published-index.json — темы за окно сверки для дедупа
//
// Зачем. До этого скрипта обе задачи решались на каждом материале заново
// и обе неверно: seo собирал «словарь тегов» греппом, который возвращал
// 353 КБ имён источников и ноль тегов (разбор — шапка lib/posts-index.mjs),
// а сверку «тема уже выходила за три дня» оркестратор делал глазами по
// ~420 файлам, потому что скрипта не существовало.
//
// НЕ КОММИТИТСЯ — как и source-index. Производный файл, лежащий рядом с
// исходником, расходится с ним молча. Собирается заново перед
// использованием: полный проход по корпусу — доли секунды, зависимостей нет,
// работает в свежем клоне до npm install.
//
// Использование:
//   node scripts/build-posts-index.mjs             — записать оба файла
//   node scripts/build-posts-index.mjs --stdout    — вывести сводку, не писать
//   node scripts/build-posts-index.mjs --days=7    — окно сверки, суток (по умолчанию 3)

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "../lib/inbox-core.mjs";
import { scanPosts, buildTagVocabulary, buildPublishedIndex } from "../lib/posts-index.mjs";

function opt(name, fallback) {
  const p = process.argv.find((a) => a.startsWith(`--${name}=`));
  return p ? p.slice(name.length + 3) : fallback;
}
const stdout = process.argv.includes("--stdout");
const days = Number(opt("days", 3));

const NOTE =
  "ПРОИЗВОДНЫЙ ФАЙЛ, не редактируй и не коммить. Собирается " +
  "scripts/build-posts-index.mjs из content/posts, content/queue, " +
  "content/needs-verification и content/rejected.";

const records = scanPosts(ROOT);
const generatedAt = new Date().toISOString();

const vocabulary = {
  $comment: NOTE,
  $usage:
    "Словарь тегов редакции. Бери теги ОТСЮДА; новый заводи, только если " +
    "ни один существующий не подходит по смыслу — россыпь синонимов ломает " +
    "фильтрацию для читателя.",
  generatedAt,
  ...buildTagVocabulary(records),
};

const index = {
  $comment: NOTE,
  $usage:
    "Темы, с которыми сверяется новая: вышедшие за окно, очередь, карточки " +
    "needs-verification и отклонённые. Читать целиком не нужно — сверку " +
    "делает scripts/topic-dupecheck.mjs.",
  generatedAt,
  ...buildPublishedIndex(records, { days }),
};

if (stdout) {
  console.log(
    JSON.stringify(
      {
        postsScanned: vocabulary.postsScanned,
        tagsTotal: vocabulary.tagsTotal,
        tagsKept: vocabulary.tags.length,
        coverage: vocabulary.coverage,
        categories: vocabulary.categories.length,
        topicsInWindow: index.topics.length,
        since: index.since,
      },
      null,
      2
    )
  );
  process.exit(0);
}

const dir = join(ROOT, "config/generated");
mkdirSync(dir, { recursive: true });

// Без отступов оба файла. Словарь тегов читает агент, и отступы в списке
// из двухсот однотипных объектов стоят втрое дороже самих данных:
// 17 КБ с отступом 2 против 6 КБ без него на том же корпусе.
writeFileSync(join(dir, "tag-vocabulary.json"), JSON.stringify(vocabulary) + "\n");
writeFileSync(join(dir, "published-index.json"), JSON.stringify(index) + "\n");

console.error(
  `[posts-index] статей ${vocabulary.postsScanned}, тегов ${vocabulary.tags.length}` +
    ` из ${vocabulary.tagsTotal} (покрытие ${Math.round(vocabulary.coverage * 100)}%),` +
    ` тем в окне ${index.topics.length} с ${index.since}`
);
