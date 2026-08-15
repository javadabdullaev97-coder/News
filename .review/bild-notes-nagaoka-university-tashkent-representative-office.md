# Bild notes: nagaoka-university-tashkent-representative-office

## Стратегия: primary-source

## Источник картинки
- URL поста: https://t.me/eduuz/50282 (frontmatter.sources[0])
- Прямой файл: https://cdn4.telesco.pe/file/UJPK2bBaMDSwETj-E2UfdyWh797UQXpbjyWcA15Bw8xyOlcF3hNmP2ZDvWmMc1buMid5YqKSA6LlZcVv7VNxxOsdyZGeTHAVNI_yPH4MHLoBiwf0McL5H9bHHuAIaoX8Yg2fOGaVjMdrOwAunTYYYj5j1glk0BDAGriO83JGcKhHH_R13FxInd1CvCWv--m51tfTtWHMKe8FLNfWCLvOs_te4mmtHpzDUyZlyNv9ZB-XTEORULbZ3c6bB9svXJ7T4OM_HxBme0Z6hgavy-3BNpTHkRK51fUz3bWlPcS1eqCiv4I9Z6-IAxEXzqtNSOeixyd44i6T9dgjDCcwjsqQKA.jpg
- Тип: фото пресс-службы (Telegram-канал Минвузнауки РУз, verified, `type: source` по белому списку) — первое (главное) фото альбома, привязанное к самому посту 50282 (`href="https://t.me/eduuz/50282?single"` в HTML embed)
- Подтверждение subject-first: на кадре видны 5 участников церемонии перерезания ленты — соответствует `mainVisualSubject` из задания (посол Японии, ректор ТГТУ, руководство университета Нагаока)
- Размер оригинала: 800×533 (ratio 1.5, горизонтальный — Telegram public embed отдаёт максимум 800px по длинной стороне, это ожидаемо и в норме)
- Обработка `prepare-image.py`:
  ```json
  {
    "source": {"width": 800, "height": 533},
    "fit": {
      "mode": "cover",
      "scale": 2.0,
      "cropLoss": 0.1557,
      "offset": [0, 163],
      "upscaled": true,
      "note": "обрезано 16% по высоте; окно кропа выбрано по содержимому; исходник растянут в 2.00× ради заливки кадра"
    },
    "output": {
      "path": "public/images/posts/2026-08/nagaoka-university-tashkent-representative-office-01.jpg",
      "url": "/images/posts/2026-08/nagaoka-university-tashkent-representative-office-01.jpg",
      "width": 1600,
      "height": 900,
      "bytes": 205698,
      "quality": 90
    },
    "status": "ok"
  }
  ```
- cropLoss 15,6% — ниже порога 25% для `crop-risky`, human-check не требуется. Визуально проверил итоговый кадр 1600×900: все пять лиц и лента в кадре, ничего критичного не срезано (обрезка ушла в верхнее/нижнее поле — потолок и ковёр).
- Апскейл 2,0× — в пределах `MAX_UPSCALE=2.5` текущей версии скрипта (умеренный апскейл разрешён политикой `prepare-image.py`, чтобы не уходить в contain/подложку на некрупном ТГ-фото); визуально резкость сохранилась, мыла на лицах нет.

## Отклонённые варианты
- Аватар канала eduuz (160×160, второй URL в HTML) — служебное изображение, не фото события
- 4 фото со страницы gov.uz/ru/edu/news/view/203749 (1280×853, встреча Шарипова с послом Хиратой 8 августа) — не выбраны: это другое событие (встреча на следующий день, не сама церемония открытия), а прямой источник о церемонии (eduuz/50282) уже дал живое горизонтальное фото нужного субъекта
- Остальные фото альбома eduuz/50283–50291 — тот же кадр ракурсом дальше/ближе, не смотрел все: первое фото альбома уже полностью закрывает mainVisualSubject

## Alt-текст
"Церемония открытия представительства Технологического университета Нагаока в ТГТУ: посол Японии Кэндзи Хирата, ректор ТГТУ Садритдин Турабджанов и руководство университета Нагаока перерезают красно-белую ленту"

## Уверенность в подборе: 92%
