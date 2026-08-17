#!/usr/bin/env node
// Проекции редакционной политики — по одной на планёрку.
//
// Зачем. config/newsroom-policy.json растёт вместе с направлениями, а читает
// его каждая планёрка целиком на каждом прогоне. Часть секций не имеет
// отношения к работе оркестратора вообще:
//
//   urgency  (4,2 КБ) — плашка «СРОЧНО» в Telegram снята решением владельца
//                       03.08.2026, и сама политика помечает секцию как
//                       внутренний резерв, не влияющий на выход в канал.
//   imagery         — правила подбора картинки. Это территория bild.
//   telegram        — параметры постинга. Это территория post-to-telegram.
//
// А с 17.08.2026 к этому добавилось второе деление, крупнее первого.
// Планёрок стало три, и каждая читала обе чужие вертикали: в проекции на
// 62 тысячи знаков секция tech занимала 33%, sport — 22%. То есть больше
// половины файла спортивная планёрка читала про технологии и наоборот,
// а основная — про оба направления, которых она не ведёт вовсе.
//
// Поэтому проекций теперь три, по одной на роль:
//
//   policy-orchestrator.json — основная планёрка. Без sport и tech, но с
//     узким срезом tech.specialRules.uzbekTechAnywhere: узбекская
//     технологическая тема физически лежит в местном потоке (фильтр региона
//     уводит её из профильной линии), и разбирает её именно основная.
//     Спортивный аналог этого правила живёт в world.specialRules и остаётся
//     в проекции целиком.
//   policy-sport.json — спортивная. Без tech. Секция world остаётся: спека
//     ссылается на world.specialRules.
//   policy-tech.json — технологическая. Без sport и без world: у неё все
//     правила свои, и спецификация прямо говорит, что world к ней не
//     применяется.
//
// Списки имён в проекции не участвуют — они вынесены в config/named-actors/
// и читаются отдельными файлами по направлению.
//
// $comment-поля НЕ вырезаются намеренно. В этой политике они несут
// обоснования решений — почему порог такой, почему квоту сняли, — и
// оркестратор принимает по ним решения на границе правил. Экономия на них
// была бы экономией на понимании.
//
// НЕ КОММИТИТСЯ, как и остальное в config/generated: производный файл рядом
// с исходником расходится с ним молча. Собирается за миллисекунды.
//
// Использование:
//   node scripts/build-policy-projection.mjs             — собрать все три
//   node scripts/build-policy-projection.mjs --for=tech  — только одну
//   node scripts/build-policy-projection.mjs --for=tech --stdout

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "../lib/inbox-core.mjs";

const SRC = join(ROOT, "config/newsroom-policy.json");
const OUT_DIR = join(ROOT, "config/generated");

// Секции, которых не должно быть ни у кого, — и почему.
const DROP_ALL = {
  urgency: "плашка СРОЧНО снята 03.08.2026, секция — внутренний резерв",
  imagery: "правила картинки — территория bild",
  telegram: "параметры постинга — территория post-to-telegram",
};

// Что выбрасывается сверх общего списка у каждой роли.
const ROLES = {
  main: {
    file: "policy-orchestrator.json",
    reader: "основная планёрка (docs/routine-prompts/planyorka-run.md)",
    drop: {
      sport: "своя планёрка и свой поток инбокса — sport-planyorka.md",
      tech: "своя планёрка и свой поток инбокса — tech-planyorka.md",
    },
    // Узкий срез чужой секции: правило нужно именно основной планёрке,
    // потому что тема с узбекской привязкой лежит в её потоке.
    keepSlices: [["tech", "specialRules", "uzbekTechAnywhere"]],
  },
  sport: {
    file: "policy-sport.json",
    reader: "спортивная планёрка (docs/routine-prompts/sport-planyorka.md)",
    drop: { tech: "чужая вертикаль — своя планёрка и свой поток" },
    keepSlices: [],
  },
  tech: {
    file: "policy-tech.json",
    reader: "технологическая планёрка (docs/routine-prompts/tech-planyorka.md)",
    drop: {
      sport: "чужая вертикаль — своя планёрка и свой поток",
      world: "секция world к технологиям не применяется, см. tech.$comment",
    },
    keepSlices: [],
  },
};

const opt = (n) => {
  const p = process.argv.find((a) => a.startsWith(`--${n}=`));
  return p ? p.slice(n.length + 3) : null;
};
const only = opt("for");
const toStdout = process.argv.includes("--stdout");

if (only && !ROLES[only]) {
  console.error(`[policy-projection] роль "${only}" не описана. Есть: ${Object.keys(ROLES).join(", ")}`);
  process.exit(2);
}
if (toStdout && !only) {
  console.error("[policy-projection] --stdout требует --for=<роль>: проекций три, в поток идёт одна");
  process.exit(2);
}

const policy = JSON.parse(readFileSync(SRC, "utf8"));

// Если секцию переименуют, тихо уехать «ничего не выбросили» нельзя:
// проекция перестанет экономить, и об этом никто не узнает.
const vanished = Object.keys(DROP_ALL).filter((k) => !(k in policy));
if (vanished.length) {
  console.error(
    `[policy-projection] в политике больше нет секций ${vanished.join(", ")} — ` +
      "их переименовали или убрали, поправь список DROP_ALL в этом скрипте",
  );
}

function sliceOf(source, path) {
  let node = source;
  for (const key of path) {
    node = node?.[key];
    if (node === undefined) return null;
  }
  return node;
}

function build(roleName) {
  const role = ROLES[roleName];
  const drop = { ...DROP_ALL, ...role.drop };
  const projected = {};
  const dropped = [];
  for (const [key, value] of Object.entries(policy)) {
    if (key in drop) {
      dropped.push(key);
      continue;
    }
    projected[key] = value;
  }

  // Узкие срезы выброшенных секций — по одному правилу, а не по секции.
  const slices = {};
  for (const path of role.keepSlices) {
    const value = sliceOf(policy, path);
    if (value === null) {
      console.error(`[policy-projection] срез ${path.join(".")} не найден — правило переименовали?`);
      continue;
    }
    let node = slices;
    for (const key of path.slice(0, -1)) node = node[key] ??= {};
    node[path.at(-1)] = value;
  }

  const out = {
    $comment:
      "ПРОИЗВОДНЫЙ ФАЙЛ, не редактируй и не коммить. Проекция " +
      `config/newsroom-policy.json под роль «${roleName}» — ${role.reader}. ` +
      "Собирается scripts/build-policy-projection.mjs.",
    $droppedSections: Object.fromEntries(dropped.map((k) => [k, drop[k]])),
    $note:
      "Нужна выброшенная секция — открой config/newsroom-policy.json. " +
      "Он остаётся источником истины и главнее прозы спецификации. " +
      "Списки имён здесь не лежат: они в config/named-actors/<направление>.json.",
    ...projected,
    ...slices,
  };
  return { text: JSON.stringify(out, null, 2) + "\n", dropped };
}

mkdirSync(OUT_DIR, { recursive: true });
const before = readFileSync(SRC, "utf8").length;
const names = only ? [only] : Object.keys(ROLES);

for (const roleName of names) {
  const { text, dropped } = build(roleName);
  if (toStdout) {
    process.stdout.write(text);
    continue;
  }
  writeFileSync(join(OUT_DIR, ROLES[roleName].file), text);
  console.error(
    `[policy-projection] ${ROLES[roleName].file}: ${text.length} знаков против ${before} ` +
      `в исходнике (выброшено: ${dropped.join(", ") || "ничего"})`,
  );
}
