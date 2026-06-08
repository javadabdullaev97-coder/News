export type Rubric = {
  slug: string;
  title: string;
  color: string;
  textColor: string;
};

export const rubrics: Rubric[] = [
  { slug: "politics", title: "Политика", color: "bg-blue-500", textColor: "text-blue-500" },
  { slug: "economy", title: "Экономика", color: "bg-emerald-500", textColor: "text-emerald-500" },
  { slug: "business", title: "Бизнес", color: "bg-amber-500", textColor: "text-amber-500" },
  { slug: "society", title: "Общество", color: "bg-rose-500", textColor: "text-rose-500" },
  { slug: "sport", title: "Спорт", color: "bg-orange-500", textColor: "text-orange-500" },
  { slug: "world", title: "Мир", color: "bg-sky-500", textColor: "text-sky-500" },
  { slug: "tech", title: "Технологии", color: "bg-violet-500", textColor: "text-violet-500" },
  { slug: "culture", title: "Культура", color: "bg-pink-500", textColor: "text-pink-500" },
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
    publishedAt: "2026-06-08T11:30:00Z",
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
    publishedAt: "2026-06-08T09:45:00Z",
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
    publishedAt: "2026-06-08T08:55:00Z",
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
    publishedAt: "2026-06-08T01:10:00Z",
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
    publishedAt: "2026-06-07T20:00:00Z",
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
    publishedAt: "2026-06-07T14:00:00Z",
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
    publishedAt: "2026-06-07T10:00:00Z",
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
    publishedAt: "2026-06-07T08:00:00Z",
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
    publishedAt: "2026-06-07T06:00:00Z",
    readingTime: 4,
    cover: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200",
    tags: ["налоги", "малый бизнес", "реформа"],
  },
  {
    slug: "uzbek-textile-export-q1",
    title: "Узбекский экспорт текстиля вырос на 18% в первом квартале",
    lead: "Основные покупатели — страны ЕС, Россия и Турция. Лидируют готовая одежда и хлопковая пряжа.",
    body: [
      "По данным Министерства внешней торговли, экспорт текстильной продукции в январе-марте 2026 года составил $1,1 млрд против $930 млн годом ранее.",
      "Аналитики связывают рост с расширением географии поставок и запуском новых производств в Намангане и Бухаре.",
    ],
    rubric: "business",
    authorSlug: "bekzod-tursunov",
    publishedAt: "2026-06-08T07:00:00Z",
    readingTime: 3,
    cover: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=1200",
    tags: ["экспорт", "текстиль", "торговля"],
  },
  {
    slug: "wildberries-wholesale-uz",
    title: "Wildberries запустил оптовые поставки в Узбекистан",
    lead: "Маркетплейс открыл прямой канал для местных продавцов, которым теперь не нужны посредники.",
    body: [
      "Платформа объявила о запуске B2B-сервиса для предпринимателей Узбекистана. Минимальная партия — от 10 единиц товара.",
      "В первую очередь сервис охватит Ташкент, Самарканд и Бухару, затем расширится на регионы.",
    ],
    rubric: "business",
    authorSlug: "bekzod-tursunov",
    publishedAt: "2026-06-08T04:00:00Z",
    readingTime: 2,
    cover: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200",
    tags: ["маркетплейс", "Wildberries", "торговля"],
  },
  {
    slug: "uz-mfa-kazakhstan-talks",
    title: "Главы МИД Узбекистана и Казахстана обсудили транспортный коридор",
    lead: "Стороны договорились ускорить запуск железнодорожного маршрута до китайской границы.",
    body: [
      "Министр иностранных дел Узбекистана провёл рабочую встречу с казахстанским коллегой в Астане.",
      "Главные темы — упрощение таможни и совместная инфраструктура на восточном направлении.",
    ],
    rubric: "politics",
    authorSlug: "redakciya",
    publishedAt: "2026-06-08T08:00:00Z",
    readingTime: 3,
    cover: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=1200",
    tags: ["МИД", "Казахстан", "транспорт"],
  },
  {
    slug: "digital-rights-law-uz",
    title: "Парламент рассмотрел проект закона о цифровых правах",
    lead: "Документ закрепляет право на доступ в интернет и регламентирует обработку персональных данных.",
    body: [
      "Законопроект предусматривает создание Уполномоченного по цифровым правам и систему обязательной маркировки AI-контента.",
      "Авторы рассчитывают, что закон вступит в силу с 1 января 2027 года.",
    ],
    rubric: "politics",
    authorSlug: "redakciya",
    publishedAt: "2026-06-08T00:00:00Z",
    readingTime: 4,
    cover: "https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=1200",
    tags: ["парламент", "цифровизация", "законы"],
  },
  {
    slug: "andijan-presidential-visit",
    title: "Президент посетил Андижан с рабочим визитом",
    lead: "Главный пункт программы — открытие индустриального парка и встреча с предпринимателями региона.",
    body: [
      "В рамках визита президент осмотрел новые производственные линии и поручил ускорить процедуру выдачи земель под индустриальные проекты.",
      "Парку дан статус особой экономической зоны на ближайшие 10 лет.",
    ],
    rubric: "politics",
    authorSlug: "redakciya",
    publishedAt: "2026-06-07T18:00:00Z",
    readingTime: 3,
    cover: "https://images.unsplash.com/photo-1531058020387-3be344556be6?w=1200",
    tags: ["президент", "Андижан", "индустрия"],
  },
  {
    slug: "uz-wrestling-asian-gold",
    title: "Узбекские борцы взяли четыре золота на чемпионате Азии",
    lead: "Сборная Узбекистана уверенно опередила Иран и Японию в общекомандном зачёте.",
    body: [
      "На турнире в Сеуле узбекские атлеты заняли первые места в четырёх весовых категориях и собрали в общей сложности 9 медалей.",
      "Главный тренер сборной отметил, что результат — лучший за десятилетие.",
    ],
    rubric: "sport",
    authorSlug: "sherzod-rakhimov",
    publishedAt: "2026-06-08T06:00:00Z",
    readingTime: 2,
    cover: "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=1200",
    tags: ["борьба", "Азия", "медали"],
  },
  {
    slug: "shomurodov-saudi-transfer",
    title: "Эльдор Шомуродов перешёл в саудовский «Аль-Иттихад»",
    lead: "Сумма трансфера составила около €22 млн — рекорд для узбекского футболиста.",
    body: [
      "Нападающий сборной Узбекистана подписал трёхлетний контракт с одним из топ-клубов Саудовской Аравии.",
      "Сам игрок назвал переход «новой главой» в карьере и поблагодарил болельщиков.",
    ],
    rubric: "sport",
    authorSlug: "sherzod-rakhimov",
    publishedAt: "2026-06-07T22:00:00Z",
    readingTime: 3,
    cover: "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=1200",
    tags: ["футбол", "трансфер", "сборная"],
  },
  {
    slug: "boxing-asia-best-team",
    title: "Боксёрская сборная Узбекистана признана лучшей в Азии",
    lead: "AIBA отметила доминирование узбекских боксёров на последних трёх континентальных турнирах.",
    body: [
      "По итогам сезона сборная Узбекистана впервые в истории получила награду «Команда года Азии» от Международной ассоциации бокса.",
      "За последние 12 месяцев атлеты из Узбекистана выиграли 28 медалей на турнирах высокого уровня.",
    ],
    rubric: "sport",
    authorSlug: "sherzod-rakhimov",
    publishedAt: "2026-06-07T16:00:00Z",
    readingTime: 2,
    cover: "https://images.unsplash.com/photo-1549824506-541f0d5e3aa1?w=1200",
    tags: ["бокс", "AIBA", "сборная"],
  },
  {
    slug: "uz-inflation-drop-84",
    title: "Инфляция в Узбекистане снизилась до 8,4%",
    lead: "Это минимальный показатель с 2021 года. ЦБ связывает замедление с укреплением сума и сезонным фактором.",
    body: [
      "Годовая инфляция в мае составила 8,4% против 9,1% в апреле. Базовая инфляция — 7,9%.",
      "Регулятор намерен сохранить жёсткую денежно-кредитную политику до конца года.",
    ],
    rubric: "economy",
    authorSlug: "redakciya",
    publishedAt: "2026-06-08T05:00:00Z",
    readingTime: 3,
    cover: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200",
    tags: ["инфляция", "ЦБ", "макро"],
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
