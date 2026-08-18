# Bild notes: moratorium-business-inspections

## Стратегия: primary-source

## Источник картинки
- Пост: https://t.me/biznes_ombudsman/13047 (фото из фотоальбома, опубликованного на канале Бизнес-омбудсмена вместе с постами 13036/13042, которые уже стоят в frontmatter.sources)
- URL файла: https://cdn4.telesco.pe/file/S9ZJ-FR0C4cMuk6pbpqcnqNtjoMyHH2lIADau_6ZNX7kcknAbBmqCucNfnfY7Bl3A_mpf5W1WNukgO1pyc3054HEoSktveUJ9wUNze1mqV9YiyGc99r4I9Eokl2YestaYUpy_7MaijIdojq1O9LhSMQgsU9nC676AYQ1gSHydbmruG0rYxyCMbsHruHa0V5ViXYLnLi8Gx-H3DDZd3cyyofWTxf-nmrCQNRYp7JCkEeCoXIjrdjpoJsxGYEJskZatygOQ280w_uXmgmgppcp56T7Mi2T24slPkGpGBabpVtjvdEThZx9coAoHwjpDxZ3g0Z5G7rnVTMHX_BNiN84tA.jpg
- Тип: официальное событийное фото (не блюр-превью видео) — Мирзиёев на трибуне VI открытого диалога с предпринимателями, на баннере трибуны читается «O'ZBEKISTON RESPUBLIKASI PREZIDENTINING TADBIRKORLAR BILAN OCHIQ MULOQOTI, XIVA, 2026» — прямое визуальное подтверждение темы и места события.
- Проверка дублей: node scripts/photo-dupes.mjs --check → «свободен, за 2 дн. этот кадр не выходил».
- Обработка: python3 scripts/prepare-image.py — исходник 800×533 → cover, масштаб 2,00×, обрезано 15,57% по высоте (окно кропа по содержимому) → 1600×900, 167 656 байт, quality 90.
  ```json
  {
    "source": {"width": 800, "height": 533},
    "fit": {"mode": "cover", "scale": 2.0, "cropLoss": 0.1557, "offset": [0, 166], "upscaled": true,
      "note": "обрезано 16% по высоте; окно кропа выбрано по содержимому; исходник растянут в 2.00× ради заливки кадра"},
    "output": {"path": "public/images/posts/2026-08/moratorium-business-inspections-01.jpg",
      "url": "/images/posts/2026-08/moratorium-business-inspections-01.jpg", "width": 1600, "height": 900,
      "bytes": 167656, "quality": 90},
    "status": "ok"
  }
  ```
- Апскейл 2,00× — в пределах текущего MAX_UPSCALE=2.5 скрипта (Telegram-виджет отдаёт исходники максимум 800px по длинной стороне; актуальная версия prepare-image.py сознательно допускает умеренный апскейл ради заливки кадра вместо подложки, см. комментарии в scripts/prepare-image.py). cropLoss 15,57% — далеко от порога crop-risky (>0,25), умный кроп не резал лицо.

## Отклонённые варианты
- Пост https://t.me/shmirziyoyev/35147 (пресс-служба президента) — грид-медиа помечен как `blured` (превью видео 9:16, вертикальное, низкое качество), не фото.
- Пост https://t.me/biznes_ombudsman/13042 — тоже `blured` видео-превью, не годится.
- Пост https://t.me/biznes_ombudsman/13036 — «чистое» фото, но общий план зала (800×533) без крупного плана президента — subject менее выражен, чем на 13047.
- Пост https://t.me/biznes_ombudsman/13041 — Мирзиёев на трибуне сбоку, тоже годный кадр, но без улыбки/контакта с камерой — выбрал 13047 как более выразительный для карточки.
- Пост https://t.me/biznes_ombudsman/13046 — общий план сцены с экраном видеосвязи, subject (президент) мелкий — отклонён.

## Alt-текст
«Президент Шавкат Мирзиёев выступает с трибуны на VI открытом диалоге с предпринимателями в Хиве, на фоне флагов Узбекистана»

## Уверенность в подборе: 92%
Официальное событийное фото с точным баннером мероприятия, subject-first (сам Мирзиёев на трибуне), источник уже в frontmatter.sources, дублей за два дня нет.
