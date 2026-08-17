# Bild notes: shelton-retains-canadian-open-title

## Стратегия: primary-source

## Источник картинки
- Страница: https://nationalbankopen.com/news/read/2026/shelton-goes-back-to-back-montreal-hitting-heights-against-nakashima
  (официальный сайт турнира National Bank Open / Tennis Canada)
- Файл: https://assets.nationalbankopen.com/production/news/PR-Ben-Shelton-0554.jpg
- Кредит найден в HTML (поле `alt` изображения на странице): "August 13, 2026 —
  @pascalphotographe — Pascal Ratthe/Tennis Canada" → указан в frontmatter как
  `Pascal Ratthe / Tennis Canada`
- Тип: официальное фото организатора турнира (пресс-служба Tennis Canada), не
  агентство и не сток
- Размер оригинала: 1200×800 → cover, масштаб 1,33×, обрезано 15,6% по высоте
  (окно кропа выбрано умным кропом по содержимому, offset y=45) → 1600×900
  (284 КБ, q90)

## Почему не ATP Tour и не Tennis Majors
- `atptour.com` отдаёт 403 на все попытки WebFetch/curl (тот же блок отмечен
  reporter'ом в notes) — прямого доступа к официальным фото ATP нет.
- На Tennis Majors нашлось хорошее горизонтальное фото (1900×1000,
  `Nakashima_Shelton_Montreal_2026.jpg`), но его caption/alt прямо указывает
  агентский копирайт: "© Yannick Legare/ZUMA/SIPA" — платное агентство фото
  (ZUMA Press/SIPA), риск как у Getty/Reuters без подтверждённой лицензии.
  Пропущено по правилу «не тащим агентские фото без уверенности в лицензии».

## Отклонённые варианты
- ATP Tour (все URL из sources) — 403, недоступно
- Tennis Majors og:image — агентское фото (ZUMA/SIPA), лицензионный риск,
  пропущено даже при хорошем горизонтальном кадре
- Unsplash — по запросу «Ben Shelton tennis» отдаёт только generic-сток без
  привязки к спортсмену, не subject-first

## Alt-текст
"Бен Шелтон поднимает трофей National Bank Open в конфетти на церемонии
награждения в Монреале"

## Ориентация и обрезка
Исходник 1200×800 (соотношение 1.5) — горизонтальный, не панорама и не
портрет, contain/подложка не потребовались. cropLoss 0,156 — ниже порога
crop-risky (0,25) и ниже потолка скрипта MAX_CROP=0,45. Лицо, трофей и
торс полностью в кадре после умного кропа.

## Уверенность в подборе: 95%
Официальное фото организатора турнира с точным событием (церемония
награждения после финала 13 августа), subject-first, живая фотография,
горизонтальная ориентация, атрибуция прозрачна и проверяема на странице
источника.
