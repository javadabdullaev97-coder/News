# Fact-check: tesla-solar-roof-tile-discontinued

## Общий вердикт: APPROVE-WITH-DOWNGRADES

**Особый случай применён:** материал квалифицируется под `specialRules.techLeakAndRumor` (config/newsroom-policy.json) — «отменённый продукт» с одним citable-источником (Electrek). Все три условия правила выполнены: (1) источник Electrek citable:true, ссылка стоит именно на него; (2) заголовок и лид формулируют факт как переданный, а не как утверждение от лица Tesla («Tesla, по данным Electrek, прекратила…», не «Tesla прекратила»); (3) это первое появление стадии «прекращение поставок», повтора без новой стадии нет.

Таблица `claims-tesla-solar-roof-tile-discontinued.md` присутствует и в целом качественная (репортёр честно пометил, где нет дословной цитаты, а есть пересказ WebFetch — это нормально для рерайта информационной статьи, не цитаты).

## Проверенные утверждения

| # | Утверждение | Источник | Вердикт | Комментарий |
|---|---|---|---|---|
| 1 | Tesla прекратила поставки Solar Roof, с 20.08.2026 — только обычные панели | Electrek | ✅ CONFIRMED | Подтверждено WebFetch: «became official as of August 20, 2026…» |
| 2 | Решение раскрыли два источника, близких к программе | Electrek | ✅ CONFIRMED | «Two unnamed sources close to the program confirmed the decision to Electrek» |
| 3 | Внутри компании продукт признан экономически невыгодным | Electrek | ⚠️ PARTIAL (глагол) | Цитата есть дословно: «concluded that the product is not financially viable». Глагол «признали» в переводе избыточно оценочен — см. downgrade #1 |
| 4 | Официального заявления Tesla нет | Electrek (по умолчанию из структуры статьи) | ✅ CONFIRMED | Согласуется с отсутствием прямой цитаты Tesla в первоисточнике |
| 5 | tesla.com/solarroof больше не о черепице, ведёт на аренду обычных панелей | tesla.com/solarroof (независимая проверка) | ✅ CONFIRMED | Перепроверено WebFetch напрямую: заголовок страницы «Home Solar Panels and Systems», «Lowest Monthly Price With New Tesla Solar Lease», Solar Roof не упоминается |
| 6 | Solar Roof представил Маск в 2016 году | Electrek | ✅ CONFIRMED | «Elon Musk unveiled it in October 2016 on a Hollywood back lot» |
| 7 | Продукт обосновывал покупку SolarCity за 2,6 млрд $ | Electrek | ✅ CONFIRMED | «Tesla shareholders voted to approve the company's roughly $2.6 billion acquisition of SolarCity» |
| 8 | Обещание 1000 крыш/неделю | Electrek | ✅ CONFIRMED | «Musk repeatedly said Tesla would be producing and installing 1,000 Solar Roofs per week» |
| 9 | Обещанная цена ~22$/кв.фут | Electrek | ✅ CONFIRMED | «early quotes in the neighborhood of $22 per square foot» |
| 10 | Пиковый темп 21–32 систем/неделю | Electrek (данные Wood Mackenzie) | ✅ CONFIRMED | «Tesla was installing roughly 21 to 32 Solar Roofs per week, according to Wood Mackenzie data» — точное совпадение чисел |
| 11 | ~3000 систем за ~7 лет | Electrek (данные Wood Mackenzie) | ✅ CONFIRMED | «Tesla installed only about 3,000 Solar Roof systems in the US across roughly seven years» |
| 12 | Клиент 72k→146k$, спор урегулирован в 2023 | Electrek | ✅ CONFIRMED (перепроверено отдельно) | Прямая цитата: «One customer's contracted price reportedly jumped from about $72,000 to roughly $146,000 before installation. That triggered a class-action lawsuit that Tesla settled for $6 million in 2023.» — год 2023 подтверждён напрямую самим Electrek |

### Расхождение между notes репортёра и фактическим драфтом

Репортёр в notes утверждал, что дата урегулирования спора (2023) не включена в статью «чтобы не опираться на непроверенный вторичный источник». Проверка показала, что дата фактически присутствует в тексте драфта, и она подтверждена самим Electrek напрямую (не вторичным источником) — угрозы точности нет. Процессный сигнал (рассинхронизация notes↔текст), не фактологическая проблема.

## Чек-лист редполитики

- [✓] Заголовок 73 символа (60–90), без CAPS и «!»
- [✓] Субъект (Tesla) и глагол действия (прекратила) — в первых 60 знаках
- [✓] Лид 29 слов, есть дата (20 августа 2026)
- [✓] Ни одно предложение не длиннее 25 слов
- [⚠] Глаголы атрибуции нейтральны — «признали» избыточно оценочен, см. downgrade #1
- [✗] У новости об одном событии есть H2 «Продукт не выполнил обещаний восьмилетней давности» — формально нарушает правило «нет H2 у новости об одном событии»; стилистический вопрос, зона editor'а
- [✓] Нет блока «Что дальше» без даты/шага
- [✓] Каждая цифра подтверждена в Electrek (перепроверено напрямую)
- [✓] Действие субъекта подтверждено первоисточником с атрибуцией
- [✓] Нет ссылок на чёрный список СМИ
- [✓] Нет AI-slop фраз
- [н/п] Суммы в сумах — не применимо
- [н/п] Названия узбекских ведомств — не применимо
- [✓] Frontmatter валиден, `sources` содержит 2 записи
- [✓] `image.credit: null`, `image.url: null` — норма для драфта

## Найденные AI-slop фразы

Не найдено.

## Проверка атрибуции (techLeakAndRumor)

Заголовок, лид и ключевые утверждения атрибутированы Electrek везде, где риск непроверенности реален. Историческая часть (запуск 2016, голосование акционеров, публичные обещания Маска) — общеизвестные факты, атрибуция не обязательна; цифры о реальных показателях корректно снабжены «по данным Electrek».

## Ссылки в статье

- ✅ https://electrek.co/2026/08/20/tesla-discontinues-solar-roof-panels-only/ — открывается, содержание подтверждено
- ✅ https://www.tesla.com/solarroof — открывается, содержание подтверждено

## Список понижений для editor'а (применяет сам, без повторной проверки)

1. Абзац 2: «внутри компании черепицу Solar Roof **признали** экономически невыгодной» → «внутри компании черепицу Solar Roof **посчитали** экономически невыгодной». Причина: «признали» в редполитике уместно только когда субъект опровергает собственное прежнее заявление; в источнике — нейтральное «concluded».
2. (Необязательно) H2 «Продукт не выполнил обещаний восьмилетней давности» формально нарушает правило «нет H2 у новости об одном событии» — решение оставить/слить с текстом на усмотрение editor'а.
3. (Необязательно) Можно добавить сумму мирового соглашения ($6 млн) — не обязательно, факт и без этого подтверждён.

## Уровень доверия к драфту: 90%

VERDICT: approve-with-downgrades
ISSUES_TOTAL: 2
ISSUES_CRITICAL: 0
CONFIDENCE: 90
