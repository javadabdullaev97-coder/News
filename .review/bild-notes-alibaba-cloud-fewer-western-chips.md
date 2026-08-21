# Bild notes: alibaba-cloud-fewer-western-chips

## Стратегия: stock (тематический, живая фотография)

## Handoff
`HANDOFF_PATH` заполнен: image-hint — «Логотип Alibaba Cloud / офис или
дата-центр Alibaba с серверным оборудованием. Человека-героя в материале
нет. Альтернатива — изображение ИИ-чипа/процессора как метафора темы
«собственные чипы»»; image-avoid — логотип/продукция Nvidia или AWS как
главный визуальный субъект. NOTES_PATH не открывал — handoff уже содержал
image-hint.

## Ход подбора

### A — первоисточники (отклонено)
- **SEC-фильинг (форма 6-K)** — текстовый финансовый документ, изображений
  не содержит.
- **Пресс-релиз Alibaba Group** (alibabagroup.com/en-US/document-2026456290057781248) —
  прямой `curl` заблокирован по UA (403, `denied by UA ACL = blacklist`),
  зашёл через WebFetch: на странице нет содержательных изображений — только
  логотип Alibaba и иконки соцсетей/сертификатов в base64. Фото дата-центра
  или продукции T-Head на странице релиза нет. Отклонено полностью.

### B0 — фототека редакции
`node scripts/pick-stock.mjs --list` — все темы фототеки (`cbu`, `sum`,
`cash`, `monetary-policy`, `banking`, `fx`, `dollar`, `rates`) про узбекскую
макроэкономику, к Alibaba Cloud/дата-центрам/чипам отношения не имеют.
Скрипт не запускал целевым топиком — тема явно не входит в список.

### C — Higgsfield
Не понадобился — B1 дал подходящий кадр без людей и без чужих логотипов.

### B1 — Unsplash (выбранный вариант)
Искал через поиск Unsplash `data-center-server-room` и `data-center`.
Рассмотренные кандидаты:
- Winston Chen, «close-up of server cooling fans in a vibrant data center»
  (photo-1782094673136-5198a372980c, 3000×2000) — живое фото, landscape,
  но резкая розово-фиолетовая неоновая подсветка выглядит клубной/игровой,
  не подходит по тону для финансовой новости о крупном облачном провайдере.
  Отклонено.
- Tony Marinescu, «modern data center with rows of white server cabinets»
  (photo-1784652852605-6945598f2af3) — при скачивании оказался
  2160×2700 (portrait), не подходит по ориентации. Отклонено.
- İsmail Enes Ayhan, «server room aisle with metal equipment racks»
  (photo-1584169417032-d34e8d805e8b, 3000×1725) — похоже на цех в процессе
  монтажа (открытые кабели, деревянные поддоны на полу), выглядит
  недостроенным/неопрятным для готовой публикации. Отклонено в пользу
  более чистого кадра.
- **Taylor Vick, «server room with rows of black and white cabinets under
  blue cables»** (photo-1564457461758-8ff96e439e83, 3000×1687) — выбран.
  Чистый, профессиональный кадр действующего дата-центра: стойки серверов,
  структурированные кабели, фальшпол — прямая иллюстрация субъекта
  «дата-центр с серверным оборудованием» из image-hint. Без людей, без
  логотипов брендов (в т.ч. Nvidia/AWS — соблюдён image-avoid), без
  глянцевых 3D-заготовок — реальная документальная съёмка.

- Страница поиска: https://unsplash.com/s/photos/data-center
- Прямая ссылка: https://images.unsplash.com/photo-1564457461758-8ff96e439e83
- Автор: Taylor Vick, Unsplash License (свободное использование с
  атрибуцией)
- Размер оригинала: 3000×1687 (landscape, ratio ~1,78 — почти готовый 16:9)
- Проверено `photo-dupes.mjs` — свободен, за 2 дня этот кадр не выходил.

## Обработка

```bash
curl -sL "https://images.unsplash.com/photo-1564457461758-8ff96e439e83?q=90&w=3000&auto=format&fit=max" -o /tmp/cand4.jpg
node scripts/photo-dupes.mjs --check /tmp/cand4.jpg   # свободен
python3 scripts/prepare-image.py /tmp/cand4.jpg alibaba-cloud-fewer-western-chips --month=2026-08
```

```json
{
  "source": {"width": 3000, "height": 1687},
  "fit": {"mode": "cover", "scale": 0.5335, "cropLoss": 0.0003, "offset": [0, 0],
    "upscaled": false, "note": "обрезано 0% по ширине; окно кропа выбрано по содержимому"},
  "output": {"path": "public/images/posts/2026-08/alibaba-cloud-fewer-western-chips-01.jpg",
    "url": "/images/posts/2026-08/alibaba-cloud-fewer-western-chips-01.jpg",
    "width": 1600, "height": 900, "bytes": 395686, "quality": 90},
  "status": "ok", "upscaled": false
}
```

`cropLoss 0.0003` — источник уже почти 16:9, обрезка минимальна.

## Отклонённые варианты
- Пресс-релиз Alibaba Group — на странице нет содержательных изображений
  (только логотип и base64-иконки соцсетей/сертификатов).
- SEC-фильинг 6-K — текстовый документ без изображений.
- Winston Chen (server cooling fans) — неоновая розово-фиолетовая подсветка,
  тон не подходит финансовой новости.
- Tony Marinescu (white server cabinets) — оказался portrait-ориентации.
- İsmail Enes Ayhan (server room aisle) — вид похож на недостроенный/
  незаконченный монтаж, отклонён в пользу более чистого кадра.

## Alt-текст
«Ряды серверных стоек и шкафов с сетевыми кабелями в дата-центре»

## Credit
`Unsplash / Taylor Vick`

## Уверенность в подборе: 60%

Официального фото Alibaba Cloud (дата-центра, офиса или логотипа T-Head)
найти не удалось — пресс-релиз и SEC-фильинг изображений не содержат.
Взят нейтральный тематический сток дата-центра согласно альтернативе из
image-hint («дата-центр с серверным оборудованием»), живая документальная
фотография, без людей, без чужих логотипов (соблюдён image-avoid по
Nvidia/AWS), без глянцевых 3D-заготовок. Минус от 100%: кадр не привязан
к Alibaba конкретно (нет логотипа/фирменных элементов) и не отражает
акцент статьи на собственных чипах T-Head/Zhenwu — связь с темой общая
(«облачная инфраструктура»), а не буквальная.
