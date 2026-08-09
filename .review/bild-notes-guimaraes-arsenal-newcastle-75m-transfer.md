# Bild notes: guimaraes-arsenal-newcastle-75m-transfer

## Стратегия: primary-source

## Источник картинки
- URL: https://assets.arsenal.com/prod/images/gm_preview/710708f75371-bg39.jpeg
  (найден через og:image на странице https://www.arsenal.com/news/bruno-guimaraes-joins-arsenal-assZJ0i5HUEi)
- Тип: официальное фото Arsenal FC с церемонии подписания контракта — Гимарайнш в форме
  «Арсенала» за столом с главным тренером Микелем Артетой (слева) и спортивным директором
  Андреа Бертой (справа), Sobha Realty Training Centre.
- Размер оригинала: 950×534 (AR 1.779, почти точно совпадает с целевым 16:9) → cover,
  масштаб 1.6854× (апскейл, ≤ MAX_UPSCALE=2.5), обрезано 0.07% по ширине → 1600×900
  (264 510 байт, quality 90).
- Полный JSON prepare-image.py:
  ```json
  {
    "source": {"width": 950, "height": 534, "path": "/tmp/arsenal_img.jpg"},
    "fit": {
      "mode": "cover", "scale": 1.6854, "cropLoss": 0.0007, "offset": [0, 0],
      "upscaled": true,
      "note": "обрезано 0% по ширине; окно кропа выбрано по содержимому; исходник растянут в 1.69× ради заливки кадра"
    },
    "output": {
      "path": "public/images/posts/2026-08/guimaraes-arsenal-newcastle-75m-transfer-01.jpg",
      "url": "/images/posts/2026-08/guimaraes-arsenal-newcastle-75m-transfer-01.jpg",
      "width": 1600, "height": 900, "bytes": 264510, "quality": 90
    },
    "status": "ok", "upscaled": false
  }
  ```

## Отклонённые варианты
- https://images.ctfassets.net/9ec6988xevcz/RSrMhheKqhtaLCtfgduX9/4b542b2080a60f56682a1d365ade9166/Bruno_Guimaraes_departs.jpg
  (og:image со страницы newcastleunited.com «Bruno Guimaraes leaves», 4210×3157) — отклонён:
  EXIF-подпись «Photo by Serena Taylor/Newcastle United via Getty Images», Copyright
  «2026 Newcastle United». Формально атрибутировано через Getty Images — попадает в чёрный
  список источников («Никогда: не бери с Getty ... риск copyright-иска»), даже несмотря на
  публикацию на официальном сайте клуба. Плюс: crop-loss при обрезке до 16:9 составил бы 24.99%
  — почти на границе порога crop-risky (0.25), верхняя часть головы игрока подрезалась
  заметнее, чем на выбранном варианте.
- BBC Sport / Sky Sports / Al Jazeera — не проверял детально: официальное фото Arsenal.com
  оказалось точной находкой (subject-first, идеальная горизонтальная пропорция, без
  Getty-атрибуции), дальнейший поиск не требовался.

## Alt-текст
"Бруну Гимарайнш в форме «Арсенала» подписывает контракт за столом рядом с главным тренером
Микелем Артетой и спортивным директором Андреа Бертой в Sobha Realty Training Centre"

## Уверенность в подборе: 92%

Официальное фото клуба-покупателя точно соответствует mainVisualSubject из reporter notes
(«Гимарайнш в форме Арсенала после подписания»), пропорции почти идеально совпадают с
целевым кадром 16:9 (обрезка 0.07%), апскейл умеренный (1.69×, в пределах политики). Единственный
минус — лёгкая мягкость от апскейла с относительно небольшого исходника (950×534), но заметно
не деградирует восприятие. Источник — arsenal.com, официальный сайт клуба, атрибуция прозрачна.
