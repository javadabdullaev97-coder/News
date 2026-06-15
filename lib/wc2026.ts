// Данные ЧМ-2026 на основе официального жребия 5 декабря 2025.
// Состав групп, расписание и слоты плей-офф — из публичных источников
// (FIFA, AFC, международные СМИ). Лучшие третьи места — таблица ФИФА
// раскрывается после группового этапа: пока в bracket-слотах хранится пул
// возможных групп, например BEST3-ABCDF.
//
// Счета матчей хранятся отдельно в lib/wc2026-scores.json — этот файл
// обновляется GitHub Action раз в 15 минут из football-data.org API.
// Туда же ходит за scorers и деталями завершённых матчей.

import LIVE_SCORES_RAW from "./wc2026-scores.json";
import SCORERS_RAW from "./wc2026-scorers.json";

type LiveScoreEntry = {
  home?: number;
  away?: number;
  status?: "live" | "finished";
  utcDate?: string; // абсолютный UTC-момент от football-data — пересиливает dateLocal
};
const LIVE_SCORES = LIVE_SCORES_RAW as Record<string, LiveScoreEntry>;

export type WCScorer = {
  playerName: string | null;
  playerNationality: string | null;
  teamName: string | null;
  teamTla: string | null;
  goals: number;
  assists: number;
  penalties: number;
  playedMatches: number;
};

export type WCScorersPayload = {
  updatedAt: string | null;
  scorers: WCScorer[];
};

export const WC_SCORERS = SCORERS_RAW as WCScorersPayload;

export type WCConfederation = "UEFA" | "AFC" | "CAF" | "CONMEBOL" | "CONCACAF" | "OFC";

export type WCGroupId =
  | "A" | "B" | "C" | "D" | "E" | "F"
  | "G" | "H" | "I" | "J" | "K" | "L";

export const WC_GROUP_IDS: WCGroupId[] = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L",
];

export type WCTeam = {
  name: string;
  code: string; // ISO-3166-1 alpha-2 для флага flagcdn.com
  fifa: string; // 3-буквенный код ФИФА
  confederation: WCConfederation;
  group: WCGroupId;
  pot: 1 | 2 | 3 | 4;
  qualifiedAs?: string;
  fifaRank?: number;
  isUz?: boolean;
};

export type WCStage = "group" | "r32" | "r16" | "qf" | "sf" | "third" | "final";

export type WCMatchStatus = "scheduled" | "live" | "finished";

export type WCMatch = {
  id: string;            // M01..M104, нумерация ФИФА
  stage: WCStage;
  group?: WCGroupId;     // для group-stage
  matchday?: 1 | 2 | 3;  // для group-stage
  dateLocal: string;     // ISO с TZ-смещением локального стадиона — единственный источник истины
  homeRef: string;       // FIFA-код для group, либо слот "1A" / "2B" / "BEST3-ABCDF" / "W M73" / "L M101"
  awayRef: string;
  venueRu: string;
  cityRu: string;
  country: "US" | "CA" | "MX";
  feedsInto?: string;    // ID следующего матча в сетке плей-офф
  score?: { home: number; away: number; status?: "live" | "finished" };
  // status="live" → матч идёт, счёт на экран; "finished" → матч сыгран
  // без status или без score → определяем по времени старта
};

export const WC_TEAMS: WCTeam[] = [
  // Group A
  { name: "Мексика", code: "mx", fifa: "MEX", confederation: "CONCACAF", group: "A", pot: 1, qualifiedAs: "Хозяин турнира" },
  { name: "Южная Корея", code: "kr", fifa: "KOR", confederation: "AFC", group: "A", pot: 2 },
  { name: "ЮАР", code: "za", fifa: "ZAF", confederation: "CAF", group: "A", pot: 3 },
  { name: "Чехия", code: "cz", fifa: "CZE", confederation: "UEFA", group: "A", pot: 4, qualifiedAs: "Плей-офф УЕФА, путь D" },

  // Group B
  { name: "Канада", code: "ca", fifa: "CAN", confederation: "CONCACAF", group: "B", pot: 1, qualifiedAs: "Хозяин турнира" },
  { name: "Швейцария", code: "ch", fifa: "SUI", confederation: "UEFA", group: "B", pot: 2 },
  { name: "Катар", code: "qa", fifa: "QAT", confederation: "AFC", group: "B", pot: 3 },
  { name: "Босния и Герцеговина", code: "ba", fifa: "BIH", confederation: "UEFA", group: "B", pot: 4, qualifiedAs: "Плей-офф УЕФА, путь A" },

  // Group C
  { name: "Бразилия", code: "br", fifa: "BRA", confederation: "CONMEBOL", group: "C", pot: 1 },
  { name: "Марокко", code: "ma", fifa: "MAR", confederation: "CAF", group: "C", pot: 2 },
  { name: "Шотландия", code: "gb-sct", fifa: "SCO", confederation: "UEFA", group: "C", pot: 3 },
  { name: "Гаити", code: "ht", fifa: "HAI", confederation: "CONCACAF", group: "C", pot: 4 },

  // Group D
  { name: "США", code: "us", fifa: "USA", confederation: "CONCACAF", group: "D", pot: 1, qualifiedAs: "Хозяин турнира" },
  { name: "Турция", code: "tr", fifa: "TUR", confederation: "UEFA", group: "D", pot: 2, qualifiedAs: "Плей-офф УЕФА, путь C" },
  { name: "Парагвай", code: "py", fifa: "PAR", confederation: "CONMEBOL", group: "D", pot: 3 },
  { name: "Австралия", code: "au", fifa: "AUS", confederation: "AFC", group: "D", pot: 4 },

  // Group E
  { name: "Германия", code: "de", fifa: "GER", confederation: "UEFA", group: "E", pot: 1 },
  { name: "Эквадор", code: "ec", fifa: "ECU", confederation: "CONMEBOL", group: "E", pot: 2 },
  { name: "Кот-д’Ивуар", code: "ci", fifa: "CIV", confederation: "CAF", group: "E", pot: 3 },
  { name: "Кюрасао", code: "cw", fifa: "CUW", confederation: "CONCACAF", group: "E", pot: 4 },

  // Group F
  { name: "Нидерланды", code: "nl", fifa: "NED", confederation: "UEFA", group: "F", pot: 1 },
  { name: "Япония", code: "jp", fifa: "JPN", confederation: "AFC", group: "F", pot: 2 },
  { name: "Швеция", code: "se", fifa: "SWE", confederation: "UEFA", group: "F", pot: 3, qualifiedAs: "Плей-офф УЕФА, путь B" },
  { name: "Тунис", code: "tn", fifa: "TUN", confederation: "CAF", group: "F", pot: 4 },

  // Group G
  { name: "Бельгия", code: "be", fifa: "BEL", confederation: "UEFA", group: "G", pot: 1 },
  { name: "Египет", code: "eg", fifa: "EGY", confederation: "CAF", group: "G", pot: 2 },
  { name: "Иран", code: "ir", fifa: "IRN", confederation: "AFC", group: "G", pot: 3 },
  { name: "Новая Зеландия", code: "nz", fifa: "NZL", confederation: "OFC", group: "G", pot: 4, qualifiedAs: "Межконтинентальный плей-офф" },

  // Group H
  { name: "Испания", code: "es", fifa: "ESP", confederation: "UEFA", group: "H", pot: 1 },
  { name: "Уругвай", code: "uy", fifa: "URU", confederation: "CONMEBOL", group: "H", pot: 2 },
  { name: "Саудовская Аравия", code: "sa", fifa: "KSA", confederation: "AFC", group: "H", pot: 3 },
  { name: "Кабо-Верде", code: "cv", fifa: "CPV", confederation: "CAF", group: "H", pot: 4 },

  // Group I
  { name: "Франция", code: "fr", fifa: "FRA", confederation: "UEFA", group: "I", pot: 1 },
  { name: "Сенегал", code: "sn", fifa: "SEN", confederation: "CAF", group: "I", pot: 2 },
  { name: "Норвегия", code: "no", fifa: "NOR", confederation: "UEFA", group: "I", pot: 3 },
  { name: "Ирак", code: "iq", fifa: "IRQ", confederation: "AFC", group: "I", pot: 4, qualifiedAs: "Межконтинентальный плей-офф, путь 2" },

  // Group J
  { name: "Аргентина", code: "ar", fifa: "ARG", confederation: "CONMEBOL", group: "J", pot: 1 },
  { name: "Алжир", code: "dz", fifa: "ALG", confederation: "CAF", group: "J", pot: 2 },
  { name: "Австрия", code: "at", fifa: "AUT", confederation: "UEFA", group: "J", pot: 3 },
  { name: "Иордания", code: "jo", fifa: "JOR", confederation: "AFC", group: "J", pot: 4 },

  // Group K — Узбекистан
  { name: "Португалия", code: "pt", fifa: "POR", confederation: "UEFA", group: "K", pot: 1 },
  { name: "Колумбия", code: "co", fifa: "COL", confederation: "CONMEBOL", group: "K", pot: 2 },
  { name: "ДР Конго", code: "cd", fifa: "COD", confederation: "CAF", group: "K", pot: 3, qualifiedAs: "Межконтинентальный плей-офф, путь 1" },
  { name: "Узбекистан", code: "uz", fifa: "UZB", confederation: "AFC", group: "K", pot: 3, fifaRank: 57, isUz: true },

  // Group L
  { name: "Англия", code: "gb-eng", fifa: "ENG", confederation: "UEFA", group: "L", pot: 1 },
  { name: "Хорватия", code: "hr", fifa: "CRO", confederation: "UEFA", group: "L", pot: 2 },
  { name: "Гана", code: "gh", fifa: "GHA", confederation: "CAF", group: "L", pot: 3 },
  { name: "Панама", code: "pa", fifa: "PAN", confederation: "CONCACAF", group: "L", pot: 4 },
];

// 104 матча. Группа (matchday 1–3) → 1/16 финала (R32) → 1/8 → 1/4 → 1/2 → матч за 3-е + финал.
const WC_MATCHES_RAW: WCMatch[] = [
  // ─── Matchday 1 ───
  { id: "M01", stage: "group", group: "A", matchday: 1, dateLocal: "2026-06-11T15:00:00-06:00", homeRef: "MEX", awayRef: "ZAF", venueRu: "Эстадио Ацтека", cityRu: "Мехико", country: "MX" },
  { id: "M02", stage: "group", group: "A", matchday: 1, dateLocal: "2026-06-11T20:00:00-06:00", homeRef: "KOR", awayRef: "CZE", venueRu: "Эстадио Акрон", cityRu: "Гвадалахара", country: "MX" },
  { id: "M03", stage: "group", group: "B", matchday: 1, dateLocal: "2026-06-12T15:00:00-04:00", homeRef: "CAN", awayRef: "BIH", venueRu: "БМО Филд", cityRu: "Торонто", country: "CA" },
  { id: "M04", stage: "group", group: "D", matchday: 1, dateLocal: "2026-06-12T18:00:00-07:00", homeRef: "USA", awayRef: "PAR", venueRu: "СоФай Стэдиум", cityRu: "Лос-Анджелес", country: "US" },
  { id: "M05", stage: "group", group: "B", matchday: 1, dateLocal: "2026-06-13T12:00:00-07:00", homeRef: "QAT", awayRef: "SUI", venueRu: "Левис Стэдиум", cityRu: "Санта-Клара", country: "US" },
  { id: "M06", stage: "group", group: "C", matchday: 1, dateLocal: "2026-06-13T18:00:00-04:00", homeRef: "BRA", awayRef: "MAR", venueRu: "МетЛайф Стэдиум", cityRu: "Нью-Йорк/Нью-Джерси", country: "US" },
  { id: "M07", stage: "group", group: "C", matchday: 1, dateLocal: "2026-06-13T21:00:00-04:00", homeRef: "HAI", awayRef: "SCO", venueRu: "Жиллет Стэдиум", cityRu: "Бостон", country: "US" },
  { id: "M08", stage: "group", group: "D", matchday: 1, dateLocal: "2026-06-14T00:00:00-07:00", homeRef: "AUS", awayRef: "TUR", venueRu: "БиСи Плейс", cityRu: "Ванкувер", country: "CA" },
  { id: "M09", stage: "group", group: "E", matchday: 1, dateLocal: "2026-06-14T13:00:00-05:00", homeRef: "GER", awayRef: "CUW", venueRu: "НРГ Стэдиум", cityRu: "Хьюстон", country: "US" },
  { id: "M10", stage: "group", group: "F", matchday: 1, dateLocal: "2026-06-14T16:00:00-05:00", homeRef: "NED", awayRef: "JPN", venueRu: "АТ&Т Стэдиум", cityRu: "Даллас", country: "US" },
  { id: "M11", stage: "group", group: "E", matchday: 1, dateLocal: "2026-06-14T19:00:00-05:00", homeRef: "CIV", awayRef: "ECU", venueRu: "Линкольн Файненшл Филд", cityRu: "Филадельфия", country: "US" },
  { id: "M12", stage: "group", group: "F", matchday: 1, dateLocal: "2026-06-14T22:00:00-06:00", homeRef: "SWE", awayRef: "TUN", venueRu: "Эстадио ББВА", cityRu: "Монтеррей", country: "MX" },
  { id: "M13", stage: "group", group: "H", matchday: 1, dateLocal: "2026-06-15T12:00:00-04:00", homeRef: "ESP", awayRef: "CPV", venueRu: "Мерседес-Бенц Стэдиум", cityRu: "Атланта", country: "US" },
  { id: "M14", stage: "group", group: "G", matchday: 1, dateLocal: "2026-06-15T15:00:00-07:00", homeRef: "BEL", awayRef: "EGY", venueRu: "Люмен Филд", cityRu: "Сиэтл", country: "US" },
  { id: "M15", stage: "group", group: "H", matchday: 1, dateLocal: "2026-06-15T18:00:00-04:00", homeRef: "KSA", awayRef: "URU", venueRu: "Хард Рок Стэдиум", cityRu: "Майами", country: "US" },
  { id: "M16", stage: "group", group: "G", matchday: 1, dateLocal: "2026-06-15T21:00:00-07:00", homeRef: "IRN", awayRef: "NZL", venueRu: "СоФай Стэдиум", cityRu: "Лос-Анджелес", country: "US" },
  { id: "M17", stage: "group", group: "I", matchday: 1, dateLocal: "2026-06-16T15:00:00-04:00", homeRef: "FRA", awayRef: "SEN", venueRu: "МетЛайф Стэдиум", cityRu: "Нью-Йорк/Нью-Джерси", country: "US" },
  { id: "M18", stage: "group", group: "I", matchday: 1, dateLocal: "2026-06-16T18:00:00-04:00", homeRef: "IRQ", awayRef: "NOR", venueRu: "Жиллет Стэдиум", cityRu: "Бостон", country: "US" },
  { id: "M19", stage: "group", group: "J", matchday: 1, dateLocal: "2026-06-16T21:00:00-05:00", homeRef: "ARG", awayRef: "ALG", venueRu: "Арроухед Стэдиум", cityRu: "Канзас-Сити", country: "US" },
  { id: "M20", stage: "group", group: "J", matchday: 1, dateLocal: "2026-06-17T00:00:00-07:00", homeRef: "AUT", awayRef: "JOR", venueRu: "Левис Стэдиум", cityRu: "Санта-Клара", country: "US" },
  { id: "M21", stage: "group", group: "K", matchday: 1, dateLocal: "2026-06-17T13:00:00-05:00", homeRef: "POR", awayRef: "COD", venueRu: "НРГ Стэдиум", cityRu: "Хьюстон", country: "US" },
  { id: "M22", stage: "group", group: "L", matchday: 1, dateLocal: "2026-06-17T16:00:00-05:00", homeRef: "ENG", awayRef: "CRO", venueRu: "АТ&Т Стэдиум", cityRu: "Даллас", country: "US" },
  { id: "M23", stage: "group", group: "L", matchday: 1, dateLocal: "2026-06-17T19:00:00-04:00", homeRef: "GHA", awayRef: "PAN", venueRu: "БМО Филд", cityRu: "Торонто", country: "CA" },
  { id: "M24", stage: "group", group: "K", matchday: 1, dateLocal: "2026-06-17T22:00:00-06:00", homeRef: "UZB", awayRef: "COL", venueRu: "Эстадио Ацтека", cityRu: "Мехико", country: "MX" },

  // ─── Matchday 2 ───
  { id: "M25", stage: "group", group: "A", matchday: 2, dateLocal: "2026-06-18T12:00:00-04:00", homeRef: "CZE", awayRef: "ZAF", venueRu: "Мерседес-Бенц Стэдиум", cityRu: "Атланта", country: "US" },
  { id: "M26", stage: "group", group: "B", matchday: 2, dateLocal: "2026-06-18T15:00:00-07:00", homeRef: "SUI", awayRef: "BIH", venueRu: "СоФай Стэдиум", cityRu: "Лос-Анджелес", country: "US" },
  { id: "M27", stage: "group", group: "B", matchday: 2, dateLocal: "2026-06-18T18:00:00-07:00", homeRef: "CAN", awayRef: "QAT", venueRu: "БиСи Плейс", cityRu: "Ванкувер", country: "CA" },
  { id: "M28", stage: "group", group: "A", matchday: 2, dateLocal: "2026-06-18T21:00:00-06:00", homeRef: "MEX", awayRef: "KOR", venueRu: "Эстадио Акрон", cityRu: "Гвадалахара", country: "MX" },
  { id: "M29", stage: "group", group: "D", matchday: 2, dateLocal: "2026-06-19T00:00:00-07:00", homeRef: "TUR", awayRef: "PAR", venueRu: "Левис Стэдиум", cityRu: "Санта-Клара", country: "US" },
  { id: "M30", stage: "group", group: "D", matchday: 2, dateLocal: "2026-06-19T15:00:00-07:00", homeRef: "USA", awayRef: "AUS", venueRu: "Люмен Филд", cityRu: "Сиэтл", country: "US" },
  { id: "M31", stage: "group", group: "C", matchday: 2, dateLocal: "2026-06-19T18:00:00-04:00", homeRef: "SCO", awayRef: "MAR", venueRu: "Жиллет Стэдиум", cityRu: "Бостон", country: "US" },
  { id: "M32", stage: "group", group: "C", matchday: 2, dateLocal: "2026-06-19T20:30:00-04:00", homeRef: "BRA", awayRef: "HAI", venueRu: "Линкольн Файненшл Филд", cityRu: "Филадельфия", country: "US" },
  { id: "M33", stage: "group", group: "F", matchday: 2, dateLocal: "2026-06-20T13:00:00-05:00", homeRef: "NED", awayRef: "SWE", venueRu: "НРГ Стэдиум", cityRu: "Хьюстон", country: "US" },
  { id: "M34", stage: "group", group: "E", matchday: 2, dateLocal: "2026-06-20T16:00:00-04:00", homeRef: "GER", awayRef: "CIV", venueRu: "БМО Филд", cityRu: "Торонто", country: "CA" },
  { id: "M35", stage: "group", group: "E", matchday: 2, dateLocal: "2026-06-20T20:00:00-05:00", homeRef: "ECU", awayRef: "CUW", venueRu: "Арроухед Стэдиум", cityRu: "Канзас-Сити", country: "US" },
  { id: "M36", stage: "group", group: "F", matchday: 2, dateLocal: "2026-06-21T00:00:00-06:00", homeRef: "TUN", awayRef: "JPN", venueRu: "Эстадио ББВА", cityRu: "Монтеррей", country: "MX" },
  { id: "M37", stage: "group", group: "H", matchday: 2, dateLocal: "2026-06-21T12:00:00-04:00", homeRef: "ESP", awayRef: "KSA", venueRu: "Мерседес-Бенц Стэдиум", cityRu: "Атланта", country: "US" },
  { id: "M38", stage: "group", group: "G", matchday: 2, dateLocal: "2026-06-21T15:00:00-07:00", homeRef: "BEL", awayRef: "IRN", venueRu: "СоФай Стэдиум", cityRu: "Лос-Анджелес", country: "US" },
  { id: "M39", stage: "group", group: "H", matchday: 2, dateLocal: "2026-06-21T18:00:00-04:00", homeRef: "URU", awayRef: "CPV", venueRu: "Хард Рок Стэдиум", cityRu: "Майами", country: "US" },
  { id: "M40", stage: "group", group: "G", matchday: 2, dateLocal: "2026-06-21T21:00:00-07:00", homeRef: "NZL", awayRef: "EGY", venueRu: "БиСи Плейс", cityRu: "Ванкувер", country: "CA" },
  { id: "M41", stage: "group", group: "J", matchday: 2, dateLocal: "2026-06-22T13:00:00-05:00", homeRef: "ARG", awayRef: "AUT", venueRu: "АТ&Т Стэдиум", cityRu: "Даллас", country: "US" },
  { id: "M42", stage: "group", group: "I", matchday: 2, dateLocal: "2026-06-22T17:00:00-04:00", homeRef: "FRA", awayRef: "IRQ", venueRu: "Линкольн Файненшл Филд", cityRu: "Филадельфия", country: "US" },
  { id: "M43", stage: "group", group: "I", matchday: 2, dateLocal: "2026-06-22T20:00:00-04:00", homeRef: "NOR", awayRef: "SEN", venueRu: "МетЛайф Стэдиум", cityRu: "Нью-Йорк/Нью-Джерси", country: "US" },
  { id: "M44", stage: "group", group: "J", matchday: 2, dateLocal: "2026-06-22T23:00:00-07:00", homeRef: "JOR", awayRef: "ALG", venueRu: "Левис Стэдиум", cityRu: "Санта-Клара", country: "US" },
  { id: "M45", stage: "group", group: "K", matchday: 2, dateLocal: "2026-06-23T13:00:00-05:00", homeRef: "POR", awayRef: "UZB", venueRu: "НРГ Стэдиум", cityRu: "Хьюстон", country: "US" },
  { id: "M46", stage: "group", group: "L", matchday: 2, dateLocal: "2026-06-23T16:00:00-04:00", homeRef: "ENG", awayRef: "GHA", venueRu: "Жиллет Стэдиум", cityRu: "Бостон", country: "US" },
  { id: "M47", stage: "group", group: "L", matchday: 2, dateLocal: "2026-06-23T19:00:00-04:00", homeRef: "PAN", awayRef: "CRO", venueRu: "БМО Филд", cityRu: "Торонто", country: "CA" },
  { id: "M48", stage: "group", group: "K", matchday: 2, dateLocal: "2026-06-23T22:00:00-06:00", homeRef: "COL", awayRef: "COD", venueRu: "Эстадио Акрон", cityRu: "Гвадалахара", country: "MX" },

  // ─── Matchday 3 ───
  { id: "M49", stage: "group", group: "B", matchday: 3, dateLocal: "2026-06-24T15:00:00-07:00", homeRef: "SUI", awayRef: "CAN", venueRu: "БиСи Плейс", cityRu: "Ванкувер", country: "CA" },
  { id: "M50", stage: "group", group: "B", matchday: 3, dateLocal: "2026-06-24T15:00:00-07:00", homeRef: "BIH", awayRef: "QAT", venueRu: "Люмен Филд", cityRu: "Сиэтл", country: "US" },
  { id: "M51", stage: "group", group: "C", matchday: 3, dateLocal: "2026-06-24T18:00:00-04:00", homeRef: "SCO", awayRef: "BRA", venueRu: "Хард Рок Стэдиум", cityRu: "Майами", country: "US" },
  { id: "M52", stage: "group", group: "C", matchday: 3, dateLocal: "2026-06-24T18:00:00-04:00", homeRef: "MAR", awayRef: "HAI", venueRu: "Мерседес-Бенц Стэдиум", cityRu: "Атланта", country: "US" },
  { id: "M53", stage: "group", group: "A", matchday: 3, dateLocal: "2026-06-24T21:00:00-06:00", homeRef: "CZE", awayRef: "MEX", venueRu: "Эстадио Ацтека", cityRu: "Мехико", country: "MX" },
  { id: "M54", stage: "group", group: "A", matchday: 3, dateLocal: "2026-06-24T21:00:00-06:00", homeRef: "ZAF", awayRef: "KOR", venueRu: "Эстадио ББВА", cityRu: "Монтеррей", country: "MX" },
  { id: "M55", stage: "group", group: "E", matchday: 3, dateLocal: "2026-06-25T16:00:00-04:00", homeRef: "CUW", awayRef: "CIV", venueRu: "Линкольн Файненшл Филд", cityRu: "Филадельфия", country: "US" },
  { id: "M56", stage: "group", group: "E", matchday: 3, dateLocal: "2026-06-25T16:00:00-04:00", homeRef: "ECU", awayRef: "GER", venueRu: "МетЛайф Стэдиум", cityRu: "Нью-Йорк/Нью-Джерси", country: "US" },
  { id: "M57", stage: "group", group: "F", matchday: 3, dateLocal: "2026-06-25T19:00:00-05:00", homeRef: "JPN", awayRef: "SWE", venueRu: "АТ&Т Стэдиум", cityRu: "Даллас", country: "US" },
  { id: "M58", stage: "group", group: "F", matchday: 3, dateLocal: "2026-06-25T19:00:00-05:00", homeRef: "TUN", awayRef: "NED", venueRu: "Арроухед Стэдиум", cityRu: "Канзас-Сити", country: "US" },
  { id: "M59", stage: "group", group: "D", matchday: 3, dateLocal: "2026-06-25T22:00:00-07:00", homeRef: "TUR", awayRef: "USA", venueRu: "СоФай Стэдиум", cityRu: "Лос-Анджелес", country: "US" },
  { id: "M60", stage: "group", group: "D", matchday: 3, dateLocal: "2026-06-25T22:00:00-07:00", homeRef: "PAR", awayRef: "AUS", venueRu: "Левис Стэдиум", cityRu: "Санта-Клара", country: "US" },
  { id: "M61", stage: "group", group: "I", matchday: 3, dateLocal: "2026-06-26T15:00:00-04:00", homeRef: "NOR", awayRef: "FRA", venueRu: "Жиллет Стэдиум", cityRu: "Бостон", country: "US" },
  { id: "M62", stage: "group", group: "I", matchday: 3, dateLocal: "2026-06-26T15:00:00-04:00", homeRef: "SEN", awayRef: "IRQ", venueRu: "БМО Филд", cityRu: "Торонто", country: "CA" },
  { id: "M63", stage: "group", group: "H", matchday: 3, dateLocal: "2026-06-26T20:00:00-05:00", homeRef: "CPV", awayRef: "KSA", venueRu: "НРГ Стэдиум", cityRu: "Хьюстон", country: "US" },
  { id: "M64", stage: "group", group: "H", matchday: 3, dateLocal: "2026-06-26T20:00:00-06:00", homeRef: "URU", awayRef: "ESP", venueRu: "Эстадио Акрон", cityRu: "Гвадалахара", country: "MX" },
  { id: "M65", stage: "group", group: "G", matchday: 3, dateLocal: "2026-06-26T23:00:00-07:00", homeRef: "EGY", awayRef: "IRN", venueRu: "Люмен Филд", cityRu: "Сиэтл", country: "US" },
  { id: "M66", stage: "group", group: "G", matchday: 3, dateLocal: "2026-06-26T23:00:00-07:00", homeRef: "NZL", awayRef: "BEL", venueRu: "БиСи Плейс", cityRu: "Ванкувер", country: "CA" },
  { id: "M67", stage: "group", group: "L", matchday: 3, dateLocal: "2026-06-27T17:00:00-04:00", homeRef: "PAN", awayRef: "ENG", venueRu: "МетЛайф Стэдиум", cityRu: "Нью-Йорк/Нью-Джерси", country: "US" },
  { id: "M68", stage: "group", group: "L", matchday: 3, dateLocal: "2026-06-27T17:00:00-04:00", homeRef: "CRO", awayRef: "GHA", venueRu: "Линкольн Файненшл Филд", cityRu: "Филадельфия", country: "US" },
  { id: "M69", stage: "group", group: "K", matchday: 3, dateLocal: "2026-06-27T19:30:00-04:00", homeRef: "COL", awayRef: "POR", venueRu: "Хард Рок Стэдиум", cityRu: "Майами", country: "US" },
  { id: "M70", stage: "group", group: "K", matchday: 3, dateLocal: "2026-06-27T19:30:00-04:00", homeRef: "COD", awayRef: "UZB", venueRu: "Мерседес-Бенц Стэдиум", cityRu: "Атланта", country: "US" },
  { id: "M71", stage: "group", group: "J", matchday: 3, dateLocal: "2026-06-27T22:00:00-05:00", homeRef: "ALG", awayRef: "AUT", venueRu: "Арроухед Стэдиум", cityRu: "Канзас-Сити", country: "US" },
  { id: "M72", stage: "group", group: "J", matchday: 3, dateLocal: "2026-06-27T22:00:00-05:00", homeRef: "JOR", awayRef: "ARG", venueRu: "АТ&Т Стэдиум", cityRu: "Даллас", country: "US" },

  // ─── 1/16 финала (Round of 32) ───
  { id: "M73", stage: "r32", dateLocal: "2026-06-28T15:00:00-07:00", homeRef: "2A", awayRef: "2B", venueRu: "СоФай Стэдиум", cityRu: "Лос-Анджелес", country: "US", feedsInto: "M90" },
  { id: "M74", stage: "r32", dateLocal: "2026-06-29T16:30:00-04:00", homeRef: "1E", awayRef: "BEST3-ABCDF", venueRu: "Жиллет Стэдиум", cityRu: "Бостон", country: "US", feedsInto: "M89" },
  { id: "M75", stage: "r32", dateLocal: "2026-06-29T21:00:00-05:00", homeRef: "1F", awayRef: "2C", venueRu: "Эстадио ББВА", cityRu: "Монтеррей", country: "MX", feedsInto: "M90" },
  { id: "M76", stage: "r32", dateLocal: "2026-06-29T13:00:00-05:00", homeRef: "1C", awayRef: "2F", venueRu: "НРГ Стэдиум", cityRu: "Хьюстон", country: "US", feedsInto: "M91" },
  { id: "M77", stage: "r32", dateLocal: "2026-06-30T17:00:00-04:00", homeRef: "1I", awayRef: "BEST3-CDFGH", venueRu: "МетЛайф Стэдиум", cityRu: "Нью-Йорк/Нью-Джерси", country: "US", feedsInto: "M89" },
  { id: "M78", stage: "r32", dateLocal: "2026-06-30T13:00:00-05:00", homeRef: "2E", awayRef: "2I", venueRu: "АТ&Т Стэдиум", cityRu: "Даллас", country: "US", feedsInto: "M91" },
  { id: "M79", stage: "r32", dateLocal: "2026-06-30T21:00:00-06:00", homeRef: "1A", awayRef: "BEST3-CEFHI", venueRu: "Эстадио Ацтека", cityRu: "Мехико", country: "MX", feedsInto: "M92" },
  { id: "M80", stage: "r32", dateLocal: "2026-07-01T12:00:00-04:00", homeRef: "1L", awayRef: "BEST3-EHIJK", venueRu: "Мерседес-Бенц Стэдиум", cityRu: "Атланта", country: "US", feedsInto: "M92" },
  { id: "M81", stage: "r32", dateLocal: "2026-07-01T20:00:00-07:00", homeRef: "1D", awayRef: "BEST3-BEFIJ", venueRu: "Левис Стэдиум", cityRu: "Санта-Клара", country: "US", feedsInto: "M94" },
  { id: "M82", stage: "r32", dateLocal: "2026-07-01T16:00:00-07:00", homeRef: "1G", awayRef: "BEST3-AEHIJ", venueRu: "Люмен Филд", cityRu: "Сиэтл", country: "US", feedsInto: "M94" },
  { id: "M83", stage: "r32", dateLocal: "2026-07-02T19:00:00-04:00", homeRef: "2K", awayRef: "2L", venueRu: "БМО Филд", cityRu: "Торонто", country: "CA", feedsInto: "M93" },
  { id: "M84", stage: "r32", dateLocal: "2026-07-02T15:00:00-07:00", homeRef: "1H", awayRef: "2J", venueRu: "СоФай Стэдиум", cityRu: "Лос-Анджелес", country: "US", feedsInto: "M93" },
  { id: "M85", stage: "r32", dateLocal: "2026-07-02T23:00:00-07:00", homeRef: "1B", awayRef: "BEST3-EFGIJ", venueRu: "БиСи Плейс", cityRu: "Ванкувер", country: "CA", feedsInto: "M96" },
  { id: "M86", stage: "r32", dateLocal: "2026-07-03T18:00:00-04:00", homeRef: "1J", awayRef: "2H", venueRu: "Хард Рок Стэдиум", cityRu: "Майами", country: "US", feedsInto: "M95" },
  { id: "M87", stage: "r32", dateLocal: "2026-07-03T21:30:00-05:00", homeRef: "1K", awayRef: "BEST3-DEIJL", venueRu: "Арроухед Стэдиум", cityRu: "Канзас-Сити", country: "US", feedsInto: "M96" },
  { id: "M88", stage: "r32", dateLocal: "2026-07-03T14:00:00-05:00", homeRef: "2D", awayRef: "2G", venueRu: "АТ&Т Стэдиум", cityRu: "Даллас", country: "US", feedsInto: "M95" },

  // ─── 1/8 финала (Round of 16) ───
  { id: "M89", stage: "r16", dateLocal: "2026-07-04T17:00:00-04:00", homeRef: "W M74", awayRef: "W M77", venueRu: "Линкольн Файненшл Филд", cityRu: "Филадельфия", country: "US", feedsInto: "M97" },
  { id: "M90", stage: "r16", dateLocal: "2026-07-04T13:00:00-05:00", homeRef: "W M73", awayRef: "W M75", venueRu: "НРГ Стэдиум", cityRu: "Хьюстон", country: "US", feedsInto: "M97" },
  { id: "M91", stage: "r16", dateLocal: "2026-07-05T16:00:00-04:00", homeRef: "W M76", awayRef: "W M78", venueRu: "МетЛайф Стэдиум", cityRu: "Нью-Йорк/Нью-Джерси", country: "US", feedsInto: "M99" },
  { id: "M92", stage: "r16", dateLocal: "2026-07-05T20:00:00-06:00", homeRef: "W M79", awayRef: "W M80", venueRu: "Эстадио Ацтека", cityRu: "Мехико", country: "MX", feedsInto: "M99" },
  { id: "M93", stage: "r16", dateLocal: "2026-07-06T15:00:00-05:00", homeRef: "W M83", awayRef: "W M84", venueRu: "АТ&Т Стэдиум", cityRu: "Даллас", country: "US", feedsInto: "M98" },
  { id: "M94", stage: "r16", dateLocal: "2026-07-06T20:00:00-07:00", homeRef: "W M81", awayRef: "W M82", venueRu: "Люмен Филд", cityRu: "Сиэтл", country: "US", feedsInto: "M98" },
  { id: "M95", stage: "r16", dateLocal: "2026-07-07T12:00:00-04:00", homeRef: "W M86", awayRef: "W M88", venueRu: "Мерседес-Бенц Стэдиум", cityRu: "Атланта", country: "US", feedsInto: "M100" },
  { id: "M96", stage: "r16", dateLocal: "2026-07-07T16:00:00-07:00", homeRef: "W M85", awayRef: "W M87", venueRu: "БиСи Плейс", cityRu: "Ванкувер", country: "CA", feedsInto: "M100" },

  // ─── 1/4 финала ───
  { id: "M97", stage: "qf", dateLocal: "2026-07-09T16:00:00-04:00", homeRef: "W M89", awayRef: "W M90", venueRu: "Жиллет Стэдиум", cityRu: "Бостон", country: "US", feedsInto: "M101" },
  { id: "M98", stage: "qf", dateLocal: "2026-07-10T15:00:00-07:00", homeRef: "W M93", awayRef: "W M94", venueRu: "СоФай Стэдиум", cityRu: "Лос-Анджелес", country: "US", feedsInto: "M101" },
  { id: "M99", stage: "qf", dateLocal: "2026-07-11T17:00:00-04:00", homeRef: "W M91", awayRef: "W M92", venueRu: "Хард Рок Стэдиум", cityRu: "Майами", country: "US", feedsInto: "M102" },
  { id: "M100", stage: "qf", dateLocal: "2026-07-11T21:00:00-05:00", homeRef: "W M95", awayRef: "W M96", venueRu: "Арроухед Стэдиум", cityRu: "Канзас-Сити", country: "US", feedsInto: "M102" },

  // ─── 1/2 финала ───
  { id: "M101", stage: "sf", dateLocal: "2026-07-14T15:00:00-05:00", homeRef: "W M97", awayRef: "W M98", venueRu: "АТ&Т Стэдиум", cityRu: "Даллас", country: "US", feedsInto: "M104" },
  { id: "M102", stage: "sf", dateLocal: "2026-07-15T15:00:00-04:00", homeRef: "W M99", awayRef: "W M100", venueRu: "Мерседес-Бенц Стэдиум", cityRu: "Атланта", country: "US", feedsInto: "M104" },

  // ─── Матч за 3-е место + Финал ───
  { id: "M103", stage: "third", dateLocal: "2026-07-18T17:00:00-04:00", homeRef: "L M101", awayRef: "L M102", venueRu: "Хард Рок Стэдиум", cityRu: "Майами", country: "US" },
  { id: "M104", stage: "final", dateLocal: "2026-07-19T15:00:00-04:00", homeRef: "W M101", awayRef: "W M102", venueRu: "МетЛайф Стэдиум", cityRu: "Нью-Йорк/Нью-Джерси", country: "US" },
];

// Накладываем live-данные (тайминг + счёт) из JSON. GitHub Action раз
// в 15 минут пишет туда правду от football-data.org; Cloudflare пересобирает.
export const WC_MATCHES: WCMatch[] = WC_MATCHES_RAW.map((m) => {
  const live = LIVE_SCORES[m.id];
  if (!live) return m;
  const next: WCMatch = { ...m };
  if (live.utcDate) next.dateLocal = live.utcDate;
  if (typeof live.home === "number" && typeof live.away === "number") {
    next.score = { home: live.home, away: live.away, status: live.status };
  }
  return next;
});

// ─── Узбекистан-фокус ────────────────────────────────────────────────────

export const WC_HEAD_COACH = {
  nameRu: "Фабио Каннаваро",
  nameEn: "Fabio Cannavaro",
  appointed: "2025-10-06",
  note: "Чемпион мира 2006 в составе сборной Италии, обладатель «Золотого мяча».",
};

export const WC_QUALIFICATION = {
  whenIso: "2025-06-05",
  where: "Абу-Даби, ОАЭ",
  match: "ОАЭ — Узбекистан, 0:0 — путёвка по итогам группы A отборочного турнира АФК",
  primarySourceUrl:
    "https://www.the-afc.com/en/national/world_cup_qual/2026/news/uzbekistan-jordan-qualify-world-cup-first-time",
  note: "Узбекистан впервые в истории квалифицировался на чемпионат мира.",
};

export const WC_BASE_CAMP = {
  cityRu: "Мариетта (штат Джорджия)",
  facility: "Тренировочный центр Atlanta United",
  note: "Матч с ДР Конго 27 июня — тут же в Атланте, на «Мерседес-Бенц Стэдиум».",
};

export const WC_GROUP_K_PREVIEW = `Узбекистан попал в группу K вместе с Португалией, Колумбией и ДР Конго. Португалия и Колумбия — фавориты, однако новый формат на 48 команд (с выходом восьми лучших третьих мест) оставляет реальный шанс продолжить турнир. Матч с Конго 27 июня в Атланте — наиболее вероятный шанс на очки или победу.`;

export type WCMatchPreview = {
  matchId: string;
  text: string;
};

export const WC_UZ_MATCH_PREVIEWS: WCMatchPreview[] = [
  {
    matchId: "M24",
    text: "Дебютный матч на ЧМ. У Колумбии (13-е место в рейтинге ФИФА) — Хамес Родригес и Луис Диас. Каннаваро сделает ставку на компактную оборону и быстрые контратаки. Высота Мехико (2240 м над уровнем моря) — отдельный фактор: тренерский штаб специально не приехал заранее для акклиматизации.",
  },
  {
    matchId: "M45",
    text: "Португалия — один из главных претендентов на трофей, в составе Роналду, Бруно Фернандеш и Рафаэль Леан. Для Узбекистана это самый сложный матч группы, расчёт — максимально плотная оборонительная организация.",
  },
  {
    matchId: "M70",
    text: "Ключевой матч за плей-офф. ДР Конго пробилась через межконтинентальный плей-офф, в составе Йоан Висса и Аксель Туанзебе из АПЛ. База сборной всё время турнира — в Мариетте, поэтому игра в Атланте по факту почти домашняя.",
  },
];

export type WCSquadPlayer = {
  nameRu: string;
  position: "вратарь" | "защитник" | "полузащитник" | "нападающий";
  clubRu: string;
  clubCountry: string; // ISO-3166-1 alpha-3 страны клуба
};

export const WC_SQUAD: WCSquadPlayer[] = [
  // Вратари
  { nameRu: "Уткир Юсупов", position: "вратарь", clubRu: "Навбахор", clubCountry: "UZB" },
  { nameRu: "Абдувохид Нематов", position: "вратарь", clubRu: "Насаф", clubCountry: "UZB" },
  { nameRu: "Ботирали Эргашев", position: "вратарь", clubRu: "Нефтчи", clubCountry: "UZB" },

  // Защитники
  { nameRu: "Абдукодир Хусанов", position: "защитник", clubRu: "Манчестер Сити", clubCountry: "ENG" },
  { nameRu: "Рустамжон Ашурматов", position: "защитник", clubRu: "Эстегляль", clubCountry: "IRN" },
  { nameRu: "Умрбек Эшмуродов", position: "защитник", clubRu: "Насаф", clubCountry: "UZB" },
  { nameRu: "Авазбек Улмасалиев", position: "защитник", clubRu: "АГМК", clubCountry: "UZB" },
  { nameRu: "Жахонгир Урозов", position: "защитник", clubRu: "Динамо Самарканд", clubCountry: "UZB" },
  { nameRu: "Хожиакбар Алижонов", position: "защитник", clubRu: "Пахтакор", clubCountry: "UZB" },
  { nameRu: "Шерзод Насруллаев", position: "защитник", clubRu: "Насаф", clubCountry: "UZB" },
  { nameRu: "Абдулла Абдуллаев", position: "защитник", clubRu: "Дибба", clubCountry: "UAE" },
  { nameRu: "Фаррух Сайфиев", position: "защитник", clubRu: "Нефтчи", clubCountry: "UZB" },
  { nameRu: "Бехруз Каримов", position: "защитник", clubRu: "Сурхон", clubCountry: "UZB" },

  // Полузащитники
  { nameRu: "Аббосбек Файзуллаев", position: "полузащитник", clubRu: "Истанбул Башакшехир", clubCountry: "TUR" },
  { nameRu: "Отабек Шукуров", position: "полузащитник", clubRu: "Банияс", clubCountry: "UAE" },
  { nameRu: "Жалолиддин Машарипов", position: "полузащитник", clubRu: "Эстегляль", clubCountry: "IRN" },
  { nameRu: "Одилжон Хамробеков", position: "полузащитник", clubRu: "Трактор", clubCountry: "IRN" },
  { nameRu: "Остон Урунов", position: "полузащитник", clubRu: "Персеполис", clubCountry: "IRN" },
  { nameRu: "Акмал Мозговой", position: "полузащитник", clubRu: "Пахтакор", clubCountry: "UZB" },
  { nameRu: "Жамшид Искандеров", position: "полузащитник", clubRu: "Нефтчи", clubCountry: "UZB" },
  { nameRu: "Достонбек Хамдамов", position: "полузащитник", clubRu: "Пахтакор", clubCountry: "UZB" },
  { nameRu: "Азизжон Ганиев", position: "полузащитник", clubRu: "Аль-Батаа", clubCountry: "UAE" },
  { nameRu: "Шерзод Эсанов", position: "полузащитник", clubRu: "Бухара", clubCountry: "UZB" },

  // Нападающие
  { nameRu: "Элдор Шомуродов", position: "нападающий", clubRu: "Истанбул Башакшехир (аренда из «Ромы»)", clubCountry: "TUR" },
  { nameRu: "Игорь Сергеев", position: "нападающий", clubRu: "Персеполис", clubCountry: "IRN" },
  { nameRu: "Азизбек Амонов", position: "нападающий", clubRu: "Бухара", clubCountry: "UZB" },
];

export const WC_SQUAD_ANNOUNCED_ISO = "2026-06-02";
export const WC_SQUAD_SOURCE_URL =
  "https://www.beinsports.com/en-us/soccer/fifa-world-cup-2026/articles/fabio-cannavaro-s-official-squad-for-uzbekistan-at-the-2026-fifa-world-cup-2026-06-02";

// ─── Регламент ───────────────────────────────────────────────────────────

export const WC_TIEBREAKERS = [
  "Очки во всех матчах группы",
  "Разница мячей во всех матчах группы",
  "Количество забитых мячей во всех матчах группы",
  "Очки в личных встречах между командами с равными показателями",
  "Разница мячей в личных встречах между командами с равными показателями",
  "Количество забитых мячей в личных встречах",
  "Оценка fair-play (по жёлтым и красным карточкам)",
  "Положение в рейтинге ФИФА на 10 июня 2026 года",
];

export const WC_TIEBREAKERS_BEST_THIRDS = [
  "Очки во всех матчах группы",
  "Разница мячей во всех матчах группы",
  "Количество забитых мячей",
  "Оценка fair-play",
  "Положение в рейтинге ФИФА на 10 июня 2026 года",
];

export const WC_BEST_THIRDS_RULES = [
  "Из 12 групп в плей-офф проходят 8 лучших третьих мест.",
  "Сравнение между группами — по критериям выше, строго по порядку.",
  "Конкретный слот плей-офф (на чью половину сетки попадает «третий») зависит от того, из каких именно групп вышли восемь лучших третьих мест. У ФИФА для этого опубликована отдельная таблица соответствий — она будет применена сразу после окончания группового этапа.",
];

export const WC_FAIR_PLAY = {
  yellow: -1,
  indirectRed: -3, // вторая жёлтая
  directRed: -4,
  yellowThenRed: -5,
};

export const WC_FORMAT_SUMMARY = [
  "48 команд, 12 групп по 4. Каждая команда играет в группе 3 матча.",
  "В плей-офф проходят по две лучшие команды из каждой группы плюс восемь лучших третьих мест по сумме всех групп.",
  "Раунд 1/16 финала (Round of 32) — новый для ЧМ: до этого минимальной стадией плей-офф была 1/8.",
  "Всего 104 матча за 39 дней (11 июня — 19 июля 2026) в 16 городах США, Канады и Мексики.",
  "Финал — 19 июля на стадионе «МетЛайф» в Нью-Йорке/Нью-Джерси, вместимость 82 500.",
];

// ─── Helpers ──────────────────────────────────────────────────────────────

export function getGroupTeams(g: WCGroupId): WCTeam[] {
  return WC_TEAMS.filter((t) => t.group === g);
}

export function getTeamByFifa(code: string): WCTeam | undefined {
  return WC_TEAMS.find((t) => t.fifa === code);
}

export function getUzMatches(): WCMatch[] {
  return WC_MATCHES.filter((m) => m.homeRef === "UZB" || m.awayRef === "UZB");
}

export function getMatchPreview(matchId: string): string | undefined {
  return WC_UZ_MATCH_PREVIEWS.find((p) => p.matchId === matchId)?.text;
}

export function flagUrl(code: string, size: 40 | 80 | 160 = 80): string {
  if (!code || code === "_tbd") return "";
  return `https://flagcdn.com/w${size}/${code}.png`;
}

// ─── Турнирные таблицы ──────────────────────────────────────────────────

export type Standing = {
  team: WCTeam;
  p: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  pts: number;
  fairPlay: number;
};

export function emptyStanding(team: WCTeam): Standing {
  return { team, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, fairPlay: 0 };
}

// Критерии ФИФА: очки → разница мячей → забитые → fair-play → рейтинг ФИФА.
export function compareStandings(a: Standing, b: Standing): number {
  if (b.pts !== a.pts) return b.pts - a.pts;
  const gdA = a.gf - a.ga;
  const gdB = b.gf - b.ga;
  if (gdB !== gdA) return gdB - gdA;
  if (b.gf !== a.gf) return b.gf - a.gf;
  if (b.fairPlay !== a.fairPlay) return b.fairPlay - a.fairPlay;
  return (a.team.fifaRank ?? 999) - (b.team.fifaRank ?? 999);
}

// Считаем строки группы по сыгранным (finished) матчам.
// Live-матчи не учитываются — счёт ещё может меняться.
export function buildGroupStandings(g: WCGroupId): Standing[] {
  const teams = getGroupTeams(g);
  const byFifa = new Map<string, Standing>();
  for (const t of teams) byFifa.set(t.fifa, emptyStanding(t));

  for (const m of WC_MATCHES) {
    if (m.stage !== "group" || m.group !== g) continue;
    if (m.score?.status !== "finished") continue;
    const home = byFifa.get(m.homeRef);
    const away = byFifa.get(m.awayRef);
    if (!home || !away) continue;

    const hg = m.score.home;
    const ag = m.score.away;
    home.p++;
    away.p++;
    home.gf += hg;
    home.ga += ag;
    away.gf += ag;
    away.ga += hg;
    if (hg > ag) {
      home.w++;
      home.pts += 3;
      away.l++;
    } else if (hg < ag) {
      away.w++;
      away.pts += 3;
      home.l++;
    } else {
      home.d++;
      home.pts += 1;
      away.d++;
      away.pts += 1;
    }
  }

  return [...byFifa.values()].sort(compareStandings);
}

// Статус матча по текущему моменту:
// — score.status === "finished" → finished (счёт фиксируем)
// — score.status === "live"     → live + расчётная минута
// — score без status             → finished (легаси)
// — score нет, kickoff в будущем → scheduled
// — score нет, kickoff в прошлом → live (расчётная минута, ждём API)
// На статике "сейчас" фиксируется временем последнего ребилда.
export function getMatchStatus(
  m: WCMatch,
  now: number = Date.now(),
): { status: WCMatchStatus; minute?: number } {
  const start = new Date(m.dateLocal).getTime();
  if (m.score) {
    if (m.score.status === "live") {
      const minute = Math.max(1, Math.min(120, Math.floor((now - start) / 60000)));
      return { status: "live", minute };
    }
    return { status: "finished" };
  }
  if (now < start) return { status: "scheduled" };
  const minute = Math.max(1, Math.min(120, Math.floor((now - start) / 60000)));
  return { status: "live", minute };
}

// Только время по Ташкенту: «09:00». Для статус-пилюль матч-центра.
export function timeTashkent(dateLocal: string): string {
  return new Date(dateLocal).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tashkent",
  });
}

// Старт матча по Ташкенту: «18 июня, 09:00». Считается от dateLocal —
// единственного источника истины. Не доверять рукописным строкам в данных:
// Уз = UTC+5, локальные стадионы — от UTC-7 (PT) до UTC-4 (ET).
export function kickoffTashkent(dateLocal: string): string {
  const d = new Date(dateLocal);
  const day = d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    timeZone: "Asia/Tashkent",
  });
  const time = d.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tashkent",
  });
  return `${day}, ${time}`;
}

// Расшифровка реф-слота в плей-офф. Возвращает короткий лейбл и при возможности команду.
export function readableRef(ref: string): {
  short: string;
  long: string;
  team?: WCTeam;
} {
  const team = getTeamByFifa(ref);
  if (team) return { short: team.fifa, long: team.name, team };

  const groupSlot = ref.match(/^([12])([A-L])$/);
  if (groupSlot) {
    const place = groupSlot[1] === "1" ? "Победитель" : "Второе место";
    return {
      short: ref,
      long: `${place} группы ${groupSlot[2]}`,
    };
  }

  const best3 = ref.match(/^BEST3-([A-L]+)$/);
  if (best3) {
    const groups = best3[1].split("").join("/");
    return {
      short: `3-е ${best3[1]}`,
      long: `Лучшее 3-е место — одна из групп ${groups}`,
    };
  }

  const win = ref.match(/^W (M\d+)$/);
  if (win) return { short: `Поб. ${win[1]}`, long: `Победитель матча ${win[1]}` };

  const lose = ref.match(/^L (M\d+)$/);
  if (lose) return { short: `Проигр. ${lose[1]}`, long: `Проигравший матча ${lose[1]}` };

  return { short: ref, long: ref };
}
