# Bild notes: nvidia-spacex-stake-21-billion-xai

## Стратегия: stock

## Ход поиска
- Официальные источники: SEC EDGAR (13F-HR — таблица данных, без изображений),
  Bloomberg и CNBC (403/paywall, недоступны для скрапинга изображений),
  NVIDIA Investor Relations (только векторный логотип компании
  s201.q4cdn.com/141608511/files/design/NVIDIA-logo.png — не годится как
  кадр 16:9, это плоский логотип без фотографического содержания).
  Итог: официального фото по теме нет.
- Фототека редакции (`config/stock-photos.json`): темы только cbu / sum /
  cash / inflation / prices / budget / salaries / payments / banking —
  под tech/корпоративные новости про Nvidia/SpaceX ничего нет.
  `pick-stock.mjs` не запускал — по списку тем видно, что не подойдёт.
- Reporter's `mainVisualSubject`: «Логотип/здание Nvidia рядом с ракетой
  или логотипом SpaceX — конкретного человека в кадре нет». Editor
  handoff (image-hint/image-avoid) — то же самое, плюс явный запрет на
  клипарт «инвестор с графиками» и биржевые тикеры.

## Источник картинки
- URL: https://images.unsplash.com/photo-1541185933-ef5d8ed016c2
  (permalink: unsplash.com/photos/rocket-ship-launching-during-daytime-Ptd-iTdrCJM)
- Автор: SpaceX (официальный аккаунт @spacex на Unsplash)
- Лицензия: Unsplash License (свободное использование)
- Тип: живая документальная фотография (запуск Falcon Heavy), не рисованная
  заготовка — в кадре чётко читается здание с логотипом SpaceX, что прямо
  раскрывает субъект статьи (доля Nvidia в SpaceX)
- Размер оригинала: 1920×1280 (ориентация горизонтальная, ratio 1.5)
- prepare-image.py: cover, scale 0.8333, cropLoss 0.1562 (обрезано 16%
  по высоте, окно кропа выбрано по содержимому) → 1600×900, 243 298 байт,
  quality 90. Полный JSON см. вывод скрипта ниже.

```json
{
  "source": {"width": 1920, "height": 1280},
  "fit": {"mode": "cover", "scale": 0.8333, "cropLoss": 0.1562,
          "offset": [0, 167], "upscaled": false,
          "note": "обрезано 16% по высоте; окно кропа выбрано по содержимому"},
  "output": {"path": "public/images/posts/2026-08/nvidia-spacex-stake-21-billion-xai-01.jpg",
             "url": "/images/posts/2026-08/nvidia-spacex-stake-21-billion-xai-01.jpg",
             "width": 1600, "height": 900, "bytes": 243298, "quality": 90},
  "status": "ok",
  "upscaled": false
}
```

## Отклонённые варианты
- NVIDIA Investor Relations logo PNG — плоский векторный логотип, не фото,
  не подходит под 16:9 живую съёмку
- Bloomberg / CNBC og:image — недоступны (403/paywall), не проверял
- Unsplash "spacecraft flying through the sky" (photo-1516850228053) —
  тоже фото SpaceX, но без здания/логотипа в кадре, менее конкретно
  привязано к субъекту статьи, чем выбранный вариант с логотипом на ангаре

## Alt-текст
"Запуск ракеты-носителя Falcon Heavy компании SpaceX с космодрома, на
заднем плане ангар с логотипом SpaceX"

## Уверенность в подборе: 80%
Живая документальная фотография SpaceX с чётко читаемым логотипом —
прямое визуальное попадание в субъект статьи (доля Nvidia именно в
SpaceX, а не в Nvidia как таковой). Понижаю за то, что фото не привязано
к конкретному инфоповоду (архивный снимок запуска Falcon Heavy, не текущее
событие) и не показывает Nvidia напрямую — но по правилу subject-first
SpaceX как приобретаемый актив важнее логотипа Nvidia.
