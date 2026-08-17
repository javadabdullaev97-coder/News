#!/usr/bin/env node
// Регрессия на списки узнаваемых имён.
//
// Зачем. Списки живут в двух местах, и это не дублирование, а разные роли:
//
//   config/newsroom-policy.json → sport.namedInterest — отбор темы спортивной
//     планёркой, с делением на globalIcons и notable;
//   config/telegram-scoring.json → namedActors.sportStars — плоский список для
//     seo-агента (+15 к tgScore) и для world.specialRules.namedActorMention.
//
// Разъехаться они могут молча, и цена этого уже известна. До 17.08.2026 в
// sportStars было 27 имён, все из футбола, тенниса, баскетбола и «Формулы-1»:
// ни одного боксёра, ни одного бойца ММА. Переговоры Фьюри с Джошуа набирали
// ноль баллов не потому, что редакция так решила, а потому что для системы
// этих людей не существовало. Заметить это по конфигу нельзя — там просто
// список, который выглядит наполненным.
//
// Поэтому: каждое имя из globalIcons обязано быть в sportStars. Обратное
// неверно — в sportStars есть виды спорта, которых спортивная редакция не
// ведёт, они нужны мировой линии.
//
// Запуск: node scripts/selftest-named-actors.mjs
// Зависимостей нет.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const policy = JSON.parse(readFileSync(join(ROOT, "config/newsroom-policy.json"), "utf8"));
const scoring = JSON.parse(readFileSync(join(ROOT, "config/telegram-scoring.json"), "utf8"));

let failed = 0;
const ok = (cond, msg) => {
  console.log((cond ? "  ok  " : "  FAIL ") + msg);
  if (!cond) failed++;
};

const ni = policy.sport?.namedInterest;
ok(Boolean(ni), "sport.namedInterest на месте");

/** Все имена из вложенных списков, кроме служебных ключей на $. */
function flatten(node) {
  if (!node) return [];
  const out = [];
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith("$")) continue;
    if (Array.isArray(value)) out.push(...value);
    else if (value && typeof value === "object") out.push(...flatten(value));
  }
  return out;
}

const icons = flatten(ni?.globalIcons);
const notable = flatten(ni?.notable);
const stars = scoring.namedActors?.sportStars ?? [];

ok(icons.length > 0, `globalIcons не пуст (${icons.length} имён)`);
ok(stars.length > 0, `namedActors.sportStars не пуст (${stars.length} имён)`);

// ── Главная проверка ──
const starSet = new Set(stars);
const missing = icons.filter((name) => !starSet.has(name));
ok(
  missing.length === 0,
  missing.length === 0
    ? "все globalIcons есть в namedActors.sportStars"
    : `в sportStars нет ${missing.length} имён из globalIcons: ${missing.slice(0, 8).join(", ")}${missing.length > 8 ? "…" : ""}`,
);

// ── Уровни не пересекаются ──
// Имя одновременно в globalIcons и notable означает, что при подсчёте
// сложатся оба слагаемых — 25 плюс 10 вместо одного из них. Тема проедет
// порог за счёт арифметической ошибки, а не за счёт значимости.
const iconSet = new Set(icons);
const both = notable.filter((name) => iconSet.has(name));
ok(
  both.length === 0,
  both.length === 0
    ? "уровни globalIcons и notable не пересекаются"
    : `имена сразу в двух уровнях (сложатся оба балла): ${both.join(", ")}`,
);

// ── Дисциплины покрыты ──
// Ровно та дыра, из-за которой всё началось: список выглядит наполненным,
// пока не спросишь, есть ли в нём хоть один боксёр.
for (const discipline of ["football", "boxing", "mma", "tennis", "f1"]) {
  const names = ni?.globalIcons?.[discipline] ?? [];
  ok(names.length >= 5, `globalIcons.${discipline}: ${names.length} имён (нужно хотя бы 5)`);
}

// ── Шкала на месте ──
const score = policy.sport?.score ?? {};
for (const key of ["globalIcon", "notableAthlete", "iconVsIcon", "routineRoundMatch"]) {
  ok(typeof score[key] === "number", `sport.score.${key} задан числом`);
}
ok(
  score.globalIcon > score.notableAthlete,
  `globalIcon (${score.globalIcon}) весит больше notable (${score.notableAthlete})`,
);
ok(
  score.routineRoundMatch < 0 && Math.abs(score.routineRoundMatch) >= score.topCompetition,
  `routineRoundMatch (${score.routineRoundMatch}) гасит topCompetition (${score.topCompetition})`,
);

// ── Контрольные примеры из конфига считаются как заявлено ──
const minScore = policy.sport?.minScore;
const shelton = score.topCompetition + score.notableAthlete + score.routineRoundMatch;
ok(shelton < minScore, `рядовой матч notable-игрока: ${shelton} < порога ${minScore}`);

const furyJoshua = score.globalIcon + score.iconVsIcon + score.negotiationStage;
ok(furyJoshua >= minScore, `переговоры двух икон: ${furyJoshua} >= порога ${minScore}`);

const slamFinal = score.majorFinal + score.topCompetition + score.notableAthlete;
ok(slamFinal >= minScore, `финал шлема с notable-игроком: ${slamFinal} >= порога ${minScore}`);

console.log(failed ? `\nпровалено ${failed}` : "\nвсе проверки пройдены");
process.exit(failed ? 1 : 0);
