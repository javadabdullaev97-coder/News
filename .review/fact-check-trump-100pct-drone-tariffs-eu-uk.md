# Fact-check: trump-100pct-drone-tariffs-eu-uk

## Общий вердикт: APPROVE-WITH-DOWNGRADES

## Проверка решения reporter'а по источникам (SCMP/Anadolu → WH Fact Sheet + Bloomberg)

Проверено напрямую по `config/generated/source-index.json` и `config/news-sources.json`:
- `scmp`: `citable:false` — подтверждено, reporter прав.
- `anadolu-ru`: `citable:false` — подтверждено.
- `euronews-ru`: `citable:true`, `type:"context"`, `bloc:"euro"` — подтверждено.
- `bloomberg`: `citable:true`, `type:"context"`, `bloc:"anglo"` — подтверждено.

Итоговый набор источников даёт три непророссийских блока (gov, euro, anglo) — требование mustPublish (minDistinctBlocs 2, requireNonRussianBloc) избыточно выполнено. Замена reporter'а корректна.

## Проверенные утверждения

| # | Утверждение | Источник | Вердикт |
|---|---|---|---|
| 1 | Пошлина 100% на дроны >25 кг или с тепловизором | whitehouse.gov | ✅ CONFIRMED |
| 2 | Пошлина 25% на менее чувствительные дроны/компоненты | whitehouse.gov | ✅ CONFIRMED |
| 3 | 15% для ЕС, Японии, Ю.Кореи, Швейцарии, Лихтенштейна, Тайваня | whitehouse.gov + Euronews | ✅ CONFIRMED |
| 4 | 10% для Британии | whitehouse.gov + Euronews | ✅ CONFIRMED |
| 5 | Условие происхождения hardware/software | whitehouse.gov | ✅ CONFIRMED |
| 6 | Раздел 232 закона о расширении торговли 1962 года | Euronews | ✅ CONFIRMED |
| 7 | 21 день / 180 дней на вступление в силу | whitehouse.gov | ✅ CONFIRMED |
| 8 | Департамент войны — 20 дней на исключения из FCC Covered List | whitehouse.gov | ✅ CONFIRMED |
| 9 | Минторгу поручена инвестпрограмма | whitehouse.gov | ✅ CONFIRMED |
| 10 | Указ подписан 13 августа | whitehouse.gov | ✅ CONFIRMED (байлайн страницы + «Today») |
| 11 | «Объявил Белый дом... 14 августа» (лид) | whitehouse.gov | ❌ CONTRADICTED — страница датирована 13 августа, не 14-м |
| 12 | Экспортный контроль Китая над дронами с 5 августа | Bloomberg (403, независимо перепроверено) | ✅ подтверждено сторонними изданиями |
| 13 | «Deepens decoupling», визит Си в сентябре | Bloomberg (403) | ⚠️ формулировка уже смягчена и атрибутирована — понижения не требует |
| 14 | «Реакции Пекина... на момент публикации не поступало» | — | ✅ корректно ограничено по времени |
| 15 | «Крупнейший в мире производитель» (Китай) | без прямой сноски | ⚠️ пограничная превосходная степень |

## Чек-лист редполитики

- [✓] Заголовок ~66 символов, без CAPS/«!»
- [✓] Лид 25–30 слов, но дата спорная (см. #11)
- [✓] Цифры подтверждены
- [✓] Нет ссылок на чёрный список СМИ
- [✓] Frontmatter валиден, sources = 3 (≥2)
- [✗] **publishedAt/updatedAt проставлены заранее** — убрать

## Список понижений/правок для editor'а

1. **Лид**: «об этом объявил Белый дом 14 августа 2026 года» → «об этом сообщил Белый дом 13 августа 2026 года» — страница whitehouse.gov датирована 13 августа («Today, President Donald J. Trump signed a Proclamation»), приписывать «14 августа» Белому дому нельзя.
2. **Абзац про Китай**, последнее предложение: «...на пошлины от 14 августа» → «...на пошлины от 13 августа» (согласованность с правкой №1).
3. **Frontmatter**: убрать `publishedAt` и `updatedAt`.
4. (Необязательно) «Китай — крупнейший в мире производитель гражданских дронов» → «один из крупнейших производителей» или добавить сноску.

## Уровень доверия к драфту: 85%

Ключевые цифры подтверждены дословно whitehouse.gov и независимо Euronews. Единственная содержательная проблема — противоречие дат (14 vs 13 августа), устраняется простой правкой.

```
FACT_CHECK_PATH: .review/fact-check-trump-100pct-drone-tariffs-eu-uk.md
VERDICT: approve-with-downgrades
CONFIDENCE: 85
SUMMARY: Ключевые цифры и правовая база подтверждены whitehouse.gov и Euronews; лид приписывал Белому дому неверную дату (14 вместо 13 августа) — исправить вместе с абзацем про Китай и убрать publishedAt/updatedAt из frontmatter.
```
