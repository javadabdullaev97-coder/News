# Bild notes: yemen-houthi-strikes-government-forces-aug2026

## Стратегия: none → editor-queue (`no-image`)

Картинка не прикреплена. `frontmatter.image` оставлен с `null`-ами, добавлены
`awaitingEditor: true` и `pendingEditorQuestion` (reason `no-image`). Файл перемещён
из `content/posts/2026-08-07/` в `content/needs-verification/` — по разделу «Шаг 3б»,
иначе `scan-pending` вопрос не найдёт.

Замечание: в очереди уже есть материал о том же событии под другим слагом
(`world-husity-ataka-yemen-avgust-2026`, см. `.review/bild-notes-world-husity-ataka-yemen-avgust-2026.md`),
для которого предыдущий прогон bild пришёл к тому же выводу (no-image). Проверка ниже
проведена независимо для текущего слага/черновика, результат совпал.

## Main visual subject (из reporter-notes и editor-verdict)

Reporter: «Последствия ракетно-дронового удара по военному объекту в Йемене либо
архивное фото ракетных пусков хуситов / карта провинций Мариб и Хадрамаут. Конкретных
фото с места инцидента не проверялось — нужна нейтральная карта или архивное фото
конфликта, не постановочное.» Editor-вердикт тематической подсказки по картинке не
даёт (image оставлен bild-агенту явно).

Ни живого фото места удара, ни чистой по лицензии карты найти не удалось.

## A. Первоисточник — не сработал

Проверены все URL из `frontmatter.sources`:

- **Al Jazeera, 6 августа** (`aljazeera.com/news/2026/8/6/houthis-claim-to-have-killed-45...`)
  — открылась напрямую (WebFetch + curl). На странице ровно одно изображение:
  `epa_694474432902-1766093891.jpg`, caption «Paintings on a fence in Sanaa, Yemen depict
  Houthi leaders, December 8, 2025», credit **«Yahya Arhab/EPA»**. Отклонено: (1) фото
  датировано декабрём 2025, не относится к удару 6 августа; (2) это не документальная
  съёмка события, а настенная роспись-портреты лидеров хуситов — политическая иконография,
  не subject-first по теме «удар по правительственным силам»; (3) EPA — платное агентство,
  открытая лицензия не подтверждена.
- **Bloomberg, 6 августа** и **Bloomberg, 4 августа** — оба URL вернули `HTTP 403` при
  прямом curl/WebFetch, совпадает с тем, что уже зафиксировал reporter в notes.
- Дополнительно (не в `sources`, но по теме, для полноты): проверен хаб AP News
  (`apnews.com/hub/yemen`) — найдена профильная статья `houthi-rebel-attacks-marib-hadhramaut-...`,
  но её `og:image` — дефолтная share-картинка AP (`defaultshareimage-copy.png`), то есть
  собственного фото у материала нет (текстовая wire-заметка без фото на момент проверки).
  Также найден постер видео `yem-houthis-drone-20260726cr` (26 июля, другой эпизод — сбитый
  дрон) — не использован: другая дата/эпизод, лицензия AP не подтверждена как открытая.

## B. Сток — не сработал

`UNSPLASH_ACCESS_KEY`/`PEXELS_API_KEY` в окружении нет. Проверено вручную через
WebFetch на сайтах Unsplash и Pexels по запросу «Yemen» — только туристические/
архитектурные снимки (Сана, Тарим, Шибам, Сокотра) и культурные сцены, ни одного кадра
по теме конфликта/армии.

Openverse (без ключа) по запросу «Yemen conflict»: топ-результат — «20-01 Yemen Conflict
Map» (Flickr, CC BY, Felton Davis) — при проверке метаданных оказался протестным фото
(теги `stopthewarinyemen`, `fastforyemen`, автор — известный NYC-протестный фотограф),
470×500px — меньше `MIN_SOURCE=600` по длинной стороне, отбраковка. Остальные
результаты — старые (2015–2020) активистские/гуманитарные фото не по теме или снимки
с Wikimedia (в чёрном списке редполитики, распространяем и на `commons.wikimedia.org`).

Карта Йемена (fallback reporter'а) — релевантные результаты только на Wikimedia
(locator maps, blank governorate maps) — заблокированы политикой источников.

## C. AI-генерация — недоступна

Higgsfield MCP-инструменты (`generate_image` и т.п.) в тулсете этого прогона
отсутствуют — только Read/Edit/WebFetch/Bash/Grep/Glob. Совпадает с прецедентом
`bild-notes-world-husity-ataka-yemen-avgust-2026.md`.

Заготовка промпта на будущее (если генерация станет доступна):

"documentary editorial illustration, aerial view of a Yemeni desert military encampment
at dusk with distant smoke plume on the horizon, no visible people, no weapons in
close-up, muted editorial palette, warm orange-red #FF4D2E accent in the sky, deep
charcoal and sand tones, no rainbow colours, no glossy 3D render, no text, no logos,
soft natural light, 16:9"

## Почему не подставил ближайший «почти подходящий» вариант

Фото Al Jazeera (роспись с портретами лидеров хуситов) — не показывает субъект
материала (атаку/лагеря/жертв), не датировано днём события, по сути ближе к
пропагандистской иконографии хуситов на нейтральной новости об их же атаке —
репутационный риск выше цены задержки публикации.

## Что сделано вместо публикации

1. Файл перемещён: `content/posts/2026-08-07/yemen-houthi-strikes-government-forces-aug2026.mdx`
   → `content/needs-verification/yemen-houthi-strikes-government-forces-aug2026.mdx`.
2. Frontmatter дополнен `awaitingEditor: true` и `pendingEditorQuestion` (reason `no-image`,
   текст вопроса — см. файл).
3. `node scripts/editor-queue.mjs push` не вызывался напрямую — у бильд-агента нет доступа
   к `TELEGRAM_BOT_TOKEN`/`TELEGRAM_EDITOR_CHAT_ID` (только внутри GitHub Actions). Материал
   уйдёт владельцу через `scan-pending` в рамках workflow `editor-queue.yml`.

## Отклонённые варианты (сводно)

- Al Jazeera `epa_694474432902-1766093891.jpg` — нерелевантная дата (дек. 2025), портреты
  политических лидеров на росписи, платная агентская лицензия (EPA)
- Bloomberg ×2 — недоступны (403)
- AP News (`apnews.com/article/houthi-rebel-attacks-marib-hadhramaut-...`) — у самой статьи
  нет фото (дефолтная share-картинка), связанный видео-постер — другой эпизод/дата,
  лицензия не подтверждена
- Unsplash / Pexels — только туристические/культурные фото Йемена, не по теме
- Openverse `Flickr — 20-01 Yemen Conflict Map` — протестное фото, 470×500px, ниже
  `MIN_SOURCE`
- Openverse: остальные Wikimedia-результаты по картам/флагам/локаторам — чёрный список
- AI-генерация (Higgsfield) — инструмент недоступен в тулсете этого прогона

## Alt-текст

Не заполнен: картинки нет. Заготовки на случай ответа владельца:
- фото места удара: «Задымление и повреждённая военная техника на месте удара хуситов
  по лагерю правительственных сил Йемена в провинции Мариб/Хадрамаут»
- карта: «Карта Йемена с отмеченными провинциями Мариб и Хадрамаут, где хуситы
  6 августа нанесли удары по лагерям правительственных сил»

## Уверенность в подборе: н/д (материал в очереди)

Уверенность в решении не публиковать без картинки — 85%. Тема военная и чувствительная
(жертвы), риск взять нерелевантный, устаревший или сомнительно лицензированный кадр
выше цены задержки на несколько часов до ответа владельца.
