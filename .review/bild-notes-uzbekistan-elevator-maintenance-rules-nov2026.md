# Bild notes: uzbekistan-elevator-maintenance-rules-nov2026

## Стратегия: stock (B1 — публичный бесплатный банк, CC0)

## Задача от поручения (handoff)
`image-hint`: лифт в подъезде МКД — кабина, панель управления или машинное
отделение, без конкретного человека, тема о техническом регламенте.
`image-avoid`: аварийные/повреждённые лифты, кадры с ЧП или пострадавшими —
материал не про инцидент.

## Шаг A — первоисточник
Оба `sources` — lex.uz (тексты приказа и базового акта). Проверил через
WebFetch страницу `lex.uz/ru/docs/-8406077`: `og:image` отсутствует, в теле
страницы только служебная графика (логотип сайта, иконки соцсетей, бейдж
www.uz, значки Google Play/App Store) — контентных фото к документу нет.
Это сайт-агрегатор нормативных актов, живых фото у него в природе не бывает.
Дальше по документу первоисточника идти некуда — нет ни пресс-релиза
ведомства с медиа, ни связанного Telegram-поста в `sources`.

## Шаг B0 — фототека редакции
`config/stock-photos.json` — темы `cbu, sum, cash, inflation, prices,
budget, salaries, payments, banking`. Лифтов/ЖКХ/техрегламентов среди тем
нет, `pick-stock.mjs` не запускал — тема заведомо не покрыта.

## Шаг B1 — публичные бесплатные банки (Openverse API, cc0/pdm)
Ключей `UNSPLASH_*`/`PEXELS_*` в окружении нет; искал через открытый API
Openverse (агрегирует CC0/PDM с разных провайдеров, включая Unsplash,
StockSnap, Flickr, rawpixel, Smithsonian, Wikimedia).

Запросы и результаты:
- `elevator cabin interior` — 0 релевантных (архитектурные чертежи rawpixel).
- `lift interior` — 123 результата, почти все Wikimedia (чёрный список —
  не берём) плюс нерелевантные интерьеры торговых центров в Китае/Гонконге.
- `elevator control panel` — 9 результатов, лучшие два — Wikimedia (в чёрном
  списке) и мелкий фликкр-кадр 768×1024 (портрет).
- **`elevator buttons` — 140 результатов.** Топ-кандидат:
  **«Elevator Buttons» (StockSnap, id `QNFDIZPFN6`), автор Kevin Sequeira,
  лицензия CC0 1.0, 4946×3340 (landscape).** Панель кнопок этажей лифта
  крупным планом с брайлевскими обозначениями, без людей, без признаков
  аварии — прямое попадание в `image-hint` («панель управления»).
  Остальные результаты — Wikimedia (чёрный список), thingiverse
  (3D-рендер для 3D-печати, не фото), нерелевантные фликкр-кадры малого
  разрешения или в портретной ориентации.
- `elevator machine room` / `elevator motor room` — 0–4 результата, все
  нерелевантны (Смитсоновский музей — хижина плантации; чертежи самолётов
  thingiverse).
- `elevator shaft`, `residential elevator`, `apartment building elevator`,
  `elevator doors`, `elevator lobby` — просмотрел, релевантных не по
  Wikimedia и не портретных не нашлось.

## Загрузка и обработка
- Прямая ссылка на файл через CDN StockSnap (`cdn.stocksnap.io/img-thumbs/...`)
  без `User-Agent` браузера отдаёт Cloudflare-заглушку (403/HTML); с
  `User-Agent: Mozilla/5.0` отдаёт файл нормально.
- Доступен только уровень `960w` (960×648, JPEG, ~50 КБ) — HTML-страницу
  фото на `stocksnap.io` Cloudflare блокирует полностью (`Just a moment...`),
  другие размерные суффиксы CDN (`1280w`, `1920w`, `2960w`, `large`,
  `original` и т.д.) — 404. Это максимум, доступный без обхода
  Cloudflare-защиты.
- `node scripts/photo-dupes.mjs --check` — кадр свободен, за 2 дня не
  выходил.
- `python3 scripts/prepare-image.py original.jpg
  uzbekistan-elevator-maintenance-rules-nov2026 --month=2026-08`:
  ```json
  {
    "source": {"width": 960, "height": 648},
    "fit": {
      "mode": "cover",
      "scale": 1.6667,
      "cropLoss": 0.1667,
      "offset": [0, 32],
      "upscaled": true,
      "note": "обрезано 17% по высоте; окно кропа выбрано по содержимому; исходник растянут в 1.67× ради заливки кадра"
    },
    "output": {
      "path": "public/images/posts/2026-08/uzbekistan-elevator-maintenance-rules-nov2026-01.jpg",
      "url": "/images/posts/2026-08/uzbekistan-elevator-maintenance-rules-nov2026-01.jpg",
      "width": 1600, "height": 900, "bytes": 156395, "quality": 90
    },
    "status": "ok"
  }
  ```
  Апскейл 1,67× и обрезка 17% — в пределах допусков текущей версии скрипта
  (`MAX_UPSCALE=2.5`, `MAX_CROP=0.45`); визуально после обработки резкость
  сохранена, кроп по вертикали не срезал ни одну кнопку целиком.

## Отклонённые варианты
- Wikimedia-результаты по всем запросам («lift interior», «elevator control
  panel», «elevator button control penal», «Dual elevator door buttons» и
  т.д.) — источник в чёрном списке редполитики (раздел 2).
- Flickr «Old elevator panel» (768×1024) — портретная ориентация, уходит в
  `contain` с подложкой, хуже кандидата StockSnap.
- Thingiverse «Elevator Buttons» — 3D-модель для печати, не фотография.
- Smithsonian «Cabin from Point of Pines Plantation» (по запросу «elevator
  machine room») — не по теме, случайное совпадение по описанию.
- HTML-страница `stocksnap.io/photo/elevator-buttons-QNFDIZPFN6` (для
  поиска ссылки на файл большего разрешения) — недоступна из-за
  Cloudflare-защиты (403 при любом `User-Agent`), остался только CDN-хотлинк
  960w.

## AI-генерация (Higgsfield)
Не понадобилась — стоковый вариант нашёлся и подошёл. Инструменты MCP
Higgsfield (`generate_image` и т.д.) не подключены к тулсету этого прогона
(доступны только Read/Edit/WebFetch/Bash/Grep/Glob) — если бы сток не
нашёлся, пришлось бы уходить в очередь владельца (`no-image`), как в
прежних прецедентах (`bild-notes-design-code-tashkent-reversal.md` и др.).

## Alt-текст
"Панель управления лифта в подъезде многоквартирного дома с кнопками
этажей и тактильными обозначениями для незрячих, людей в кадре нет"

## Уверенность в подборе: 82%
Плюс: точное попадание в `image-hint` (панель управления лифта), живая
фотография (не 3D-рендер), лицензия CC0 1.0 через официальный API
Openverse — чище требования об «Unsplash License», нет людей, нет
намёка на аварию/ЧП, источник не в чёрном списке. Минус: доступный
хотлинк — всего 960×648, обработка потребовала апскейла 1,67× (в пределах
допуска скрипта, но не нативное высокое разрешение); полноразмерный файл
со страницы StockSnap получить не удалось из-за Cloudflare.
