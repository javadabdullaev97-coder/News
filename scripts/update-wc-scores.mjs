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
  /\{\s*id:\s*"(M\d+)",\s*stage:\s*"(\w+)"[^}]*?dateLocal:\s*"([^"]+)"[^}]*?homeRef:\s*"([^"]+)"[^}]*?awayRef:\s*"([^"]+)"[^}]*?\}/g;
const ourMatches = [];
let match;
while ((match = matchRegex.exec(wcSource))) {
  const [, id, stage, dateLocal, homeRef, awayRef] = match;
  ourMatches.push({
    id,
    stage,
    homeRef,
    awayRef,
    when: new Date(dateLocal).getTime(),
  });
}
console.log(`Найдено ${ourMatches.length} матчей в lib/wc2026.ts`);

// football-data stage → наш stage
const FD_STAGE_MAP = {
  GROUP_STAGE: "group",
  LAST_32: "r32",
  ROUND_OF_32: "r32",
  LAST_16: "r16",
  ROUND_OF_16: "r16",
  QUARTER_FINALS: "qf",
  SEMI_FINALS: "sf",
  THIRD_PLACE: "third",
  FINAL: "final",
};

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
const fdIdByOurId = {}; // M01 → 12345 (FD match id) — нужно для запроса деталей

function sameUtc(a, b) {
  if (!a || !b) return false;
  return new Date(a).getTime() === new Date(b).getTime();
}

for (const fd of apiMatches) {
  const fdHome = fdToOurs(fd.homeTeam?.tla);
  const fdAway = fdToOurs(fd.awayTeam?.tla);
  if (!fdHome || !fdAway) continue;

  const fdWhen = new Date(fd.utcDate).getTime();
  const fdStage = FD_STAGE_MAP[fd.stage] ?? "group";

  // Стратегия матчинга зависит от стадии:
  //   group  → по обеим командам + дата ±36 часов (наши homeRef/awayRef
  //            это реальные FIFA-коды)
  //   r32+   → по stage + дата ±12 часов (наши homeRef/awayRef это слоты
  //            "1A"/"2B"/"BEST3-X", их не сравнить с реальными
  //            командами от football-data)
  let mine;
  if (fdStage === "group") {
    mine = ourMatches.find((om) => {
      if (om.homeRef !== fdHome || om.awayRef !== fdAway) return false;
      return Math.abs(om.when - fdWhen) < 36 * 3600 * 1000;
    });
  } else {
    mine = ourMatches.find((om) => {
      if (om.stage !== fdStage) return false;
      return Math.abs(om.when - fdWhen) < 12 * 3600 * 1000;
    });
  }

  if (!mine) {
    unmatched.push(`${fdHome} vs ${fdAway} @ ${fd.utcDate} [${fdStage}]`);
    continue;
  }

  fdIdByOurId[mine.id] = fd.id;

  const ourStatus = STATUS_MAP[fd.status];
  const prev = existingScores[mine.id] ?? {};
  const next = { ...prev };
  let entryChanged = false;

  // Тайминг — всегда синхронизируем с API (единый источник истины).
  if (!sameUtc(prev.utcDate, fd.utcDate)) {
    next.utcDate = fd.utcDate;
    entryChanged = true;
  }

  // Для плей-офф пишем реальные команды, чтобы перебить слоты "1A"/"BEST3-X".
  if (fdStage !== "group") {
    if (prev.homeRef !== fdHome) {
      next.homeRef = fdHome;
      entryChanged = true;
    }
    if (prev.awayRef !== fdAway) {
      next.awayRef = fdAway;
      entryChanged = true;
    }
  }

  // Счёт — только для активных/завершённых матчей.
  if (ourStatus) {
    const ft = fd.score?.fullTime;
    const et = fd.score?.extraTime;
    const pk = fd.score?.penalties;
    // Если матч пошёл в ET — итоговый счёт там, иначе берём fullTime.
    const hasEt = !!et && (et.home != null || et.away != null);
    const home = hasEt
      ? et.home ?? ft?.home ?? 0
      : ft?.home ?? fd.score?.halfTime?.home ?? 0;
    const away = hasEt
      ? et.away ?? ft?.away ?? 0
      : ft?.away ?? fd.score?.halfTime?.away ?? 0;
    const hasPk = !!pk && (pk.home != null || pk.away != null);

    const pkChanged = hasPk
      ? prev.penalties?.home !== pk.home || prev.penalties?.away !== pk.away
      : !!prev.penalties;

    if (
      prev.home !== home ||
      prev.away !== away ||
      prev.status !== ourStatus ||
      pkChanged
    ) {
      next.home = home;
      next.away = away;
      next.status = ourStatus;
      if (hasPk) next.penalties = { home: pk.home, away: pk.away };
      else if (next.penalties) delete next.penalties;
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

if (changed > 0) {
  const ordered = Object.fromEntries(
    Object.entries(newScores).sort(([a], [b]) => a.localeCompare(b)),
  );
  fs.writeFileSync(SCORES_FILE, JSON.stringify(ordered, null, 2) + "\n");
  console.log(`Записано в ${SCORES_FILE}, обновлено ${changed} матчей`);
} else {
  console.log("Счёты — изменений нет.");
}

// Детали матчей (/v4/matches/{id}) на free-тарифе football-data возвращают
// пустые массивы goals/bookings/substitutions. Не тратим запросы впустую —
// если включим платный план или другой источник, верни эту секцию из git.
