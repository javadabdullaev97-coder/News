# Решение: khiva-urganch-railway — не публикуется, дубликат

Материал прошёл полный цикл (reporter → fact-checker approve-with-downgrades 93% →
editor publish → bild → seo) и был готов к очереди. Перед коммитом в
`content/queue/` перечитал состояние из `origin/main` (правило §Шаг 7 «перед
отбором тем — перечитай состояние из origin/main») и обнаружил, что соседняя
планёрка уже опубликовала тот же сюжет:

- `content/posts/2026-08-17/urgench-khiva-railway.mdx` (+ .uz/.en) — тот же
  первоисточник `president.uz/ru/lists/view/9504`.
- `content/posts/2026-08-17/urgench-airport-reconstruction.mdx` — тот же
  контекстный факт про реконструкцию аэропорта, `president.uz/ru/lists/view/9501`.

`topic-dupecheck.mjs` подтвердил вердикт `duplicate` по совпадению ссылок.

**Решение: не публиковать.** Тема закрыта в журнале
(`topic-journal.mjs done --slug=khiva-urganch-railway`) без выхода на сайт.
Черновик, фактчек, editor-verdict и handoff остаются в `.review/`/`content/drafts/`
как рабочий артефакт; изображение (`khiva-urganch-railway-01.jpg`) удалено как
неиспользуемое.

Гонка объясняется тем, что на момент брони темы (13:24 Ташкента) `topic-dupecheck`
и `topic-journal claim` ничего не находили — соседняя планёрка опубликовала свою
версию уже после этого, в процессе моего производства.
