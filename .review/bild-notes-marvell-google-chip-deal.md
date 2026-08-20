# Bild notes: marvell-google-chip-deal

## Стратегия: primary-source

## Источник картинки
- URL: https://images.siliconangle.com/blogs.dir/1/files/2026/08/Marvell.jpg
  (найдено в статье-источнике SiliconANGLE, подпись в HTML — "Photo: Marvell",
  т.е. фото официально атрибутировано Marvell, а не стоку/агентству SiliconANGLE)
- Тип: официальное фото штаб-квартиры Marvell с логотипом на фасаде — живая
  фотография, не рисованная заготовка
- Соответствие image-hint: прямое попадание — "офис Marvell" из handoff
- Размер оригинала: 855×504 (JPEG, 132 КБ)
- Обработка prepare-image.py: cover, scale 1.8713 (в пределах MAX_UPSCALE=2.5
  скрипта — апскейл умеренный, картинка на выходе не выглядит замыленной),
  обрезка 4.58% по высоте, офсет кропа (0, 43) → 1600×900, 259 КБ, quality 90.
  Полный JSON от скрипта:
  ```json
  {
    "source": {"width": 855, "height": 504},
    "fit": {"mode": "cover", "scale": 1.8713, "cropLoss": 0.0458,
      "offset": [0, 43], "upscaled": true,
      "note": "обрезано 5% по высоте; окно кропа выбрано по содержимому; исходник растянут в 1.87× ради заливки кадра"},
    "output": {"path": "public/images/posts/2026-08/marvell-google-chip-deal-01.jpg",
      "url": "/images/posts/2026-08/marvell-google-chip-deal-01.jpg",
      "width": 1600, "height": 900, "bytes": 259107, "quality": 90},
    "status": "ok"
  }
  ```
- Проверка на повтор: `photo-dupes.mjs --check` — свободен, за 2 дня этот кадр не выходил.

## Отклонённые варианты
- Официальный ньюсрум Marvell (marvell.com/company/newsroom.html) — свежих
  пресс-релизов именно про сделку с Google на дату публикации нет; свежие
  превью — только стандартный логотип-баннер (не фото).
- SEC 8-K (первичный источник факта) — текстовый документ, изображений нет.
- Google Cloud blog / TPU-страницы — не нашёл подходящего горизонтального
  официального фото чипа с логотипом Google для этой конкретной сделки
  (страница ironwood-tpu-generally-available вернула 404, topics/tpu — без
  чёткого og:image под тему).
- Логотип Broadcom как основной объект — не рассматривал по прямому запрету
  из image-avoid (Broadcom — только контекст в тексте).
- Фото людей-спикеров — в источниках их нет, и handoff явно просит избегать.

## Alt-текст
"Здание штаб-квартиры Marvell Technology с логотипом компании на фасаде, дневная съёмка"

## Уверенность в подборе: 85%
