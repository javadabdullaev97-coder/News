# Коллизия тем: nevada-robotaxi-uber-tesla-waymo

Обнаружено на шаге editor, до публикации (в отличие от прецедента
`tesla-robotaxi-nevada-expansion`, где коллизию поймали только на выходе в
`content/queue/`).

Этот черновик (`content/drafts/2026-08-21/nevada-robotaxi-uber-tesla-waymo.mdx`,
fact-check `approve-with-downgrades`, confidence 60%, первоисточник Engadget)
описывает тот же факт, что уже прошёл полный конвейер под другим слагом и
стоит в очереди на публикацию:

- **Событие**: одобрение Nevada Transportation Authority от 20 августа 2026 —
  Tesla до 5 000 роботакси, Waymo до 1 000, Uber до 1 000 (через Zoox/Motional)
  в округе Кларк, плюс задокументированный интерим-ордер на 10 машин от 27 июля
  (Docket 26-05015, тот же PDF NTA в источниках обеих версий).
- **Уже в очереди**: `content/queue/nevada-robotaxis-tesla-uber-waymo.mdx` —
  тот же сюжет, тот же первоисточник PDF NTA плюс TechCrunch/Electrek/Axios,
  вердикт fact-checker'а `approve-with-downgrades` (confidence 64%), editor
  `publish`, уже проставлены `tgScore: 35`, `broadcast: false`,
  `mainChannelGate: regulatorDecision`, изображение и `publishedNotice`
  (`low-confidence`). Материал полностью готов к выходу.
- Эта же тема ранее уже сталкивалась в конвейере: `tesla-robotaxi-nevada-expansion`
  была снята в пользу `nevada-robotaxis-tesla-uber-waymo` (см.
  `.review/collision-note-tesla-robotaxi-nevada-expansion.md`). Нынешний
  черновик — третий независимый заход на один и тот же сюжет NTA/Tesla/Uber/Waymo
  за 21 августа.

**Решение**: не публиковать второй материал по одному событию. Черновик
`nevada-robotaxi-uber-tesla-waymo` помечен editor'ом как `killed` (дубль темы,
не проблема качества) и перенесён в `content/rejected/nevada-robotaxi-uber-tesla-waymo.mdx`
с полным контекстом. Стилистическая доводка (понижения fact-checker'а, заголовок,
лид, frontmatter) не выполнялась — она бессмысленна для материала, который не
выходит.

**Наблюдение для владельца** (не решение editor'а, только сигнал): в этом
черновике оговорка «NTA текст решения от 20 августа не опубликовала» и
разведение задокументированного интерим-ордера (27 июля, PDF) от неподтверждённых
цифр 5000/1000/1000 (Engadget со слов компаний) проработаны детальнее, чем в
уже опубликованной версии через TechCrunch. Если у владельца есть время —
имеет смысл свериться, не стоит ли перенести эту атрибуционную формулировку в
уже стоящий в очереди материал перед его выходом. Editor такую правку сам не
вносил: `content/queue/nevada-robotaxis-tesla-uber-waymo.mdx` не входит в
мандат этой задачи.

Тема одна и та же на 21 августа 2026 — при повторном появлении сюжета NTA/Tesla/
Uber/Waymo в последующих циклах планёрки его тоже следует сверять с обоими
слагами выше, а не заводить четвёртую копию.
