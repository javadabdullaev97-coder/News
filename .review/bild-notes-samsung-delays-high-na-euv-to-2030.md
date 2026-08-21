# Bild notes: samsung-delays-high-na-euv-to-2030

## Стратегия: primary-source

## Источник картинки
- URL: https://img.digitimes.com/newsshow/20260820vl217_files/2_b.jpg
- Найдена как главное изображение статьи-источника DigiTimes
  (https://www.digitimes.com/news/a20260820VL217/samsung-high-na-euv-production-1nm-high-na.html),
  подпись в HTML: "Credit: ASML".
- Тип: официальное пресс-фото производителя литографического оборудования (ASML) —
  разрезной снимок EUV-станка NXE:3400B с подсветкой пути ультрафиолетового излучения.
  Людей на кадре нет — соответствует image-hint из handoff.
- Размер оригинала: 640×427 → cover, масштаб 2,50× (в пределах MAX_UPSCALE=2.5),
  обрезано 15,69% по высоте → 1600×900 (208 274 байт, quality 90).
  Полный JSON от prepare-image.py:
  ```json
  {
    "source": {"width": 640, "height": 427},
    "fit": {"mode": "cover", "scale": 2.5, "cropLoss": 0.1569, "offset": [0, 70],
            "upscaled": true, "note": "обрезано 16% по высоте; окно кропа выбрано по содержимому; исходник растянут в 2.50× ради заливки кадра"},
    "output": {"path": "public/images/posts/2026-08/samsung-delays-high-na-euv-to-2030-01.jpg",
               "url": "/images/posts/2026-08/samsung-delays-high-na-euv-to-2030-01.jpg",
               "width": 1600, "height": 900, "bytes": 208274, "quality": 90},
    "status": "ok"
  }
  ```
- photo-dupes.mjs: "свободен, за 2 дн. этот кадр не выходил" — проверка пройдена до обработки.

## Примечание по точности
Модель на фото — NXE:3400B (обычный low-NA EUV, серия NXE), а не High-NA (серия EXE),
о переносе которой статья. Alt-текст сформулирован без утверждения, что это именно
High-NA станок, — только "литограф EUV ASML" и модель по факту на шильдике.
Кадр иллюстрирует технологию EUV-литографии в целом (тема статьи), не выдаёт себя
за фото конкретного High-NA станка.

## Отклонённые варианты
- https://www.sammobile.com/wp-content/uploads/2026/07/Samsung-Foundry-SAFE-Forum-2026-Korea-Event-1200x675.jpg —
  фото Шин Чон Сина (вице-президент Samsung Foundry) на конференции SAFE Forum 2026.
  Отклонено: на фото человек, а handoff прямо просит кадр без людей
  (literographic equipment / clean room, "людей на фото нет"), плюс это не тот
  спикер, о котором текст статьи (Пак Чан Мин), — риск путаницы с image-avoid.

## Alt-текст
"Литограф EUV ASML NXE:3400B в разрезе: виден путь ультрафиолетового излучения
внутри станка для производства микрочипов"

## Уверенность в подборе: 80%
