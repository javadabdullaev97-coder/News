# Bild notes: abituriyent-second-stage-deadline-aug8

## Стратегия: primary-source

## Источник картинки
- URL Telegram-поста: https://t.me/MyGovUz/3973
- Прямая ссылка на файл: https://cdn4.telesco.pe/file/QWKe0I9CbtYUMnXLPAuJj3jY7dDdS6b-qTq6JrzmkmiboD6hnBHzHJlZzwupAkVgk5S8g46pioRJiV98CLLl55WZ4rTbUK_hOALkU2WYcWPpQvU0DaGnrLpdmG-FyRyegZ1YsialSW2jMB3PGxGPUbxP7zeOVTETq8OxF7GXjvOIxLdUpVFKjGXL5h1Ls1MInEshophrXoU2cyDg8VfevJj4gNfOFYTAI-WYosgQVtDElDJU-ZdIHuno1p2Fik0sRw_8qX7_xRQJFKJswyhO2cOsy_mD_PYSEBF6NQuC8JYyqCz6EDQ47Fz6EzECiE0hycQqrptU8WXrIyjkwKmP3g.jpg
- Тип: официальная иллюстрация my.gov.uz (собственный Telegram-канал портала, тот же
  пост, что указан в `frontmatter.sources`). Молодой человек за компьютером с
  открытым личным кабинетом my.gov.uz (фото/лого/QR-мокап на экране), на
  заднем плане — сотрудники за столом с документами. Живая фотографическая
  композиция, не рисованный 3D-график/диаграмма.
- Извлечение: WebFetch/curl HTML `https://t.me/MyGovUz/3973?embed=1` →
  `tgme_widget_message_photo_wrap` → `background-image` содержал прямую
  ссылку на файл на cdn4.telesco.pe.
- Размер оригинала: 800×565 (ratio 1.415 — горизонтальный кадр, требование
  соблюдено без подложки).
- Обработка: `python3 scripts/prepare-image.py /tmp/original.jpg
  abituriyent-second-stage-deadline-aug8 --month=2026-08`

```json
{
  "source": {"width": 800, "height": 565, "path": "/tmp/original.jpg"},
  "fit": {
    "mode": "cover",
    "scale": 2.0,
    "cropLoss": 0.2035,
    "offset": [0, 38],
    "upscaled": true,
    "note": "обрезано 20% по высоте; окно кропа выбрано по содержимому; исходник растянут в 2.00× ради заливки кадра"
  },
  "output": {
    "path": "public/images/posts/2026-08/abituriyent-second-stage-deadline-aug8-01.jpg",
    "url": "/images/posts/2026-08/abituriyent-second-stage-deadline-aug8-01.jpg",
    "width": 1600,
    "height": 900,
    "bytes": 185821,
    "quality": 90
  },
  "status": "ok"
}
```

Апскейл 2.00× и обрезка 20,35% — оба в пределах, которые сам скрипт
считает допустимыми (MAX_UPSCALE=2.5, MAX_CROP=0.45 в текущей версии
`scripts/prepare-image.py`); cropLoss ниже порога 0,25 из раздела «Шаг 3б»,
эскалация к владельцу не требуется. Кадр горизонтальный изначально —
подложка/contain не понадобились.

## Отклонённые варианты
- https://t.me/BaholashUz/11301 (файл LcXptBIJI1AD...jpg) — тот же дедлайн,
  но карточка 800×800 (квадрат) с крупным текстовым баннером на узбекском
  «2 KUN QOLDI / MUDDAT: 8-AVGUST» поверх фото пустой аудитории с партами.
  Отклонил: (1) квадратная — потребовала бы либо жёсткого кропа, либо
  подложки, тогда как у альтернативы есть готовый горизонтальный кадр;
  (2) плотный текстовый оверлей на узбекском не читается на превью и
  дублирует то, что уже сказано в заголовке/лиде статьи на русском.

## Alt-текст
"Абитуриент за компьютером выбирает вуз в личном кабинете портала my.gov.uz,
на заднем плане сотрудники приёмной комиссии за столом с документами"

## Credit
"my.gov.uz" — официальная иллюстрация из Telegram-канала портала
(источник уже фигурирует в `frontmatter.sources`), собственных фото
человека в кадре нет, deepfake-риска нет (иллюстративная, не политическая
тема, лицо не публичное).

## Уверенность в подборе: 85%
