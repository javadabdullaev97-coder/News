# Fact-check: amazon-mandatory-arbitration-us-customers

## Общий вердикт: APPROVE-WITH-DOWNGRADES

Центральный факт материала (Amazon 14 августа 2026 вернула обязательный арбитраж и запрет коллективных исков) подтверждён независимо двумя проверяемыми wire-агентствами (Reuters через spokesman.com, Bloomberg через claimsjournal.com) плюс отдельным прямым разбором документа (Value Added Resource). Найдена одна непроверяемая деталь (не центральная) и два нарушения лимита длины предложения — всё лечится понижением/правкой, без отката материала.

## Методология проверки источников

1. **Официальная страница Amazon** (`amazon.com/gp/help/customer/display.html?nodeId=508088`) — повторная попытка дала тот же результат, что у репортёра: HTTP 503. Блокер подтверждён независимо, не выдумка репортёра.
2. **reuters.com напрямую** — инструмент фетчинга недоступен на www.reuters.com. Подтверждён и этот блокер.
3. **spokesman.com** (Reuters, Greg Bensinger, 14 авг. 2026) — легитимная синдикация: статья содержит явный байлайн «By Greg Bensinger, Reuters». The Spokesman-Review — региональная газета США (Спокан, Вашингтон), стандартно перепечатывающая wire-контент с указанием агентства. Это не самостоятельный непроверяемый источник, а зеркало текста Reuters с сохранённым авторством — приемлемо в рамках §2 (Reuters в белом списке).
4. **claimsjournal.com** (Bloomberg, Spencer Soper, 17 авг. 2026) — байлайн «By Spencer Soper | Claims Journal (Copyright 2026 Bloomberg)». Легитимная синдикация, а не независимый источник.
5. **valueaddedresource.net** — нишевое издание для продавцов Amazon, автор явно указывает, что разбирала документ Amazon Conditions of Use напрямую. Использовано только для деталей, которых не было в Reuters/Bloomberg (эскалация пакетов 100/500) — корректно, это независимое третье подтверждение цифр.

## Проверенные утверждения

| # | Утверждение | Источник | Вердикт | Комментарий |
|---|---|---|---|---|
| 1 | 14 августа Amazon вернула арбитраж, запретила коллективные иски, изменения вступили в силу сразу | spokesman.com/Reuters | ✅ CONFIRMED | «effective immediately upon customers continuing to use the service» |
| 2 | Уведомление по email, продолжение использования = согласие | spokesman.com/Reuters | ✅ CONFIRMED | «notified customers via email on Friday» |
| 3 | Суд мелких тяжб сохраняется, до нескольких тысяч долларов | claimsjournal.com/Bloomberg | ✅ CONFIRMED | «small claims cases, which typically cap damages at a few thousand dollars» |
| 4 | Notice of Dispute + 60 дней переговоров | valueaddedresource.net | ✅ CONFIRMED | «submit a Notice of Dispute and negotiate in good faith for 60 days» |
| 5 | «Массовый арбитраж»: 25+ дел за 6 мес., пакеты от 25 | spokesman.com/Reuters | ✅ CONFIRMED | «classified as "mass arbitration" and settled in "batches of at least 25"» |
| 6 | >500 обращений → пакеты от 100; >2500 → от 500 | valueaddedresource.net | ✅ CONFIRMED | «minimum 100 claims (at 500+ demands); minimum 500 claims (at 2,500+ demands)» |
| 7 | Цитата представителя Amazon | spokesman.com/Reuters | ✅ CONFIRMED | Дословное совпадение |
| 8 | ~75 000 пользователей Alexa подали требования в 2021 | claimsjournal.com (указано в таблице) | ⚠️ PARTIAL (техническая неточность цитирования) | Факт верный, подтверждён Reuters дословно, но в таблице цитат ошибочно указан claimsjournal.com вместо spokesman.com — не влияет на текст статьи |
| 9 | После 2021 споры рассматривались в судах штата Вашингтон | claimsjournal.com (указано в таблице) | ❌ UNSUPPORTED | Ни один из трёх источников не подтверждает эту деталь при прямой перепроверке |
| 10 | Дела/иски до 14 августа новые условия не затрагивают | spokesman.com/Reuters | ✅ CONFIRMED | «Previous disputes and class-action suits initiated before Friday remain unaffected by new terms» |

## Чек-лист редполитики

- [✓] Заголовок 60–90 символов, без CAPS и «!»
- [✓] Субъект + глагол действия в первых 60 знаках заголовка
- [✗] Лид-предложение — 30 слов, выше лимита ≤25
- [✗] Предложение про Echo/Alexa/2021 — 37 слов, выше лимита
- [✓] Глаголы атрибуции нейтральны
- [✓] Блока «Что дальше» нет и не требуется
- [⚠] Деталь «суды штата Вашингтон» без подтверждения — удалить
- [✓] Нет ссылок на чёрный список СМИ
- [✓] Нет AI-slop фраз
- [✓] Frontmatter валиден, sources — 3 записи
- [✓] Habr не использован ни в тексте, ни в sources

## Список понижений для editor'а (применяет сам, без повторной проверки)

1. Удалить предложение «После отказа от арбитража споры с покупателями рассматривались в судах штата Вашингтон.» — не подтверждено ни одним источником.
2. Разбить лид (30 слов) на два предложения.
3. Разбить предложение про Echo/Alexa/2021 (37 слов) на два предложения.
4. (Не блокирует публикацию) Внутренняя правка таблицы claims: строка про 75 000 пользователей Alexa ссылается не на тот источник (claimsjournal.com вместо spokesman.com).

## Уровень доверия к драфту: 82%

---

VERDICT: approve-with-downgrades
ISSUES_TOTAL: 3
ISSUES_CRITICAL: 0
CONFIDENCE: 82
FETCHES: 6
SUMMARY: Центральные факты о возврате Amazon обязательного арбитража и запрета коллективных исков (14 августа 2026) подтверждены независимо через легитимные синдикации Reuters (spokesman.com) и Bloomberg (claimsjournal.com) плюс прямой разбор документа (Value Added Resource); найдена одна неподтверждённая деталь про «суды штата Вашингтон» (удалить) и два предложения свыше лимита в 25 слов (разбить).
