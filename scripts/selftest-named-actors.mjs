#!/usr/bin/env node
// Регрессия на списки узнаваемых имён — спорт и технологии.
//
// Оба направления решали одну задачу и пришли к ней с разных сторон, поэтому
// словарь у них свой: у спорта уровни globalIcons/notable, у технологий тиры
// tier1..tier3 плюс defenseTech и locallyPresent. Сводить их к одному
// названию не стали — проверка смотрит на каждую половину по её собственным
// правилам.
//
// ЧТО ИЗМЕНИЛОСЬ 17.08.2026. Списки переехали в config/named-actors/ — файл
// на направление, чтобы спортивная планёрка не тащила в контекст
// технологические имена и наоборот. Заодно исчезла копия: раньше те же имена
// лежали и в редполитике, и в telegram-scoring.json, и главной проверкой
// этого файла была их синхронность. Теперь синхронять нечего — источник один,
// и проверка сместилась на то, что список не разъехался с ШКАЛОЙ: балл за
// группу задан в редполитике, а сама группа живёт в отдельном файле, и
// переименовать её молча по-прежнему можно.
//
// Осталось от прежнего разбора (ниже по тексту оно же проверяется числами):
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
const actors = (name) =>
  JSON.parse(readFileSync(join(ROOT, `config/named-actors/${name}.json`), "utf8"));
const sportActors = actors("sport");
const techActors = actors("tech");
const globalActors = actors("global");

let failed = 0;
const ok = (cond, msg) => {
  console.log((cond ? "  ok  " : "  FAIL ") + msg);
  if (!cond) failed++;
};

const ni = sportActors;
ok(Boolean(ni?.globalIcons), "config/named-actors/sport.json на месте");
ok(
  !policy.sport?.namedInterest,
  "списка имён в редполитике не осталось — источник один, config/named-actors/",
);

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
// Плоского списка для рассылки больше нет: seo-агент читает этот же файл
// целиком. Проверяем, что копия не воскресла в скоринге.
const stars = flatten(ni);

ok(icons.length > 0, `globalIcons не пуст (${icons.length} имён)`);
ok(stars.length > 0, `имён в файле спорта: ${stars.length}`);

// ── Копий больше нет ──
const scoring = JSON.parse(readFileSync(join(ROOT, "config/telegram-scoring.json"), "utf8"));
for (const key of ["sportStars", "techCompanies", "techPeople", "techProducts", "politicians", "footballClubs"]) {
  ok(
    !scoring.namedActors?.[key],
    `namedActors.${key} не воскрес в telegram-scoring.json — имена живут в config/named-actors/`,
  );
}
ok(flatten(globalActors).length > 0, `config/named-actors/global.json не пуст (${flatten(globalActors).length} имён)`);

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

// ═══ Технологии ═══
//
// Та же болезнь, замеренная на технологическом потоке 17.08.2026: имя знакомо
// скорингу только у 43% из 1357 записей, а продукты не считались вовсе — при
// том что «Pixel» упоминается 120 раз против 128 у Google. Отсюда тиры,
// продукты в списках и два симметричных правила: tier1Floor не даёт крупному
// имени провалиться, noNameNoNews не пускает безымянный стартап.

const tech = policy.tech ?? {};
const tni = techActors;
ok(Boolean(tni.tier1), "config/named-actors/tech.json на месте и разбит на тиры");
ok(!tech.namedInterest, "списка имён в секции tech редполитики не осталось");

const TECH_TIERS = ["tier1", "tier2", "tier3", "defenseTech", "locallyPresent"];
for (const tier of TECH_TIERS) {
  ok(flatten(tni[tier]).length > 0, `tech.namedInterest.${tier} не пуст (${flatten(tni[tier]).length})`);
}

// Продукты — половина технологической повестки. Читатель узнаёт тему по
// названию того, чем пользуется, а не по названию юрлица.
ok(
  (tni.tier1?.products ?? []).length >= 8,
  `tier1.products: ${(tni.tier1?.products ?? []).length} имён (нужно хотя бы 8)`,
);

// Автопроход обесценивается, если в тир-1 попадает всё подряд.
ok(flatten(tni.tier1).length <= 80, `tier1 остался коротким (${flatten(tni.tier1).length} ≤ 80)`);

// Имя короче трёх знаков совпадёт с половиной потока: «Arm» ловится в «harm».
const tooShort = TECH_TIERS.flatMap((t) => flatten(tni[t])).filter((n) => String(n).trim().length < 3);
ok(tooShort.length === 0, tooShort.length ? `слишком короткие имена: ${tooShort.join(", ")}` : "нет имён короче трёх знаков");

// Пересечение тиров = два балла за один субъект. Исключений два и оба
// описаны в конфиге: defenseTech намеренно повторяет ИИ-лаборатории с
// оборонными контрактами, locallyPresent — глобальные бренды, работающие
// в стране.
const seenTier = new Map();
const techDupes = [];
for (const tier of ["tier1", "tier2", "tier3"]) {
  for (const name of flatten(tni[tier])) {
    if (seenTier.has(name)) techDupes.push(`${name} (${seenTier.get(name)} и ${tier})`);
    seenTier.set(name, tier);
  }
}
ok(techDupes.length === 0, techDupes.length ? `имена в двух тирах: ${techDupes.join("; ")}` : "тиры 1-3 не пересекаются");

// ── Шкала знает про каждую группу файла ──
// Группа, переименованная в файле и не переименованная в шкале, молча
// перестаёт давать баллы: балл ищется по имени группы, а его больше нет.
const scoredGroups = { tier1: "namedActorTier1", tier2: "namedActorTier2", tier3: "namedActorTier3", locallyPresent: "locallyPresentActor" };
for (const [group, key] of Object.entries(scoredGroups)) {
  ok(
    flatten(tni[group]).length > 0 && typeof tech.score?.[key] === "number",
    `группа ${group} есть в файле и оценена в шкале как ${key}`,
  );
}

// ── Шкала и правила ──
const ts = tech.score ?? {};
for (const key of ["namedActorTier1", "namedActorTier2", "namedActorTier3", "locallyPresentActor", "unknownActor"]) {
  ok(typeof ts[key] === "number", `tech.score.${key} задан числом`);
}
ok(ts.namedActorTier1 > ts.namedActorTier2, `тир-1 (${ts.namedActorTier1}) весит больше тир-2 (${ts.namedActorTier2})`);
ok(ts.namedActorTier2 > ts.namedActorTier3, `тир-2 (${ts.namedActorTier2}) весит больше тир-3 (${ts.namedActorTier3})`);
ok(
  ts.locallyPresentActor >= ts.namedActorTier1,
  `узбекская привязка (${ts.locallyPresentActor}) не слабее тир-1 (${ts.namedActorTier1})`,
);
ok(ts.unknownActor < 0, `unknownActor (${ts.unknownActor}) — штраф`);

for (const rule of ["tier1Floor", "noNameNoNews", "oneActorOneScore", "uzbekTechAnywhere"]) {
  ok(Boolean(tech.specialRules?.[rule]), `tech.specialRules.${rule} описано`);
}

// ── Контрольные примеры, считаются из конфига ──
const techMin = tech.minScore ?? 40;

// Аналог Шелтона: стартап без имени с релизом модели. Не должен проходить.
const namelessStartup = ts.frontierAI + ts.unknownActor;
ok(namelessStartup < techMin, `безымянный стартап с релизом: ${namelessStartup} < порога ${techMin}`);

// Аналог Фьюри: анонс тир-1 без суммы и без узбекской привязки. Обязан
// проходить — и без правила tier1Floor не прошёл бы.
const tier1Announcement = ts.namedActorTier1 + ts.massProduct;
ok(tier1Announcement >= techMin, `анонс тир-1 с массовым продуктом: ${tier1Announcement} >= порога ${techMin}`);

// Локальный сюжет обязан проходить сам по себе: ради него всё и читается.
const localStory = ts.locallyPresentActor + ts.fintechForReader;
ok(localStory >= techMin, `узбекский финтех: ${localStory} >= порога ${techMin}`);

// Обзор гаджета не спасает даже тир-1 — обзоры в neverTake, но и по баллам
// он обязан оставаться под порогом.
const gadgetReview = ts.namedActorTier1 + ts.reviewOrBenchmark;
ok(gadgetReview < techMin, `обзор устройства с именем тир-1: ${gadgetReview} < порога ${techMin}`);

console.log(failed ? `\nпровалено ${failed}` : "\nвсе проверки пройдены");
process.exit(failed ? 1 : 0);
