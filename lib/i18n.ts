import type { Lang } from "./types";

/**
 * Интерфейс сайта на трёх языках.
 *
 * Строк намеренно немного: локализуется обвязка — навигация, названия
 * секций, подписи виджетов, — а не контент. Контент переводит редакция
 * (см. .claude/agents/translator.md), и его переводы лежат отдельными
 * MDX-файлами рядом с оригиналом.
 *
 * Русский — источник истины. Если строки нет в uz/en, показывается
 * русская: пустое место в интерфейсе хуже непереведённого слова.
 */

type Dict = {
  // навигация
  all: string;
  saved: string;
  search: string;
  // секции главной
  feed: string;
  main: string;
  more: string;
  seeAll: string;
  // статья
  readFull: string;
  sources: string;
  related: string;
  popular: string;
  share: string;
  save: string;
  updated: string;
  // виджеты
  weather: string;
  rates: string;
  // служебное
  notFound: string;
  notFoundHint: string;
  toHome: string;
  langNote: string;
};

const ru: Dict = {
  all: "Все новости",
  saved: "Сохранённое",
  search: "Поиск",
  feed: "Лента",
  main: "Главное",
  more: "Ещё",
  seeAll: "все",
  readFull: "Читать полностью",
  sources: "Источники",
  related: "По теме",
  popular: "Популярное",
  share: "Поделиться",
  save: "Сохранить",
  updated: "Обновлено",
  weather: "Ташкент",
  rates: "Курсы валют",
  notFound: "Страница не найдена",
  notFoundHint: "Материал мог быть снят или переехал на другой адрес.",
  toHome: "На главную",
  langNote: "Перевод материала редакции LEAP News",
};

const uz: Dict = {
  all: "Barcha yangiliklar",
  saved: "Saqlanganlar",
  search: "Qidiruv",
  feed: "Lenta",
  main: "Asosiy",
  more: "Yana",
  seeAll: "barchasi",
  readFull: "To'liq o'qish",
  sources: "Manbalar",
  related: "Mavzu bo'yicha",
  popular: "Ommabop",
  share: "Ulashish",
  save: "Saqlash",
  updated: "Yangilandi",
  weather: "Toshkent",
  rates: "Valyuta kurslari",
  notFound: "Sahifa topilmadi",
  notFoundHint: "Material olib tashlangan yoki boshqa manzilga ko'chirilgan bo'lishi mumkin.",
  toHome: "Bosh sahifaga",
  langNote: "LEAP News tahririyati tarjimasi",
};

const en: Dict = {
  all: "All news",
  saved: "Saved",
  search: "Search",
  feed: "Latest",
  main: "Top stories",
  more: "More",
  seeAll: "all",
  readFull: "Read in full",
  sources: "Sources",
  related: "Related",
  popular: "Popular",
  share: "Share",
  save: "Save",
  updated: "Updated",
  weather: "Tashkent",
  rates: "Exchange rates",
  notFound: "Page not found",
  notFoundHint: "The story may have been taken down or moved to another address.",
  toHome: "Go to homepage",
  langNote: "Translated by the LEAP News desk",
};

const DICTS: Record<Lang, Dict> = { ru, uz, en };

export function t(lang: Lang, key: keyof Dict): string {
  return DICTS[lang]?.[key] ?? ru[key];
}

/** Названия рубрик. Слаг рубрики общий для всех языков — меняется подпись. */
const RUBRIC_TITLES: Record<string, Record<Lang, string>> = {
  politics: { ru: "Политика", uz: "Siyosat", en: "Politics" },
  economy: { ru: "Экономика", uz: "Iqtisodiyot", en: "Economy" },
  business: { ru: "Бизнес", uz: "Biznes", en: "Business" },
  society: { ru: "Общество", uz: "Jamiyat", en: "Society" },
  sport: { ru: "Спорт", uz: "Sport", en: "Sport" },
  world: { ru: "Мир", uz: "Dunyo", en: "World" },
  tech: { ru: "Технологии", uz: "Texnologiya", en: "Tech" },
  culture: { ru: "Культура", uz: "Madaniyat", en: "Culture" },
};

export function rubricTitle(slug: string, lang: Lang, fallback?: string): string {
  return RUBRIC_TITLES[slug]?.[lang] ?? fallback ?? slug;
}

/**
 * Домашний адрес языка. Русская версия живёт в корне — так исторически
 * проиндексированы все ссылки, и переезд ради симметрии стоил бы больше,
 * чем даёт.
 */
export function homeHref(lang: Lang): string {
  return lang === "ru" ? "/" : `/${lang}`;
}

/** Локали для <html lang> и форматирования дат. */
export const LOCALE: Record<Lang, string> = {
  ru: "ru-RU",
  uz: "uz-UZ",
  en: "en-US",
};
