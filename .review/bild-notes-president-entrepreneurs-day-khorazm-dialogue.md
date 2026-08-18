# Bild notes: president-entrepreneurs-day-khorazm-dialogue

## Стратегия: primary-source

## Источник картинки
- URL поста: https://t.me/napp_uz/2398 (Telegram-канал НАПП)
- Прямая ссылка на фото: https://cdn4.telesco.pe/file/aYGxwsbNUJooRgvUXWKm0Ht2WDkTYwZ55QOEE0ZG38hSALB0k6c7bCtn1R2cfhDRLxmhiwY4sXA2osmzQi9isBYAZyVpx3WOAq1KXLQ6aYk56kSagKHpSp87XN2tOYHIRoGupmmC4oqQbICcZYWNS72xBn4XIP0H21ynkSmL7sIEgv4CWviv85yzaFrwgz466XRtsbNYIKznsWErJ99ZKmSXkaE_PEpbRoiGJ9aFBtYbYfLpyNyS8jgH7DWvKX2eTZE60QoEZNjmMZ54vnjbZqkafUJws045c7XDO5afjqmr8whQfIsmQnroxWZVKh9zQcYi4HOkikW1MZDtCzSYPA.jpg
- Тип: официальное фото пресс-службы президента, репост через Telegram-канал НАПП. Текст поста (узб.) дословно совпадает с фактурой статьи — тот же анонс диалога, 25 тыс. по видеосвязи, 1,2 млн бизнес-сообщества, 84/861, 450/650 трлн сумов, $1 млрд — то есть это фото именно с этого мероприятия.
- Содержимое: Мирзиёев выступает с трибуны, на трибуне табличка «O'ZBEKISTON RESPUBLIKASI PREZIDENTINING TADBIRKORLAR BILAN OCHIQ MULOQOTI — XIVA, 2026», за спиной флаги Узбекистана. Subject-first в чистом виде — точное совпадение с image-hint editor'а.
- Проверка на повтор: `node scripts/photo-dupes.mjs --check` — кадр свободен, за 2 дня не выходил.
- Обработка `prepare-image.py`:
  ```json
  {
    "source": {"width": 800, "height": 534},
    "fit": {
      "mode": "cover",
      "scale": 2.0,
      "cropLoss": 0.1573,
      "offset": [0, 168],
      "upscaled": true,
      "note": "обрезано 16% по высоте; окно кропа выбрано по содержимому; исходник растянут в 2.00× ради заливки кадра"
    },
    "output": {
      "path": "public/images/posts/2026-08/president-entrepreneurs-day-khorazm-dialogue-01.jpg",
      "url": "/images/posts/2026-08/president-entrepreneurs-day-khorazm-dialogue-01.jpg",
      "width": 1600, "height": 900, "bytes": 150068, "quality": 90
    },
    "status": "ok"
  }
  ```
  Исходник — Telegram-виджет, публично отдаёт максимум 800px по длинной стороне (ожидаемо по image-pipeline.md). Апскейл 2.0× в пределах MAX_UPSCALE=2.5, обрезка 15,7% по высоте — ниже порога crop-risky (0,25), лицо и подпись на трибуне не срезаны. Визуально проверил итоговый кадр — резкий, без артефактов, читаемая табличка.

## Отклонённые варианты
- Не искал дальше в других каналах (minecofinuz, DAVAKTIVUZ, uzmetaxborotxizmati) — первый же официальный источник (НАПП) дал точное subject-first фото события, искать альтернативу смысла не было.
- Альтернатива из handoff (карта/панорама Хорезма с промышленными объектами) не понадобилась — есть прямое фото президента с мероприятия.

## Alt-текст
"Президент Шавкат Мирзиёев выступает с трибуны на VI открытом диалоге с предпринимателями в Хиве, за спиной флаги Узбекистана"

## Уверенность в подборе: 95%
