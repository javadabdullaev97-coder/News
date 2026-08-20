# Bild notes: google-publisher-preferred-source-ai-traffic

## Стратегия: primary-source

## Источник картинки
- URL: https://storage.googleapis.com/gweb-uniblog-publish-prod/images/01-ps-button-Family_resized.width-1200.format-webp.webp
- Найдено на: официальный блог Google (первый source в frontmatter) — https://blog.google/products-and-platforms/products/search/personalize-search-discover-news/
- Тип: официальный скриншот интерфейса (три рендера телефона), иллюстрирующий сам flow «Preferred Source» — именно то, что просил image-hint
- Размер оригинала: 1200×675 (webp) → конвертирован в jpg → prepare-image.py: cover, scale 1.3333 (умеренный апскейл в пределах MAX_UPSCALE=2.5), обрезка 0% → 1600×900 (160 КБ, q90)
- Дубликат-проверка: `node scripts/photo-dupes.mjs --check` — свободен, за 2 дня не выходил

## Отклонённые варианты
- Untitled-13V_1 (первое/hero-изображение статьи, "A woman looks at a phone outdoors") — отклонено: живой человек в кадре, image-avoid прямо просит без лиц/людей-со-стока для этой продуктовой темы
- gNews-2UP / gNews-1UP (Pixel 10 Pro, аудио-брифинги/curated briefings) — про другую фичу (Google News персонализация тем), не про кнопку Preferred Source — тема статьи именно про кнопку

## Alt-текст
"Три экрана смартфона показывают процесс добавления сайта в «Предпочитаемые источники» Google: кнопка на сайте издателя, экран подтверждения с логотипом Google и итоговое сообщение о добавлении источника"

## Уверенность в подборе: 90%

Примечание: скрипт применил умеренный апскейл (1.33×) ради заливки кадра 1600×900 без
обрезки — это в рамках текущего MAX_UPSCALE=2.5 в prepare-image.py (см. докстринг скрипта:
политика апскейла была осознанно изменена с "никогда" на "до 2.5×", чтобы избегать
letterboxing на официальных ассетах меньше целевого размера). Видимой потери резкости на
итоговом кадре нет, текст интерфейса читаем.
