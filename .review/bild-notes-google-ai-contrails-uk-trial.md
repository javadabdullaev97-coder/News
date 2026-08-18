# Bild notes: google-ai-contrails-uk-trial

## Стратегия: primary-source

## Источник картинки
- URL: https://storage.googleapis.com/gweb-uniblog-publish-prod/images/Google_blog_image.width-1600.format-webp.webp
- Найдена как hero-изображение официального анонса Google (первый source статьи:
  https://blog.google/innovation-and-ai/models-and-research/google-research/blue-skies/)
- Тип: официальная иллюстрация Google для этой конкретной статьи про Operation Blue Skies —
  самолёт с конденсационным следом над облаками, на фоне видны линии-дуги (стилизация маршрута/
  атмосферы). Не диаграмма, не «бизнес-заготовка» — подходит под правило subject-first
  (mainVisualSubject reporter'а: «самолёт с конденсационным следом в небе над океаном»).
- Размер оригинала: 1600×900 (уже готовое 16:9) → prepare-image.py: cover, scale 1.0,
  cropLoss 0% → 1600×900, 89 458 байт, quality 90. Обрезки и апскейла не было.

## Проверка на повтор
- `node scripts/photo-dupes.mjs --check` — кадр свободен, за последние 2 дня не выходил.

## Отклонённые варианты
- https://storage.googleapis.com/gweb-uniblog-publish-prod/images/Shanwick_Oceanic_Diagram.width-1200.format-webp.webp
  (карта/диаграмма зоны Shanwick с блога Google) — оставлена как запасной вариант, не понадобилась:
  hero-фото самолёта точнее передаёт subject-first и не является инфографикой/схемой.
- https://nats.aero/blog/wp-content/uploads/2026/08/newsblog-hero-template-1600x800-6-800x400.png
  — шаблонная хедер-картинка блога NATS (не относится к конкретной новости, типовой баннер блога).
- https://nats.aero/blog/wp-content/uploads/2026/08/APContrails.png — инфографика подходов
  к контрейл-avoidance на блоге NATS: диаграмма/схема, не живое фото, отклонена в пользу
  фото самолёта.

## Alt-текст
"Пассажирский самолёт с белым конденсационным следом летит высоко над облаками, вид сверху
на изгиб атмосферы"

## Уверенность в подборе: 90%
Официальная hero-картинка первоисточника, точное совпадение с mainVisualSubject reporter'а,
готовый кадр 16:9 без обрезки и апскейла, дубликат не найден.
