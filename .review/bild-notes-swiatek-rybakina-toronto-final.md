# Bild notes: swiatek-rybakina-toronto-final

## Стратегия: primary-source

## Источник картинки
- Найдено через связку двух источников: `frontmatter.sources` статьи указывает
  на UbiTennis-превью (theguardian.com не отдаёт содержимое WebFetch'у, как
  и reporter'у ранее — ошибка инструмента на домене, не 403/404).
- В HTML UbiTennis картинка на странице подписана `data-caption="Iga Swiatek -
  WTA Toronto 2026 (@ X NBOtoronto)"` — это указало на официальный аккаунт
  турнира National Bank Open Toronto.
- Прямой обход к официальному сайту турнира (`nationalbankopen.com`) дал
  собственную новость о финале с полноразмерным кадром церемонии награждения:
  `https://assets.nationalbankopen.com/production/news/Iga-Swiatek-2026-Toronto-Morgan-Givens-Wick-Photography-for-National-Bank-Open-4.JPG`
  — фотограф указан прямо в имени файла: Morgan Givens / Wick Photography for
  National Bank Open. Это официальный турнирный фотограф, атрибуция
  проверяема напрямую по URL.
- URL: https://assets.nationalbankopen.com/production/news/Iga-Swiatek-2026-Toronto-Morgan-Givens-Wick-Photography-for-National-Bank-Open-4.JPG
- Тип: официальное фото турнира-организатора (National Bank Open), не сток.
- Subject-first: на фото Ига Швёнтек с трофеем, баннер "National Bank Open"
  читаем в кадре — соответствует image-hint из handoff и mainVisualSubject
  из reporter notes без компромиссов.

## Обработка
Исходник 2193×1600 (соотношение 1,37 — горизонтальный, живая репортажная
съёмка церемонии, не рисованная заготовка) → `scripts/prepare-image.py`:

```json
{
  "source": {"width": 2193, "height": 1600},
  "fit": {
    "mode": "cover",
    "scale": 0.7296,
    "cropLoss": 0.229,
    "offset": [0, 225],
    "upscaled": false,
    "note": "обрезано 23% по высоте; окно кропа выбрано по содержимому"
  },
  "output": {
    "path": "public/images/posts/2026-08/swiatek-rybakina-toronto-final-01.jpg",
    "url": "/images/posts/2026-08/swiatek-rybakina-toronto-final-01.jpg",
    "width": 1600,
    "height": 900,
    "bytes": 390241,
    "quality": 90
  },
  "status": "ok",
  "upscaled": false
}
```

cropLoss 0,229 — ниже порога 0,25 для ручной проверки (crop-risky), апскейла
нет. Проверено визуально: лицо и трофей в кадре целиком, срезан верхний край
с частью искр фейерверка и трибун — не субъект.

## Отклонённые варианты
- UbiTennis thumbnail (860×573, `Iga-Swiatek-Toronto-Finale-860x573.jpg.webp`) —
  тот же кадр серии, но заметно меньшего разрешения и в webp; предпочёл
  full-size оригинал с официального сайта турнира вместо ререндеренного
  превью с сайта-агрегатора.
- Guardian — не удалось получить содержимое (WebFetch стабильно отклоняет
  домен theguardian.com, тот же симптом, что фиксировал reporter).

## Alt-текст
«Ига Швёнтек поднимает трофей над головой на церемонии награждения после
победы в финале Кэнэдиан Оупен в Торонто, на фоне баннера National Bank Open
и фейерверка»

## Уверенность в подборе: 92%
Официальный кадр турнира-организатора с прямой атрибуцией фотографа,
subject-first (Швёнтек с трофеем, узнаваемый баннер турнира), горизонтальная
ориентация без подложки, обрезка в пределах нормы.
