// Сколько постоянного текста редакция читает на один материал.
//
// «Постоянный» — это инструкция агента плюс срез редполитики плюс то, что
// роль открывает всегда. Сама статья, поиск в сети и переписка агентов сюда
// не входят: они зависят от темы, а это — от того, как мы написали инструкции.
//
// Число нужно в двух местах, и оба обязаны считать одинаково:
//   scripts/prompt-budget.mjs   — сторожит, чтобы тексты не отрастали;
//   scripts/record-run-cost.mjs — штампует его на каждом прогоне, чтобы
//                                 потом было видно, при какой версии
//                                 инструкций прогон работал.
//
// Без штампа сравнение «до и после» превращается в спор о датах: прогоны
// лежат в одном журнале вперемешку, а даты правок помнит только git.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** Роль → что она читает ВСЕГДА помимо инструкции и среза редполитики. */
export const ALWAYS_READS = {
  reporter: [],
  "fact-checker": [],
  editor: [],
  bild: [],
  translator: ["docs/terminology-glossary.md"],
};

const sizeOf = (root, rel) => {
  const abs = join(root, rel);
  return existsSync(abs) ? readFileSync(abs, "utf8").length : null;
};

/**
 * Разбивка по ролям и сумма на материал, в знаках.
 *
 * Срез не собран — роль отдаётся с `policy: null`, а сумма считается без неё
 * и помечается `complete: false`. Молча подставить ноль нельзя: это выглядело
 * бы как экономия, которой не было.
 */
export function readCostPerArticle(root) {
  const roles = {};
  let total = 0;
  let complete = true;
  for (const [role, extras] of Object.entries(ALWAYS_READS)) {
    const agent = sizeOf(root, `.claude/agents/${role}.md`) ?? 0;
    const policy = sizeOf(root, `config/generated/policy-${role}.md`);
    const extra = extras.reduce((a, rel) => a + (sizeOf(root, rel) ?? 0), 0);
    roles[role] = { agent, policy, extra, total: policy === null ? null : agent + policy + extra };
    if (policy === null) complete = false;
    else total += agent + policy + extra;
  }
  return { roles, total, complete };
}
