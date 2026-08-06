# Bild notes: tashabbusli-byudjet-693-proekta-sofinansirovanie

## Стратегия: fallback-needed → editor-queue (reason: no-image)

## mainVisualSubject (из reporter-notes)

Reporter прямо пишет: «Нет явного субъекта — тема про статистику подачи заявок
в разных категориях (дороги, электроснабжение, уличное освещение)». Предложил
три варианта: 1) фото ремонта внутренней дороги в махалле, 2) фото портала
openbudget.uz, 3) инфографика с разбивкой по категориям. Проверил все три.

## A. Первоисточник — t.me/minecofinuz/16193

Пост содержит одно вложение — портретная инфографика-таблица (639×800,
`cdn4.telesco.pe`, взято из полной HTML-версии канала `t.me/s/minecofinuz`,
не из `?embed=1`, который отдаёт только логотип канала как og:image).

Содержимое: таблица «Sheriklik asosidagi loyihalar» — 14 регионов ×
7 категорий + итоговая строка (Jami: 693, 285, 132, 105, 23, 48, 100) +
donut-диаграмма долей финансирования внизу. Реальные данные ведомства,
не декоративный рендер — формально проходит фильтр «не рисованная
заготовка».

Проблема чисто техническая, не эвристическая:
- Исходник портретный (639×800, AR 0.80 < PORTRAIT_AR 0.95) →
  `prepare-image.py` уходит в `contain` с подложкой по умолчанию.
- Полный кадр в `contain` даёт занимаемую область ~639×800 внутри
  холста 1600×900 БЕЗ апскейла (`contain_scale` ограничен 1.0) — то есть
  почти половина кадра станет графитовыми полями, а сама таблица
  останется мелкой и нечитаемой. Это хуже, чем частичная подложка по
  бокам, которую критиковал владелец 04.08 — здесь подложка была бы
  доминирующей.
- Пробовал вручную выделить самодостаточный верхний фрагмент (заголовок +
  шапка категорий + строка «Jami» с итоговой разбивкой 693/285/132/105) —
  визуально фрагмент читаемый и звучит как прямая иллюстрация абзаца
  «Что предложили жители». Но по ширине источник ограничен нативными
  639px (потолок Telegram для этого поста), и `cover`-заливка кадра
  1600×900 из кропа 639×359 требует масштаб ×2.507 — на 0.007 выше
  `MAX_UPSCALE=2.5` в `prepare-image.py`. Прогнал через скрипт для
  проверки — предсказуемо ушло в `contain` с полями:
  ```json
  {
    "source": {"width": 639, "height": 359},
    "fit": {"mode": "contain", "scale": 1.0, "placed": [639, 359],
      "note": "заливка кадра потребовала бы растянуть исходник в 2.51× при допустимых 2.5×"},
    "status": "ok"
  }
  ```
  (тестовый прогон удалён, в `public/` не сохранён). Меньший кроп ещё
  сильнее сокращает доступную ширину и только ухудшает соотношение —
  выхода без подложки нет, разрешение источника — жёсткий потолок.
- Итого: инфографика физически не может лечь в кадр 1600×900 без
  доминирующих полей. Правило «графики почти никогда» + правило
  «подложка — красный флаг, если есть шанс найти горизонталь» здесь
  совпадают — не публикую.

Сохранил оригинал для референса: `.review/bild-candidate-infographic-tashabbusli-byudjet-693-proekta-sofinansirovanie.jpg`.

## B. Портал openbudget.uz

`curl` на `https://openbudget.uz` отдаёт только SPA-shell (Vite/Vue-бандл,
`<div id="app"></div>`) без серверного рендера — ни `og:image`, ни `<img>`
в исходном HTML нет. Без headless-браузера (нет в тулсете) скриншот
получить не могу.

## C. Сток — тема «ремонт внутренней дороги»

Openverse (без API-ключа, `license=cc0,pdm`):
- Запросы: `road repair asphalt`, `asphalt road paving workers`, `street
  paving crew`, `road construction workers laying asphalt`.
- Лучший найденный кандидат — «First Street Paving Crews begin»
  (rawpixel via Openverse, CC0, 4000×2661, альбомная ориентация,
  живая документальная съёмка дорожно-ремонтной бригады с фрезой
  и самосвалом). Скачал и посмотрел (`.review/bild-candidate-original-...jpg`):
  кадр явно американский — кирпичная автобусная остановка типовой
  застройки США, седаны на парковке, дорожная разметка и техника
  западного образца («Roadtec Challenger»). Для материала про
  узбекскую программу «Инициативный бюджет» это географически вводит
  в заблуждение — тот же класс отказа, что уже фиксировался в
  `bild-notes-bukhara-alat-sewerage-27000-residents.md` (техасское ранчо
  для бухарской стройки). Не беру.
- Точечные запросы под «электроснабжение» и «уличное освещение»
  (`street light pole installation`, `led street light closeup`,
  `utility worker street lamp`) не дали пригодных кандидатов: либо нет
  результатов, либо только Wikimedia (запрещено правилом «не берём
  wikipedia.org» — Openverse агрегирует Wikimedia Commons под
  `source: wikimedia`, эти результаты сразу отклонял).
- Отдельно проверил геоспецифичные запросы (`Uzbekistan road`,
  `Uzbekistan mahalla`, `Tashkent street`, `Samarkand street road`) —
  либо дорожные знаки (SVG-пиктограммы, не фото), либо туристические
  снимки памятников (Регистан, Хива, Чорсу) без отношения к теме
  ремонта дорог/электросетей, либо снова Wikimedia (отклонено по
  правилу).

## D. AI-генерация (Higgsfield)

Недоступна в тулсете этого прогона — доступны только
Bash/Read/Edit/Grep/Glob/WebFetch, инструментов `generate_image` и т.п.
нет (тот же случай, что зафиксирован в
`bild-notes-bukhara-alat-sewerage-27000-residents.md`). Тема формально
подходит под категорию для AI-fallback («абстрактная бюджетная тема»,
без людей/логотипов/политиков) — промпт на будущее, если владелец
согласится и инструмент станет доступен:

«documentary-style editorial illustration, close-up of fresh grey asphalt
being smoothed on a residential street with a hand-held rake, warm evening
light, Central Asian mahalla courtyard architecture with clay walls faintly
visible in soft-focus background, muted editorial palette, warm
orange-red #FF4D2E accent on a safety cone, deep charcoal and sand tones,
no rainbow colours, no glossy 3D render, no people, no text, no logos,
soft natural light, 16:9»

## Решение

Ни один из четырёх путей не даёт результата, который проходит editorial
bar (subject-first + не вводит в заблуждение геолокацией + не
рендер-заготовка + landscape без доминирующих полей). Материал уходит в
очередь на подтверждение владельцу.

## Действия
1. `content/posts/2026-08-06/tashabbusli-byudjet-693-proekta-sofinansirovanie.mdx`
   → `content/needs-verification/tashabbusli-byudjet-693-proekta-sofinansirovanie.mdx`.
2. Frontmatter: `image` оставлен с `null`, добавлены `awaitingEditor: true`
   и `pendingEditorQuestion` (`reason: no-image`, вопрос с описанием всех
   отклонённых вариантов, `image` указывает на сохранённый кандидат-фото
   американской бригады — для референса, не для публикации).
3. Кандидаты сохранены в `.review/`:
   - `bild-candidate-original-tashabbusli-byudjet-693-proekta-sofinansirovanie.jpg`
     (американская дорожная бригада, CC0, отклонён по географии)
   - `bild-candidate-infographic-tashabbusli-byudjet-693-proekta-sofinansirovanie.jpg`
     (оригинал портретной таблицы Минфина, отклонён по формату/разрешению)
4. `node scripts/editor-queue.mjs push` не вызывал — нет
   `TELEGRAM_BOT_TOKEN`/`TELEGRAM_EDITOR_CHAT_ID` в этом тулсете (секреты
   только в GitHub Actions). Двухшаговый процесс соблюдён: файл перемещён
   в `content/needs-verification/`, `scan-pending` в `editor-queue.yml`
   подхватит и отправит вопрос владельцу сам.

## Alt-текст (заготовка на случай ответа владельца)

Если владелец пришлёт своё фото или подтвердит один из отклонённых
вариантов — заготовка под тему «ремонт внутренней дороги»: «Дорожные
рабочие укладывают асфальт на внутриквартальной улице в рамках
программы «Инициативный бюджет»».

## Уверенность: н/д (материал в очереди)

Уверенность, что без headless-браузера (для openbudget.uz) и без
Higgsfield дальнейший поиск даст лучший результат — низкая (~20%),
все реалистичные бесплатные пути перебраны.
