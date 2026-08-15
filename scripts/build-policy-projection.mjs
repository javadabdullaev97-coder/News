#!/usr/bin/env node
// Проекция редакционной политики под оркестратора планёрки.
//
// Зачем. config/newsroom-policy.json — 12,8k токенов, и оркестратор читает
// его целиком на каждом прогоне. Между тем часть секций к его работе
// отношения не имеет:
//
//   urgency  (4,2 КБ) — плашка «СРОЧНО» в Telegram снята решением владельца
//                       03.08.2026, и сама политика помечает секцию как
//                       внутренний резерв, не влияющий на выход в канал.
//   imagery         — правила подбора картинки. Это территория bild.
//   telegram        — параметры постинга. Это территория post-to-telegram.
//
// Всё остальное оркестратору нужно и остаётся: selection, world,
// editorReview, directPublish, publishing, rework, factCheckSkip и
// breakingLane (по нему идут ночная полоса ЧП и утренняя ревизия).
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
//   node scripts/build-policy-projection.mjs           — записать файл
//   node scripts/build-policy-projection.mjs --stdout  — вывести

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "../lib/inbox-core.mjs";

const SRC = join(ROOT, "config/newsroom-policy.json");
const OUT = join(ROOT, "config/generated/policy-orchestrator.json");

// Секции, которых у оркестратора быть не должно, — и почему.
const DROP = {
  urgency: "плашка СРОЧНО снята 03.08.2026, секция — внутренний резерв",
  imagery: "правила картинки — территория bild",
  telegram: "параметры постинга — территория post-to-telegram",
};

const policy = JSON.parse(readFileSync(SRC, "utf8"));

const projected = {};
const dropped = [];
for (const [key, value] of Object.entries(policy)) {
  if (key in DROP) {
    dropped.push(key);
    continue;
  }
  projected[key] = value;
}

// Если секцию переименуют, тихо уехать «ничего не выбросили» нельзя:
// проекция перестанет экономить, и об этом никто не узнает.
const vanished = Object.keys(DROP).filter((k) => !(k in policy));
if (vanished.length) {
  console.error(
    `[policy-projection] в политике больше нет секций ${vanished.join(", ")} — ` +
      "их переименовали или убрали, поправь список DROP в этом скрипте"
  );
}

const out = {
  $comment:
    "ПРОИЗВОДНЫЙ ФАЙЛ, не редактируй и не коммить. Проекция " +
    "config/newsroom-policy.json под оркестратора планёрки, собирается " +
    "scripts/build-policy-projection.mjs.",
  $droppedSections: Object.fromEntries(dropped.map((k) => [k, DROP[k]])),
  $note:
    "Нужна выброшенная секция — открой config/newsroom-policy.json. " +
    "Он остаётся источником истины и главнее прозы спецификации.",
  ...projected,
};

const text = JSON.stringify(out, null, 2) + "\n";

if (process.argv.includes("--stdout")) {
  process.stdout.write(text);
  process.exit(0);
}

mkdirSync(join(ROOT, "config/generated"), { recursive: true });
writeFileSync(OUT, text);

const before = readFileSync(SRC, "utf8").length;
console.error(
  `[policy-projection] ${text.length} знаков против ${before} в исходнике ` +
    `(выброшено: ${dropped.join(", ") || "ничего"})`
);
