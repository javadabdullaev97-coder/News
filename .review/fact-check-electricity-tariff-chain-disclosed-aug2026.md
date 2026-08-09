# Fact-check: electricity-tariff-chain-disclosed-aug2026

## Общий вердикт: APPROVE (confidence 90) — фактчек пропущен по правилу factCheckSkip

Планёрка пропустила вызов fact-checker'а по `config/newsroom-policy.json` → `factCheckSkip`:

- источников 2 (≤ maxSources: 3);
- источников типа `attributed` нет;
- первый источник — официальный протокол №37 Межведомственной тарифной комиссии при
  Кабинете министров (api-portal.gov.uz), т.е. официальный первоисточник (P0/source);
- категория `economy`, не `world`;
- материал не задевает forbiddenTopics;
- reporter подтвердил, что все цифры статьи взяты из самого протокола (или из второго
  официального источника — постановления КМ №243 на lex.uz), цифр из третьих источников
  в тексте нет — `hasNumbersNotInPrimarySource` не применяется;
- не rework.

Reporter прочитал протокол №37 целиком (5 страниц, подпись Ж. Кучкарова, голосование
7 «за») и постановление №243 на lex.uz. Цифры из inbox-сигнала (Gazeta.uz) совпали с
протоколом без расхождений. Подробности — `.review/reporter-notes-electricity-tariff-chain-disclosed-aug2026.md`.

## Замечание для editor'а

Reporter намеренно не включил в статью: изменение тарифов в % к прежним значениям, переход
на методологию RAB, дату вступления в силу (1 августа) — эти детали встречаются только у
конкурентных СМИ (Spot.uz, Gazeta.uz), не в самом протоколе. Не добавлять их в текст без
отдельного официального подтверждения.

```
VERDICT: approve
ISSUES_TOTAL: 0
ISSUES_CRITICAL: 0
CONFIDENCE: 90
```
