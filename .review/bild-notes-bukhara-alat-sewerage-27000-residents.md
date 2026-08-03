# Bild notes: bukhara-alat-sewerage-27000-residents

## Стратегия: none → editor-queue (`no-image`)

Картинка не прикреплена. `frontmatter.image` оставлен с `null`-ами, добавлен
`awaitingEditor: true` + `pendingEditorQuestion`. Файл перемещён из
`content/posts/2026-08-03/` в `content/needs-verification/`.

## mainVisualSubject

Из поручения: строительная площадка канализационных сетей/очистных сооружений
в Алатском районе, либо логотип/здание АО «Узсувтаъминот». Строго subject-first,
без абстрактных заглушек.

## A. Первоисточник — `t.me/uzsuv/45308` (пост с 3 фото) и `uzsuv.uz/ru/posts/20598`

Пост-источник — медиагруппа из 3 фото. Проверены все три через `t.me/<id>?single`
(`og:image`) и через полную страницу канала `t.me/s/uzsuv`:

| Пост | Содержание | Разрешение |
|---|---|---|
| `t.me/uzsuv/45308` | Стопка чёрных гофрированных канализационных труб с разноцветными (жёлтый/синий/оранжевый) заглушками, крупный план | 320×180 |
| `t.me/uzsuv/45309` | Геодезист с нивелиром на переднем плане, на площадке рабочие и экскаватор на фоне | 320×180 |
| `t.me/uzsuv/45310` | Экскаватор Volvo роет траншею, рядом двое рабочих со штативом геодезиста — ровно то, что нужно по теме (укладка коллектора в Алате) | 320×213 |

Все три — **живая документальная съёмка с площадки**, не заготовка/рендер: субъект
подобран идеально (45310 — почти буквальная иллюстрация абзаца про мобилизацию
подрядчика и укладку коллекторов). Проблема чисто техническая: Telegram отдаёт
анонимному скрейперу превью групповых (альбомных) постов на уровне **320px** по
длинной стороне — заметно ниже задокументированных в `image-pipeline.md` 800px
(те 800px подтверждены на **одиночном** фото того же канала, пост `45297`, для
сравнения). Групповые (`media_group`) посты у этого канала так сжимаются без
Bot API — обойти нельзя.

`prepare-image.py` на кандидате 45310:

```json
{
  "source": { "width": 320, "height": 213, "path": "/tmp/original_45310.jpg" },
  "status": "too-small",
  "reason": "исходник 320×213, длинная сторона меньше 600px — в главную не годится, нужен другой источник"
}
```

Сайт `uzsuv.uz/ru/posts/20598` — Nuxt SPA, отдаёт только shell с `og:image`
= дефолтная иконка сайта (`android-chrome-192x192.png`). Прямых API-эндпоинтов
для поста не нашёл (перебрал `/api/posts/*`, `/api/v1/*`, `/api/news/*` — везде 404,
JS-бандлы не содержат читаемых путей к бэкенду).

## Здание/логотип АО «Узсувтаъминот»

Официального фото здания головного офиса в открытом доступе (в первых экранах
сайта и канала) не нашёл — только упомянутая выше SPA-заглушка и аватар канала
(160×160, заведомо `too-small` и просто логотип-эмблема, не здание).

## B. Сток

- **Unsplash API** — ключа `UNSPLASH_ACCESS_KEY` в окружении нет.
- **Pexels API** — ключа `PEXELS_API_KEY` нет.
- **Openverse** (без ключа, только `license=cc0,pdm`): запросы `sewer pipe trench
  construction`, `sewage pipeline installation`, `water supply pipe trench excavator`,
  `wastewater treatment plant construction`, `large diameter plastic pipes stacked`,
  `pipe stack`, `sewer pipe`, `pipeline construction`, `drainage pipe`. Просмотрены
  лучшие кандидаты:
  - USDA `20220610-FPAC-LSC-*` (экскаватор роет траншею на техасском ранчо) —
    явно американский сельский пейзаж (изгороди, грузовики, сухая трава), для
    статьи про Бухарскую область вводит в заблуждение по географии — тот же
    класс отказа, что и в `bild-notes-tashkent-water-shutoff-aug-3.md`.
  - `Plastic pipes stacked` (rawpixel, CC0, 6000×4000) — реальное фото, но
    тегировано самим источником как `abstract`/`colorful geometric`: декоративная
    абстракция без места и контекста, не показывает ни стройку, ни объект.
    Формально прошло бы правило «не рендер», но не проходит subject-first —
    отклонено.
  - `Digging Out For Sewer Pipes`, `Drainage Pipe Inspection` — фото из США/Британии
    с людьми и локальными деталями (дорожная разметка, номера, техника), к теме
    не относятся.
- AIIB — офпейдж проекта отдаёт только общий `og:image` штаб-квартиры AIIB
  в Пекине (`about_aiib_teaser1.jpg`, 780×780) — здание не имеет отношения
  к месту действия (Алатский район), использовать под этим заголовком значит
  подставить читателю не то здание. Отклонено.

## C. AI-генерация

Инструменты Higgsfield (`generate_image` и т.д.) в тулсете бильд-редактора в этом
прогоне недоступны — доступны только Bash/Read/Edit/Grep/Glob/WebFetch. Промпт
на будущее (если владелец согласится на AI-заглушку, без людей и логотипов):
«documentary editorial photograph, open trench with a section of large-diameter
grey PVC sewer pipe being laid at a rural construction site near Bukhara,
Uzbekistan, excavator in soft-focus background, muted editorial palette, warm
orange-red #FF4D2E accent on safety markers, deep charcoal and sand tones,
no rainbow colours, no glossy 3D render, no people, no text, no logos, soft
natural daylight, 16:9».

## Отклонённые варианты (сводно)

- `t.me/uzsuv/45308` (трубы крупным планом, 320×180) — `too-small`
- `t.me/uzsuv/45309` (геодезист + площадка, 320×180) — `too-small`
- `t.me/uzsuv/45310` (экскаватор + геодезист, 320×213) — **лучший субъект, но
  `too-small`**, сохранён как кандидат для владельца
- `uzsuv.uz/ru/posts/20598` — SPA без доступного `og:image`/API
- Аватар канала `@uzsuv` (160×160) — логотип, `too-small`
- Openverse `20220610-FPAC-LSC-0095/0117/0147` (USDA, техасское ранчо) —
  географически вводит в заблуждение
- Openverse `Plastic pipes stacked` (rawpixel CC0 6000×4000) — абстрактный
  декоративный кадр, не subject-first
- AIIB `about_aiib_teaser1.jpg` (штаб-квартира AIIB, Пекин, 780×780) — не то
  здание/место
- Unsplash / Pexels — ключей нет, API недоступны (401)

## Кандидат, переданный владельцу

`.review/bild-candidate-original-bukhara-alat-sewerage-27000-residents.jpg`
— оригинал поста `t.me/uzsuv/45310` (320×213), для référence в вопросе очереди.
В `public/` не выкладывался.

## Alt-текст

Не заполнен: картинки нет. Заготовка на случай присланного фото по теме —
«Экскаватор роет траншею под канализационный коллектор на стройплощадке
в Алатском районе Бухарской области, рядом — геодезист с нивелиром».

## Очередь редактору

`node scripts/editor-queue.mjs push` в этом тулсете не запускался — здесь нет
`TELEGRAM_BOT_TOKEN`/`TELEGRAM_EDITOR_CHAT_ID` (секреты только внутри
GitHub Actions). Двухшаговый процесс соблюдён: файл перемещён в
`content/needs-verification/`, frontmatter содержит `awaitingEditor: true` и
`pendingEditorQuestion` — `scan-pending` в workflow `editor-queue.yml` подхватит
материал и отправит вопрос владельцу сам.

## Уверенность в подборе: н/д (материал в очереди)

Уверенность, что дальнейшего поиска без Bot API/Higgsfield не хватит — 85%.
Субъект найден точно (45310 — идеальная иллюстрация текста), но чисто
технический потолок Telegram-превью для групповых постов (320px) не даёт
использовать его напрямую.
