# Bild notes: uzbekistan-islamic-finance-capital-market-law

## Стратегия: primary-source

Reporter в задании отметил, что явного визуального субъекта нет и что в посте
НАПП «нет фото». Это оказалось неточно: пост `https://t.me/napp_uz/2364`
содержит фотографию самой встречи (первый и единственный медиа-объект поста,
`tgme_widget_message_photo_wrap`) — это subject-first кадр в чистом виде,
показывает именно то событие, о котором статья.

## Источник картинки
- URL исходника (Telegram CDN, отдано `t.me/napp_uz/2364?embed=1`):
  `https://cdn4.telesco.pe/file/S9QqYCJ1NOkzJxIcRoKx3smvrFaWQhfzMX5DBlg2Iu-TLoQkQ5x9OeRJw_W4XM57ICktgJOQBK1pXHOMD2-qm3lkPcbvk4WICM8Nz5XG4matk9OAU-u1wPNFS9MKmpPNeGz0Fp-G2ruYzSGuQ-EC7IalNT5FNzN1T-K1J49utAorrWOZWPbBM4DQ7A0QiL-NP99i3V0kya_USGpJT0gz30tuKIExFFgegoUPf8D-Rk7PzHoCETXhOUFj9ZXsFqkXhne_IsQI0sAJq9iD7_2JKoc0uLLJ3uNt5OCfTQXpVn_YC5zf_ynn9Tb8-wUt7eF59xSfIOxu-GgWDjYlKDUh6Q.jpg`
- Пост-источник: https://t.me/napp_uz/2364 (официальный, верифицированный канал НАПП,
  тот же URL уже в `frontmatter.sources`)
- Тип: официальное фото пресс-службы НАПП с самой встречи. На экране в кадре —
  логотип НАПП, за столом — делегации (реальные участники встречи), живая
  документальная съёмка, не рисованная заготовка и не инфографика.
- Ориентация: горизонтальная изначально (800×533, соотношение 1,5:1), горизонталь
  искать не пришлось.
- Обработка `prepare-image.py`:
  ```json
  {
    "source": {"width": 800, "height": 533},
    "fit": {
      "mode": "cover",
      "scale": 2.0,
      "cropLoss": 0.1557,
      "offset": [0, 67],
      "upscaled": true,
      "note": "обрезано 16% по высоте; окно кропа выбрано по содержимому; исходник растянут в 2.00× ради заливки кадра"
    },
    "output": {
      "path": "public/images/posts/2026-08/uzbekistan-islamic-finance-capital-market-law-01.jpg",
      "url": "/images/posts/2026-08/uzbekistan-islamic-finance-capital-market-law-01.jpg",
      "width": 1600, "height": 900, "bytes": 246684, "quality": 90
    },
    "status": "ok"
  }
  ```
  Апскейл 2,00× — в пределах разрешённых 2,5×; исходник 800×533 выше
  MIN_SOURCE=600. cropLoss 15,6% — ниже порога crop-risky (0,25) и, что
  важнее, обрезка идёт по верху/низу группового кадра за столом (потолок и
  край стола), а не по лицам или ключевому объекту — риска срезать субъект
  нет, `editor-queue` не нужен.

## Отклонённые варианты
- Higgsfield-генерация (AI) — не понадобилась, т.к. subject-first фото нашлось
  сразу в первоисточнике; по правилу №1 живое фото всегда приоритетнее
  генерации.
- napp.uz (`/ru/news/...`) — страница на JS-рендере (SPA), `og:image` и `<img>`
  с фото встречи в статическом HTML не отдаёт; фото взято напрямую из
  Telegram-поста той же новости — тот же официальный источник, надёжнее для
  автоматического скачивания.

## Alt-текст
«Встреча представителей НАПП с делегацией Исламского банка развития и ПРООН
за столом переговоров, на экране — логотип НАПП»

## Уверенность в подборе: 92%
