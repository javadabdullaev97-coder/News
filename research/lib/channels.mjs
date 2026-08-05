// Реестр Telegram-каналов конкурентов для research/collect-telegram.mjs.
//
// Хендлы установлены прямым перебором кандидатов через t.me/s/ и сверены по
// заголовку канала и по ссылкам, которые он ставит на свой сайт. Каталог
// docs/media-landscape-2026.md для этого не годится: у него @spotug с 45K
// подписчиков там, где на деле @spotuz с 26.7K, а часть каналов не указана
// вовсе.
//
// Отдельно про двойников. По запросу «узбекская версия Gazeta» находится
// @gazetauzb — канал, озаглавленный «Kun.uz». Это чужой ресурс, а не языковая
// версия издания; такие в реестр не берём. Проверка простая: канал должен
// ссылаться на домен своего издания.
//
// linkForm — в каком виде канал даёт ссылку на материал. От этого зависит
// сложность связывания поста со статьёй в Фазе 3:
//   "full"     — полный URL статьи, join прямой
//   "numeric"  — короткий вид с числовым id (kun.uz/ru/49112665), нужна карта
//                id → URL
//   "shortlink"— непрозрачный редирект (daryo.uz/7TMKQHyDR), нужен заход за
//                Location на каждый пост

export const CHANNELS = [
  // Kun.uz — единственное издание с полным набором из трёх языков в TG.
  { id: "kunuzofficial", outlet: "kun", lang: "uz", title: "Kun.uz | Расмий канал", subscribers: 1_130_000, linkForm: "numeric" },
  { id: "kunuzru", outlet: "kun", lang: "ru", title: "Kun.uz | Новости Узбекистана", subscribers: 80_600, linkForm: "numeric" },
  { id: "kunuzen", outlet: "kun", lang: "en", title: "Kun.uz English", subscribers: 14_700, linkForm: "numeric" },

  // Gazeta.uz — узбекского канала нет вовсе, при том что на сайте узбекская
  // версия сопоставима с русской. Английский канал существует, но с 318
  // подписчиками он мёртв.
  { id: "gazetauz", outlet: "gazeta", lang: "ru", title: "Gazeta.uz - Новости Узбекистана", subscribers: 86_700, linkForm: "full" },
  { id: "gazetauznews", outlet: "gazeta", lang: "en", title: "Gazeta.uz - Uzbekistan news", subscribers: 318, linkForm: "full" },

  { id: "spotuz", outlet: "spot", lang: "ru", title: "Spot.uz – бизнес и технологии", subscribers: 26_700, linkForm: "full" },
  { id: "spotuz_uz", outlet: "spot", lang: "uz", title: "Spot.uz – biznes va texnologiyalar", subscribers: 10_600, linkForm: "full" },

  // Repost узбекского канала не ведёт — согласуется с сайтом, где узбекских
  // материалов 11%.
  { id: "RepostUZ", outlet: "repost", lang: "ru", title: "Repost.uz", subscribers: 91_800, linkForm: "full" },

  // Daryo: узбекский канал крупнее русского в 350 раз. На сайте разрыв
  // четырёхкратный — в Telegram русское направление фактически брошено.
  { id: "Daryo", outlet: "daryo", lang: "uz", title: "Daryo | Rasmiy kanal", subscribers: 438_000, linkForm: "shortlink" },
  { id: "daryo_russian", outlet: "daryo", lang: "ru", title: "Daryo | На русском", subscribers: 1_250, linkForm: "shortlink" },

  { id: "uznews", outlet: "uznews", lang: "ru", title: "UzNews.uz", subscribers: 71_000, linkForm: "full" },
  { id: "uznewsuzb", outlet: "uznews", lang: "uz", title: "UzNews.uz ахборот агентлиги расмий канали", subscribers: 14_200, linkForm: "full" },

  { id: "qalampir", outlet: "qalampir", lang: "uz", title: "Qalampir.uz I расмий канал", subscribers: 253_000, linkForm: "numeric" },

  // Тематические и вспомогательные каналы. Найдены не перебором хендлов, а по
  // ссылкам в постах самих изданий: каждое ставит в подвал поста ссылки на
  // свои остальные каналы, и это исчерпывающий список — @qalampirsport
  // упоминается в 4238 постах из 4278.
  //
  // Важное для выводов: деление у изданий идёт не только по языку, но и по
  // теме, причём тематический канал бывает крупнее языкового. Спортивный
  // канал Daryo (38.5K) больше его русского (1.25K) в тридцать раз.
  { id: "qalampirlive", outlet: "qalampir", lang: "uz", vertical: "live", title: "Qalampir LIVE", subscribers: 60_700, linkForm: "numeric" },
  { id: "Daryo_Sport24", outlet: "daryo", lang: "uz", vertical: "sport", title: "Daryo | Sport24", subscribers: 38_500, linkForm: "shortlink" },
  { id: "qalampirsport", outlet: "qalampir", lang: "uz", vertical: "sport", title: "QALAMPIR.UZ | SPORT", subscribers: 10_700, linkForm: "numeric" },
  { id: "RepostLife", outlet: "repost", lang: "ru", vertical: "lifestyle", title: "Repost Lifestyle", subscribers: 6_070, linkForm: "full" },
  { id: "qalampirfm", outlet: "qalampir", lang: "uz", vertical: "tv", title: "Qalampir TV", subscribers: 5_520, linkForm: "numeric" },
  { id: "gazetauzspecial", outlet: "gazeta", lang: "ru", vertical: "longread", title: "Gazeta — Horizon", subscribers: 1_520, linkForm: "full" },
  { id: "qalampir_english", outlet: "qalampir", lang: "en", title: "Qalampir | ENGLISH", subscribers: 1_460, linkForm: "numeric" },
  { id: "kunuzbiznes", outlet: "kun", lang: "uz", vertical: "business", title: "Kun.uz | Biznes", subscribers: 1_240, linkForm: "numeric" },
  { id: "spotuzmini", outlet: "spot", lang: "ru", vertical: "mini", title: "Spot.uz – Mini", subscribers: 821, linkForm: "full" },
];

// Каналы, отклонённые при разведке. Держим списком, чтобы следующий заход не
// начинал перебор заново и не принял двойника за языковую версию.
export const REJECTED = [
  { handle: "@gazetauzb", reason: "озаглавлен «Kun.uz» — чужой канал, не узбекская Gazeta" },
  { handle: "@kun_uz", reason: "«Kun Videolari» — видеоканал, отдельный продукт" },
  { handle: "@repostuzb", reason: "«REpostUzb» — не связан с repost.uz" },
  { handle: "@daryo_uz", reason: "1.06K подписчиков, заброшен в пользу @Daryo" },
  { handle: "@daryo_rus", reason: "5 подписчиков, пустышка" },
  { handle: "@daryo_central_asia", reason: "10 подписчиков, пустышка" },
  { handle: "@uznewsofficial", reason: "4 подписчика, ведёт на @pressauz" },
  { handle: "@kunuz_english", reason: "дубль @kunuzen без аудитории" },
  { handle: "@spotug", reason: "из docs/media-landscape-2026.md; такого канала нет" },
];

// Узбекского канала у Gazeta нет. Проверено дважды: перебором хендлов
// (@gazetauzb — чужой канал с заголовком «Kun.uz», @gazetauzb_uz,
// @gazeta_uz_uzb, @gazetauzo — публичной ленты не отдают) и по ссылкам в
// подвале собственных постов Gazeta, где перечислены @gazetauznews и
// @gazetauzspecial, но узбекского нет. При этом на сайте узбекских
// материалов больше, чем русских: 22 против 18.7 в день.
export const NO_CHANNEL = [
  { outlet: "gazeta", lang: "uz", note: "узбекского канала не существует при том, что узбекская лента сайта крупнее русской" },
  { outlet: "repost", lang: "uz", note: "узбекского канала нет; на сайте узбекских материалов 11%" },
  { outlet: "spot", lang: "en", note: "английской версии нет ни на сайте, ни в Telegram" },
];

export function channelsFor(outletId) {
  return CHANNELS.filter((c) => c.outlet === outletId);
}
