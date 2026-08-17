# Bild notes: google-pixel11-madebygoogle-2026

## Стратегия: primary-source

## Источник картинки
- Страница: https://blog.google/intl/en-in/products/hardware/the-pixel-11-series-your-most-personal-pixel-yet/
  (один из `frontmatter.sources` — официальный блог Google The Keyword)
- Прямой URL картинки: https://storage.googleapis.com/gweb-uniblog-publish-prod/images/Pixel-11ProXL_Family-Shot.width-2000.format-webp.webp
  (найден в HTML страницы среди других `<img>`/srcset, не через og:image — og:image
  оказался рекламным баннером с наложенным текстом "Pixel 11 Pro with Gemini Intelligence",
  что для нейтральной новостной подачи хуже, чем чистый product shot)
- Тип: официальное пресс-фото Google (product family shot), без людей, без текста на кадре
- Размер оригинала: 2000×1125 (соотношение 1,78 — уже готовое 16:9)

## Обработка
python3 scripts/prepare-image.py → cover, scale 0.8, cropLoss 0.0, upscaled: false,
результат 1600×900, 89 479 байт, quality 90. Обрезки практически нет — исходник
идеально ложится в кадр статьи.

```json
{
  "source": {"width": 2000, "height": 1125},
  "fit": {"mode": "cover", "scale": 0.8, "cropLoss": 0.0, "offset": [0,0], "upscaled": false},
  "output": {"path": "public/images/posts/2026-08/google-pixel11-madebygoogle-2026-01.jpg",
             "url": "/images/posts/2026-08/google-pixel11-madebygoogle-2026-01.jpg",
             "width": 1600, "height": 900, "bytes": 89479, "quality": 90},
  "status": "ok",
  "upscaled": false
}
```

## Отклонённые варианты
- `Pixel_11_Launch_social.width-1300.png` (og:image страницы, 1300×731) — тот же
  розовый Pixel 11 Pro, но с наложенным маркетинговым текстом "Google / Pixel 11 Pro
  / with Gemini Intelligence" — не годится для новостной картинки, выглядит как рекламный
  баннер, а не документальное фото; плюс лишнее упоминание Gemini рядом со статьёй,
  где reporter отдельно объяснял, что Gemini 3.7 Flash к этой презентации не относится.
- `The_Pixel_11_Series_ProandProXL.width-2000.format-webp.webp` (2000×1239, 1,61) — тоже
  чистое product-фото (2 телефона, перед и зад), без текста, тоже годный вариант, но
  показывает только 2 модели; Family-Shot с 4 цветами лучше передаёт «линейку» из
  заголовка статьи.
- Хаб-страница события (made-by-google-2026) не открывал отдельно — нужное фото уже
  нашлось на первой же дочерней странице.
- AI-генерация не понадобилась — официальное фото найдено с первой попытки.

## Alt-текст
"Четыре смартфона линейки Google Pixel 11 в разных цветах корпуса — чёрном, оливковом,
светло-зелёном и розовом, вид сзади, официальное фото Google"

## Уверенность в подборе: 90%
Официальный источник, subject-first (сам продукт крупным планом), готовое соотношение
16:9 без значимой обрезки, без текста и людей на кадре. Минус 10% — точная модель на
фото (Pixel 11 Pro XL по имени файла) не расшифрована в alt отдельно от остальной линейки,
чтобы не гадать между Pro и Pro XL по силуэту; alt намеренно описывает как «линейку Pixel 11».
