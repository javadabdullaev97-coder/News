# Bild notes: mintrans-national-transport-hackathon-aug2026

## Стратегия: primary-source

## Источник картинки
- URL поста: https://t.me/Mintrans_uz/28571 (фото 1 из альбома, посвящённого трём трекам хакатона)
- Прямой URL файла (Telegram CDN, может истечь): https://cdn4.telesco.pe/file/YgvplM6eIzoeeSZM9IFSXB8P93epTOkJsaaavZsmZpKkCft6wHrtFDv1eseJpJQswineOLSmab7hBr5thcttIt8XJElHqokonQzBSAxXaXyNi3FNLvquzRrttTFaJHrqH_t69MW3LgaKBu3orKHUGKNVdLxg4I_kr5XyigvIQtmGjEEWZ3zSfaCcu9BUMDF8GAI4ZWsn0L_YKNldJMLhdHFeuksnIiNtG4vWDP842CXcyyTSsJcFcNy8X9J1lgvQ5EWtxDyE6EyT9NNT89rRjo5NEQTbEyRrXWuCOD_aM9n_EDeusF4e37TNmjfxnt7w_uwxhIEcljZGv1ToCMlU2A.jpg
- Тип: живое фото с открытия хакатона, опубликовано официальным Telegram-каналом Минтранса
  РУз (`t.me/Mintrans_uz`) — источник уже в `frontmatter.sources`
- Содержание: общий план зала мероприятия, на большом экране заставка «NATIONAL TRANSPORT
  HACKATHON», на переднем плане — участники за ноутбуками в футболках с логотипом хакатона.
  Прямой subject-first снимок самого события, без стоковых заглушек.
- Размер оригинала: 800×449 (это верхний публичный лимит виджета `t.me/<slug>/<id>?embed=1`,
  см. `image-pipeline.md`) → `prepare-image.py`: mode=cover, scale=2.0045×, cropLoss=0,22%
  (0,0022), offset [4, 0] → 1600×900 (222 795 байт, quality 90)

### JSON от prepare-image.py
```json
{
  "source": {"width": 800, "height": 449, "path": "post28571_1.jpg"},
  "fit": {
    "mode": "cover",
    "scale": 2.0045,
    "cropLoss": 0.0022,
    "offset": [4, 0],
    "upscaled": true,
    "note": "обрезано 0% по ширине; окно кропа выбрано по содержимому; исходник растянут в 2.00× ради заливки кадра"
  },
  "output": {
    "path": "public/images/posts/2026-08/mintrans-national-transport-hackathon-aug2026-01.jpg",
    "url": "/images/posts/2026-08/mintrans-national-transport-hackathon-aug2026-01.jpg",
    "width": 1600,
    "height": 900,
    "bytes": 222795,
    "quality": 90
  },
  "status": "ok"
}
```

Апскейл 2,00× — в пределах текущего `MAX_UPSCALE = 2.5` в самом скрипте (докстринг
объясняет: умеренный апскейл сейчас разрешён политикой скрипта, так как выглядит
дешевле, чем размытая подложка вокруг мелкого фото). Кроп практически нулевой
(0,22%), риска обрезать значимую деталь нет — `crop-risky` не применяется.

## Отклонённые варианты
- `t.me/Mintrans_uz/28556` фото 1 — министр Илхом Махкамов виден только на видеоэкране
  (трансляция), а не вживую в кадре; субъект показан «через экран», это слабее прямого
  живого кадра.
- `t.me/Mintrans_uz/28556` фото 2, 3, 5–8 и `t.me/Mintrans_uz/28564` фото 1 (первый
  замминистра Маманбий Омаров на сцене) — все хорошие живые кадры с мероприятия,
  но выбранный кадр (28571 фото 1) лучше передаёт суть материала одним планом: видно и
  название хакатона на экране, и участников с ноутбуками, при этом соотношение сторон
  800×449 почти точно совпадает с целевым 16:9 — минимальный кроп/апскейл.
- Карточки без людей/события (стоковые 3D-рендеры, абстрактная цифровизация) не
  рассматривались — у мероприятия есть достаточно живых фото с самого события.

## Alt-текст
«Зал National Transport Hackathon в Ташкенте: участники за ноутбуками в футболках с
логотипом хакатона, на большом экране — заставка «National Transport Hackathon»»

## Уверенность в подборе: 90%
