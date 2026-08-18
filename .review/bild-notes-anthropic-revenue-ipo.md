# Bild notes: anthropic-revenue-ipo

## Стратегия: primary-source

## Источник картинки
- URL: https://cdn.sanity.io/images/4zrzovbb/website/6d4a0d28992ade92d6fa63646fd9c9d318245c6c-2400x1260.jpg
- Найдено как `og:image` страницы https://www.anthropic.com/news (newsroom index, официальный
  сайт компании), `og:image:alt` = "Anthropic logo".
- Тип: официальный wordmark-логотип Anthropic (не фотография, не 3D-рендер, не диаграмма) —
  чистая типографика на нейтральном фоне, взято напрямую с anthropic.com.
- Размер оригинала: 2400×1260 (ratio 1.905, горизонтальный) → prepare-image.py, режим cover,
  scale 0.7143, cropLoss 6.67% (offset x=62), апскейла нет → 1600×900, 32 138 байт, quality 90.
  Итог JSON скрипта:
  ```json
  {"source":{"width":2400,"height":1260},"fit":{"mode":"cover","scale":0.7143,"cropLoss":0.0667,"offset":[62,0],"upscaled":false},"output":{"width":1600,"height":900,"bytes":32138,"quality":90},"status":"ok"}
  ```
- Проверка на повтор: `node scripts/photo-dupes.mjs --check` → "свободен, за 2 дн. этот кадр
  не выходил". Явно указанный в задании файл
  `/images/posts/2026-08/ai-infra-financing-wall-street-01.jpg` не использовался и не совпадает
  с этим кадром (разный источник, разные байты).

## Почему выбор именно такой
Reporter (mainVisualSubject) и editor (image-hint) сошлись: у темы нет фотогеничного
события или человека (это финансовая новость про компанию), допустимый субъект —
логотип Anthropic или интерфейс Claude. Первым делом проверил официальные страницы
anthropic.com:
- https://www.anthropic.com/news/series-h (прямой источник статьи, Series H) — og:image
  оказался абстрактной рисованной иллюстрацией "растущая лестница" (`/api/opengraph-illustration`,
  Curved upward growth line на коралловом фоне) — без опознаваемого бренда, слишком абстрактно
  для subject-first, отклонил.
- https://www.anthropic.com/news (общий newsroom) — og:image = чистый логотип-wordmark
  "ANTHROPIC" на светлом фоне, прямая узнаваемая привязка к компании, горизонтальный кадр
  без необходимости в подложке. Выбран.

image-avoid из handoff соблюдён: логотип OpenAI не использован, стоковых «бизнесменов»
и придуманных графиков нет.

## Отклонённые варианты
- `/api/opengraph-illustration?name=Object%20Growth&backgroundColor=coral` (со страницы
  Series H) — абстрактная рисованная иллюстрация без опознаваемого субъекта, отклонена в
  пользу более прямого узнаваемого лого.
- Скриншот интерфейса Claude — не искал отдельно: официальный wordmark-логотип с newsroom
  ближе к первоисточнику текущей новости (годовая выручка/IPO Anthropic) и не требует
  скриншота продукта, который мог бы устареть визуально.

## Alt-текст
"Логотип компании Anthropic на светлом фоне"

## Уверенность в подборе: 80%
Официальный источник, subject-first соблюдён (прямое опознавание Anthropic), горизонтальный
кадр без подложки, не дубликат. Минус за то, что это логотип, а не живая фотография —
но у темы объективно нет фотогеничного события или человека, а рисованная abstract-иллюстрация
уступает логотипу в узнаваемости субъекта.
