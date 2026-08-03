# Bild notes: japan-kumamoto-earthquake-aftermath

## Стратегия: none → editor-queue (`no-image`)

Картинка не прикреплена. `frontmatter.image` оставлен с `null`-ами, проставлен
`awaitingEditor: true` + `pendingEditorQuestion`, материал перемещён из
`content/posts/2026-08-03/` в `content/needs-verification/`, чтобы `scan-pending`
его подхватил и запушил вопрос владельцу в TG (сам `editor-queue.mjs push` не вызывал —
в этом прогоне нет `TELEGRAM_BOT_TOKEN`/`TELEGRAM_EDITOR_CHAT_ID`, вызов упал бы с ошибкой,
как задокументировано в прошлом прогоне tashkent-water-shutoff-aug-3).

## A. Первоисточники — проверены все 4 URL из frontmatter.sources

| URL | Картинка | Credit |
|---|---|---|
| Al Jazeera, 28 июля (what-happened-damage-victims) | `.../2026-07-29T055714Z_..._RTRMADP_3_JAPAN-QUAKE...jpg` | не указан явно в теле, но по индексу файла (`RTRMADP`) — Reuters wire |
| Al Jazeera, 31 июля (death-toll-climbs) | `/wp-content/uploads/2026/07/reuters_6a6c10e1-1785467105.jpg` | **Kim Kyung-Hoon/Reuters** (указано в подписи) |
| PBS NewsHour, News Wrap (show-страница) | только placeholder-заглушки (видео-эпизод, thumbnails разделов), реального фото нет | — |
| PBS NewsHour, "sleep in cars" | `.../2026-07-31T154911Z_..._RTRMADP_3_JAPAN-QUAKE...jpg` | **Kim Kyung-Hoon/Reuters** (указано в подписи к другому кадру статьи — обрушенный дом в Яцусиро) |

**Итог по A:** оба Al Jazeera и вторая страница PBS отдают один и тот же класс кадра —
съёмку Reuters (Kim Kyung-Hoon). PBS News Wrap собственного фото не даёт вовсе.

### Почему не взял Reuters-фото напрямую

Правила бильда: «Международные агентства (Reuters, AP) — обычно требуют лицензию,
пропускай если не уверен что открытое использование разрешено». Reuters-снимки,
встроенные в статьи Al Jazeera и PBS, лицензированы именно этим редакциям — переиздание
LEAP News без своей лицензии на Reuters wire — прямой риск copyright-иска, тот же класс
проблемы, что Getty/Shutterstock. Уверенности в разрешении переиздания нет — не беру.

## B. Тематический сток — не нашёл релевантного

- **Openverse API** (без ключа, `license=cc0,pdm`): запрос `earthquake japan collapsed
  building` — три результата, все про землетрясение в Крайстчерче 2011 года
  (US Embassy New Zealand, Flickr, PDM), к теме Кумамото/Кюсю 2026 не относятся.
  Не взял — вводило бы читателя в заблуждение (другая страна, другое десятилетие).
- **Unsplash / Pexels API** — ключей (`UNSPLASH_ACCESS_KEY`, `PEXELS_API_KEY`) в
  окружении нет, официальный API недоступен; без него лицензионную чистоту не
  подтвердить — не беру (правило «при сомнении в лицензии — другой источник»).
- **Официальный сайт префектуры Кумамото** (`pref.kumamoto.jp`) — HTTP 503,
  недоступен из песочницы.
- **Wikimedia Commons** — не смотрел сознательно: та же категория риска, что
  `wikipedia.org` в чёрном списке (лицензии Wikimedia требуют атрибуции конкретному
  автору, сложно валидировать быстро — редполитика прямо откладывает такие источники).
- Getty/Shutterstock/Depositphotos — по чёрному списку, не смотрел.

## C. AI-генерация — недоступна в этом прогоне

Инструменты Higgsfield MCP (`generate_image` и т.д.) не входят в тулсет этого запуска
бильд-агента (доступны только Bash/Read/Edit/WebFetch/Grep/Glob) — тот же случай, что
в прошлом прогоне `tashkent-water-shutoff-aug-3`. Заготовка промпта для будущего
прогона с доступным Higgsfield (без людей, без политиков, бренд-палитра):

"documentary editorial photograph, collapsed concrete building facade and rubble after
an earthquake in a Japanese city street, cracked asphalt, rescue tape, no people, no
text, no logos, muted editorial palette, warm orange-red #FF4D2E accent, deep charcoal
and sand tones, no rainbow colours, no glossy 3D render, soft overcast daylight, 16:9"

## Очередь редактору

Материал перемещён: `content/posts/2026-08-03/japan-kumamoto-earthquake-aftermath.mdx`
→ `content/needs-verification/japan-kumamoto-earthquake-aftermath.mdx`.

Frontmatter обновлён:
```yaml
awaitingEditor: true
pendingEditorQuestion:
  reason: "no-image"
  question: "Фото первоисточников (Al Jazeera, PBS) — все wire-снимки Reuters
    (Kim Kyung-Hoon/Reuters), лицензия на переиздание не подтверждена, брать рискованно.
    Открытого стока или официального фото по этому землетрясению не нашлось (Openverse —
    нерелевантные архивные снимки других землетрясений, сайт префектуры Кумамото
    недоступен). AI-генерация недоступна в этом прогоне (нет доступа к Higgsfield).
    Прислать своё фото/подтвердить риск с Reuters, или публикуем без картинки?"
```

`node scripts/editor-queue.mjs push` в этой среде не вызывал — нет `TELEGRAM_BOT_TOKEN`
и `TELEGRAM_EDITOR_CHAT_ID`. Workflow `editor-queue.yml` → `scan-pending` подхватит
материал из `content/needs-verification/` и запушит вопрос владельцу.

## Отклонённые варианты

- Al Jazeera 28 июля — Reuters wire photo, нет открытой лицензии на переиздание
- Al Jazeera 31 июля — Reuters wire photo (Kim Kyung-Hoon/Reuters), тот же риск
- PBS "sleep in cars" — Reuters wire photo (Kim Kyung-Hoon/Reuters), тот же риск
- PBS News Wrap — реального фото в статье нет, только плейсхолдеры
- Openverse `earthquake japan collapsed building` (3 результата) — не тот инцидент
  (Крайстчерч 2011, не Кумамото 2026)
- Unsplash/Pexels — нет API-ключей, без официального API не берём

## Alt-текст

Не заполнен: картинки нет. Заготовка на случай присланного фото —
«Разрушенное здание/спасательные работы в префектуре Кумамото после землетрясения
магнитудой 7,1, 28 июля 2026» (уточнить по факту присланного кадра).

## Уверенность в подборе: н/д (материал в очереди)

Уверенность в решении не публиковать без подтверждения — 85%. Reuters-фото формально
доступны и точно попадают в subject-first (взрыв в Aeon Mall, разбор завалов), но
лицензионный риск реален и явно прописан в правилах бильда как «пропускай, если не
уверен». Оставшиеся 15% — что владелец сочтёт использование Reuters-кадра с явным
credit допустимым (fair use для новостной статьи) и разрешит взять его напрямую.
