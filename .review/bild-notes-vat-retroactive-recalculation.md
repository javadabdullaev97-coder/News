# Bild notes: vat-retroactive-recalculation

## Стратегия: primary-source

## Источник картинки
- URL Telegram-поста: https://t.me/soliqnews/20420 (тот же пост, что процитирован
  в лиде и в `frontmatter.sources` как основной первоисточник статьи).
- Прямая ссылка на файл: https://cdn4.telesco.pe/file/CGgFGyOXUHNsuqP50008WHWGIfKhhtFHMh6fra60hjOlJj_W79Y2JfNXJw-KwouYroJtWPi5PhAjbPUCzf2IGc5PvHQAAU5SWLn1lv7YpqngTgdNMbS1QGUVqyQNnoexIRca3Ewz3rUegNzIstckyy8mDXoPwsjLw6spnti8eHkYuJN-5V3XQGmo0D5pBjnegCJTqTLUXsB9Wy4qpxJ5K2eYypKrlKAfejOM8dyW2mSX8YnvgBLniJubiHTs0y1_hX8L5j50htlajaYUAYD_lwPJLJ1zs2vfxEKjOhagrRQT9cIJoSQT7v7-qrJCebAS7FC-Zgnz1jBDRXohSsfy6A.jpg
- Тип: официальное фото здания Государственного налогового комитета
  (Soliq Qo'mitasi) в Ташкенте, приложенное к посту "Rasmiy munosabat"
  (официальный ответ) — живая фотографическая съёмка фасада с вывеской
  ведомства, не рисованная 3D-заготовка/график.
- mainVisualSubject из reporter-notes: «Здание/логотип Налогового комитета
  Узбекистана (soliq.uz)» — совпадает напрямую, subject-first соблюдён.
- Извлечение: `curl "https://t.me/soliqnews/20420?embed=1"` →
  `tgme_widget_message_photo_wrap` → `background-image` содержал прямую
  ссылку на cdn4.telesco.pe (публичный виджет отдал 800px по длинной стороне,
  как и предупреждает `image-pipeline.md`).
- Размер оригинала: 800×553 (ratio 1.446 — горизонтальный кадр, апскейл не
  потребовался для ориентации, только для заполнения кадра).

## Обработка (`scripts/prepare-image.py`)
```json
{
  "source": {"width": 800, "height": 553},
  "fit": {
    "mode": "cover",
    "scale": 2.0,
    "cropLoss": 0.1863,
    "offset": [0, 206],
    "upscaled": true,
    "note": "обрезано 19% по высоте; окно кропа выбрано по содержимому; исходник растянут в 2.00× ради заливки кадра"
  },
  "output": {
    "path": "public/images/posts/2026-08/vat-retroactive-recalculation-01.jpg",
    "url": "/images/posts/2026-08/vat-retroactive-recalculation-01.jpg",
    "width": 1600,
    "height": 900,
    "bytes": 265496,
    "quality": 90
  },
  "status": "ok"
}
```
Cover-режим, без подложки/полей, апскейл 2,0× в пределах разрешённых 2,5×,
обрезка 18,6% ниже лимита 45%.

## Отклонённые варианты
- `https://www.soliq.uz/sadmin/storage/news/August2024/*.jpg` (иллюстрации
  из статьи gov.uz о рейтинге устойчивости) — недоступны: `www.soliq.uz`
  сбрасывает TLS-соединение через прокси (`Connection reset by peer`),
  скачать не удалось.
- Соседние посты канала @soliqnews (20410–20423) — по превью не относятся
  к теме НДС/рейтинга устойчивости, не подошли по содержанию.
- Higgsfield-генерация не понадобилась: нашёлся официальный фотографический
  кадр здания ведомства прямо из первоисточника, использованного в статье.

## Особенность кадра
На фото — фирменный графический баннер канала «RASMIY MUNOSABAT» (узб.
«официальный ответ») в нижней трети кадра поверх фото здания. Это
собственная графика первоисточника (ведомственный канал), не стороннее
СМИ и не наш монтаж; в кадр 16:9 попадает частично — здание с вывеской
"SOLIQ QO'MITASI" остаётся основным узнаваемым элементом сверху.

## Alt-текст
«Здание Государственного налогового комитета Узбекистана в Ташкенте с
вывеской «Soliq qo'mitasi», кадр из официального Telegram-поста ведомства
о пересчёте НДС»

## Уверенность в подборе: 78%
Здание — прямое визуальное соответствие теме (ведомство, о решении которого
статья) и точное совпадение с `mainVisualSubject` из reporter-notes.
Уверенность снижена из-за фирменного баннера ведомства на узбекском языке
в нижней трети кадра — альтернативы без баннера в первоисточнике не нашлось,
`www.soliq.uz` был недоступен для проверки других фото.
