# Bild notes: uzbekfilm-debts

## Стратегия: primary-source

## Источник картинки
- URL: https://cdn4.telesco.pe/file/KFaFW4kmGwF7UiQF-y7z_3LP5QeQgF4kUff_bBLyxP-zg4H2_VKsj8ToqDei6Wo52bRR267_nLPs6RN5fG7g7C0ZnPpryuPLhO7NY75l7ygMeRFRWHwNBbaRJJisGGvbS70wcvZ6vadkcmiSjeNree_v6w8eqnXqaUBu-QOHqGNlsthoCh3_D_Pc5RYG-XPKPNJOEgrjocxxawrakNBqABaDmwDcstGCmqZcXB8khlXmGL_vQA6lbDdbmWsrx-ZqdQ7_yHmCbMllhxuqDAuIgI3NR8vdrZNbBDvgXLXmQk-h8b1ofzDiwXo3RS9biM7z-mxisCklZmzLFQCUilIIYg.jpg
- Взято напрямую из поста-первоисточника https://t.me/uzbekkinopress/30519 (embed HTML, background-image самого поста). Текст поста сверен построчно с текстом статьи (22,9 млн евро, 1 млрд сумов, 12 автомобилей, 12 дней, 60 млрд сумов) — фото точно принадлежит этому посту, а не соседнему.
- Тип: живое фото пресс-службы (Агентство кинематографии), не скриншот, не рисованная заготовка. Жахонгир Ахмедов в кабинете с гербом Узбекистана, держит документы с таблицей цифр — совпадает с `image-hint` (вариант «Ахмедов на публичном мероприятии»).
- Размер оригинала: 800×584 (это стандартный публичный лимит Telegram embed по длинной стороне — see comments in prepare-image.py). Прошёл MIN_SOURCE=600.

### Вывод prepare-image.py
```json
{
  "source": {"width": 800, "height": 584},
  "fit": {
    "mode": "cover",
    "scale": 2.0,
    "cropLoss": 0.2295,
    "offset": [0, 164],
    "upscaled": true,
    "note": "обрезано 23% по высоте; окно кропа выбрано по содержимому; исходник растянут в 2.00× ради заливки кадра"
  },
  "output": {
    "path": "public/images/posts/2026-08/uzbekfilm-debts-01.jpg",
    "url": "/images/posts/2026-08/uzbekfilm-debts-01.jpg",
    "width": 1600,
    "height": 900,
    "bytes": 165304,
    "quality": 90
  },
  "status": "ok",
  "upscaled": false
}
```
Апскейл 2.0× и обрезка 22,95% — в пределах текущих порогов скрипта
(MAX_UPSCALE=2.5, MAX_CROP=0.45 для cover-режима у не-вертикального
исходника; изображение горизонтальное, AR ~1.37, режим contain/подложка
не требовался). Причина повышенных порогов — прямо в шапке
`prepare-image.py`: Telegram отдаёт публично не больше 800px по длинной
стороне, поэтому апскейл почти неизбежен для кадров из ТГ.

## Проверка на повтор
`node scripts/photo-dupes.mjs --check` — «свободен, за 2 дн. этот кадр не выходил».

## Отклонённые варианты
- Скриншот самого Telegram-поста — прямо запрещён `image-avoid` в handoff, не рассматривался как кадр.
- Фото здания киностудии «Узбекфильм» — не нашлось свежего официального кадра в этом же посте/канале за разумное время поиска; фото Ахмедова оказалось прямым попаданием в `image-hint` и было доступно немедленно, поиск на этом остановлен.
- Автомобили с номерами — не рассматривались согласно `image-avoid`.

## Alt-текст
"Жахонгир Ахмедов на рабочем совещании держит документы с финансовыми показателями «Узбекфильма»"

## Уверенность в подборе: 85%
Прямое попадание в image-hint, официальный источник, фото из самого поста
с заявлением. Снижение с более высокой оценки — за счёт апскейла 2× (мелкая
резкость по краю кадра) и мелкого разрешения оригинала (800×584).
