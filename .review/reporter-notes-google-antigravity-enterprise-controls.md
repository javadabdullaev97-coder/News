# Reporter notes: google-antigravity-enterprise-controls

**Тема.** Google 21 августа 2026 расширил Antigravity — свою агентскую среду программирования с ИИ — корпоративными инструментами управления: лимиты расходов, контроль доступа/безопасности, аудит-лог. 20 августа отдельно вышли расширения Antigravity для сред разработки (VS Code, JetBrains, Zed, Visual Studio).

**Первоисточники (проверенные):**
- Блог Google Cloud (21 августа) — описание Antigravity, уровни лицензий Gemini Enterprise (Standard/Plus/Standard Emerging Market), биллинг (лимиты, пул токенов, доплата за превышение), безопасность (sandboxing, доступ к браузеру и MCP-серверам), аудит-лог, соглашение об обработке данных, план добавить per-user/team лимиты «later this year». URL: https://cloud.google.com/blog/products/ai-machine-learning/expanding-google-antigravity-for-enterprise-customers
- Блог Antigravity об IDE-расширениях (20 августа) — точный статус по IDE: VS Code GA, Visual Studio Preview, JetBrains GA (с версии 2026.2.1, Enterprise-функции Preview), Zed GA (Enterprise-функции Preview). URL: https://antigravity.google/blog/antigravity-ide-extensions

**Вторичный источник (не как факт-основание):** The Register — использован только для обнаружения темы и точного URL блога Google Cloud. Register также писал про уход Джеффа Дина и смену роли Хассабиса — этот сюжет отложен: подпадает под neverTake (назначения ниже CEO/CTO) и не верифицирован через официальный источник.

**Расхождения с inbox-снипетом.** Снипет («Corporate customers can look forward to easier management of agents in Google Cloud») — общая формулировка без конкретики; первоисточник детальнее. По цифрам расхождений нет. Отдельно: Register описывал статус всех IDE-расширений как «preview», но официальный блог Antigravity показывает, что JetBrains и Zed уже GA (preview — только их Enterprise-функции и Visual Studio целиком) — в статье использована версия официального источника.

**Main visual subject.** Интерфейс/логотип Google Antigravity или нейтральная иллюстрация ИИ-инструментов для разработчиков (экран кода с ИИ-ассистентом). Явного человека-субъекта нет.

**Что не вошло.** Кадровые перестановки в AI-подразделении Google (Дин, Хассабис) — не проверены, подпадают под neverTake. Конкуренция Google с OpenAI/Anthropic в агентских IDE — не проверялась.

**Пропуски и слабые места.** Числовых сумм лимитов в источнике нет (Google описывает только механизм). Формулировка «до конца 2026 года» — интерпретация «later this year» из публикации от 21 августа 2026; прямой цитаты с точной датой нет.

**Уверенность: 85%.** Оба источника официальные, цифры и формулировки сверены напрямую. Снижение — из-за отсутствия точной даты для будущих per-user лимитов и нишевости темы для читателя без инженерного бэкграунда (учтено раскрытием терминов в тексте).

```
DRAFT_PATH: content/drafts/2026-08-21/google-antigravity-enterprise-controls.mdx
CLAIMS_PATH: .review/claims-google-antigravity-enterprise-controls.md
CONFIDENCE: 85
FETCHES: 3
STATUS: ready-for-factcheck
```
