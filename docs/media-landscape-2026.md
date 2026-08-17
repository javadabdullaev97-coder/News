# Медиа- и информационный ландшафт Республики Узбекистан на 2026 год

Каталог источников и технический регламент для новостного агрегатора **leap.uz**.

Исследование выполнено Gemini Deep Research, 2026-07-31. Используется как справочник при
формировании `config/news-sources.json` и `config/telegram-channels.json`.

## Редакционные исключения

Следующие источники **исключены** из мониторинга по редакционному решению
и не должны попадать в конфиги фетчера, промпты агентов или ссылки в статьях:

- **Radio Ozodlik** (`ozodlik.org`, `@ozodlikradiosi`) — RFE/RL Uzbek
- **Настоящее Время / Currenttime.tv** (`@currenttimetv`) — RFE/RL / VOA
- **Мубашир Ахмад** и все связанные ресурсы: **Azon.uz**, **Azon Global**, его личные
  каналы. Azon.uz прекратил работу в Узбекистане в августе 2023 г.

## Executive summary

Медиапространство Республики Узбекистан к 2026 году — высокодинамичная гибридная
экосистема: традиционные веб-ресурсы работают как структурированные архивы и
аналитические площадки, а Telegram — основной канал оперативного распространения
новостей и формирования повестки.

Ключевой институциональный тренд — упразднение Агентства информации и массовых
коммуникаций (АИМК / АОКА) в июле 2025 г. с созданием Центра производства
национального контента при Администрации Президента: вектор регулирования сместился
от административного контроля к системному созданию инфоповодов и усилению
институтов пресс-секретарей.

Рынок частных и полугосударственных онлайн-СМИ концентрируется вокруг **Kun.uz,
Gazeta.uz, Daryo.uz и Repost.uz**.

Для leap.uz оптимальна комбинированная архитектура:
- **первичный сигнал и правовая верификация** — через ведомственные Telegram-каналы
  (в первую очередь `@huquqiyaxborot` Минюста и `@shmirziyoyev` пресс-службы Президента);
- **полнотекстовый парсинг** — сочетание RSS-ингестии, Open Data API и headless-браузера
  (Playwright) для источников с anti-bot защитой.

## Раздел 1 — Конкуренты (частные и полугосударственные СМИ)

Топ-10 по совокупной аудитории (Web + Telegram):

| # | Издание | Совокупный охват |
|---|---|---|
| 1 | Kun.uz | ~8.5M+ |
| 2 | Daryo.uz | ~4.5M+ |
| 3 | Gazeta.uz | ~3.0M+ |
| 4 | Repost.uz | ~1.8M+ |
| 5 | Podrobno.uz | ~1.6M+ |
| 6 | UzNews.uz | ~1.4M+ |
| 7 | Spot.uz | ~700K+ |
| 8 | Afisha.uz | ~700K+ |
| 9 | Yuz.uz | ~500K+ |

### Полный каталог конкурентов

| Название | Домен | Языки | RSS | Telegram | Охват | Фокус | Владелец |
|---|---|---|---|---|---|---|---|
| Kun.uz | kun.uz/ru | UZ/RU/EN | `kun.uz/news/rss` | `@kunuzofficial` (1.17M) | Web ~7.4M | Универсальное | ООО «WEB EXPERT» |
| Gazeta.uz | gazeta.uz/ru | RU/UZ/EN | `gazeta.uz/ru/rss/` | `@gazetauz` (87K) | Web ~2-4.7M | Аналитика, урбанистика | ООО «Gazeta News» |
| Daryo.uz | daryo.uz/ru | UZ/RU/EN | `daryo.uz/rss/` | `@daryo_ru` (350K суммарно) | Web ~3.5-5M | Универсальное, регионы | ООО «Simple Networking Solutions» |
| Repost.uz | repost.uz | RU/UZ | `repost.uz/rss` (Cloudflare) | `@repostuz` (84K) | Web ~1.2-2M | Молодёжка, вирус | Частное |
| Podrobno.uz | podrobno.uz | RU/UZ | `podrobno.uz/rss/` | `@podrobno` (60K) | Web ~1.5M | Ташкент, политика | ООО «Big Media Group» |
| UzNews.uz | uznews.uz/ru | RU/UZ | `uznews.uz/rss` (Cloudflare) | `@uznews` (120K) | Web ~1-1.8M | ЧП, суды, криминал | ИА «UzNews» |
| Spot.uz | spot.uz/ru | RU/UZ | `spot.uz/ru/rss/` | `@spotug` (45K) | Web ~500-800K | Бизнес, IT, финтех | ООО «Afisha Media» |
| Afisha.uz | afisha.uz/ru | RU/UZ | `afisha.uz/rss/` | `@afishauz` (20K) | Web ~600K-1M | Lifestyle, культура | ООО «Afisha Media» |
| Yuz.uz | yuz.uz/ru | UZ/RU/EN | `yuz.uz/rss` | `@yuz_official` (30K) | Web ~400-700K | Гос-политика, реформы | ГУ «Yangi O'zbekiston» |
| Tribuna.uz | tribuna.uz | UZ/RU | `tribuna.uz/rss` | `@tribuna_uz` (80K) | Web ~400K | Спорт | ООО «WEB EXPERT» |
| Kapital.uz | kapital.uz | RU/UZ | `kapital.uz/feed/` | `@kapitaluz` (25K) | Web ~300-500K | Финансы, банки | Частное |
| Nuz.uz | nuz.uz | RU | `nuz.uz/feed/` | `@nuzuz` (20K) | Web ~300-500K | Общество, политика | ООО «Media Biznes» |
| Anhor.uz | anhor.uz | RU/UZ | `anhor.uz/feed/` | `@anhoruz` (15K) | Web ~150-300K | Урбанистика, расследования | ООО «LIFT MEDIA» |
| Hook.report | hook.report | RU/UZ | `hook.report/feed/` | `@hook_report` (12K) | Web ~80-150K | Соц. аналитика, лонгриды | Независимый |
| Mover.uz | mover.uz | RU/UZ | Нет | `@moveruz` (15K) | Web ~200K | Видеохостинг | Частное |

### Инфлюенсеры (Telegram, авторские каналы)

| Канал | Автор | Тематика |
|---|---|---|
| `@davletovuz` | Давлетов | Политика, законы, назначения |
| `@KurbanovTelegram` | Бахтиёр Курбанов (Bakiroo) | Экономика, финансы, ставка ЦБ, тарифы |
| `@allamjonov_ki` | Комил Алламжонов | Медиа, свобода слова, IT |

## Раздел 2 — Государственные структуры (первоисточники)

### 2.1. Высшие органы власти

| Орган | Сайт | Telegram (подп.) | Примечание |
|---|---|---|---|
| Президент | `president.uz` (Cloudflare) | `@shmirziyoyev` (240K+) | Пресс-служба ведёт TG |
| Кабинет Министров | `gov.uz` | `@portal_gov_uz` (750+) | ЕПИГУ = `my.gov.uz` |
| Законодательная палата | `parliament.gov.uz` | `@parliamentuz` (12K) | |
| Сенат | `senat.uz` | `@senat_uz` (18K) | |
| Конституционный суд | `ksrk.uz` | `@ksrk_uz` (2K) | Низкая частота |
| Верховный суд | `suds.uz` | `@sud_uz` (25K) | e-sud.uz |
| Генпрокуратура | `prokuratura.uz` | `@prokuraturauz` (85K) | Резонансные дела |

### 2.2. Министерства (структура на 2026)

| Министерство | Сайт | RSS | Telegram (подп.) |
|---|---|---|---|
| МИД | mfa.uz | Нет | `@mfa_uz` (35K) |
| МВД | mvd.uz | Нет | `@mvd_uz` (110K) |
| Обороны | mudofaa.uz | Нет | `@mudofaavazirliqi` (40K) |
| **Юстиции** | adliya.uz | Нет | **`@huquqiyaxborot` (400K+, критично)** |
| Экономики и финансов | mf.uz / gov.uz/imv | Нет | `@minecofinuz` (26,4K) |
| Цифровых технологий | digital.uz | **Да** | `@digitaluzbekistan` (25K) |
| Здравоохранения | ssv.uz | Нет | `@ssvuz` (120K) |
| Высшего образования | edu.uz | Нет | `@eduuz` (250K) |
| Дошк. и школьного образования | uzedu.uz | Нет | `@uzedu` (300K) |
| Инвестиций, промышл. и торговли | miit.uz | Нет | `@miituz` (20K) |
| Транспорта | mintrans.uz | Нет | `@Mintrans_uz` (15K) |
| Энергетики | minenergy.uz | Нет | `@minenergy_uz` (50K) |
| Сельского хозяйства | agro.uz | Нет | `@agrouz` (18K) |
| Строительства и ЖКХ | mc.uz | Нет | `@mcu_uz` (22K) |
| Занятости и сокращения бедности | mehnat.uz | Нет | `@mehnatvazirligi` (40K) |
| Культуры | madaniyat.uz | Нет | `@madaniyatvazirligi` (12K) |
| Экологии | eco.gov.uz | Нет | `@ecogovuz` (18K) |
| Водного хозяйства | water.gov.uz | Нет | `@suv_xojaligi` (8K) |
| Спорта | ms.uz | Нет | `@minsportuz` (15K) |

### 2.3. Госкомитеты, агентства, службы

| Ведомство | Сайт | RSS | Telegram (подп.) |
|---|---|---|---|
| Налоговый комитет (Soliq) | soliq.uz (Cloudflare) | Нет | `@soliquz` (90K) |
| Таможенный комитет | customs.uz | Нет | `@customsuz` (45K) |
| **Агентство статистики** | stat.uz | **Да** | `@uzstataxborot` (30K) |
| Комитет по конкуренции | antimon.gov.uz | Нет | `@antimon_uz` (12K) |
| Агентство по борьбе с коррупцией | anticorruption.uz | Нет | `@anti_corruption_uz` (20K) |
| Агентство по управлению госактивами | davaktiv.uz | Нет | `@davaktivuz` (25K) |
| Uzpost | uz.post | Нет | `@uzpost_uz` (8K) |
| Агентство интеллектуальной собственности | ima.uz | Нет | `@ima_uz` (5K) |
| MyGov (агентство госуслуг) | my.gov.uz | Нет | `@davxizmat` / `@mygovuz` (150K) |
| **NAPP** (перспективные проекты) | napp.uz | Нет | `@napp_uz` (15K) |
| IT-Park | it-park.uz | Нет | `@itpark_uz` (40K) |
| Нац. агентство соцзащиты (IHMA) | ihma.uz | Нет | `@ihmauz` (35K) |

### 2.4. Финансово-экономический блок

| Орган | Сайт | RSS/API | Telegram (подп.) |
|---|---|---|---|
| **Центральный банк** | cbu.uz (Cloudflare) | **RSS + JSON API курсов** | `@centralbankuzbekistan` (60K) |
| Минэкономфин | mf.uz | Нет | `@minecofinuz` (26,4K) |
| Респ. фондовая биржа «Toshkent» | uzse.uz | API котировок | `@rse_tashkent` (8K) |
| Центральный депозитарий | deponet.uz | Нет | `@deponet_uz` (3K) |
| Национальный банк ВЭД (NBU) | nbu.uz | Нет | `@nbu_official` (20K) |

### 2.5. Силовые структуры

| Орган | Сайт | Telegram | Особенности |
|---|---|---|---|
| МВД | mvd.uz | `@mvd_uz` (110K) | `@iibb_uz` — ГУВД Ташкента, ключевой исток ЧП |
| СГБ | Нет сайта | Нет канала | Только через УзА (uza.uz) |
| Национальная гвардия | milliygvardiya.uz | `@milliygvardiyauz` (30K) | |
| Генпрокуратура | prokuratura.uz | `@prokuraturauz` (85K) | |
| Комитет по контролю за наркотиками | ncdc.uz | `@ncdc_uz` (3K) | |
| ГУИН (пенитенциарная) | guin.mvd.uz | `@guin_mvd` (5K) | |

### 2.6. Хокимияты (регионы)

| Регион | Сайт | Telegram |
|---|---|---|
| Ташкент (город) | tashkent.uz | `@tashkentpressuz` (90K), `@codd_tashkent` — ЦОДД при хокимияте, ограничения движения |
| Ташкентская обл. | toshvil.uz | `@toshvilpress` (35K) |
| Самарканд | samarkand.uz | `@samarkandpress` (40K) |
| Фергана | fergana.uz | `@ferganapress` (30K) |
| Андижан | andijan.uz | `@andijannews` (50K) |
| Наманган | namangan.uz | `@namanganpress` (25K) |
| Бухара | bukhara.uz | `@bukharapress` (20K) |
| Хорезм | xorazm.uz | `@xorazmpress` (18K) |
| Кашкадарья | qashqadaryo.uz | `@qashpress` (35K) |
| Сурхандарья | surxondaryo.uz | `@surxondaryopress` (22K) |
| Джизак | jizzax.uz | `@jizzaxpress` (15K) |
| Сырдарья | sirdaryo.uz | `@sirdaryopress` (12K) |
| Навои | navoi.uz | `@navoipress` (15K) |
| Каракалпакстан | karakalpakstan.uz | `@joqargikenes` (45K, Жоқарғы Кеңес — Верховный Совет) |

### 2.7. Госкомпании и отраслевые монополии

| Компания | Сайт | Telegram |
|---|---|---|
| O'zbekiston Temir Yo'llari (ж/д) | railway.uz | `@uzrailways` (35K) |
| Uzbekistan Airways | uzairways.com | `@uzbekistanairways` (50K) |
| Узбекнефтегаз | ung.uz | `@uzbekneftegaz` (25K) |
| Узбекгидроэнерго | uzhydropower.uz | `@uzuzhydro` (10K) |
| Узавтосаноат | uzavtosanoat.uz | `@uzavtosanoat_official` (30K) |
| Узатом | uzatom.uz | `@uzatom_official` (8K) |
| Узгидромет | hydromet.uz | `@uzgydromet` (7,1K) — через `g`; `@uzhydromet` через `h` это сквоттер |

## Раздел 3 — Международные и региональные источники

| Издание | URL | RSS | Специализация по ЦА |
|---|---|---|---|
| Reuters | reuters.com | `reutersagency.com/feed/` | Макроэкономика, энергетика ЦА |
| AP | apnews.com | HTML-парсинг | Права человека, геополитика |
| BBC Uzbek | bbc.com/uzbek | `bbc.com/uzbek/index.xml` | Соц-политический анализ |
| Bloomberg | bloomberg.com | HTML/API | Суверенный долг, валюта |
| Al Jazeera | aljazeera.com | `aljazeera.com/xml/rss/all.xml` | Внешняя политика, коридоры |
| DW (Deutsche Welle) | dw.com | `rss.dw.com/xml/rss-ru-all` | ЕС–Узбекистан, экология, Арал |
| Nikkei Asia | asia.nikkei.com | HTML | Инвестиции Китая, Японии |
| Financial Times | ft.com | `ft.com/?format=rss` | Транспортный коридор Север-Юг |
| ТАСС | tass.ru | `tass.ru/rss/v2.xml` | РФ–РУз, ЕАЭС, ШОС |
| РИА Новости | ria.ru | `ria.ru/export/rss2/archive/index.xml` | Региональная безопасность, миграция |
| Интерфакс | interfax.ru | `interfax.ru/rss.asp` | Корпораты, газ, энергетика |
| РБК | rbc.ru | `rssexport.rbc.ru/rbcnews/news/30/full.rss` | Банки, релокация бизнеса |
| Коммерсантъ | kommersant.ru | `kommersant.ru/RSS/news.xml` | Промкооперация, торговля |
| Ведомости | vedomosti.ru | `vedomosti.ru/rss/news` | Рынки капитала, логистика |
| Kazinform (KZ) | inform.kz | `inform.kz/rss/rss.xml` | Граница KZ-UZ, вода, ОТГ |
| Sputnik Кыргызстан | ru.sputnik.kg | `ru.sputnik.kg/export/rss2/archive/index.xml` | Трансграничная торговля |
| Kabar (KG) | kabar.kg | `kabar.kg/rss/` | Памир, энергетика ЦА |
| Trend (AZ) | trend.az | `ru.trend.az/rss/index.rss` | Middle Corridor |
| Turkmenportal (TM) | turkmenportal.com | `turkmenportal.com/rss` | Газ, транзит, порты |
| Eurasianet | eurasianet.org | `eurasianet.org/rss.xml` | Глубокая экон-аналитика ЦА |
| Fergana.agency | fergana.agency | `fergana.agency/rss/` | Права человека, миграция |
| Radio Ozodi (Таджикистан) | ozodi.org | `ozodi.org/api/` | Рогунская ГЭС, границы |
| The Diplomat | thediplomat.com | `thediplomat.com/feed/` | Стратегический анализ ЦА |
| CACI Analyst | cacianalyst.org | HTML | Академический анализ безопасности |
| CABAR.asia | cabar.asia | `cabar.asia/feed/` | Аналитический портал ЦА |

## Раздел 3.1 — Спортивные источники

Заведены 17.08.2026 отдельным заходом: до этого на 75 лент приходилось четыре
спортивные, из них одна отключённая. Приоритетные дисциплины — футбол,
ММА/UFC, бокс, теннис, «Формула-1»; остальные виды не покрываем.

| Дисциплина | Что закрывает | Ленты в конфиге |
|---|---|---|
| Футбол | топ-5 лиг Европы, еврокубки, сборные | `bbc-sport-football`, `guardian-football`, `cbs-sports-soccer`, `football-italia`, `football-espana`, `marca-en`, `bulinews`, `fourfourtwo`, `sportsru-football`, `sport-express-football` |
| Трансферы | суммы, переходы, рыночные оценки | `sport-express-transfers`, плюс футбольные ленты BBC, Guardian, Sky, Marca. Ранний сигнал — `caughtoffside` и `eyefootball-transfers` с `citable:false`. Пять лент `transfermarkt-*` отключены 17.08.2026, разбор ниже |
| Турция и узбекские легионеры | Суперлига, Шомуродов, Файзуллаев | `trt-spor-futbol`, `football-italia` |
| ММА / UFC | карды, рейтинги, контракты | `sherdog-news`, `mma-fighting`, `cbs-sports-mma`, `sportsru-fight`, `one-championship` |
| Бокс | топ-бои, титулы, санкционирование | `boxingscene`, `fightnews`, `wbc-boxing`, `wba-boxing`, `wbo-boxing`, `sportsru-fight` |
| Теннис | Grand Slam, ATP/WTA, рейтинги | `bbc-tennis`, `guardian-tennis`, `tennismajors`, `tennis365`, `ubitennis`, `sportsru-tennis`, `sport-express-tennis` |
| «Формула-1» | Гран-при, регламент, контракты пилотов | `formula1-official`, `motorsport-f1`, `skysports-f1`, `the-race-f1`, `racefans`, `sportsru-f1`, `fia-official` |

### Спорт идёт отдельным потоком инбокса

С 17.08.2026 у спорта свой файл — `content/inbox/sport-YYYY-MM-DD.jsonl`.
Ленты помечены полем `stream: "sport"` в `config/news-sources.json`, разводку
делает `scripts/pull-news-inbox.mjs`, читает `inbox-select.mjs --sport`.

Повод — замер боевого прогона 17.08: 1290 спортивных записей против 100
мировых. В общей линии спорт перекрыл бы собой войну, экономику и выборы,
и планёрка просеивала бы трансферные слухи в поисках мирового сюжета.

Разводка касается **только записей, не прошедших фильтр региона**. Спортивная
новость с упоминанием Узбекистана — Хусанов в АПЛ, узбекский боец в UFC —
идёт в основной инбокс, как и раньше. Иначе правило `uzbekAthleteAnywhere`
потеряло бы половину поводов.

### Слухи о трансферах и боях — берём, а не ждём

`citable` управляет правом поставить ссылку, а не правом взять тему. Это
разные вещи, и путать их нельзя: трансферный рынок и переговоры о боях
устроены так, что новостью является сама стадия — отказ игрока, названная
сумма, согласие сторон, медосмотр. Дожидаться официального объявления значит
выходить последними. Правило записано в
`config/newsroom-policy.json` → `world.specialRules.sportTransferAndFightRumor`.

Работает это так: `boxingnews24`, `eyefootball-transfers` и `caughtoffside`
заведены с `citable: false` — они пересказывают таблоиды, ссылаться в статье
на них не на что. Их роль — **заметить тему раньше других**. Дальше материал
делается по источнику с `citable: true`, который сообщает то же самое, и с
атрибуцией в заголовке и лиде: «по информации Sky Sports, Родри отказал
„Реалу“», но не «Родри переходит в „Барселону“».

Единственный ограничитель — не превращаться в жёлтую ленту: тот же слух,
пересказанный второй раз без новой стадии, новостью не является.

### Как читать отрицательный результат

**403, 202 и таймаут из агентской песочницы ничего не доказывают.** Контур,
в котором работает агент, ходит через прокси, и часть площадок его режет.
Проверка: прогон `source-health` в Actions от 16.08.2026 нашёл сломанными
2 ленты из 75, тогда как из песочницы 403 отдавали Guardian, NYT, FT,
Economist, The Verge и Ars Technica — все они в проде живы.

Отсюда правило: **источник признаётся мёртвым только по тому отказу, который
не зависит от сети** — HTTP 404, отдача HTML вместо XML, битая кодировка,
замороженная лента. Всё остальное проверяется прогоном в Actions, и до этого
момента источник не выбрасывается, а помечается как неподтверждённый.

### Мёртвые адреса — отказ не зависит от контура (17.08.2026)

| Организация | Адрес | Что на самом деле |
|---|---|---|
| UFC | — | открытой ленты нет, только закрытый API приложения |
| FIFA | `fifa.com/rss/news.xml` | отдаёт HTML, не XML |
| UEFA | `uefa.com/rss/news/index.xml` | HTTP 404 |
| AFC | `the-afc.com/en/rss.xml` | HTTP 404 |
| WTA | `wtatennis.com/rss/news` | HTTP 404 |
| Premier League, LaLiga | `/rss/news` | HTTP 404 у обеих |
| «Аль-Хиляль» | `alhilal.com/feed/news` | HTTP 404 |
| Saudi Pro League | `spl.com.sa/en/rss` | HTTP 404 |
| «Истанбул Башакшехир» | `ibfk.com.tr/rss.xml` | HTTP 404 на всех вариантах |
| BoxingScene | `boxingscene.com/rss.xml` | HTTP 404 — рабочий адрес `/feed` |
| Pitpass | `pitpass.com/rss/f1_news.xml` | HTTP 404 |
| Sports.ru | `sports.ru/rss/all.xml` | HTTP 404 — рабочие рубричные `rubric.xml?s=` |
| championat.asia | `championat.asia/ru/rss` | HTTP 404 |
| Goal.com | `goal.com/*/feeds/news` | HTTP 404 |
| BBC legacy | `newsrss.bbc.co.uk/rss/sportonline_uk_edition/*` | адреса выведены из строя |
| 90min | `90min.com/posts.rss` | лента заморожена на сентябре 2025 |
| World Soccer | `worldsoccer.com/feed` | последняя запись 31.07.2026 |
| Inside Tennis, BoxingInsider | `/feed` | обновляются раз в 9–10 дней |
| f1-world.ru | `f1-world.ru/news/rssexp6.xml` | cp1251 без объявления кодировки, кириллица приходит мусором |

**Formula 1 ленту отдаёт** — `formula1.com/en/latest/all.xml`, 10 записей,
заведена как `formula1-official`. У записей нет `pubDate`, но это безопасно:
`lib/inbox-core.mjs` берёт время из `fetchedAt` и обращается к `pubDate` только
запасным.

### Спорные адреса — разобраны прогоном в Actions 17.08.2026

Шесть адресов давали из песочницы 403, 202 или таймаут. Разовый воркфлоу
спросил их из окружения фетчера и закрыл вопрос. Итог: половина оказалась
живой, половина мертва по-настоящему.

| Источник | Ответ из песочницы | Ответ из Actions | Итог |
|---|---|---|---|
| Guardian (футбол, теннис) | 403 | 200, 64 и 20 записей | заведены |
| Marca (англ.) | 403 | 200, 48 записей | заведена |
| RaceFans | 429 | 200, 20 записей | заведена |
| ESPN (soccer, mma, tennis, boxing) | 202 без записей | не XML | мёртв окончательно |
| ATP | 403 | 403 | мёртв, Cloudflare режет и дата-центры |
| «Аль-Наср» | 403 | 403 | мёртв |
| Ассоциация футбола Узбекистана | соединение не встаёт | то же | мёртв |
| UEFA | 404 | таймаут | мёртв в любом контуре |

Практический вывод на будущее: **спорный источник проверяется разовым
воркфлоу, а не отбрасывается по ответу песочницы.** Стоит это одну минуту
и один пуш в свою ветку. Триггер — `push` в ветку, а не `workflow_dispatch`:
кнопку «Run workflow» GitHub показывает только для воркфлоу, лежащих в `main`.

### Обратная ошибка стоит столько же: Transfermarkt

17.08.2026 пять лент Transfermarkt завели по проверке из песочницы — HTTP 200,
валидный XML, 10 записей у каждой. Первый же боевой прогон фетчера уронил все
пять: «Unable to parse XML».

Диагностика в Actions показала причину: **Transfermarkt отдаёт дата-центрам
пустой HTTP 202** с `content-type: text/html` и нулевым телом. Ровно то же
поведение, что у ESPN. Ленты отключены (`disabled: true`), записи в конфиге
сохранены вместе с разбором.

Вывод симметричен предыдущему и важнее его: **проверка из песочницы не
доказывает НИ ЖИЗНЬ источника, НИ его смерть.** `check-sources.mjs` тут ни при
чём — он бы это поймал, `items=0` для него признак поломки; но запускали его
оттуда же, из песочницы, где лента отвечает. Новый источник проверяется
прогоном в Actions до мержа, а не после.

Следствия, с которыми живём сегодня: **первоисточника в теннисе нет** (WTA
мертва наверняка, ATP под вопросом); **Саудовская Про-лига** покрывается только
общими футбольными лентами; **узбекского футбола** первоисточником не закрыть,
остаются `sports-uz` и телеграм-каналы.

## Раздел 3.2 — Технологические источники

Заведены 17.08.2026 вторым профильным заходом, сразу после спортивного. До
него на 120 лент приходилось три технологические — TechCrunch, The Verge и
Ars Technica, все три с приоритетом P3, то есть в аварийный сбор не попадали
вовсе. Стало 76 живых лент. Приоритеты владельца: ИИ, стартапы, финтех,
SpaceX, Google, Apple, Tesla, Nvidia, Microsoft, Revolut, Telegram и «Плата»
Олега Тинькова.

| Направление | Что закрывает | Ленты в конфиге |
|---|---|---|
| ИИ — лаборатории | релизы моделей и исследования из первых рук | `openai-news`, `anthropic-news`, `deepmind-blog`, `google-ai-blog`, `microsoft-ai-source`, `huggingface-blog`, `nvidia-blog` |
| ИИ — разборы | что релиз означает на самом деле | `techcrunch-ai`, `the-decoder`, `verge-ai`, `mit-tech-review`, `venturebeat`, `ai-business`, `ieee-spectrum-ai`, `platformer` |
| Big Tech — ньюсрумы | цифры отчётов, даты, официальные заявления | `apple-newsroom`, `google-keyword`, `microsoft-blogs`, `amazon-news`, `meta-newsroom`, `samsung-newsroom`, `nvidia-newsroom`, `intel-newsroom`, `amd-newsroom` |
| Big Tech — независимо | суды, антимонопольные дела, реакция рынка | `bloomberg-tech`, `cnbc-tech`, `ft-tech`, `bbc-tech`, `wired`, `the-register`, `engadget`, `fortune-tech`, `siliconangle`, `guardian-tech` |
| Стартапы и венчур | раунды, оценки, выходы, закрытия | `techcrunch-startups`, `techcrunch-venture`, `crunchbase-news`, `sifted`, `eu-startups`, `tech-eu`, `geekwire`, `rest-of-world` |
| Финтех | необанки, платежи, лицензии — Revolut, Wise, Plata | `finextra`, `pymnts`, `techcrunch-fintech`, `banking-dive`, `payments-dive`, `stripe-blog`, `latamlist`, `iupana` |
| Криптовалюты | биржи, регулирование, институционалы | `coindesk`, `the-block`; ранний сигнал — `cointelegraph`, `decrypt` с `citable:false` |
| Космос и SpaceX | пуски, контракты, миссии | `spacenews`, `spaceflight-now`, `nasaspaceflight`, `ars-space`, `nasa-news`, `esa-news` |
| Tesla и электромобили | продажи, модели, автопилот | `electrek`, `insideevs`; ранний сигнал — `teslarati` с `citable:false` |
| Apple и Google — экосистемы | релизы iOS и Android, App Store | `nine-to-five-mac`, `nine-to-five-google`; слухи — `macrumors` с `citable:false` |
| Железо и инфраструктура | чипы, фабрики, дата-центры под ИИ | `digitimes`, `datacenterdynamics` |
| Кибербезопасность | утечки, вымогатели, схемы мошенничества | `bleeping-computer`, `krebs-on-security` |
| Платформы | Telegram, соцсети, модерация | TG-каналы `@durov` и `@telegram`, плюс `platformer` и `rest-of-world` |
| По-русски | ранний сигнал и терминология | `habr-news`, `vc-ru` — оба `citable:false`, блок `ru-tech` |

### Технологии идут отдельным потоком инбокса

С 17.08.2026 у направления свой файл — `content/inbox/tech-YYYY-MM-DD.jsonl`.
Механика ровно та же, что у спорта: поле `stream: "tech"` у ленты,
разводка в `scripts/pull-news-inbox.mjs`, чтение через `inbox-select.mjs --tech`.

Повод — замер боевого прогона 17.08.2026: 1204 технологические записи за один
заход, то есть столько же, сколько даёт спорт. В общей линии они перекрыли бы
мировую целиком.

Разводка касается **только записей, не прошедших фильтр региона**. Вложение
Nvidia в узбекский дата-центр или запуск Starlink в стране идут в основной
инбокс — правило `tech.specialRules.uzbekTechAnywhere` без этого потеряло бы
свои поводы.

Одно отличие от спорта пришлось внести в код. У спортивных лент все записи
были типа `context`, и фильтр региона работал на них по умолчанию.
Корпоративные ньюсрумы — это `type: source`, а фильтр по региону на `source`
не распространялся: без правки пресс-релизы Apple и OpenAI целиком уехали бы
в местный инбокс. Теперь фильтр применяется к любой ленте с полем `stream`,
независимо от типа.

### Корпоративный ньюсрум — первоисточник о себе и только о себе

Для лент вида `apple-newsroom`, `openai-news`, `nvidia-newsroom` заведён
отдельный блок `corp-tech`. Смысл — в арифметике независимых подтверждений:
пять пресс-релизов пяти вендоров об одном событии это пять заинтересованных
сторон, а не пять источников. Отсюда правило
`tech.specialRules.vendorSpeaksAboutItself`: цифры отчёта и дата запуска
берутся из релиза как факт, оценки («самая быстрая модель в мире») — только
с атрибуцией или никак. Заявленные бенчмарки подаются как заявление компании
(`benchmarkClaims`).

### Архивные ленты — почему у фетчера появилась отсечка по дате

`openai.com/news/rss.xml` отдаёт 1129 записей, `huggingface.co/blog/feed.xml` —
842: это не лента новостей, а весь архив. Возраст записи в системе считается
по `fetchedAt`, а не по `pubDate` (у половины лент дата кривая или её нет),
поэтому первый же прогон предъявил бы планёрке несколько тысяч «свежих»
новостей трёхлетней давности.

Решение — потолок `MAX_ITEM_AGE_DAYS = 7` в `scripts/pull-news-inbox.mjs`:
запись с разобранным `pubDate` старше недели в инбокс не попадает. Записи без
даты проходят как раньше — для них в `selectFresh` есть отдельный счётчик
`ageUnknown`. На боевом прогоне отсечка сняла 2412 архивных записей из 3616.

### Чего в технологиях нет и не будет

Проверено прямым запросом 17.08.2026, записи оставлены в конфиге с
`disabled: true`, чтобы никто не заводил их заново:

| Компания | Адрес | Что на самом деле |
|---|---|---|
| Revolut | `revolut.com/news/rss/`, `blog.revolut.com/rss/` | 403 от Cloudflare на обоих |
| Tesla | `tesla.com/blog/rss` | Access Denied |
| SpaceX | `spacex.com/updates/` | ленты нет, только HTML |
| Telegram | `telegram.org/blog/rss` | редирект на главную; вместо ленты — каналы `@durov` и `@telegram` |
| IT Park | `it-park.uz/rss` и ещё четыре варианта | HTTP 404 на всех; закрывается каналом `@itpark_uz` |
| FinTech Futures | `fintechfutures.com/feed` | 403 и 301 в никуда |
| Anthropic | `anthropic.com/rss.xml` | HTTP 404; рабочая лента — через FeedBurner |
| Mistral AI | `mistral.ai/news/feed.xml` | HTTP 404, открытой ленты нет |
| AnandTech | `anandtech.com/rss/` | издание закрыто, лента не обновляется |

Правило чтения отрицательного результата из спортивного раздела действует и
здесь: 403 из песочницы ничего не доказывает. Wired, ZDNet, Guardian, FT,
The Verge и Ars Technica отдавали из контура агента 403, а прямым запросом —
200 и валидный XML. Все шесть оставлены в конфиге живыми.

## Раздел 4 — Техника парсинга

### 4.1. Публичные RSS

**Работают напрямую:**
- Все конкурентные СМИ из таблицы выше (кроме repost.uz и uznews.uz — там Cloudflare)
- ЦБ РУз: `cbu.uz/ru/arkhiv-kursov-valyut/rss/`
- Агентство статистики: `stat.uz/ru/?option=com_content&view=featured&format=feed&type=rss`
- Минцифры: `digital.uz/ru/rss`

### 4.2. Anti-bot защита (нужен Playwright)

- `repost.uz`
- `uznews.uz`
- `soliq.uz`
- `president.uz`
- `cbu.uz` (для веб-скрейпа; JSON API открытый)

Cloudflare + reCAPTCHA v3, User-Agent filtering, TLS fingerprinting, HTTP/2 Rapid Reset.
Нужны headless-браузеры с ротацией резидентских узбекских IP.

### 4.3. Открытые API

- **ЦБ РУз**: `cbu.uz/ru/arkhiv-kursov-valyut/json/` — курсы валют и историка, без авторизации
- **Data.gov.uz**: JSON-реестры юрлиц, статистика
- **Tasnif Soliq**: `tasnif.soliq.uz` — классификатор товаров/услуг

### 4.4. Telegram-парсинг

- **HTML-эндпоинт `t.me/s/<slug>`** — работает без API-ключей, отдаёт текст, медиа, таймстемпы, просмотры
- **MTProto (Telethon/Pyrogram)** — если нужна задержка <1 сек, через клиентский бот

### 4.5. Частота опроса

| Тип источника | Интервал |
|---|---|
| Топ-СМИ (Kun, Daryo, Gazeta) | 4–5 мин |
| Ведомственные каналы (Минюст, Президент) | 5 мин |
| Региональные хокимияты и министерства | 15–30 мин |
| Статистика, ЦБ | 1 час |

## Итоговый рейтинг TOP-15 для мониторинга

| # | Источник | Тип | Приоритет | Стратегическая ценность |
|---|---|---|---|---|
| 1 | `@huquqiyaxborot` (Минюст) | Гос | P0 | Абсолютный лидер по скорости публикации законов и указов |
| 2 | Kun.uz | СМИ | P0 | Крупнейшее СМИ страны |
| 3 | `@shmirziyoyev` (Пресс-служба Президента) | Гос | P0 | Первичный источник по назначениям и визитам |
| 4 | Gazeta.uz | СМИ | P0 | Главное качественное RU-издание |
| 5 | ЦБ РУз (cbu.uz) | Гос | P0 | Курсы валют, ставки, макростатистика |
| 6 | Daryo.uz | СМИ | P1 | Скорость, охват регионов |
| 7 | Агентство статистики (stat.uz) | Гос | P1 | Инфляция, ВВП, демография, ВЭД |
| 8 | `@tashkentpressuz` (Хокимият Ташкента) | Гос | P1 | Коммуналка, транспорт столицы |
| 9 | Spot.uz | СМИ | P1 | Бизнес, финтех, IT, налоги |
| 10 | Минэкономфин (mf.uz) | Гос | P1 | Бюджет, госдолг, аукционы |
| 11 | UzNews.uz | СМИ | P2 | ЧП, суды |
| 12 | Repost.uz | СМИ | P2 | Молодёжка, вирус |
| 13 | `@soliquz` (Налоговый) | Гос | P2 | Налоги, ККТ |
| 14 | Yuz.uz | Полугос-СМИ | P2 | Официальная трактовка НПА |
| 15 | `@mvd_uz` (МВД) | Гос | P2 | Заявления силового ведомства |

## Проблемные зоны

1. **Силовые структуры без цифрового присутствия** — СГБ, Погранвойска. Только через УзА.
2. **Деградация сайтов в пользу Telegram** — большинство хокимиятов и министерств
   (Минэнерго, Минтранс, Минкультуры) держат новости в TG; на сайтах публикация
   задерживается на часы или сутки.
3. **Facebook-first у отдельных ведомств** — Минводхоз, Комитет по конкуренции.
   Парсинг требует Graph API.
4. **RSS почти нет у гос-сектора** — только ЦБ, Статистика, Минцифры.

## Рекомендации по запуску

### Приоритет 1 — MVP (14 дней)

Пять источников, покрывающих ~80% полезного сигнала:

1. `@huquqiyaxborot` (Минюст) — MTProto-слушатель для мгновенного перехвата актов
2. `@shmirziyoyev` (Президент) — TG-парсер официальных заявлений
3. Kun.uz — RSS
4. Gazeta.uz — RSS
5. ЦБ РУз — JSON API + RSS

### Приоритет 2 — Масштабирование (30–60 дней)

- Playwright-скрейперы для repost.uz, uznews.uz, soliq.uz
- `@iibb_uz`, `@tashkentpressuz`, `@davletovuz`, `@KurbanovTelegram`
- Модуль кросс-верификации: сущность в СМИ ↔ база Минюста и Статистики

### Приоритет 3 — Полное покрытие (90 дней+)

- Все 12 областных хокимиятов + Каракалпакстан
- Международные источники (Eurasianet, Fergana, Reuters, TASS)
- Автоматическая кластеризация дубликатов (TF-IDF / эмбеддинги)
