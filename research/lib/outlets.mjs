// Адаптеры sitemap-архивов конкурентов для research/collect-sitemaps.mjs.
//
// Каждое издание раскладывает архив по-своему, и универсального парсера тут
// быть не может. Общий контракт адаптера:
//
//   id, name          — идентификатор и человеческое имя
//   langs             — какие языковые версии ожидаем увидеть
//   listMaps(window)  — async, отдаёт список URL карт, которые надо скачать
//   parseEntry(entry) — {loc, lastmod} → {lang, date, slug, key} или null,
//                       если это не статья (рубрика, главная, служебная стр.)
//
// Поле dateSource фиксирует, откуда берётся дата публикации:
//   "url"     — дата зашита в путь, точная
//   "lastmod" — только <lastmod>, приблизительная (правки сдвигают её вперёд)
//   "none"    — из карты дату не достать, нужен заход в статью (Фаза 1c)
//
// Это различие важно: на "lastmod" и "none" изданиях суточные объёмы считать
// нельзя, они пойдут в анализ только через выборочные недели.

const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export const USER_AGENT = UA;

// ── помощники ──────────────────────────────────────────────────────────────

function eachDay(from, to) {
  const out = [];
  const d = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (d <= end) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

// Понедельник ISO-недели для даты — Gazeta и Spot называют недельные карты
// по дате понедельника.
function mondayOf(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  const shift = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - shift);
  return d.toISOString().slice(0, 10);
}

function weeksIn(from, to) {
  const seen = new Set();
  // Захватываем и неделю до начала окна: материал от 1 мая лежит в карте
  // недели, начавшейся 27 апреля.
  const start = new Date(`${from}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - 7);
  for (const day of eachDay(start.toISOString().slice(0, 10), to)) {
    seen.add(mondayOf(day));
  }
  return [...seen].sort();
}

// Дата вида /2026/06/15/ в пути статьи.
const URL_DATE = /\/(\d{4})\/(\d{2})\/(\d{2})\//;

function dateFromUrl(loc) {
  const m = loc.match(URL_DATE);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

function lastSegment(loc) {
  return loc.replace(/\/+$/, "").split("/").pop();
}

// ── адаптеры ───────────────────────────────────────────────────────────────

// Kun.uz — самый аккуратный архив: посуточные карты, в каждой сразу все
// языковые версии за этот день.
//
// Латиница и кириллица (/kr/) — один и тот же материал с идентичным slug'ом,
// включая хвостовой хэш. RU и EN — отдельные записи со своими хэшами:
// пересечение хэшей между uz и ru за проверенный день ровно нулевое, так что
// как ключ связывания хэш работает только внутри пары latin↔cyrillic.
const kun = {
  id: "kun",
  name: "Kun.uz",
  langs: ["uz", "uz-cyr", "ru", "en"],
  dateSource: "url",
  async listMaps({ from, to }) {
    return eachDay(from, to).map((iso) => {
      const [y, m, d] = iso.split("-").map(Number);
      return `https://kun.uz/sitemap/site-map-news_day_${d}_year_${y}_month_${m}.xml`;
    });
  },
  parseEntry({ loc }) {
    const m = loc.match(
      /^https:\/\/kun\.uz\/(?:(kr|ru|en)\/)?news\/(\d{4})\/(\d{2})\/(\d{2})\/([^/?#]+)/,
    );
    if (!m) return null;
    const [, prefix, y, mo, d, slug] = m;
    const lang = prefix === "kr" ? "uz-cyr" : (prefix ?? "uz");
    // Хвостовой хэш есть не у всех материалов — у части slug заканчивается
    // словом. Тогда ключом остаётся сам slug.
    const hash = slug.match(/-([0-9a-f]{6})$/)?.[1] ?? null;
    return { lang, date: `${y}-${mo}-${d}`, slug, key: hash ?? slug };
  },
};

// Соглашение об именах языков во всём рисёрче:
//   uz      — узбекский латиницей
//   uz-cyr  — узбекский кириллицей
//   ru, en  — как есть
//
// В путях изданий это записано непоследовательно и, на первый взгляд,
// наоборот: у Gazeta и Daryo сегмент /oz/ — это латиница (O'zbekcha), а /uz/ —
// кириллица. Проверено сличением заголовков одного и того же материала.
// Нормализуем на входе, чтобы дальше по конвейеру не путаться.

// Gazeta.uz и Spot.uz — один движок (Spot принадлежит Afisha Media, но карты
// устроены идентично): недельные карты materials-<seg>-<понедельник>.xml,
// дата статьи зашита в путь.
function afishaLike({ id, name, host, segments }) {
  const segs = Object.keys(segments);
  return {
    id,
    name,
    langs: [...new Set(Object.values(segments))],
    dateSource: "url",
    async listMaps({ from, to }) {
      const out = [];
      for (const seg of segs) {
        for (const monday of weeksIn(from, to)) {
          out.push(`https://${host}/sitemap/materials-${seg}-${monday}.xml`);
        }
      }
      return out;
    },
    parseEntry({ loc }) {
      const m = loc.match(
        new RegExp(
          `^https://${host.replace(".", "\\.")}/(${segs.join("|")})/(\\d{4})/(\\d{2})/(\\d{2})/([^/?#]+)`,
        ),
      );
      if (!m) return null;
      const [, seg, y, mo, d, slug] = m;
      return { lang: segments[seg], date: `${y}-${mo}-${d}`, slug, key: slug };
    },
  };
}

const gazeta = afishaLike({
  id: "gazeta",
  name: "Gazeta.uz",
  host: "www.gazeta.uz",
  segments: { ru: "ru", oz: "uz", uz: "uz-cyr", en: "en" },
});

// У Spot кириллической версии нет вообще — только /ru/ и /oz/.
const spot = afishaLike({
  id: "spot",
  name: "Spot.uz",
  host: "www.spot.uz",
  segments: { ru: "ru", oz: "uz" },
});

// Daryo.uz — шардированные карты по языкам. Шардов у узбекских версий 34,
// у русской 2, у английской 3: асимметрия видна ещё до разбора содержимого.
// Даты в пути есть, поэтому окно фильтруем уже после скачивания шардов.
//
// Ловушка: латиница у Daryo лежит на голом пути, без языкового сегмента
// (daryo.uz/2026/08/04/slug/), и раздаётся картой sitemap-oz-*. Сегмент /uz/ —
// это кириллица. Регулярка, требующая языковой префикс, теряет всю латиницу,
// то есть основной массив издания.
const daryo = {
  id: "daryo",
  name: "Daryo.uz",
  langs: ["ru", "uz", "uz-cyr", "en"],
  dateSource: "url",
  shards: { ru: 2, uz: 34, oz: 34, en: 3 },
  async listMaps() {
    const out = [];
    for (const [seg, count] of Object.entries(daryo.shards)) {
      for (let i = 1; i <= count; i += 1) {
        out.push(`https://daryo.uz/sitemap-${seg}-${i}.xml`);
      }
    }
    return out;
  },
  parseEntry({ loc }) {
    const m = loc.match(
      /^https:\/\/daryo\.uz\/(?:(ru|uz|en)\/)?(\d{4})\/(\d{2})\/(\d{2})\/([^/?#]+)/,
    );
    if (!m) return null;
    const [, seg, y, mo, d, slug] = m;
    const lang = seg === "uz" ? "uz-cyr" : (seg ?? "uz");
    return { lang, date: `${y}-${mo}-${d}`, slug, key: slug };
  },
};

// Repost.uz — язык в пути есть (/uz/), но даты нет вообще. Остаётся
// <lastmod>, а он сдвигается при любой правке материала. Суточные объёмы по
// нему считать нельзя — Repost идёт в анализ через выборочные недели, где
// дату берём со страницы статьи.
const repost = {
  id: "repost",
  name: "Repost.uz",
  langs: ["ru", "uz"],
  dateSource: "lastmod",
  async listMaps() {
    return [
      "https://repost.uz/sitemap.xml",
      "https://repost.uz/sitemap_uz.xml",
      "https://repost.uz/sitemap-archive-1.xml",
      "https://repost.uz/sitemap-archive-2.xml",
      "https://repost.uz/sitemap-archive-3.xml",
    ];
  },
  // Путь у Repost бывает двух видов: repost.uz/<slug> и repost.uz/<рубрика>/<slug>,
  // где рубрика — life, sport и подобные. Плюс отдельно repost.uz/uz/<slug> для
  // узбекской версии, и по форме она неотличима от рубричной.
  //
  // Первая версия адаптера принимала только односегментные адреса, и из карты
  // выпадало 1455 записей из 5281. Обнаружилось это не глазами, а сверкой: 30%
  // ссылок из телеграм-постов Repost не находили себе статьи, тогда как у
  // Gazeta, Spot и Kun мимо карты шло 0,1–0,5%.
  parseEntry({ loc, lastmod }) {
    const m = loc.match(/^https:\/\/repost\.uz\/([^/?#]+)(?:\/([^/?#]+))?\/?$/);
    if (!m) return null;
    const [, first, second] = m;
    if (!first || first.includes(".xml")) return null;

    // Один сегмент — русский материал. Два — либо язык, либо рубрика.
    const isLangPrefix = second && first === "uz";
    const slug = second ?? first;
    const section = second && !isLangPrefix ? first : null;
    if (slug.includes(".xml")) return null;

    return {
      lang: isLangPrefix ? "uz" : "ru",
      date: lastmod ? lastmod.slice(0, 10) : null,
      slug,
      section,
      key: second ? `${first}/${second}` : first,
    };
  },
};

// UzNews.uz — самый бедный архив: URL вида /news/10001, ни языка, ни даты.
// <lastmod> у всей карты одинаковый (перегенерирована пачкой), то есть
// бесполезен. Собираем только идентификаторы; язык и дату придётся брать со
// страницы статьи в Фазе 1c. В агрегатный уровень UzNews не попадает.
const uznews = {
  id: "uznews",
  name: "UzNews.uz",
  langs: ["ru", "uz"],
  dateSource: "none",
  async listMaps() {
    return Array.from(
      { length: 12 },
      (_, i) => `https://www.uznews.uz/sitemap${i + 1}.xml`,
    );
  },
  parseEntry({ loc }) {
    const m = loc.match(/^https:\/\/www\.uznews\.uz\/news\/(\d+)$/);
    if (!m) return null;
    return { lang: null, date: null, slug: m[1], key: m[1] };
  },
};

// Qalampir.uz — одна карта на 120 тысяч URL (17 МБ). Даты в пути нет, а
// <lastmod> у всех 120 881 записей одинаковый и равен дню скачивания: карта
// перегенерируется целиком, реальную дату материала она не несёт. Как и у
// UzNews, окно придётся находить по числовому id в хвосте slug'а — id растут
// монотонно во времени, так что границы мая и июля ищутся выборочными
// заходами в статьи, а не сплошной выкачкой.
const qalampir = {
  id: "qalampir",
  name: "Qalampir.uz",
  langs: ["uz"],
  dateSource: "none",
  async listMaps() {
    return ["https://qalampir.uz/sitemap.xml"];
  },
  parseEntry({ loc }) {
    const m = loc.match(/^https:\/\/qalampir\.uz\/(?:([a-z]{2})\/)?news\/(.+)$/);
    if (!m) return null;
    const [, prefix, slug] = m;
    return {
      lang: prefix ?? "uz",
      date: null,
      slug,
      key: slug.match(/-(\d+)$/)?.[1] ?? slug,
    };
  },
};

export const OUTLETS = [kun, gazeta, spot, repost, daryo, uznews, qalampir];

export function outletById(id) {
  return OUTLETS.find((o) => o.id === id);
}

export { eachDay, mondayOf, weeksIn, dateFromUrl, lastSegment };
