# Bild notes: world-us-states-tariff-lawsuit

## Стратегия: stock (Unsplash License)

## Ход подбора

### Main visual subject (из reporter-notes)
Дональд Трамп на трибуне/пресс-конференции — узнаваемый субъект. Альтернатива: Летиция Джеймс.
Абстрактные картинки (контейнеры, графики, карты) исключены правилом subject-first.

### A. Первоисточник — проверены все 3 sources из frontmatter
- **Al Jazeera** (og:image) — нашёл фото Трампа в Розовом саду, но credit `[File: Carlos
  Barria/Reuters]` — агентское фото Reuters. Пропущено: правило bild-агента прямо требует
  пропускать Reuters/AP без подтверждённой лицензии.
- **AG NY — пресс-релиз** — зафетчен повторно, на странице нет og:image и нет фото в теле
  статьи (только логотипы/иконки соцсетей). Фото Летиции Джеймс не нашлось.
- **USTR Fact Sheet** — документ без визуалов, релевантных теме (диаграммы/сток не подходят по
  правилу "никакого рисованного стока").

### Проверка whitehouse.gov (дополнительный официальный источник, не из sources)
Скачал 3 свежих официальных фото Трампа (`P20260727DT-2382.jpg` — GM Proving Ground remarks,
`P20260724MR-0892.jpg` — Oval Office, `P20260731DT-1412.jpg` — Cabinet at Camp David).
Все три технически хорошо подходили под subject-first (особенно GM Proving Ground: Трамп на
трибуне с баннером «AMERICAN JOBS», тематически близко к торговле/пошлинам). **Отклонены
все три**: EXIF Copyright прямо запрещает коммерческое использование без письменного
разрешения White House Photo Office («may not be used in any commercial or political
materials... without the written permission»). Это не исторический public-domain статус, а
новая ограничительная лицензия 2026 года — риск copyright-иска, пропускаю по правилу
"при сомнении в лицензии — выбирай другой источник".

### B. Stock (Unsplash) — использовано
- Проверил unsplash.com/s/photos/donald-trump — большинство результатов нерелевантны (маски,
  граффити, случайные люди в чёрных костюмах).
- Нашёл `unsplash.com/photos/president-donald-trump-jPN_oglAjOU` — официальный портрет Трампа,
  загружен аккаунтом `@libraryofcongress`, источник — Library of Congress Prints &
  Photographs Division (loc.gov/item/2017645723). Лицензия страницы: **Unsplash License**
  (свободное использование, коммерческое и некоммерческое, атрибуция не обязательна, но даю
  её для прозрачности).
- Скачан оригинал 4032×5040 (портретная ориентация).

## Обработка — scripts/prepare-image.py
```json
{
  "source": {"width": 4032, "height": 5040},
  "fit": {
    "mode": "contain",
    "scale": 0.1786,
    "placed": [720, 900],
    "note": "вписано целиком на solid тёмно-графитовый фон бренда; вертикальный исходник 4032×5040 (соотношение 0.80) — заливка кадра 16:9 срезала бы большую часть снимка"
  },
  "output": {
    "path": "public/images/posts/2026-08/world-us-states-tariff-lawsuit-01.jpg",
    "url": "/images/posts/2026-08/world-us-states-tariff-lawsuit-01.jpg",
    "width": 1600, "height": 900, "bytes": 99172, "quality": 90
  },
  "status": "ok",
  "upscaled": false
}
```
Портретный исходник автоматически ушёл в `contain` (не `cover`) — скрипт сам определил, что
кроп в 16:9 срезал бы голову/плечи, и вписал фото целиком на тёмно-графитовую (бренд `#1A1A1A`)
подложку. Ручного кропа не делал.

## Отклонённые варианты
- Al Jazeera og:image (Трамп, Розовый сад) — фото Reuters/Carlos Barria, нет подтверждённой лицензии.
- 3 официальных фото whitehouse.gov (GM Proving Ground, Oval Office, Cabinet at Camp David) —
  EXIF Copyright явно запрещает коммерческое использование без письменного разрешения White
  House Photo Office.
- Прочие результаты Unsplash по запросу "donald trump" (History in HD, маски, граффити) —
  нерелевантны или несерьёзны для новостной статьи.
- Фото Летиции Джеймс — не найдено ни в пресс-релизе AG NY, ни в открытых источниках за
  разумное время поиска.

## Alt-текст
"Официальный портрет президента США Дональда Трампа на фоне флага США и Белого дома"

## Credit
"Unsplash / Library of Congress"

## Уверенность в подборе: 65%
Subject-first соблюдён (реальное фото Трампа, не абстракция, не рисованный сток). Минусы:
(1) фото — типовой официальный портрет, не привязан к конкретному событию (иску/тарифам/дате),
(2) портретная ориентация вынудила `contain` с тёмными полями по бокам вместо full-bleed
кадра. Плюсы: лицензия прозрачна и подтверждена (Unsplash License, источник — Library of
Congress), риска copyright-иска нет, в отличие от Reuters и новых фото whitehouse.gov.
