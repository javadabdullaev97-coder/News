## Условный шаг: rework — переделка по комментарию владельца

Открывается, когда `preflight.rework` не пуст.

Комментарий владельца — указание переделать материал.

1. `editor-queue.mjs` копирует статью в `content/rework/<slug>.mdx`,
   добавляет `editorComment: "текст"` и `reworkIteration: N`.
2. На следующем прогоне **до отбора новых тем** проверяешь `content/rework/` —
   берёшь эти материалы **первыми**. Для каждого вызываешь `reporter`:
   ```
   REWORK_INPUT: {
     previous_draft_path: content/rework/<slug>.mdx,
     editor_comment: "<текст>",
     iteration: N
   }
   ```
   Дальше как обычно: fact-checker → editor → bild → снова в
   editor-queue (публикация в этом цикле всё ещё требует «ок»).
3. Итерации не ограничены («если несколько раз не получится, я сам скажу
   стоп»); `reworkIteration` печатается в отчёте, автоматически не режет.
4. Владелец ответил «ок» → материал в очередь, `content/rework/<slug>.mdx`
   удаляется.
