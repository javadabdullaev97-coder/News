// Обновлятор счетов ЧМ-2026 из football-data.org API.
// Запускается из GitHub Action раз в 15 минут, пишет в lib/wc2026-scores.json.
// Если файл изменился — Action коммитит, Cloudflare ребилдит, новые счета на сайте.

import fs from "node:fs";
import path from "node:path";

const TOKEN = process.env.FOOTBALL_DATA_TOKEN;
if (!TOKEN) {
  console.error("FOOTBALL_DATA_TOKEN не задан, выхожу.");
  process.exit(1);
}

const NOW = new Date();
const TOURNAMENT_START = new Date("2026-06-10T00:00:00Z"); // за день до старта
const TOURNAMENT_END = new Date("2026-07-20T23:59:59Z");
if (NOW < TOURNAMENT_START || NOW > TOURNAMENT_END) {
  console.log(
    `Сейчас ${NOW.toISOString()} — вне турнирного окна (${TOURNAMENT_START.toISOString()} … ${TOURNAMENT_END.toISOString()}). Пропускаю.`,
  );
  process.exit(0);
}

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SCORES_FILE = path.join(ROOT, "lib", "wc2026-scores.json");
const MATCHES_FILE = path.join(ROOT, "lib", "wc2026.ts");

const existingScores = JSON.parse(fs.readFileSync(SCORES_FILE, "utf8"));

// FD-кодов, которые отличаются от наших FIFA-кодов (или просто запасные варианты).
// Если в логах увидим непривязанные матчи — дописываем сюда.
const FD_CODE_MAP = {
  SAU: "KSA", // Saudi Arabia
  RSA: "ZAF", // South Africa
  DZA: "ALG", // Algeria
  CHE: "SUI", // Switzerland
  CIV: "CIV",
  COD: "COD",
  HRV: "CRO",
  DEU: "GER",
  URY: "URU", // Uruguay
};
function fdToOurs(tla) {
  return FD_CODE_MAP[tla] ?? tla;
}

// Извлекаем наши матчи (id, dateLocal, homeRef, awayRef) регулярно из исходника.
// Альтернатива — динамический импорт TS, но он тянет за собой целую тулчейн.
const wcSource = fs.readFileSync(MATCHES_FILE, "utf8");
const matchRegex =
  /\{\s*id:\s*"(M\d+)"[^}]*?dateLocal:\s*"([^"]+)"[^}]*?homeRef:\s*"([^"]+)"[^}]*?awayRef:\s*"([^"]+)"[^}]*?\}/g;
const ourMatches = [];
let match;
while ((match = matchRegex.exec(wcSource))) {
  const [, id, dateLocal, homeRef, awayRef] = match;
  ourMatches.push({
    id,
    homeRef,
    awayRef,
    when: new Date(dateLocal).getTime(),
  });
}
console.log(`Найдено ${ourMatches.length} матчей в lib/wc2026.ts`);

// Качаем API. На WC у football-data код "WC", альтернативно — числовой id 2000.
const apiUrl = "https://api.football-data.org/v4/competitions/WC/matches";
const apiRes = await fetch(apiUrl, {
  headers: { "X-Auth-Token": TOKEN },
});
if (!apiRes.ok) {
  console.error(`API ответил ${apiRes.status} ${apiRes.statusText}`);
  console.error(await apiRes.text());
  process.exit(1);
}
const apiData = await apiRes.json();
const apiMatches = apiData.matches ?? [];
console.log(`API вернул ${apiMatches.length} матчей`);

const STATUS_MAP = {
  IN_PLAY: "live",
  PAUSED: "live",
  FINISHED: "finished",
};

const newScores = { ...existingScores };
let changed = 0;
const unmatched = [];

function sameUtc(a, b) {
  if (!a || !b) return false;
  return new Date(a).getTime() === new Date(b).getTime();
}

for (const fd of apiMatches) {
  const fdHome = fdToOurs(fd.homeTeam?.tla);
  const fdAway = fdToOurs(fd.awayTeam?.tla);
  if (!fdHome || !fdAway) continue;

  const fdWhen = new Date(fd.utcDate).getTime();

  // Сопоставляем по обеим командам и дате ±36 часов
  // (часовые пояса разных стадионов отличаются до 3ч, плюс возможны
  // переносы — даём широкое окно).
  const mine = ourMatches.find((om) => {
    if (om.homeRef !== fdHome || om.awayRef !== fdAway) return false;
    return Math.abs(om.when - fdWhen) < 36 * 3600 * 1000;
  });

  if (!mine) {
    unmatched.push(`${fdHome} vs ${fdAway} @ ${fd.utcDate}`);
    continue;
  }

  const ourStatus = STATUS_MAP[fd.status];
  const prev = existingScores[mine.id] ?? {};
  const next = { ...prev };
  let entryChanged = false;

  // Тайминг — всегда синхронизируем с API (единый источник истины).
  if (!sameUtc(prev.utcDate, fd.utcDate)) {
    next.utcDate = fd.utcDate;
    entryChanged = true;
  }

  // Счёт — только для активных/завершённых матчей.
  if (ourStatus) {
    const home = fd.score?.fullTime?.home ?? fd.score?.halfTime?.home ?? 0;
    const away = fd.score?.fullTime?.away ?? fd.score?.halfTime?.away ?? 0;
    if (
      prev.home !== home ||
      prev.away !== away ||
      prev.status !== ourStatus
    ) {
      next.home = home;
      next.away = away;
      next.status = ourStatus;
      entryChanged = true;
    }
  }

  if (entryChanged) {
    newScores[mine.id] = next;
    changed++;
    const desc =
      ourStatus
        ? `${fdHome} ${next.home}:${next.away} ${fdAway} (${ourStatus})`
        : `${fdHome} vs ${fdAway} @ ${fd.utcDate}`;
    console.log(`→ ${mine.id}: ${desc}`);
  }
}

if (unmatched.length > 0) {
  console.warn(`Не привязаны к нашим матчам (${unmatched.length}):`);
  for (const u of unmatched) console.warn(`  · ${u}`);
}

if (changed === 0) {
  console.log("Изменений нет.");
  process.exit(0);
}

const ordered = Object.fromEntries(
  Object.entries(newScores).sort(([a], [b]) => a.localeCompare(b)),
);
fs.writeFileSync(SCORES_FILE, JSON.stringify(ordered, null, 2) + "\n");
console.log(`Записано в ${SCORES_FILE}, обновлено ${changed} матчей`);
