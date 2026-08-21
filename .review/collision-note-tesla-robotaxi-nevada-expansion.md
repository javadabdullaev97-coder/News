# Коллизия тем: tesla-robotaxi-nevada-expansion

Полный конвейер (reporter → claims-lint → fact-checker → editor → tg-score → photo-dupes →
bild-gate → bild → translator) пройден для этого слага. При выходе на публикацию в
`content/queue/` обнаружено, что параллельная сессия уже произвела и поставила в очередь тот
же сюжет под слагом **`nevada-robotaxis-tesla-uber-waymo`** (тот же первоисточник TechCrunch,
тот же вердикт `approve-with-downgrades`, тот же confidence 64%, та же дата `queuedAt` в районе
07:11 по Ташкенту — то есть до завершения этого конвейера).

Материал `nevada-robotaxis-tesla-uber-waymo` полнее: объединяет все три разрешения (Tesla 5000,
Uber 1000, Waymo 1000) в одной цифре («до 8000 роботакси»), явно ссылается на собственный
материал LEAP News от 18 августа, и использует дополнительный источник Electrek.

Решение: не дублировать публикацию. `content/queue/tesla-robotaxi-nevada-expansion.{uz,en}.mdx`
удалены до коммита. Файл `public/images/posts/2026-08/tesla-robotaxi-nevada-expansion-01.jpg`
удалён как осиротевший (был закоммичен до обнаружения коллизии). RU-черновик остаётся в
`content/drafts/2026-08-21/` (не отслеживается git, `content/drafts/` в `.gitignore`).

Артефакты цепочки (`reporter-notes-`, `claims-`, `fact-check-`, `editor-verdict-`, `handoff-`,
`bild-notes-tesla-robotaxi-nevada-expansion.md`) оставлены как есть — рабочий процесс был
корректным, коллизия обнаружилась только на последнем шаге и не является ошибкой конвейера,
а следствием одновременной работы двух планёрок по разным входным ссылкам на один сюжет.

Тема закрыта в журнале (`topic-journal.mjs done`) со ссылками из уже опубликованной версии
и из этого захода — чтобы сюжет не всплыл повторно как новый.
