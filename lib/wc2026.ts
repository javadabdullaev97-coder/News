// Данные ЧМ-2026. Гипотетические группы — реальный жребий проходил в декабре 2025,
// здесь редакторская версия с верными квалифицированными сборными и реалистичным
// распределением по корзинам. Когда состав групп будет официально известен —
// правится один файл и весь раздел /wc2026 подтягивается автоматически.

export type WCTeam = {
  name: string;
  code: string; // ISO-3166-1 alpha-2 для флага flagcdn.com
  fifa: string; // 3-буквенный код ФИФА для коротких отображений
  group: WCGroupId;
  pot: 1 | 2 | 3 | 4;
  isUz?: boolean;
};

export type WCGroupId =
  | "A" | "B" | "C" | "D" | "E" | "F"
  | "G" | "H" | "I" | "J" | "K" | "L";

export const WC_GROUP_IDS: WCGroupId[] = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L",
];

// 48 команд. Хосты — Мексика (A), Канада (B), США (D).
// Узбекистан — группа H с Бразилией, Марокко и Камеруном.
export const WC_TEAMS: WCTeam[] = [
  // Group A
  { name: "Мексика", code: "mx", fifa: "MEX", group: "A", pot: 1 },
  { name: "Хорватия", code: "hr", fifa: "CRO", group: "A", pot: 2 },
  { name: "Австрия", code: "at", fifa: "AUT", group: "A", pot: 3 },
  { name: "Коста-Рика", code: "cr", fifa: "CRC", group: "A", pot: 4 },

  // Group B
  { name: "Канада", code: "ca", fifa: "CAN", group: "B", pot: 1 },
  { name: "Швейцария", code: "ch", fifa: "SUI", group: "B", pot: 2 },
  { name: "Дания", code: "dk", fifa: "DEN", group: "B", pot: 3 },
  { name: "Новая Зеландия", code: "nz", fifa: "NZL", group: "B", pot: 4 },

  // Group C
  { name: "Аргентина", code: "ar", fifa: "ARG", group: "C", pot: 1 },
  { name: "Южная Корея", code: "kr", fifa: "KOR", group: "C", pot: 2 },
  { name: "Польша", code: "pl", fifa: "POL", group: "C", pot: 3 },
  { name: "Иордания", code: "jo", fifa: "JOR", group: "C", pot: 4 },

  // Group D
  { name: "США", code: "us", fifa: "USA", group: "D", pot: 1 },
  { name: "Япония", code: "jp", fifa: "JPN", group: "D", pot: 2 },
  { name: "Сербия", code: "rs", fifa: "SRB", group: "D", pot: 3 },
  { name: "Ямайка", code: "jm", fifa: "JAM", group: "D", pot: 4 },

  // Group E
  { name: "Франция", code: "fr", fifa: "FRA", group: "E", pot: 1 },
  { name: "Иран", code: "ir", fifa: "IRN", group: "E", pot: 2 },
  { name: "Норвегия", code: "no", fifa: "NOR", group: "E", pot: 3 },
  { name: "Гана", code: "gh", fifa: "GHA", group: "E", pot: 4 },

  // Group F
  { name: "Испания", code: "es", fifa: "ESP", group: "F", pot: 1 },
  { name: "Уругвай", code: "uy", fifa: "URU", group: "F", pot: 2 },
  { name: "Турция", code: "tr", fifa: "TUR", group: "F", pot: 3 },
  { name: "Панама", code: "pa", fifa: "PAN", group: "F", pot: 4 },

  // Group G
  { name: "Англия", code: "gb-eng", fifa: "ENG", group: "G", pot: 1 },
  { name: "Колумбия", code: "co", fifa: "COL", group: "G", pot: 2 },
  { name: "Нигерия", code: "ng", fifa: "NGA", group: "G", pot: 3 },
  { name: "Саудовская Аравия", code: "sa", fifa: "KSA", group: "G", pot: 4 },

  // Group H — Узбекистан
  { name: "Бразилия", code: "br", fifa: "BRA", group: "H", pot: 1 },
  { name: "Марокко", code: "ma", fifa: "MAR", group: "H", pot: 2 },
  { name: "Камерун", code: "cm", fifa: "CMR", group: "H", pot: 3 },
  { name: "Узбекистан", code: "uz", fifa: "UZB", group: "H", pot: 4, isUz: true },

  // Group I
  { name: "Португалия", code: "pt", fifa: "POR", group: "I", pot: 1 },
  { name: "Сенегал", code: "sn", fifa: "SEN", group: "I", pot: 2 },
  { name: "Кот-д’Ивуар", code: "ci", fifa: "CIV", group: "I", pot: 3 },
  { name: "Алжир", code: "dz", fifa: "ALG", group: "I", pot: 4 },

  // Group J
  { name: "Нидерланды", code: "nl", fifa: "NED", group: "J", pot: 1 },
  { name: "Эквадор", code: "ec", fifa: "ECU", group: "J", pot: 2 },
  { name: "Тунис", code: "tn", fifa: "TUN", group: "J", pot: 3 },
  { name: "Ирак", code: "iq", fifa: "IRQ", group: "J", pot: 4 },

  // Group K
  { name: "Бельгия", code: "be", fifa: "BEL", group: "K", pot: 1 },
  { name: "Австралия", code: "au", fifa: "AUS", group: "K", pot: 2 },
  { name: "Египет", code: "eg", fifa: "EGY", group: "K", pot: 3 },
  { name: "Победитель плей-офф 1", code: "_tbd", fifa: "TBD", group: "K", pot: 4 },

  // Group L
  { name: "Германия", code: "de", fifa: "GER", group: "L", pot: 1 },
  { name: "Италия", code: "it", fifa: "ITA", group: "L", pot: 2 },
  { name: "Парагвай", code: "py", fifa: "PAR", group: "L", pot: 3 },
  { name: "Победитель плей-офф 2", code: "_tbd", fifa: "TBD", group: "L", pot: 4 },
];

export type WCMatch = {
  id: string;
  date: string; // ISO
  stage: "group" | "r32" | "r16" | "qf" | "sf" | "third" | "final";
  group?: WCGroupId;
  homeFifa: string; // FIFA code or slot like "1A" / "BEST3-1"
  awayFifa: string;
  venue: string;
  score?: { home: number; away: number; status: "ft" | "ht" | "live" };
};

// Расписание — Узбекистан и часть знаковых матчей. Полные 104 матча тащить не нужно,
// показываем дни, в которые есть всё, что нам интересно.
export const WC_MATCHES: WCMatch[] = [
  // Открытие — Мексика играет первой
  { id: "m1", date: "2026-06-11T20:00:00-05:00", stage: "group", group: "A", homeFifa: "MEX", awayFifa: "CRO", venue: "Эстадио Ацтека, Мехико" },
  // США — стартовый матч хозяев
  { id: "m4", date: "2026-06-12T20:00:00-04:00", stage: "group", group: "D", homeFifa: "USA", awayFifa: "JPN", venue: "СоФай Стэдиум, Лос-Анджелес" },
  // Канада старт
  { id: "m6", date: "2026-06-12T19:00:00-04:00", stage: "group", group: "B", homeFifa: "CAN", awayFifa: "SUI", venue: "БМО Филд, Торонто" },

  // Узбекистан — все три матча группы H
  {
    id: "uz-1",
    date: "2026-06-14T19:00:00-04:00",
    stage: "group",
    group: "H",
    homeFifa: "BRA",
    awayFifa: "UZB",
    venue: "МетЛайф Стэдиум, Нью-Йорк/Нью-Джерси",
  },
  {
    id: "uz-2",
    date: "2026-06-19T16:00:00-05:00",
    stage: "group",
    group: "H",
    homeFifa: "UZB",
    awayFifa: "CMR",
    venue: "Аррохэд Стэдиум, Канзас-Сити",
  },
  {
    id: "uz-3",
    date: "2026-06-24T18:00:00-05:00",
    stage: "group",
    group: "H",
    homeFifa: "UZB",
    awayFifa: "MAR",
    venue: "АТ&Т Стэдиум, Даллас",
  },

  // Бразилия — Марокко и Камерун — Марокко в группе H
  {
    id: "m-h-2",
    date: "2026-06-14T22:00:00-05:00",
    stage: "group",
    group: "H",
    homeFifa: "MAR",
    awayFifa: "CMR",
    venue: "Левис Стэдиум, Сан-Франциско",
  },
  {
    id: "m-h-5",
    date: "2026-06-19T20:00:00-04:00",
    stage: "group",
    group: "H",
    homeFifa: "BRA",
    awayFifa: "MAR",
    venue: "Линкольн Файнэншл Филд, Филадельфия",
  },
  {
    id: "m-h-6",
    date: "2026-06-24T18:00:00-04:00",
    stage: "group",
    group: "H",
    homeFifa: "BRA",
    awayFifa: "CMR",
    venue: "Хард-Рок Стэдиум, Майами",
  },

  // Несколько знаковых матчей других групп
  { id: "m-c", date: "2026-06-13T21:00:00-04:00", stage: "group", group: "C", homeFifa: "ARG", awayFifa: "KOR", venue: "Жиллет Стэдиум, Бостон" },
  { id: "m-e", date: "2026-06-13T15:00:00-05:00", stage: "group", group: "E", homeFifa: "FRA", awayFifa: "IRN", venue: "Эстадио Монтеррей, Монтеррей" },
  { id: "m-g", date: "2026-06-14T15:00:00-05:00", stage: "group", group: "G", homeFifa: "ENG", awayFifa: "COL", venue: "Артур Эш / NRG Стэдиум, Хьюстон" },
  { id: "m-l", date: "2026-06-15T18:00:00-04:00", stage: "group", group: "L", homeFifa: "GER", awayFifa: "ITA", venue: "Мерседес-Бенц Стэдиум, Атланта" },
];

// Описание плей-офф сетки для формата 48 команд: 16 команд из первых мест,
// 16 — со вторых, 8 лучших третьих мест. Все 32 в раунде на вылет.
// Пары R32 — стандартная схема FIFA (упрощённо).
export type BracketSlot = string; // "1A", "2B", "3A/B/D/E", "W1", "W2"...

export type BracketMatch = {
  id: string; // R32-1, R16-1, QF-1, ...
  round: "r32" | "r16" | "qf" | "sf" | "third" | "final";
  home: BracketSlot;
  away: BracketSlot;
  feedsInto?: string; // id следующего матча
  date?: string; // ISO
};

export const WC_BRACKET: BracketMatch[] = [
  // R32 — пары распределены по сетке FIFA для 48-команд формата
  { id: "R32-1", round: "r32", home: "1A", away: "2B", feedsInto: "R16-1", date: "2026-06-28" },
  { id: "R32-2", round: "r32", home: "1C", away: "BEST3-1", feedsInto: "R16-2", date: "2026-06-28" },
  { id: "R32-3", round: "r32", home: "1E", away: "2F", feedsInto: "R16-3", date: "2026-06-29" },
  { id: "R32-4", round: "r32", home: "1G", away: "BEST3-2", feedsInto: "R16-4", date: "2026-06-29" },
  { id: "R32-5", round: "r32", home: "1B", away: "BEST3-3", feedsInto: "R16-5", date: "2026-06-30" },
  { id: "R32-6", round: "r32", home: "1D", away: "2A", feedsInto: "R16-6", date: "2026-06-30" },
  { id: "R32-7", round: "r32", home: "1F", away: "BEST3-4", feedsInto: "R16-7", date: "2026-07-01" },
  { id: "R32-8", round: "r32", home: "1H", away: "2G", feedsInto: "R16-8", date: "2026-07-01" },
  { id: "R32-9", round: "r32", home: "1I", away: "2J", feedsInto: "R16-9", date: "2026-07-02" },
  { id: "R32-10", round: "r32", home: "1K", away: "BEST3-5", feedsInto: "R16-10", date: "2026-07-02" },
  { id: "R32-11", round: "r32", home: "1J", away: "2I", feedsInto: "R16-11", date: "2026-07-03" },
  { id: "R32-12", round: "r32", home: "1L", away: "BEST3-6", feedsInto: "R16-12", date: "2026-07-03" },
  { id: "R32-13", round: "r32", home: "2C", away: "2E", feedsInto: "R16-13", date: "2026-06-28" },
  { id: "R32-14", round: "r32", home: "2D", away: "BEST3-7", feedsInto: "R16-14", date: "2026-06-29" },
  { id: "R32-15", round: "r32", home: "2H", away: "2K", feedsInto: "R16-15", date: "2026-07-01" },
  { id: "R32-16", round: "r32", home: "2L", away: "BEST3-8", feedsInto: "R16-16", date: "2026-07-02" },

  // R16
  { id: "R16-1", round: "r16", home: "W R32-1", away: "W R32-2", feedsInto: "QF-1", date: "2026-07-04" },
  { id: "R16-2", round: "r16", home: "W R32-3", away: "W R32-4", feedsInto: "QF-1", date: "2026-07-04" },
  { id: "R16-3", round: "r16", home: "W R32-5", away: "W R32-6", feedsInto: "QF-2", date: "2026-07-05" },
  { id: "R16-4", round: "r16", home: "W R32-7", away: "W R32-8", feedsInto: "QF-2", date: "2026-07-05" },
  { id: "R16-5", round: "r16", home: "W R32-9", away: "W R32-10", feedsInto: "QF-3", date: "2026-07-06" },
  { id: "R16-6", round: "r16", home: "W R32-11", away: "W R32-12", feedsInto: "QF-3", date: "2026-07-06" },
  { id: "R16-7", round: "r16", home: "W R32-13", away: "W R32-14", feedsInto: "QF-4", date: "2026-07-07" },
  { id: "R16-8", round: "r16", home: "W R32-15", away: "W R32-16", feedsInto: "QF-4", date: "2026-07-07" },

  // QF
  { id: "QF-1", round: "qf", home: "W R16-1", away: "W R16-2", feedsInto: "SF-1", date: "2026-07-09" },
  { id: "QF-2", round: "qf", home: "W R16-3", away: "W R16-4", feedsInto: "SF-1", date: "2026-07-10" },
  { id: "QF-3", round: "qf", home: "W R16-5", away: "W R16-6", feedsInto: "SF-2", date: "2026-07-11" },
  { id: "QF-4", round: "qf", home: "W R16-7", away: "W R16-8", feedsInto: "SF-2", date: "2026-07-11" },

  // SF
  { id: "SF-1", round: "sf", home: "W QF-1", away: "W QF-2", feedsInto: "FINAL", date: "2026-07-14" },
  { id: "SF-2", round: "sf", home: "W QF-3", away: "W QF-4", feedsInto: "FINAL", date: "2026-07-15" },

  // Матч за 3-е место и финал
  { id: "THIRD", round: "third", home: "L SF-1", away: "L SF-2", date: "2026-07-18" },
  { id: "FINAL", round: "final", home: "W SF-1", away: "W SF-2", date: "2026-07-19" },
];

export const WC_TIEBREAKERS = [
  "Очки во всех матчах группы",
  "Разница забитых и пропущенных мячей во всех матчах группы",
  "Забитые мячи во всех матчах группы",
  "Очки в личных встречах между командами с равными показателями",
  "Разница мячей в личных встречах между командами с равными показателями",
  "Забитые мячи в личных встречах между командами с равными показателями",
  "Очки fair-play (по жёлтым/красным карточкам)",
  "Жребий, проводимый ФИФА",
];

export const WC_BEST_THIRDS_RULES = [
  "Из 12 групп в плей-офф проходят 8 лучших третьих мест.",
  "Сравнение по тем же тай-брейкерам: очки → разница мячей → забитые → fair-play → жребий.",
  "Конкретный слот плей-офф (на чью половину сетки попадёт «третий») зависит от того, из каких групп вышли восемь лучших третьих мест — для этого у ФИФА есть таблица соответствий.",
];

export function getGroupTeams(g: WCGroupId): WCTeam[] {
  return WC_TEAMS.filter((t) => t.group === g);
}

export function getTeamByFifa(code: string): WCTeam | undefined {
  return WC_TEAMS.find((t) => t.fifa === code);
}

export function getUzMatches(): WCMatch[] {
  return WC_MATCHES.filter((m) => m.homeFifa === "UZB" || m.awayFifa === "UZB");
}

export function flagUrl(code: string, size: 40 | 80 | 160 = 80): string {
  if (code === "_tbd") return "";
  return `https://flagcdn.com/w${size}/${code}.png`;
}
