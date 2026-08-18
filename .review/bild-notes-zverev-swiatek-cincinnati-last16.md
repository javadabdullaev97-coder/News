# Bild notes: zverev-swiatek-cincinnati-last16

## Стратегия: primary-source

## Попытки найти фото Зверева (по image-hint из handoff)
- Al Jazeera (aljazeera.com/sports/2026/8/18/...) — og:image ведёт на фото сестёр Уильямс
  (Aaron Doster/Imagn Images via Reuters), не Зверев, не по теме матча. Отклонено.
- ATP Tour (atptour.com) — все страницы (griekspoor-zverev-montreal, sinner-zverev-wimbledon,
  zverev-norrie-cincinnati-r2, player overview) отдают HTTP 403 при WebFetch — та же блокировка
  ботов, что у reporter'а в notes. Фото недоступно.
- Cincinnati Open (cincinnatiopen.com) — страница анонса "Saturday Preview: Djokovic, Zverev &
  Pegula" содержит только фото Александры Эалы, Зверева на фото нет. Профильная страница игрока
  cincinnatiopen.com/players/alexander-zverev/ — 404.
- Итог: живого фото Зверева в разрешённых источниках не нашлось. Per handoff (image-avoid/
  image-hint) в этом случае допустима Швёнтек как альтернативный субъект.

## Источник картинки
- URL: https://photoresources.wtatennis.com/photo-resources/2026/08/17/fa499d26-77be-49cb-b2ff-fd5c98091099/Swiatek-R3-Jimmie.jpg
- Найдено через: og:image статьи WTA Tennis (wtatennis.com/news/4561453) — тот же материал,
  на который ссылается статья как источник счёта Швёнтек-Саккари.
- Тип: официальное фото WTA (пресс-фото турнира), живая съёмка матча в Цинциннати, 17.08.2026.
- Credit по подписи страницы: "Jimmie" (фотограф WTA photo resources).
- Размер оригинала: 3000×1894 (запрошен через ?width=3000 у ресайз-сервиса WTA) → cover,
  масштаб 0,5333, обрезано 10,9% по высоте (offset y=53) → 1600×900 (150 КБ, q90).
- Дедуп-проверка: node scripts/photo-dupes.mjs --check — «свободен, за 2 дн. этот кадр не выходил».

## Отклонённые варианты
- Al Jazeera og:image — сёстры Уильямс, не субъект материала (парный разряд — отдельная тема,
  не вошла в статью).
- Cincinnati Open "Saturday Preview" og:image — Александра Эала, не Зверев/Швёнтек.
- Фото Швёнтек с cincinnatiopen.com (WhatsApp-Image-2026-08-15...jpeg) — рассмотрено как
  альтернатива, но WTA-фото с og:image более чёткое, горизонтальное, прямая привязка к материалу
  17.08 (тот же матч, что в статье), и подпись credit понятнее.

## Alt-текст
"Ига Швёнтек играет удар с лёта на харде турнира в Цинциннати, 2026 год"

## Уверенность в подборе: 75%
Subject-first соблюдён (реальный участник материала, не абстракция), кадр горизонтальный,
живая фотография с турнира, обрезка в пределах нормы, повторов за 2 дня нет. Не 100%, т.к.
основной субъект по handoff — Зверев, но фото Зверева в разрешённых источниках недоступно
(ATP 403, у остальных источников либо не тот субъект). Credit "Jimmie" — только имя без
фамилии, как указано в подписи первоисточника; более полной атрибуции на странице WTA не было.
