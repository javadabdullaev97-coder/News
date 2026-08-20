# Fact-check: nvidia-mercor-investment

## Общий вердикт: APPROVE-WITH-DOWNGRADES

Материал — случай `specialRules.techLeakAndRumor`: слух об инвестиции Nvidia в раунд Mercor, единственный первичный источник — платная статья The Information с анонимными источниками, пересказанная citable-изданием PYMNTS. Проверены все 7 строк таблицы цитат, две дыры закрыты прямым WebFetch (PYMNTS и TechCrunch), все утверждения подтверждены. Единственная содержательная находка — заголовку не хватает атрибуции источника, как того требует techLeakAndRumor.

## Проверка правила techLeakAndRumor

1. Citable-источник обязателен — ✅ выполнено (PYMNTS citable:true P2).
2. Атрибуция в заголовке и лиде, слух подан как слух — ⚠️ частично: лид образцовый («сообщило издание The Information со ссылкой на неназванные источники, передаёт PYMNTS»), но заголовок атрибуции не содержит вообще — нужна правка.
3. Не повтор без новой стадии — ✅ первая публикация LEAP по теме.

## Список понижений для editor'а

1. **Заголовок**: добавить атрибуцию. Было: «Nvidia обсуждает участие в раунде Mercor с оценкой в 20 млрд долларов». Предлагается: «По данным The Information, Nvidia обсуждает участие в раунде Mercor с оценкой $20 млрд».
2. Абзац 4, первое предложение — 26 слов, чуть выше лимита 25; можно разбить на два.
3. Лид — 30 слов (верхняя граница диапазона), не обязательно сокращать.

## Уровень доверия к драфту: 60%

Все 7 фактических утверждений подтверждены. Материал соответствует правилу techLeakAndRumor по существу. Confidence 60 — выше порога editorReview.routing.notice.minFactCheckConfidence (50), но ниже directPublish.gates.minFactCheckConfidence (70): маршрут — публикация с publishedNotice (уведомление владельцу после факта), не editorReview.stillAsk и не прямой directPublish.

---

VERDICT: approve-with-downgrades
CONFIDENCE: 60
ROUTING: editorReview.notice (reason: low-confidence) — публикуется в очередь как обычно, во frontmatter ставится publishedNotice вместо ожидания подтверждения владельца.
