export type Rubric = {
  slug: string;
  title: string;
  color: string;
};

export const rubrics: Rubric[] = [
  { slug: "politics", title: "Политика", color: "bg-blue-500" },
  { slug: "economy", title: "Экономика", color: "bg-emerald-500" },
  { slug: "business", title: "Бизнес", color: "bg-amber-500" },
  { slug: "tech", title: "Технологии", color: "bg-violet-500" },
  { slug: "society", title: "Общество", color: "bg-rose-500" },
  { slug: "culture", title: "Культура", color: "bg-pink-500" },
  { slug: "sport", title: "Спорт", color: "bg-orange-500" },
  { slug: "world", title: "Мир", color: "bg-sky-500" },
];

export type Author = {
  slug: string;
  name: string;
  bio: string;
  initialsColor: string;
};

export const authors: Record<string, Author> = {
  "alisher-karimov": {
    slug: "alisher-karimov",
    name: "Алишер Каримов",
    bio: "Корреспондент отдела общества. Пишет о Ташкенте, инфраструктуре и городских проектах.",
    initialsColor: "bg-rose-500",
  },
  "kamila-yusupova": {
    slug: "kamila-yusupova",
    name: "Камила Юсупова",
    bio: "Технологический обозреватель. Стартапы, IT-индустрия, цифровая экономика Узбекистана.",
    initialsColor: "bg-violet-500",
  },
  "sherzod-rakhimov": {
    slug: "sherzod-rakhimov",
    name: "Шерзод Рахимов",
    bio: "Спортивный редактор. Футбол, бокс, олимпийские дисциплины.",
    initialsColor: "bg-orange-500",
  },
  "dilnoza-abbasova": {
    slug: "dilnoza-abbasova",
    name: "Дильноза Аббасова",
    bio: "Репортёр в Самарканде. Туризм, регионы, культура.",
    initialsColor: "bg-emerald-500",
  },
  "bekzod-tursunov": {
    slug: "bekzod-tursunov",
    name: "Бекзод Турсунов",
    bio: "Деловой журналист. Экономика, налоги, малый бизнес.",
    initialsColor: "bg-amber-500",
  },
  "zuhra-nurmatova": {
    slug: "zuhra-nurmatova",
    name: "Зухра Нурматова",
    bio: "Культурный обозреватель. Искусство, выставки, кино.",
    initialsColor: "bg-pink-500",
  },
  "redakciya": {
    slug: "redakciya",
    name: "Редакция LEAP",
    bio: "Совместные материалы редакции.",
    initialsColor: "bg-neutral-500",
  },
};

export type Article = {
  slug: string;
  title: string;
  lead: string;
  body: string[];
  rubric: string;
  authorSlug: string;
  publishedAt: string;
  readingTime: number;
  cover: string;
  featured?: boolean;
  tags: string[];
};

export const articles: Article[] = [
  {
    slug: "tashkent-metro-new-line",
    title: "В Ташкенте открыли новую ветку метро: что изменится для жителей",
    lead: "Запуск Сергелийской линии должен разгрузить южные районы и сократить время в пути до центра почти вдвое.",
    body: [
      "В понедельник в Ташкенте торжественно открыли новый участок метро, который соединил Сергели с центральной частью города. Линия включает шесть станций и протянулась более чем на 11 километров.",
      "По оценкам городских властей, ежедневно новой веткой будут пользоваться до 150 тысяч пассажиров. Это позволит снизить нагрузку на наземный транспорт и сократить пробки на ключевых магистралях юга столицы.",
      "Проект реализован при участии международных подрядчиков. Общая стоимость превысила $400 млн. В перспективе линию планируют продлить ещё на четыре станции.",
    ],
    rubric: "society",
    authorSlug: "alisher-karimov",
    publishedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    readingTime: 4,
    cover: "https://images.unsplash.com/photo-1581262177000-8139a463e531?w=1600",
    featured: true,
    tags: ["Ташкент", "транспорт", "метро"],
  },
  {
    slug: "uzbek-it-park-record-export",
    title: "IT Park Узбекистана зафиксировал рекордный экспорт услуг в 2025 году",
    lead: "Объём экспорта IT-услуг резидентов IT Park превысил $700 млн — почти в полтора раза больше прошлогоднего показателя.",
    body: [
      "Резиденты IT Park Узбекистана в 2025 году экспортировали услуг на сумму более $700 млн. Это рекордный показатель за всю историю парка и рост на 47% год к году.",
      "Основными рынками сбыта стали США, Великобритания и страны Евросоюза. Лидируют направления заказной разработки, аутстаффинга и продуктовых стартапов.",
    ],
    rubric: "tech",
    authorSlug: "kamila-yusupova",
    publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    readingTime: 3,
    cover: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200",
    featured: true,
    tags: ["IT", "экспорт", "стартапы"],
  },
  {
    slug: "som-rate-may-2026",
    title: "Курс сума к доллару впервые с начала года ушёл ниже 12 600",
    lead: "Центральный банк объясняет укрепление национальной валюты ростом валютной выручки от экспорта золота и текстиля.",
    body: [
      "По данным ЦБ, средневзвешенный курс на торгах составил 12 587 сумов за доллар — минимум с января 2026 года.",
      "Аналитики связывают укрепление с сезонным ростом экспорта и сокращением спроса на наличную валюту со стороны населения.",
    ],
    rubric: "economy",
    authorSlug: "redakciya",
    publishedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    readingTime: 2,
    cover: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=1200",
    tags: ["сум", "ЦБ", "валюта"],
  },
  {
    slug: "uzbek-football-asian-cup",
    title: "Сборная Узбекистана по футболу вышла в полуфинал Кубка Азии",
    lead: "Команда обыграла Иран в дополнительное время и впервые за десятилетие пробилась в четвёрку сильнейших континента.",
    body: [
      "В драматичном матче в Дохе сборная Узбекистана одержала победу со счётом 2:1. Решающий гол на 118-й минуте забил Эльдор Шомуродов.",
      "В полуфинале команда сыграет с победителем пары Япония — Южная Корея.",
    ],
    rubric: "sport",
    authorSlug: "sherzod-rakhimov",
    publishedAt: new Date(Date.now() - 11 * 60 * 60 * 1000).toISOString(),
    readingTime: 3,
    cover: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=1200",
    tags: ["футбол", "сборная", "Кубок Азии"],
  },
  {
    slug: "samarkand-tourism-record",
    title: "Самарканд принял рекордное число туристов в первом квартале",
    lead: "С января по март город посетили более 800 тысяч иностранных гостей — на 35% больше, чем годом ранее.",
    body: [
      "Самым большим спросом пользовались туры выходного дня из Индии, Малайзии и Турции. Гостиничный фонд города загружен в среднем на 82%.",
    ],
    rubric: "society",
    authorSlug: "dilnoza-abbasova",
    publishedAt: new Date(Date.now() - 16 * 60 * 60 * 1000).toISOString(),
    readingTime: 2,
    cover: "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=1200",
    tags: ["Самарканд", "туризм"],
  },
  {
    slug: "ai-school-program",
    title: "В школах Узбекистана введут обязательный курс по ИИ с 7 класса",
    lead: "Минобразования утвердило новую программу: ученики будут изучать основы машинного обучения и работу с языковыми моделями.",
    body: [
      "Курс рассчитан на два года и включает практические занятия с готовыми ИИ-инструментами. Преподавателей переобучат на базе IT Park и национального университета.",
    ],
    rubric: "tech",
    authorSlug: "kamila-yusupova",
    publishedAt: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
    readingTime: 4,
    cover: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200",
    tags: ["ИИ", "образование", "школа"],
  },
  {
    slug: "tashkent-biennale-2026",
    title: "В Ташкенте стартовала Биеннале современного искусства — 2026",
    lead: "Главной площадкой стал отреставрированный кинотеатр «Панорама». В программе — 60 художников из 24 стран.",
    body: [
      "Тема биеннале — «Шёлковый путь будущего». Экспозиция продлится до конца июля, вход свободный.",
    ],
    rubric: "culture",
    authorSlug: "zuhra-nurmatova",
    publishedAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    readingTime: 3,
    cover: "https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?w=1200",
    tags: ["искусство", "биеннале", "Ташкент"],
  },
  {
    slug: "global-oil-prices-impact",
    title: "Как падение цен на нефть отразится на бюджете Узбекистана",
    lead: "Эксперты оценивают чувствительность доходов государства к мировой конъюнктуре сырьевых рынков.",
    body: [
      "Несмотря на то что Узбекистан не является крупным экспортёром нефти, страна косвенно зависит от цен через торговлю с Россией и Казахстаном.",
    ],
    rubric: "world",
    authorSlug: "redakciya",
    publishedAt: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString(),
    readingTime: 5,
    cover: "https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=1200",
    tags: ["нефть", "бюджет", "анализ"],
  },
  {
    slug: "new-tax-reform-2026",
    title: "Парламент рассмотрит новую налоговую реформу для малого бизнеса",
    lead: "Предполагается снижение ставки НДС для предпринимателей с оборотом до 5 млрд сумов и упрощение отчётности.",
    body: [
      "Реформа разрабатывалась более полугода с участием бизнес-ассоциаций. Если её примут, изменения вступят в силу с 1 января 2027 года.",
    ],
    rubric: "business",
    authorSlug: "bekzod-tursunov",
    publishedAt: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
    readingTime: 4,
    cover: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200",
    tags: ["налоги", "малый бизнес", "реформа"],
  },
];

export function getArticle(slug: string) {
  return articles.find((a) => a.slug === slug);
}

export function getArticlesByRubric(rubricSlug: string) {
  return articles.filter((a) => a.rubric === rubricSlug);
}

export function getRubric(slug: string) {
  return rubrics.find((r) => r.slug === slug);
}

export function getAuthor(slug: string) {
  return authors[slug] ?? authors["redakciya"];
}

export function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeAgo(iso: string) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "только что";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ${pluralRu(days, "день", "дня", "дней")} назад`;
  return formatDate(iso);
}

function pluralRu(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}
