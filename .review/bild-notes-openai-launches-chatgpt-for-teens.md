# Bild notes: openai-launches-chatgpt-for-teens

## Стратегия: primary-source

## Источник картинки
- URL: https://www.engadget.com/img/gallery/chatgpts-stricter-teen-mode-starts-rolling-out-today/intro-1787007551.jpg
  (openai.com/index/introducing-chatgpt-for-teens/ отдал 403 напрямую — оригинал недоступен
  для скачивания, поэтому взято зеркало из галереи Engadget; подпись в статье прямо
  указывает "Photo Credit: OpenAI" — это официальные скриншоты из пресс-кита OpenAI,
  не собственная съёмка Engadget)
- Тип: официальный продуктовый скриншот (пара мокапов iPhone с онбордингом ChatGPT for Teens:
  «Learn it your way», «Personalize ChatGPT»)
- Размер оригинала: 780×438 (16:9-совместимая горизонталь, готовая пропорция под кадр статьи)
- prepare-image.py: cover, scale 2.0548 (upscale в пределах MAX_UPSCALE=2.5, cropLoss 0.0017),
  offset [3, 0] → 1600×900, 105 577 байт, quality 90, status: ok

```json
{
  "source": {"width": 780, "height": 438},
  "fit": {"mode": "cover", "scale": 2.0548, "cropLoss": 0.0017, "offset": [3, 0], "upscaled": true},
  "output": {"path": "public/images/posts/2026-08/openai-launches-chatgpt-for-teens-01.jpg",
             "url": "/images/posts/2026-08/openai-launches-chatgpt-for-teens-01.jpg",
             "width": 1600, "height": 900, "bytes": 105577, "quality": 90},
  "status": "ok"
}
```

## Отклонённые варианты
- AP Photo/Richard Drew (iPhone с ChatGPT, файловое фото 2023 года) — og:image статьи
  ClickOnDetroit. Отклонено: лицензированное агентское фото (AP), риск копирайта,
  прямого разрешения на использование нет.
- Логотип OpenAI/ChatGPT крупным планом — запасной вариант из handoff, не понадобился:
  нашёлся более информативный официальный визуал (реальный интерфейс продукта).

## Проверка на повтор
`node scripts/photo-dupes.mjs --check` — кадр свободен, за 2 дня не выходил.

## Соответствие ограничению по несовершеннолетним
На фото нет людей и нет узнаваемых лиц — только UI-скриншоты на мокапах телефонов.
Полностью закрывает требование handoff "image-avoid: реальные лица несовершеннолетних".

## Alt-текст
"Экраны онбординга ChatGPT for Teens на двух смартфонах: подсказки «Learn it your way»
и «Personalize ChatGPT»"

## Уверенность в подборе: 85%
Официальный визуал OpenAI, subject-first (показывает сам продукт из статьи), горизонтальная
пропорция, без риска для несовершеннолетних. Минус к уверенности — файл скачан через зеркало
Engadget, а не напрямую с openai.com (заблокирован 403 для бот-трафика).
