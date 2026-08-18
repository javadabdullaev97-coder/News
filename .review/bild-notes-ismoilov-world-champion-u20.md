# Bild notes: ismoilov-world-champion-u20

## Стратегия: primary-source

## Источник картинки
- URL поста: https://t.me/minsportuz/90889 (основной пост Минспорта РУз про победу)
- Фото: https://cdn4.telesco.pe/file/Fli2PHkvKLL5R8qkFY9UaLkc5P46Loa6K5JF24bO7zvzqDiEezzaEih0qED4dSKvyNslLBmEIcv-VjVBZryf3Tb5PjZ33AO6DNsFDN3b5mDIZQlTeiF4z6xqKEj2ZPpWnkoVNybK67ufD1wJKSMA3Rt1wF_iMUwpXIMMc0EM55voJlh-mOl_i0gKpitMmUFSk5Vx06wVO3y_nqAFvNRxIU8hh748Gp-P31qaRfxB0WmBmLvO9Bhw8IyXTQLDxZm4aUCwuUBkGmX9cvleK6jEuBNRJ8rwOT54C6bE0Ss5F7Qdp5rgtMzjfTn_RZzRbSqPR-t8Se3RQiq92oQzeDMUZw.jpg
- Тип: фото пресс-службы Минспорта РУз, opengraph-фото ТГ-поста (Исмоилов празднует победу, флаг Узбекистана на плечах, крупный план лица)
- Проверка дублей: `node scripts/photo-dupes.mjs --check` → "свободен, за 2 дн. этот кадр не выходил"
- Обработка `prepare-image.py`:
```json
{
  "source": { "width": 800, "height": 599 },
  "fit": {
    "mode": "cover",
    "scale": 2.0,
    "cropLoss": 0.2487,
    "offset": [0, 21],
    "upscaled": true,
    "note": "обрезано 25% по высоте; окно кропа выбрано по содержимому; исходник растянут в 2.00× ради заливки кадра"
  },
  "output": {
    "path": "public/images/posts/2026-08/ismoilov-world-champion-u20-01.jpg",
    "url": "/images/posts/2026-08/ismoilov-world-champion-u20-01.jpg",
    "width": 1600, "height": 900, "bytes": 203891, "quality": 90
  },
  "status": "ok"
}
```
Ориентация исходника горизонтальная (800×599, ratio ~1.34) — соответствует
правилу владельца про 16:9. cropLoss 0.2487 — ниже порога crop-risky (0.25),
апскейл 2.0× ниже предела MAX_UPSCALE скрипта (2.5×). Лицо и флаг после
кропа полностью в кадре, ничего значимого не срезано (проверено визуально
на выходном файле).

## Отклонённые варианты
- https://t.me/OlympicUz/46326 — визуально тот же кадр (та же поза, тот же
  момент съёмки), но другой файл ТГ-компрессии; не взят, чтобы не дублировать
  почти идентичный снимок — основной пост Минспорта первичнее.
- https://t.me/minsportuz/90890, фото 1 (подиум, вручение медали Ненадом
  Лаловичем) — хорошая альтернатива по теме «вручение пояса», но в кадре
  крупным планом соперник Казмахов (красная форма РФ) слева, что противоречит
  image-avoid из handoff («лицо соперника не в фокусе как главный объект»).
- https://t.me/minsportuz/90890, фото 2 и 3 (общий план подиума, президиум
  UWW) — Исмоилов слишком мелко, не subject-first.
- uww.org/article/u20-world-championships-2026-entries — страница со списком
  участников, фото турнира на ней не найдено, не открывал повторно.

## Alt-текст
"Кувончбек Исмоилов с флагом Узбекистана на плечах празднует победу в финале
чемпионата мира U20 по греко-римской борьбе в Братиславе"

## Уверенность в подборе: 95%
Subject-first, официальный источник (Минспорт РУз), живая фотография,
горизонтальная ориентация, лицо спортсмена полностью в кадре после обработки.
