---
recheckAt: "2026-08-21T09:00:00+05:00"
status: needs-verification
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
