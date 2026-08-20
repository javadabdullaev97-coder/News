# Reporter notes: windows-11-august-update-games

**Тема.** Microsoft расследует сообщения о сбоях в играх на Windows 11 после накопительного обновления KB5121003 (11 августа 2026, сборка 26100.9168). Игры зависают, вылетают с ошибкой EXCEPTION_ACCESS_VIOLATION или вызывают перезагрузку ПК. Запись открыта 19 августа 2026, статус — «Investigating».

**Первоисточники (проверены оба, текст идентичен):**
- `https://learn.microsoft.com/en-us/windows/release-health/status-windows-11-25h2` — originating update KB5121003 (2026-08-11, build 26100.9168), симптомы (unresponsive / closes without notice / EXCEPTION_ACCESS_VIOLATION / restart), примеры игр (ARC Raiders, MARVEL Tokon: Fighting Souls, The Finals), статус Investigating, next steps (Feedback Hub), affected platforms: Windows 11 25H2 и 24H2, Server: None. Opened 2026-08-19 17:50 PT, last updated 2026-08-19 17:53 PT.
- `https://learn.microsoft.com/en-us/windows/release-health/status-windows-11-24h2` — идентичная запись, подтверждает 24H2 в списке затронутых версий.

KB-страница support.microsoft.com/help/5121003 отдельно не открывалась — номер и ссылка взяты из самой записи Microsoft Learn.

**Расхождение с inbox-снипетом.** Инбокс не содержал цифр, только описание темы. Первоисточник дал точные данные: KB, дату, сборку, примеры игр, статус. Расхождений с заданной темой не найдено.

**Main visual subject:** явного визуального субъекта нет — bild может взять экран Windows 11 с уведомлением об обновлении или логотип Windows 11.

**Что не вошло:** реакция профильных изданий (BleepingComputer, The Register, Engadget) не использовалась как источник — это пересказ того же первоисточника, конкурентов сознательно не открывал (первоисточник уже был в руках). Развитие темы (смена статуса на Resolved/Mitigated, публикация патча) — материал для RECHECK или отдельной заметки позже.

**Слабые места:** причина сбоя самой Microsoft не установлена — версий в тексте не приводил. Список игр в источнике не исчерпывающий («limited number... including») — отражено формулировкой «в пример». Официального обходного пути или отзыва обновления в источнике нет — статья прямо это констатирует.

**Уверенность: 90%** — все ключевые факты взяты дословно из официальной записи Microsoft Learn, продублированной на двух версийных страницах без расхождений.
