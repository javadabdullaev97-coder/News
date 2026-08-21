#!/usr/bin/env node
// Регрессия на сторожа тишины.
//
// Проверки возраста стояли на statSync(...).mtimeMs. Actions клонируют
// репозиторий заново каждый запуск, поэтому mtime у всех файлов — время
// checkout'а, а «возраст» всегда около нуля: сторож не мог сработать
// никогда. 19.08.2026 все три планёрки молчали сутки, 20.08 была вторая
// пауза на пятнадцать часов — оба раза сторож отчитался «всё живо».
//
// Здесь проверяется то, что это чинит: возраст берётся из содержимого.

import { timestampFromJson, timestampFromJsonl } from "./heartbeat.mjs";

let failed = 0;
const ok = (c, m) => {
  if (!c) failed++;
  console.log((c ? "  ok  " : "  FAIL ") + m);
};

const t = (iso) => Date.parse(iso);

ok(
  timestampFromJson('{"lastRunAt":"2026-08-19T10:00:00+05:00"}', "lastRunAt") ===
    t("2026-08-19T10:00:00+05:00"),
  "отметка прогона читается из lastRunAt",
);
ok(timestampFromJson('{"topicsProcessed":3}', "lastRunAt") === null, "нет поля — null, а не ноль");
ok(timestampFromJson("не json", "lastRunAt") === null, "битый файл — null, а не исключение");
ok(timestampFromJson('{"lastRunAt":"позавчера"}', "lastRunAt") === null, "неразбираемая дата — null");

const jsonl = [
  '{"title":"a","fetchedAt":"2026-08-21T10:00:00.000Z"}',
  '{"title":"b","fetchedAt":"2026-08-21T16:21:54.310Z"}',
].join("\n");
ok(
  timestampFromJsonl(jsonl, "fetchedAt") === t("2026-08-21T16:21:54.310Z"),
  "инбокс: берётся время ПОСЛЕДНЕЙ записи",
);
ok(
  timestampFromJsonl(`${jsonl}\n{"title":"c"}\n`, "fetchedAt") === t("2026-08-21T16:21:54.310Z"),
  "последняя запись без поля — берём предыдущую с полем",
);
ok(timestampFromJsonl("", "fetchedAt") === null, "пустой файл — null");

console.log(failed ? `\n${failed} проверок упало` : "\nвсе проверки прошли");
process.exit(failed ? 1 : 0);
