# Bild notes: tashkent-region-water-centralized-expansion

## Стратегия: none → editor-queue (`no-image`)

Картинка не прикреплена. `frontmatter.image` оставлен с `null`-ами, добавлен
`awaitingEditor: true` + `pendingEditorQuestion`. Файл перемещён из
`content/posts/2026-08-05/` в `content/needs-verification/`.

## mainVisualSubject

Из reporter-notes: явного субъекта нет — оба поста Узсув содержат видео о работах
по замене/прокладке труб. Подсказка: «стоп-кадр прокладки труб водоснабжения».

## A. Первоисточник — `t.me/uzsuv/45368` и `t.me/uzsuv/45360`

Оба поста — видео (не фото), у обоих есть кадр-превью (`tgme_widget_message_video_thumb`),
скачал через `?embed=1` и через полную ленту канала `t.me/s/uzsuv/<id>` (второй способ
даёт 800px для фото-альбомов согласно прецеденту `bild-notes-bukhara-alat-sewerage-27000-residents.md`,
но для видео такого повышения разрешения не даёт — оба способа отдали один и тот же файл):

| Пост | Содержание превью | Разрешение |
|---|---|---|
| `t.me/uzsuv/45368` | Экскаватор роет у обочины дороги, дорожный знак «объезд», ЛЭП на фоне, недостроенные высотки вдалеке — **ровно по теме** (замена сетей на присоединённых территориях) | 320×176 |
| `t.me/uzsuv/45360` | Куча щебня/гравия, вдалеке поле и опоры ЛЭП, поверх кадра — телеграфика новостного канала (тикер котировок, логотип «MAHALLA», «JOYIDA information district») — вставка из телесюжета, не чистая фотография | 320×180 |

`prepare-image.py` на лучшем кандидате (45368):

```json
{
  "source": { "width": 320, "height": 176, "path": "/tmp/original.jpg" },
  "status": "too-small",
  "reason": "исходник 320×176, длинная сторона меньше 600px — в главную не годится, нужен другой источник"
}
```

Кандидат 45360 дополнительно отклонён и по содержанию: это скриншот телесюжета с
наложенной инфографикой (тикер валют, логотипы каналов), а не самостоятельная
фотография — не прошёл бы даже при достаточном разрешении.

`ffmpeg` в окружении нет, поэтому кадр большего разрешения из самого mp4 (который
отдаёт Telegram) извлечь не удалось — доступен только сжатый превью-JPEG виджета.

Сайт компании и переход через Bot API недоступны в этом тулсете (нет токена).

## B. Сток

- **Unsplash API** — ключа `UNSPLASH_ACCESS_KEY` нет, публичный `unsplash.com` отдаёт
  антибот-страницу без API-ключа.
- **Pexels API** — ключа `PEXELS_API_KEY` нет.
- **Openverse** (без ключа, `license=cc0,pdm`, `orientation=landscape`): прогнал запросы
  `water pipe trench excavator`, `water main pipe installation`, `water supply pipeline
  construction`, `water utility pipe repair street`, `drinking water pipe network`,
  `excavator digging trench road pipe`, `water main repair`, `PVC pipe trench workers`,
  `utility trench pipe laying`, `sewer pipe installation site`, `large diameter pipe trench
  excavator`. Просмотрены лучшие кандидаты контактным листом:
  - USDA NRCS «Watersheds» серия — прерия/холмы со снегом, трактор John Deere с читаемым
    логотипом — климат и рельеф явно не Ташкент в августе, вводит в заблуждение.
  - «City of Watsonville Water Resources Center» — англоязычная вывеска конкретного
    американского города, прямая географическая подмена.
  - Датские `Bøgeskov Høvej, vejarbejde` (Flickr, PDM) — траншея с чёрно-жёлтыми
    гофротрубами, но голые деревья и грязь однозначно читаются как северная Европа
    поздней зимой/весной — тоже климатически и географически вводит в заблуждение под
    августовский Ташкент.
  - NRCS `20150827-*` серия — поля/фермы Калифорнии, ирригационные трубы на грядках,
    не про городскую водопроводную сеть и не про Узбекистан.
  - `Mammoth Hot Springs water main repair` — Йеллоустоунский нацпарк, легко узнаваемое
    место, прямая географическая подмена.

Ни один кандидат не прошёл: либо не тот климат/рельеф (снег, прерия, голые деревья),
либо прямая англоязычная привязка к конкретному месту в США — то же нарушение
«не вводить читателя в заблуждение», что и в `bild-notes-tashkent-water-shutoff-aug-3.md`
и `bild-notes-bukhara-alat-sewerage-27000-residents.md`.

## C. AI-генерация — недоступна

Инструменты Higgsfield (`generate_image` и т.д.) в тулсете бильд-редактора в этом
прогоне недоступны — доступны только Bash/Read/Edit/Grep/Glob/WebFetch.

Промпт на случай, если владелец согласится на AI-заглушку (без людей, без брендов):
«documentary editorial photograph, excavator laying a section of grey PVC water supply
pipe in an open trench beside a paved road on the outskirts of Tashkent, Uzbekistan,
dry summer terrain, poplar trees and low-rise residential blocks in soft-focus
background, muted editorial palette, warm orange-red #FF4D2E accent on a road safety
sign, deep charcoal and sand tones, no rainbow colours, no glossy 3D render, no people,
no text, no logos, soft natural daylight, 16:9».

## Отклонённые варианты (сводно)

- `t.me/uzsuv/45368` (экскаватор у дороги, 320×176) — **лучший субъект, но `too-small`**,
  сохранён как кандидат для владельца
- `t.me/uzsuv/45360` (куча щебня + телеграфика новостного канала, 320×180) — `too-small`
  и по содержанию не годится (скриншот телесюжета с инфографикой)
- Openverse USDA NRCS «Watersheds» (прерия, снег, John Deere) — климат/рельеф не Ташкент
- Openverse «City of Watsonville Water Resources Center» — прямая географическая подмена (США)
- Openverse датские `Bøgeskov Høvej, vejarbejde` — климат/сезон не совпадает (голые деревья, грязь)
- Openverse NRCS `20150827-*` (ирригация на калифорнийских полях) — не по теме и не по месту
- Openverse «Mammoth Hot Springs water main repair» (Йеллоустоун) — узнаваемое чужое место
- Unsplash / Pexels — ключей нет, официальный API недоступен

## Кандидат, переданный владельцу

`.review/bild-candidate-original-tashkent-region-water-centralized-expansion.jpg`
— оригинал кадра-превью видео из поста `t.me/uzsuv/45368` (320×176), для референса
в вопросе очереди. В `public/` не выкладывался.

## Alt-текст

Не заполнен: картинки нет. Заготовка на случай присланного фото по теме —
«Экскаватор роет траншею для прокладки водопроводной трубы у дороги в районе,
присоединённом к Ташкенту»

## Очередь редактору

`node scripts/editor-queue.mjs push` в этом тулсете не запускался — здесь нет
`TELEGRAM_BOT_TOKEN`/`TELEGRAM_EDITOR_CHAT_ID` (секреты только внутри GitHub Actions).
Двухшаговый процесс соблюдён: файл перемещён в `content/needs-verification/`,
frontmatter содержит `awaitingEditor: true` и `pendingEditorQuestion` — `scan-pending`
в workflow `editor-queue.yml` подхватит материал и отправит вопрос владельцу сам.

## Уверенность в подборе: н/д (материал в очереди)

Уверенность, что дальнейший поиск без Bot API/Higgsfield не даст лучшего результата — 85%.
Субъект найден точно (45368 — прямая иллюстрация темы, экскаватор роет траншею у дороги
на присоединённой территории), но технический потолок превью-кадра видео в Telegram
(320px) не даёт использовать его напрямую, а сток без географической подмены не нашёлся.
