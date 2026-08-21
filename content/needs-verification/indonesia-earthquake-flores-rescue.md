---
recheckAt: "2026-08-22T04:43:04+00:00"
status: needs-verification
rechecks: "1"
---

# Спасение 84-летней женщины через 3 дня после землетрясения на Флоресе + обновлённый tolль 71

**Статус:** ждёт первоисточника (citable)
**Заведено:** 2026-08-21, по сигналу Anadolu Agency (RU) и The Guardian — World
**Проверить снова:** после того как citable-агентство (Reuters, AP, AFP, Al Jazeera, BBC, CBS,
DW, PBS) опубликует материал о спасении женщины и/или обновлённом числе погибших

## Что утверждается (по сигналам, оба citable:false)

- Anadolu Agency (RU), 20.08.2026: число погибших при землетрясении на острове Флорес
  (магнитуда 7,7, 15 августа) возросло до 71.
  https://www.aa.com.tr/ru/мир/число-погибших-при-землетрясении-в-индонезии-возросло-до-71/4032395
- The Guardian — World, 20.08.2026: 84-летняя женщина найдена живой под завалами через три дня
  после землетрясения (деревня, где оползень заблокировал доступ).
  https://www.theguardian.com/world/2026/aug/20/indonesia-earthquake-flores-miracle-rescue-elderly-woman-found-alive-in-rubble

Это развитие сюжета, уже трижды освещённого LEAP News:
- content/posts/.../indonesia-earthquake-toll-53 (17.08, toll 53)
- content/posts/2026-08-18/indonesia-earthquake-toll-70.mdx (toll 68)
- content/posts/2026-08-20/indonesia-earthquake-death-toll.mdx (toll 68, данные на вечер 17.08)

## Почему не опубликовано

Оба факта — спасение женщины и toll 71 — по состоянию на 20.08 вечер по Ташкенту подтверждены
только источниками с `citable:false` в `config/generated/source-index.json` (`anadolu-ru`,
`guardian-world`) либо изданиями, которых вообще нет в белом списке (Tempo.co, Jakarta Globe,
Khaleej Times, Korea Times, AOL, ua.news, Time). Reporter сделал 8 обращений в сеть
(WebSearch + WebFetch по Al Jazeera, CBS News), ни Reuters, ни AP, ни AFP, ни BBC, ни DW, ни PBS
историю не публиковали на момент проверки. Свежие материалы Al Jazeera обрываются на 17 августа
(toll 68); BBC не удалось зафетчить технически.

Вероятная причина — задержка ротации у крупных агентств: у Guardian/Anadolu «на местах» раньше,
у AP/Reuters обычно лаг в несколько часов на подобные human-interest сюжеты о спасении.

## Что закроет тему

1. Публикация истории спасения (или обновлённого toll) у любого citable-агентства из белого
   списка.
2. Смотреть в первую очередь: https://www.aljazeera.com/where/indonesia/,
   https://www.cbsnews.com/world/, https://apnews.com/hub/indonesia, поиск по Reuters (публичная
   RSS-лента отключена в config/news-sources.json → disabled.reuters, но ссылка допустима, если
   найдётся прямой URL статьи).

## Где искали безрезультатно (reporter, 20.08 вечер по Ташкенту)

WebSearch: «84-year-old woman rescued rubble three days», «death toll 71 Flores August 20»,
«"Reuters" ... toll 71 elderly woman rescued», site-поиск по apnews.com/aljazeera.com.
WebFetch: aljazeera.com (материал от 17.08, toll 68, про женщину ничего), cbsnews.com (тот же
материал, что уже в предыдущем драфте LEAP), aljazeera.com/where/indonesia (топик-страница,
свежих материалов после 17.08 нет), bbc.com (фетч не удался технически).

## Перепроверка 21.08.2026 — результат отрицательный

6 обращений (3 WebFetch, 3 WebSearch), строго по адресам из «Что закроет тему»:
- `aljazeera.com/where/indonesia/` — последний материал по-прежнему 17.08 (toll 68).
- `cbsnews.com/world/` — землетрясение на Флоресе не представлено свежими материалами.
- `apnews.com/hub/indonesia` — WebFetch не удался технически (как и в прошлый раз);
  компенсировано двумя WebSearch (`site:apnews.com Indonesia earthquake Flores death toll`
  и общий поиск) — ни одной ссылки на apnews.com с этой историей.
- WebSearch по Reuters на прямой URL — не найден. Единственные материалы про спасение
  84-летней Паулины Поби и **toll 73** (цифра снова разошлась, теперь не 71, а 73) —
  Khaleej Times, Korea Times, ua.news, madhyamamonline: все `citable:false` или вне
  белого списка.

Citable-агентство по-прежнему не публиковало ни историю спасения, ни обновлённый toll.
Цифра в непроверенных источниках продолжает расходиться (71 → 73) — ещё один аргумент
подождать, а не публиковать промежуточную оценку.
