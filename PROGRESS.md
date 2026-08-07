# Анализ контента конкурентов — статус

Пайплайн: `scripts/competitor/*.py`. Данные: `data/` (в git не хранятся, регенерируются).
Результаты: `output/`.

## Конфиг прогона

| Параметр | Значение |
|---|---|
| Наш ресурс | LEAP News (leap.uz), `content/posts`, RU |
| Период | 2026-07-08 … 2026-08-07 (30 дней) |
| Целевой объём | 80–120 материалов на конкурента |
| Языки | ru |
| Каналы | сайт + Telegram (`t.me/s/<канал>`) |
| Конкуренты | Gazeta.uz, Kun.uz, Daryo.uz, Spot.uz, Podrobno.uz, Repost.uz, UzNews.uz, Yuz.uz |

Машиночитаемо: `scripts/competitor/corpus-config.json`.

## Этапы

| Этап | Статус |
|---|---|
| 0. Структура, зависимости, конфиг | готово |
| 1. Разведка источников | готово — `output/source-discovery.json` |
| 1. Сбор индекса URL (4821 адрес) | готово |
| 1. Скачивание материалов (960 страниц) | готово |
| 1. Telegram (6298 постов) | готово |
| 2. Нормализация, дедуп, кросспосты | готово — `output/corpus-report.json` |
| 3. Количественные метрики | готово — `output/articles-metrics.csv` |
| 3.5. Медийные метрики | готово — `output/summary-by-outlet.csv`, `share-*.csv` |
| 4. Качественное кодирование | не начато |
| 5. Разбивка по топикам | готово — `output/topics-by-outlet*.csv` |
| 5.5. Сравнение по инфоповодам | готово — `output/newsbreaks*.csv` |
| 5.6. Повестка и цитируемость | готово — `output/agenda-first-mover.csv`, `citations.csv`, `topic-gaps.csv` |
| 6. Отчёт и дашборд | дашборд готов (`output/dashboard.html`), отчёт не начат |

## Что собрано

| Издание | Индекс URL | Скачано | В корпусе | Telegram | Постов со ссылкой на свой сайт |
|---|---|---|---|---|---|
| Gazeta.uz | 593 | 120 | 120 | 655 | 604 (92%) |
| Kun.uz | 476 | 120 | 115 | 448 | 429 (96%) |
| Daryo.uz | 539 | 120 | 108 | 1115 | 1014 (91%) |
| Spot.uz | 653 | 120 | 120 | 541 | 530 (98%) |
| Podrobno.uz | 262 | 120 | 116 | 1184 | 1155 (98%) |
| Repost.uz | 1031 | 120 | 120 | 1173 | 1041 (89%) |
| UzNews.uz | 378 | 120 | 93 | 430 | 404 (94%) |
| Yuz.uz | 889 | 120 | 118 | 752 | 710 (94%) |
| LEAP News (мы) | — | — | 303 | нет канала в корпусе | — |

Порог «не менее 10 материалов на конкурента» (правило 5) выполнен везде с запасом;
минимум — UzNews.uz, 93.

## Источники и как они брались

Robots.txt проверяется перед каждым запросом (`Fetcher.robots_allows`, проверка и по
нашему имени, и по `*`), задержка 1.5 с на хост, User-Agent
`LeapNewsResearchBot/1.0 … contact: newsroom@leap.uz`. Сырьё кешируется в `data/raw/`,
повторный прогон сеть не трогает.

| Конкурент | Рабочий источник списка | Telegram |
|---|---|---|
| Gazeta.uz | RSS + недельные `sitemap/materials-ru-*.xml` | `@gazetauz` |
| Kun.uz | посуточные `sitemap/site-map-news_day_*` | `@kunuzru` |
| Daryo.uz | `sitemap-ru-1/2.xml` | `@daryo` (uz) |
| Spot.uz | RSS + недельные `sitemap/materials-ru-*.xml` | `@spotuz` |
| Podrobno.uz | RSS + пагинация рубрик (`?PAGEN_1=`) | `@podrobno` |
| Repost.uz | `news-feed.xml` + `sitemap.xml` с lastmod | `@repostuz` |
| UzNews.uz | RSS + пагинация `/ru/news?page=` | `@uznews` |
| Yuz.uz | `yuz.uz/ru/sitemap.xml` | `@yuz_official` (uz) |

## Проблемы и как решены

1. **`www.gazeta.uz` обрывает соединение** (`RemoteProtocolError`) — и на www-хосте,
   и на любом небраузерном User-Agent. robots.txt пуст, запретов нет. Решение:
   голый домен `gazeta.uz` + браузерный UA (`browser_ua: true` в конфиге).
2. **Kun.uz не отдаёт RU-RSS**: `/ru/news/rss` возвращает Next.js-страницу.
   Решение: посуточные sitemap-файлы, RU-версии ~20 материалов в день из ~55.
3. **Daryo.uz рендерится на JS** — в html пустой каркас. Playwright не понадобился:
   текст лежит экранированным в инлайновом Nuxt-скрипте, метаданные — в schema.org.
   `parse_articles.py` собирает из сырья синтетическую страницу (`extractor: nuxt-daryo`).
   Из 120 скачанных так восстановились 108; остальные 12 — заметки короче 40 слов
   (курс валют), они и не нужны.
4. **Ошибочные Telegram-handle в `docs/media-landscape-2026.md`**: у Spot.uz указан
   `@spotug` (пустой предпросмотр), рабочий — `@spotuz`. У Daryo указан `@daryo_ru`
   (пусто); живой канал — `@daryo`, узбекоязычный.
   **Русского Telegram-канала у Daryo.uz нет**: `@daryo_ru` и `@daryouz` пустые,
   `@daryo_uz` заброшен в июне 2024, `@daryo_rus` не обновлялся с июля 2020.
5. **Kun.uz в robots.txt** объявляет content-signals (`search` / `ai-input` / `ai-train`)
   без единого правила `Disallow`. Материалы читаются для редакционного сравнения,
   ничего не обучается и не индексируется; в отчёт идут цитаты не длиннее 15 слов
   со ссылкой.
6. **UzNews.uz и Podrobno.uz не дают дату в индексе** — период по ним фильтруется
   после парсинга страницы. У UzNews по этой причине отсеялся 21 материал из 120
   (вне периода) и 6 дублей текста, осталось 93.
7. **Короткие ссылки в Telegram.** Kun.uz даёт `kun.uz/ru/<8 цифр>`, Daryo — `daryo.uz/<код>`,
   Yuz — `/a/<lang>/<id>`. Сопоставить по строке нельзя, поэтому `resolve_links.py`
   разрешает случайную выборку в 200 ссылок на издание. У Kun редиректы разрешаются
   (192 из 200), у Daryo — нет: редирект клиентский, доля кросспостов по ссылкам для
   Daryo не измерена и в отчёте помечена как «нет данных».
8. **Telegram Yuz.uz ведёт не на русскую версию сайта**: из разрешённых ссылок
   237 на `/oz/` и 225 на `/uz/`, на `/ru/` — ни одной.
9. **Инфоповоды считаются по Telegram, а не по сайту.** Корпус сайта — выборка 120 из
   500–1000, и одно событие попадает в неё у одного издания и не попадает у другого;
   мерить «кто был первым» по такой выборке нельзя. Telegram собран за период целиком.
   Глубина при этом берётся с сайта: `fetch_event_articles.py` адресно докачивает
   материал по ссылке из поста.
10. **Daryo.uz и Yuz.uz выпадают из сравнения по инфоповодам и повестке** — их каналы
    узбекоязычные и с русскими кластерами не пересекаются. Это ограничение, а не ноль.
11. **Наш корпус существует только с 2026-08-01** (7 дней против 30 у конкурентов).
    Поэтому инфоповоды считаются дважды: за весь период (только конкуренты) и за
    01–07.08 (`newsbreaks-headtohead*`), где сравнение с нами корректно.

## Что осталось

- Этап 4: качественное кодирование, 8–12 материалов на издание, `output/qualitative.csv`.
- Проверка точности эвристик на ручной разметке (`sample.py --validation`).
- Этап 6: `output/report.md`.

## Как воспроизвести

```bash
python3 -m venv .venv-competitor
.venv-competitor/bin/pip install -r requirements.txt
.venv-competitor/bin/python scripts/competitor/run_all.py
```

Отдельные шаги в порядке запуска: `discover_sources.py` → `collect_index.py` →
`fetch_articles.py` → `collect_telegram.py` → `resolve_links.py` → `parse_articles.py`
→ `parse_ours.py` → `normalize.py` → `metrics.py` → `topics.py` → `newsbreaks.py` →
`fetch_event_articles.py` → `agenda.py` → `dashboard.py` → `report.py`.
