"""Этап 4. Качественное кодирование выборки и проверка точности эвристик.

Выборка: output/qualitative-sample.json — по 8 материалов на издание,
стратифицированно по топикам и по периоду (scripts/competitor/sample.py,
seed фиксирован). Каждый материал прочитан целиком.

Ниже две таблицы ручной разметки:

  CODES — кодировочная таблица этапа 4 (что обещает заголовок, как открывается
          материал, соотношение факта и мнения, на что опирается, тон,
          адресат, чем заканчивается, самодостаточность);

  LABELS — ручные метки в тех же словарях, что у автоматических эвристик
           (тип лида, жанр, первичность, топик). Нужны, чтобы измерить
           точность метрик этапов 3, 3.5 и 5, а не заявлять её на глаз.

Ключ обеих таблиц — url материала. По индексу в выборке ключевать нельзя:
пересборка корпуса меняет её состав, и разметка молча съезжает на чужие строки.

Запуск: .venv-competitor/bin/python scripts/competitor/qualitative.py
Результат: output/qualitative.csv, output/heuristics-validation.json
"""

from __future__ import annotations

import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import OUTPUT  # noqa: E402
from metrics import compute_row  # noqa: E402

# ---------------------------------------------------------------------------
# Кодировочная таблица этапа 4.
# Поля: обещание заголовка | выполнено | чем открывается | чем удерживает |
#       факт/интерпретация/мнение | на что опирается | тон | адресат |
#       чем заканчивается | самодостаточность | заметка
# ---------------------------------------------------------------------------
CODES: dict[str, tuple] = {
    "https://daryo.uz/ru/2026/07/14/period-zarabotka-raschet-pensii-uzbekistan": ("период расчёта пенсии вырастет с 5 до 20 лет", "да", "факт", "цифры",
        "только факт", "пресс-служба президента, без ссылки", "нейтральный", "массовый",
        "ничего", "да", "перечень поручений без вывода"),
    "https://daryo.uz/ru/2026/07/08/9-iyulya-uzbekistan-prognoz-pogoda": ("жара до 43 градусов 9 июля", "да", "факт", "практическая польза",
        "только факт", "пересказ Узгидромета", "нейтральный", "массовый",
        "ничего", "да", "сводка по регионам, ноль интерпретации"),
    "https://daryo.uz/ru/2026/07/11/chislo-ekonomicheski-aktivnyx-zhenshchin-uzbekistan": ("к 2030 году экономически активных женщин станет более 7 млн", "да", "факт", "цифры",
        "факт + контекст", "исследование НИИ, без ссылки", "нейтральный", "массовый",
        "вывод", "да", "прогноз подан как данность, метод не описан"),
    "https://daryo.uz/ru/2026/07/08/kibermoshenniki-poxishchavshie-dengi-u-inostrantsev": ("задержана группа кибермошенников", "да", "факт", "цифры и масштаб",
        "только факт", "МВД", "нейтральный", "массовый",
        "ничего", "да", "внутри есть подзаголовок «Как действовали мошенники»"),
    "https://daryo.uz/ru/2026/07/09/portugaliya-braga-perexod-futbolistov-iz-uzbekistana": ("«Брага» объявила о переходе двух узбекистанцев", "да", "факт", "имена и суммы",
        "только факт", "клуб", "нейтральный", "массовый", "ничего", "да", ""),
    "https://daryo.uz/ru/2026/07/28/eldor-shomurodov-vtoroy-samyy-krasivyy-gol-na-chm-2026": ("гол Шомуродова стал вторым в голосовании", "да", "факт", "имя",
        "только факт", "ФИФА", "нейтральный", "массовый", "ничего", "частично",
        "без контекста ЧМ читается наполовину"),
    "https://daryo.uz/ru/2026/07/23/abdukodir-xusanov-samye-prosmatrivaemye-igroki-chm-2026": ("Хусанов в символической сборной Transfermarkt", "да", "факт", "имена и стоимости",
        "только факт", "Transfermarkt", "нейтральный", "массовый",
        "отсылка «напомним»", "да", ""),
    "https://daryo.uz/ru/2026/07/18/uzbekistan-kvoty-priema-v-vuzy-na-20262027-uchebnyy-god": ("утверждены квоты приёма в вузы", "да", "перечень", "практическая польза",
        "только факт", "госкомиссия", "нейтральный", "массовый",
        "ничего", "да", "текст начинается с обрывка списка — сломанная вёрстка лида"),
    "https://www.gazeta.uz/ru/2026/08/05/livestock-farming": ("на животноводство направят почти $900 млн", "да", "факт", "цифры",
        "только факт", "презентация президенту", "нейтральный", "деловой",
        "ничего", "да", ""),
    "https://www.gazeta.uz/ru/2026/07/14/kyrgyzstan": ("Кыргызстан запретил вывоз топлива", "да", "факт", "практическая польза",
        "только факт", "чужая публикация 24.kg со ссылкой", "нейтральный", "массовый",
        "отсылка", "да", "источник назван прямо в первом абзаце"),
    "https://www.gazeta.uz/ru/2026/07/17/landfill": ("загрязнение превысило норму в 12,8 раза", "да", "факт", "цифры и конфликт",
         "факт + контекст", "Нацкомитет по экологии, прямая цитата чиновника",
         "нейтральный", "массовый", "развитие темы", "да",
         "образец: цифра из заголовка подтверждена в тексте, назван ответственный"),
    "https://www.gazeta.uz/ru/2026/07/20/korea-medical-tourism": ("в Ташкенте представили медтуризм Южной Кореи", "частично", "факт", "ничего",
         "факт + оценка", "пресс-конференция организатора", "продающий", "массовый",
         "ничего", "да", "по сути партнёрский материал, пометки о рекламе нет"),
    "https://www.gazeta.uz/ru/2026/07/29/tashtech": ("каких инженеров будет искать страна и как выбрать вуз", "да", "сцена",
         "практическая польза", "факт + интерпретация", "данные вуза",
         "продающий", "массовый", "вывод", "да",
         "нативная реклама вуза в форме объяснителя, пометки нет"),
    "https://www.gazeta.uz/ru/2026/07/29/tournament": ("Мирзиёев участвовал в открытии «Игр будущего»", "да", "факт", "имя-ньюсмейкер",
         "только факт", "пресс-служба", "нейтральный", "массовый", "отсылка", "да", ""),
    "https://www.gazeta.uz/ru/2026/07/09/mobiuz": ("как Mobiuz меняет связь в Ферганской долине", "да", "общее рассуждение",
         "цифры", "факт + оценка", "данные компании", "продающий", "массовый",
         "анонс следующего материала", "да", "помечено «На правах рекламы» — в отличие от [11] и [12]"),
    "https://www.gazeta.uz/ru/2026/07/16/ambassador": ("посол Германии завершает миссию", "да", "факт", "имя-ньюсмейкер",
         "только факт", "Telegram МИД, цитата", "нейтральный", "массовый",
         "ничего", "да", ""),
    "https://kun.uz/ru/news/2026/07/30/v-uzbekistane-na-obshchestvennoye-obsujdeniye-vynesen-proyekt-o-novom-poryadke-otsenki-studentov": ("на обсуждение вынесен новый порядок оценки студентов", "да", "факт",
         "практическая польза", "только факт", "regulation.gov.uz — первичный документ",
         "нейтральный", "массовый", "ничего", "да",
         "начинается с итога голосования на портале — сильный ход"),
    "https://kun.uz/ru/news/2026/07/16/v-rossii-planiruyut-obyazat-migrantov-priobretat-telefony-s-elektronnym-profilem-51d54e": ("мигрантов обяжут покупать телефон с электронным профилем", "да", "факт",
         "конфликт", "только факт", "чужая публикация РБК, цитата", "нейтральный",
         "массовый", "ничего", "да", ""),
    "https://kun.uz/ru/news/2026/07/09/k-2030-godu-defitsit-vody-dostignet-15-mlrd-kubometrov-ministr-vodnogo-xozyaystva-shavkat-xamroyev-80237d": ("дефицит воды достигнет 15 млрд кубометров", "да", "факт", "цифры и эксклюзив",
         "факт + контекст", "собственный сбор: корреспондент в Нью-Йорке, ответы министра",
         "нейтральный", "массовый", "развитие темы", "да",
         "единственный в выборке случай собственной работы в поле за рубежом"),
    "https://kun.uz/ru/news/2026/07/08/grajdaninu-uzbekistana-pomogli-vernutsya-na-rodinu-iz-serbii-ff7a5a": ("гражданину помогли вернуться из Сербии", "да", "факт", "ничего",
         "только факт", "ИА «Дунё»", "нейтральный", "массовый", "ничего", "да",
         "тот же релиз, что и у Yuz.uz [65] — параллельная перепечатка"),
    "https://kun.uz/ru/news/2026/08/04/deputaty-odobrili-proyekt-konstitutsionnogo-zakona-opredelyayushchego-mexanizmy-raboty-administratsii-prezidenta": ("депутаты одобрили закон об Администрации президента", "да", "факт",
         "имя-ньюсмейкер", "только факт", "релиз, цитата", "нейтральный", "массовый",
         "ничего", "частично", "без контекста первого чтения понятно не всё"),
    "https://kun.uz/ru/news/2026/07/11/na-uzbeksko-kazaxstanskoy-granitse-vnedryat-tsifrovoy-tamojyennyy-kontrol-3b4c1c": ("на границе с Казахстаном внедрят цифровой контроль", "да", "факт", "ничего",
         "только факт", "УзА", "официозный", "массовый", "ничего", "да", ""),
    "https://kun.uz/ru/news/2026/07/28/sbornaya-uzbekistana-sygrayet-tovarishcheskiy-match-s-yujnoy-koreyey": ("сборная сыграет с Южной Кореей", "да", "факт", "имя-ньюсмейкер",
         "только факт", "Ассоциация футбола", "нейтральный", "массовый",
         "отсылка", "да", ""),
    "https://kun.uz/ru/news/2026/07/27/energosistemu-uzbekistana-podvergnut-stress-auditu": ("энергосистему подвергнут стресс-аудиту", "частично", "факт", "цифры",
         "только факт", "пресс-служба президента", "нейтральный", "массовый",
         "ничего", "нет",
         "текст начинается с «Однако…» — первый абзац оторван, заголовок и лид о разном"),
    "https://leap.uz/ru/2026/08/06/uzsuv-kwater-cooperation-training-aug2026": ("«Узсувтаъминот» и K-Water обновили программы подготовки", "да", "факт",
         "перечень направлений", "только факт", "публикация компании", "нейтральный",
         "профильный", "контекст и признание неизвестного", "да",
         "прямо сказано, чего в источнике нет: дат, числа слушателей, сумм"),
    "https://leap.uz/ru/2026/08/04/social-protection-reform-2026": ("одобрены предложения по реформе соцзащиты", "да", "факт",
         "практическая польза", "только факт", "сайт президента", "нейтральный",
         "массовый", "«что дальше»", "да", ""),
    "https://leap.uz/ru/2026/08/04/world-pentagon-patriot-thaad-contracts": ("Пентагон заключил контракты на $3 млрд", "да", "факт", "цифры",
         "только факт", "пресс-релиз Northrop, Al Jazeera, «Ведомости», SCMP",
         "нейтральный", "массовый", "«что дальше»", "да",
         "расхождение источников по дате указано прямо в тексте"),
    "https://leap.uz/ru/2026/08/01/uzbekistan-gdp-h1-2026-growth-85pct": ("ВВП вырос на 8,5% — до 1 072,7 трлн сумов", "да", "факт", "цифры",
         "факт + контекст", "Нацкомстат, ЦБ, МВФ", "экспертный", "деловой",
         "«что дальше»", "да",
         "оговорка, что выпуск по секторам не складывается в ВВП — редкая аккуратность"),
    "https://leap.uz/ru/2026/08/06/uzbekistan-phygital-football-spain-53": ("сборная обыграла Испанию 5:3", "да", "факт", "результат",
         "только факт", "Минспорта, проверка по сайту организатора", "нейтральный",
         "массовый", "«что дальше»", "да",
         "сказано, что независимо подтвердить статус сборной не удалось"),
    "https://leap.uz/ru/2026/08/06/meta-anthropic-openai-ai-hacked-systems-safety-tests": ("три ИИ-лаборатории признали взломы на тестах", "да", "факт", "конфликт",
         "только факт", "Al Jazeera, отчёт британского AISI", "нейтральный",
         "профильный", "«что дальше»", "да", ""),
    "https://leap.uz/ru/2026/08/07/bukhara-medvuz-admission-bribery-arrest-aug2026": ("задержан посредник за 26 млн сумов", "да", "факт", "цифры",
         "только факт", "департамент Генпрокуратуры", "нейтральный", "массовый",
         "правовая оговорка", "да", "прямо сказано, что вина не установлена"),
    "https://leap.uz/ru/2026/08/06/napp-capital-markets-law-draft": ("НАПП рассказало о законопроекте о рынке капитала", "да", "факт",
         "перечень инструментов", "только факт", "НАПП, пресс-служба палаты, сайт президента",
         "нейтральный", "деловой", "контекст", "да", ""),
    "https://podrobno.uz/cat/politic/v-uzbekistane-nachal-rabotu-novyy-posol-pakistana": ("новый посол Пакистана начал работу", "да", "факт", "ничего",
         "только факт", "МИД", "официозный", "массовый", "отсылка", "да",
         "текст открывается фирменной строкой «Узбекистан, Ташкент – АН Podrobno.uz»"),
    "https://podrobno.uz/cat/proisshestviya/skonchalsya-voditel-chevrolet-onix-postradavshiy-v-rezonansnom-dtp-s-patrulnymi-mototsiklami": ("скончался водитель, пострадавший в резонансном ДТП", "да", "факт",
         "конфликт", "только факт", "чужая публикация Daryo, данные РНЦЭМП",
         "нейтральный", "массовый", "развитие темы", "да",
         "прямая ссылка на конкурента как на источник"),
    "https://podrobno.uz/cat/obchestvo/v-tashkente-na-chetyre-dnya-perekryli-uchastok-maloy-koltsevoy-dorogi-i-izmenili-marshruty-avtobusov": ("перекрыт участок Малой кольцевой, изменены маршруты", "да", "факт",
         "практическая польза", "только факт", "Тошшахартрансхизмат", "нейтральный",
         "массовый", "рекомендация", "да", ""),
    "https://podrobno.uz/cat/proisshestviya/na-granitse-kyrgyzstana-i-uzbekistana-nashli-podzemnyy-tunnel-kotoryy-mogli-ispolzovat-kontrabandist": ("на границе нашли подземный туннель", "да", "факт", "конфликт",
         "только факт", "УВД Кыргызстана", "нейтральный", "массовый", "отсылка", "да", ""),
    "https://podrobno.uz/cat/economic/strany-eaes-zapustyat-sistemu-otslezhivaniya-torgovli-bytovoy-tekhnikoy": ("страны ЕАЭС запустят прослеживаемость техники", "да", "факт", "ничего",
         "только факт", "заявление главы коллегии ЕЭК", "нейтральный", "деловой",
         "отсылка", "да", "внизу пометка «Изображение сгенерировано ИИ»"),
    "https://podrobno.uz/cat/politic/uzbekistan-predstavit-svoe-kulturnoe-nasledie-na-krupneyshikh-mirovykh-ploshchadkakh": ("Узбекистан представит наследие на мировых площадках", "да", "факт",
         "перечень площадок", "только факт", "программа, представленная президенту",
         "официозный", "массовый", "ничего", "да", ""),
    "https://podrobno.uz/cat/politic/mirziyeev-poruchil-podgotovit-energosistemu-uzbekistana-k-bespereboynoy-rabote-zimoy": ("Мирзиёев поручил подготовить энергосистему к зиме", "да", "факт", "ничего",
         "только факт", "пресс-служба", "официозный", "массовый", "ничего", "да", ""),
    "https://podrobno.uz/cat/politic/shavkat-mirziyeev-prinyal-delegatsiyu-belarusi-vo-glave-s-vitse-premerom-viktorom-karankevichem": ("Мирзиёев принял делегацию Беларуси", "да", "факт", "имя-ньюсмейкер",
         "только факт", "пресс-служба", "официозный", "массовый", "ничего", "да",
         "«главе нашего государства» — редакция говорит от лица страны"),
    "https://repost.uz/govoryat-dast-prozrachnost": ("в Казахстане предложили менять правила въезда", "да", "факт",
         "практическая польза", "только факт", "чужая публикация Nur.kz", "нейтральный",
         "массовый", "призыв подписаться на канал", "да", ""),
    "https://repost.uz/tut-teper-otvetit-pered-zakonom": ("из Польши доставили разыскиваемого Интерполом", "да", "факт", "ничего",
         "только факт", "ИА «Дунё»", "нейтральный", "массовый",
         "призыв подписаться на канал", "да", ""),
    "https://repost.uz/xotyat-objalovat-reshenie": ("швейцарский суд оштрафовал банк по делу Каримовой", "да", "факт",
         "цифры и имя", "только факт", "Swissinfo", "нейтральный", "массовый",
         "ничего", "частично", "без контекста дела Каримовой читается наполовину"),
    "https://repost.uz/chto-tam-da-kak": ("определён порядок работы бондовых складов", "да", "факт",
         "перечень требований", "только факт", "Norma со ссылкой на постановление",
         "нейтральный", "деловой", "определение термина", "да", ""),
    "https://repost.uz/v-celom-obsudili-povestku": ("Мирзиёев созвонился с президентом Ирана", "да", "факт", "имя-ньюсмейкер",
         "только факт", "пресс-служба", "официозный", "массовый",
         "призыв подписаться на канал", "да", ""),
    "https://repost.uz/kachaem-trudovie-otnosheniya": ("сократят перечень документов при приёме на работу", "да", "факт",
         "практическая польза", "только факт", "пресс-служба палаты", "нейтральный",
         "массовый", "призыв подписаться на канал", "да", ""),
    "https://repost.uz/vnutrennix-turistov-eshe-bolshe": ("Ташкент посетили более 3 млн иностранных туристов", "да", "факт", "цифры",
         "только факт", "хокимият", "нейтральный", "массовый",
         "призыв подписаться на канал", "да", ""),
    "https://repost.uz/nakruti-i-tut-presekli": ("выявлено 148 тысяч случаев завышения цен на лекарства", "да", "факт", "цифры",
         "только факт", "Комитет по конкуренции", "нейтральный", "массовый",
         "призыв подписаться на канал", "да", ""),
    "https://www.spot.uz/ru/2026/07/17/id-amendments": ("планируют отменить штраф за утерю паспорта", "да",
         "отсылка на свой прошлый материал", "практическая польза", "только факт",
         "указ", "нейтральный", "массовый", "отсылка на свой материал", "частично", ""),
    "https://www.spot.uz/ru/2026/07/31/real-estate": ("сделки с недвижимостью выросли на 25%", "да", "факт", "цифры",
         "факт + контекст", "отчёт ЦЭИР", "экспертный", "деловой",
         "отсылка на свой материал", "да", ""),
    "https://www.spot.uz/ru/2026/07/10/belarus-projects": ("Узбекистан и Беларусь запустят семь производств на $164 млн", "да", "факт",
         "цифры", "только факт", "собственный сбор: комментарий секретариата вице-премьера",
         "нейтральный", "деловой", "отсылка на свой материал", "да",
         "«Об этом Spot сообщили в секретариате» — эксклюзивный комментарий"),
    "https://www.spot.uz/ru/2026/08/06/akfa": ("как отличить качественные ПВХ-окна", "да", "общее рассуждение",
         "практическая польза", "факт + оценка", "данные компании", "продающий",
         "массовый", "контакты компании", "да", "помечено «На правах рекламы»"),
    "https://www.spot.uz/ru/2026/08/03/crypto-fines": ("иностранным криптобиржам грозят штрафы до 11 млрд сумов", "да", "факт",
         "цифры", "только факт", "проект на портале обсуждения", "нейтральный",
         "деловой", "ничего", "да", "суммы штрафов остались в таблице, в текст не вынесены"),
    "https://www.spot.uz/ru/2026/08/03/edelweiss-samarkand": ("под Самаркандом открылся комплекс за $22 млн", "да", "факт", "цифры",
         "факт + оценка", "Комитет по туризму, хокимият", "нейтральный", "массовый",
         "отсылка на свой материал", "да", ""),
    "https://www.spot.uz/ru/2026/07/27/uzum-record-bonds": ("Uzum разместит рекордный выпуск облигаций на 600 млрд сумов", "да", "факт",
         "цифры", "факт + контекст", "Ташкентская фондовая биржа, история выпусков",
         "экспертный", "деловой", "отсылка на свой материал", "да",
         "весь ряд предыдущих размещений со ставками — редкая для рынка глубина"),
    "https://www.spot.uz/ru/2026/07/09/diesel": ("Россия полностью запретила экспорт дизеля", "да", "факт", "практическая польза",
         "только факт", "постановление, цитата вице-премьера", "нейтральный", "деловой",
         "отсылка на свой материал", "да",
         "объяснено, почему поставки в Узбекистан не затронуты"),
    "https://uznews.uz/ru/news/111851": ("массовые кибератаки на серверы госорганизаций", "да", "факт",
         "практическая польза", "только факт", "UZCERT", "нейтральный", "профильный",
         "рекомендации", "да", ""),
    "https://www.uznews.uz/ru/news/111689": ("в школах введут КПП и ограничат доступ посторонним", "да", "факт",
         "практическая польза", "только факт", "постановление Кабмина", "нейтральный",
         "массовый", "ничего", "да", ""),
    "https://www.uznews.uz/ru/news/111577": ("Мирзиёев участвовал в открытии «Игр будущего»", "да", "факт",
         "имя-ньюсмейкер", "только факт", "пресс-служба", "нейтральный", "массовый",
         "отсылка", "да", "фактура совпадает с материалом Gazeta.uz [13] почти дословно"),
    "https://uznews.uz/ru/news/111841": ("ещё одна возможность для работы в США", "частично", "факт",
         "практическая польза", "факт + оценка", "Агентство по миграции", "продающий",
         "массовый", "указание на телеграм-канал", "да",
         "компания-работодатель не названа, заголовок обещает больше, чем даёт текст"),
    "https://www.uznews.uz/ru/news/111363": ("«Голубые купола» вернут к первоначальному облику", "да",
         "отсылка на свой прошлый материал", "конфликт", "только факт",
         "Агентство культурного наследия, цитаты", "нейтральный", "массовый",
         "цитата-вывод", "частично", ""),
    "https://www.uznews.uz/ru/news/111540": ("на волю выпустили 778 дроф-красоток", "да", "факт", "цифры",
         "только факт", "Нацкомитет по экологии", "нейтральный", "массовый",
         "ничего", "да", ""),
    "https://uznews.uz/ru/news/111827": ("водитель BYD протаранил несколько автомобилей", "да",
         "отсылка на соцсети", "конфликт", "только факт", "УВД области", "нейтральный",
         "массовый", "ничего", "да", ""),
    "https://www.uznews.uz/ru/news/111455": ("жених и невеста погибли от угарного газа", "да", "факт", "конфликт",
         "только факт", "телепрограмма «Миллар»", "нейтральный", "массовый",
         "ничего", "да", "возраст и родство погибших названы, имена — нет"),
    "https://yuz.uz/ru/news/zdravooxranenie-upravlenie-otvetstvennost-doverie": ("здравоохранение: управление, ответственность, доверие", "частично",
         "общее рассуждение", "ничего", "мнение", "указ", "официозный", "чиновник",
         "вывод-лозунг", "да",
         "авторская статья к указу без пометки «мнение» — оценка смешана с фактом"),
    "https://yuz.uz/ru/news/grajdaninu-uzbekistana-okazano-sodeystvie-v-vozvraenii-iz-serbii-na-rodinu": ("гражданину помогли вернуться из Сербии", "да", "факт", "ничего",
         "только факт", "ИА «Дунё»", "официозный", "массовый", "ничего", "да",
         "тот же релиз, что у Kun.uz [19]"),
    "https://yuz.uz/ru/news/tashkent-razvivaet-sotrudnichestvo-s-yaponiey-v-sfere-jkx-i-energoeffektivnogo-upravleniya-domami": ("Ташкент развивает сотрудничество с Японией по ЖКХ", "да", "факт", "ничего",
         "только факт", "хокимият", "официозный", "чиновник", "ничего", "да",
         "ни одной цифры на весь материал"),
    "https://yuz.uz/ru/news/molodej-uzbekistana-dobilas-vsokix-rezultatov-na-mejdunarodnom-": ("молодёжь добилась высоких результатов на WRS", "да", "факт", "ничего",
         "факт + оценка", "пресс-служба", "официозный", "массовый",
         "призыв обращаться в офис", "да", ""),
    "https://yuz.uz/ru/news/v-uzbekistane-opredelen-poryadok-perexoda-bankov-i-mfo-na-islamskuyu-bankovskuyu-deyatelnost": ("определён порядок перехода банков на исламский банкинг", "да", "факт",
         "перечень процедур", "только факт", "Минюст, номер закона", "официозный",
         "профильный", "ничего", "нет", "сплошной канцелярит, без знания закона не читается"),
    "https://yuz.uz/ru/news/predstavitel-gp-navoiyuran-prinyat-v-mejdunarodnuyu-texnicheskuyu-rabochuyu-gruppu-magate-": ("представитель «Навоийуран» принят в группу МАГАТЭ", "да", "факт", "ничего",
         "только факт", "PR-служба предприятия", "официозный", "профильный",
         "ничего", "да", "подписано «PR-служба ГП «Навоийуран»» — релиз без обработки"),
    "https://yuz.uz/ru/news/prognoz-pogod-na-den-3-avgusta-": ("прогноз погоды на 3 августа", "да", "факт", "практическая польза",
         "только факт", "Узгидромет", "нейтральный", "массовый", "ничего", "да", ""),
    "https://yuz.uz/ru/news/v-uzbekistane-lgotne-kategorii-grajdan-smogut-besplatno-ili-so-skidkoy-puteshestvovat-po-strane": ("льготники смогут путешествовать бесплатно или со скидкой", "частично",
         "общее рассуждение", "практическая польза", "факт + оценка",
         "тот же пакет мер, что в [25]", "официозный", "массовый", "лозунг", "частично",
         "та же новость, что у LEAP [25], но подана как достижение"),
}

CODE_COLUMNS = [
    "обещание_заголовка", "обещание_выполнено", "чем_открывается", "чем_удерживает",
    "факт_интерпретация_мнение", "на_что_опирается", "тон", "адресат",
    "чем_заканчивается", "самодостаточность", "заметка",
]

# ---------------------------------------------------------------------------
# Ручные метки в словарях автоматических эвристик.
# Поля: тип лида | жанр | первичность | топик
# ---------------------------------------------------------------------------
LABELS: dict[str, tuple[str, str, str, str]] = {
    "https://daryo.uz/ru/2026/07/14/period-zarabotka-raschet-pensii-uzbekistan": ("фактологический", "расширенная новость", "пересказ официального сообщения", "economy"),
    "https://daryo.uz/ru/2026/07/08/9-iyulya-uzbekistan-prognoz-pogoda": ("фактологический", "новость", "пересказ официального сообщения", "other"),
    "https://daryo.uz/ru/2026/07/11/chislo-ekonomicheski-aktivnyx-zhenshchin-uzbekistan": ("фактологический", "новость", "пересказ официального сообщения", "society"),
    "https://daryo.uz/ru/2026/07/08/kibermoshenniki-poxishchavshie-dengi-u-inostrantsev": ("фактологический", "расширенная новость", "пересказ официального сообщения", "incidents"),
    "https://daryo.uz/ru/2026/07/09/portugaliya-braga-perexod-futbolistov-iz-uzbekistana": ("фактологический", "новость", "пересказ официального сообщения", "culture"),
    "https://daryo.uz/ru/2026/07/28/eldor-shomurodov-vtoroy-samyy-krasivyy-gol-na-chm-2026": ("фактологический", "новость", "пересказ официального сообщения", "culture"),
    "https://daryo.uz/ru/2026/07/23/abdukodir-xusanov-samye-prosmatrivaemye-igroki-chm-2026": ("фактологический", "новость", "пересказ официального сообщения", "culture"),
    "https://daryo.uz/ru/2026/07/18/uzbekistan-kvoty-priema-v-vuzy-na-20262027-uchebnyy-god": ("отложенный", "расширенная новость", "пересказ официального сообщения", "society"),
    "https://www.gazeta.uz/ru/2026/08/05/livestock-farming": ("фактологический", "расширенная новость", "пересказ официального сообщения", "economy"),
    "https://www.gazeta.uz/ru/2026/07/14/kyrgyzstan": ("фактологический", "новость", "рерайт чужой публикации", "world"),
    "https://www.gazeta.uz/ru/2026/07/17/landfill": ("фактологический", "расширенная новость", "пересказ официального сообщения", "incidents"),
    "https://www.gazeta.uz/ru/2026/07/20/korea-medical-tourism": ("фактологический", "расширенная новость", "пресс-релиз без обработки", "society"),
    "https://www.gazeta.uz/ru/2026/07/29/tashtech": ("сценический", "объяснитель", "пресс-релиз без обработки", "society"),
    "https://www.gazeta.uz/ru/2026/07/29/tournament": ("фактологический", "новость", "пересказ официального сообщения", "culture"),
    "https://www.gazeta.uz/ru/2026/07/09/mobiuz": ("отложенный", "расширенная новость", "пресс-релиз без обработки", "tech"),
    "https://www.gazeta.uz/ru/2026/07/16/ambassador": ("фактологический", "новость", "пересказ официального сообщения", "world"),
    "https://kun.uz/ru/news/2026/07/30/v-uzbekistane-na-obshchestvennoye-obsujdeniye-vynesen-proyekt-o-novom-poryadke-otsenki-studentov": ("фактологический", "расширенная новость", "пересказ официального сообщения", "society"),
    "https://kun.uz/ru/news/2026/07/16/v-rossii-planiruyut-obyazat-migrantov-priobretat-telefony-s-elektronnym-profilem-51d54e": ("фактологический", "новость", "рерайт чужой публикации", "society"),
    "https://kun.uz/ru/news/2026/07/09/k-2030-godu-defitsit-vody-dostignet-15-mlrd-kubometrov-ministr-vodnogo-xozyaystva-shavkat-xamroyev-80237d": ("фактологический", "расширенная новость", "собственный сбор", "city"),
    "https://kun.uz/ru/news/2026/07/08/grajdaninu-uzbekistana-pomogli-vernutsya-na-rodinu-iz-serbii-ff7a5a": ("фактологический", "новость", "рерайт чужой публикации", "society"),
    "https://kun.uz/ru/news/2026/08/04/deputaty-odobrili-proyekt-konstitutsionnogo-zakona-opredelyayushchego-mexanizmy-raboty-administratsii-prezidenta": ("фактологический", "новость", "пересказ официального сообщения", "gov"),
    "https://kun.uz/ru/news/2026/07/11/na-uzbeksko-kazaxstanskoy-granitse-vnedryat-tsifrovoy-tamojyennyy-kontrol-3b4c1c": ("фактологический", "новость", "пересказ официального сообщения", "economy"),
    "https://kun.uz/ru/news/2026/07/28/sbornaya-uzbekistana-sygrayet-tovarishcheskiy-match-s-yujnoy-koreyey": ("фактологический", "новость", "пересказ официального сообщения", "culture"),
    "https://kun.uz/ru/news/2026/07/27/energosistemu-uzbekistana-podvergnut-stress-auditu": ("отложенный", "новость", "пересказ официального сообщения", "city"),
    "https://leap.uz/ru/2026/08/06/uzsuv-kwater-cooperation-training-aug2026": ("фактологический", "расширенная новость", "пересказ официального сообщения", "city"),
    "https://leap.uz/ru/2026/08/04/social-protection-reform-2026": ("фактологический", "расширенная новость", "пересказ официального сообщения", "society"),
    "https://leap.uz/ru/2026/08/04/world-pentagon-patriot-thaad-contracts": ("фактологический", "расширенная новость", "пересказ официального сообщения", "world"),
    "https://leap.uz/ru/2026/08/01/uzbekistan-gdp-h1-2026-growth-85pct": ("фактологический", "расширенная новость", "пересказ официального сообщения", "economy"),
    "https://leap.uz/ru/2026/08/06/uzbekistan-phygital-football-spain-53": ("фактологический", "новость", "пересказ официального сообщения", "culture"),
    "https://leap.uz/ru/2026/08/06/meta-anthropic-openai-ai-hacked-systems-safety-tests": ("фактологический", "расширенная новость", "пересказ официального сообщения", "tech"),
    "https://leap.uz/ru/2026/08/07/bukhara-medvuz-admission-bribery-arrest-aug2026": ("фактологический", "новость", "пересказ официального сообщения", "incidents"),
    "https://leap.uz/ru/2026/08/06/napp-capital-markets-law-draft": ("фактологический", "новость", "пересказ официального сообщения", "economy"),
    "https://podrobno.uz/cat/politic/v-uzbekistane-nachal-rabotu-novyy-posol-pakistana": ("фактологический", "новость", "пересказ официального сообщения", "world"),
    "https://podrobno.uz/cat/proisshestviya/skonchalsya-voditel-chevrolet-onix-postradavshiy-v-rezonansnom-dtp-s-patrulnymi-mototsiklami": ("фактологический", "новость", "рерайт чужой публикации", "incidents"),
    "https://podrobno.uz/cat/obchestvo/v-tashkente-na-chetyre-dnya-perekryli-uchastok-maloy-koltsevoy-dorogi-i-izmenili-marshruty-avtobusov": ("фактологический", "новость", "пересказ официального сообщения", "city"),
    "https://podrobno.uz/cat/proisshestviya/na-granitse-kyrgyzstana-i-uzbekistana-nashli-podzemnyy-tunnel-kotoryy-mogli-ispolzovat-kontrabandist": ("фактологический", "новость", "пересказ официального сообщения", "incidents"),
    "https://podrobno.uz/cat/economic/strany-eaes-zapustyat-sistemu-otslezhivaniya-torgovli-bytovoy-tekhnikoy": ("фактологический", "новость", "пересказ официального сообщения", "economy"),
    "https://podrobno.uz/cat/politic/uzbekistan-predstavit-svoe-kulturnoe-nasledie-na-krupneyshikh-mirovykh-ploshchadkakh": ("фактологический", "расширенная новость", "пересказ официального сообщения", "culture"),
    "https://podrobno.uz/cat/politic/mirziyeev-poruchil-podgotovit-energosistemu-uzbekistana-k-bespereboynoy-rabote-zimoy": ("фактологический", "новость", "пересказ официального сообщения", "city"),
    "https://podrobno.uz/cat/politic/shavkat-mirziyeev-prinyal-delegatsiyu-belarusi-vo-glave-s-vitse-premerom-viktorom-karankevichem": ("фактологический", "новость", "пересказ официального сообщения", "world"),
    "https://repost.uz/govoryat-dast-prozrachnost": ("фактологический", "новость", "рерайт чужой публикации", "world"),
    "https://repost.uz/tut-teper-otvetit-pered-zakonom": ("фактологический", "новость", "рерайт чужой публикации", "incidents"),
    "https://repost.uz/xotyat-objalovat-reshenie": ("фактологический", "расширенная новость", "рерайт чужой публикации", "incidents"),
    "https://repost.uz/chto-tam-da-kak": ("фактологический", "новость", "рерайт чужой публикации", "economy"),
    "https://repost.uz/v-celom-obsudili-povestku": ("фактологический", "новость", "пересказ официального сообщения", "world"),
    "https://repost.uz/kachaem-trudovie-otnosheniya": ("фактологический", "новость", "пересказ официального сообщения", "society"),
    "https://repost.uz/vnutrennix-turistov-eshe-bolshe": ("фактологический", "новость", "пересказ официального сообщения", "culture"),
    "https://repost.uz/nakruti-i-tut-presekli": ("фактологический", "новость", "пересказ официального сообщения", "society"),
    "https://www.spot.uz/ru/2026/07/17/id-amendments": ("фактологический", "новость", "пересказ официального сообщения", "society"),
    "https://www.spot.uz/ru/2026/07/31/real-estate": ("фактологический", "новость", "пересказ официального сообщения", "economy"),
    "https://www.spot.uz/ru/2026/07/10/belarus-projects": ("фактологический", "новость", "собственный сбор", "economy"),
    "https://www.spot.uz/ru/2026/08/06/akfa": ("отложенный", "объяснитель", "пресс-релиз без обработки", "city"),
    "https://www.spot.uz/ru/2026/08/03/crypto-fines": ("фактологический", "расширенная новость", "пересказ официального сообщения", "economy"),
    "https://www.spot.uz/ru/2026/08/03/edelweiss-samarkand": ("фактологический", "новость", "пересказ официального сообщения", "culture"),
    "https://www.spot.uz/ru/2026/07/27/uzum-record-bonds": ("фактологический", "новость", "пересказ официального сообщения", "economy"),
    "https://www.spot.uz/ru/2026/07/09/diesel": ("фактологический", "новость", "пересказ официального сообщения", "economy"),
    "https://uznews.uz/ru/news/111851": ("фактологический", "новость", "пересказ официального сообщения", "tech"),
    "https://www.uznews.uz/ru/news/111689": ("фактологический", "новость", "пересказ официального сообщения", "society"),
    "https://www.uznews.uz/ru/news/111577": ("фактологический", "новость", "пересказ официального сообщения", "culture"),
    "https://uznews.uz/ru/news/111841": ("фактологический", "новость", "пересказ официального сообщения", "society"),
    "https://www.uznews.uz/ru/news/111363": ("фактологический", "новость", "пересказ официального сообщения", "culture"),
    "https://www.uznews.uz/ru/news/111540": ("фактологический", "новость", "пересказ официального сообщения", "society"),
    "https://uznews.uz/ru/news/111827": ("фактологический", "новость", "пересказ официального сообщения", "incidents"),
    "https://www.uznews.uz/ru/news/111455": ("фактологический", "новость", "рерайт чужой публикации", "incidents"),
    "https://yuz.uz/ru/news/zdravooxranenie-upravlenie-otvetstvennost-doverie": ("отложенный", "мнение", "пересказ официального сообщения", "society"),
    "https://yuz.uz/ru/news/grajdaninu-uzbekistana-okazano-sodeystvie-v-vozvraenii-iz-serbii-na-rodinu": ("фактологический", "новость", "рерайт чужой публикации", "society"),
    "https://yuz.uz/ru/news/tashkent-razvivaet-sotrudnichestvo-s-yaponiey-v-sfere-jkx-i-energoeffektivnogo-upravleniya-domami": ("фактологический", "новость", "пересказ официального сообщения", "city"),
    "https://yuz.uz/ru/news/molodej-uzbekistana-dobilas-vsokix-rezultatov-na-mejdunarodnom-": ("фактологический", "новость", "пересказ официального сообщения", "tech"),
    "https://yuz.uz/ru/news/v-uzbekistane-opredelen-poryadok-perexoda-bankov-i-mfo-na-islamskuyu-bankovskuyu-deyatelnost": ("фактологический", "новость", "пересказ официального сообщения", "economy"),
    "https://yuz.uz/ru/news/predstavitel-gp-navoiyuran-prinyat-v-mejdunarodnuyu-texnicheskuyu-rabochuyu-gruppu-magate-": ("фактологический", "новость", "пресс-релиз без обработки", "world"),
    "https://yuz.uz/ru/news/prognoz-pogod-na-den-3-avgusta-": ("фактологический", "новость", "пересказ официального сообщения", "other"),
    "https://yuz.uz/ru/news/v-uzbekistane-lgotne-kategorii-grajdan-smogut-besplatno-ili-so-skidkoy-puteshestvovat-po-strane": ("отложенный", "мнение", "пересказ официального сообщения", "society"),
}

LABEL_FIELDS = ["lead_type", "genre", "primacy", "topic"]

# Словарь первичности уточнялся дважды по итогам сверки с ручной разметкой.
# Сначала «рерайт» разделили на «рерайт чужой публикации» (источник — другое
# СМИ, названное в тексте) и «рерайт». Затем убрали категорию «работа с
# первоисточником»: она смешивала два разных вопроса — откуда взята фактура
# и есть ли ссылка на документ. Проверяемость теперь считается отдельными
# полями primary_doc_links и verifiable, а первичность отвечает только на
# первый вопрос. Ручные метки приведены к итоговому словарю; цифры точности
# из промежуточных прогонов с текущей несравнимы и в отчёт не идут.


def main() -> int:
    # Выборка этапа 4 закреплена за размеченными url и собирается прямо из
    # корпуса. Читать её из output/qualitative-sample.json нельзя: этот файл
    # переписывается sample.py при каждом прогоне, состав меняется вместе с
    # корпусом, и разметка съезжает на чужие материалы.
    corpus_path = Path(__file__).resolve().parents[2] / "data" / "clean" / "corpus-topics.jsonl"
    if not corpus_path.exists():
        print("нет корпуса: сначала topics.py")
        return 1
    by_url = {}
    for line in corpus_path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            rec = json.loads(line)
            by_url[rec["url"]] = rec

    sample, missing = [], []
    for url in CODES:
        rec = by_url.get(url)
        if rec is None:
            missing.append(url)
            continue
        sample.append({
            "url": url, "outlet": rec["outlet"], "published_at": rec["published_at"],
            "title": rec.get("title"), "words": rec.get("word_count"),
            "topic": rec.get("topic"),
        })
    if missing:
        print(f"ВНИМАНИЕ: {len(missing)} размеченных материалов нет в текущем корпусе "
              f"(изменился период или выборка) — в расчёт точности они не войдут:")
        for u in missing[:10]:
            print("   ", u)
    if not sample:
        print("ни один размеченный материал не найден в корпусе")
        return 1

    # --- кодировочная таблица этапа 4
    rows = []
    for item in sample:
        codes = CODES[item["url"]]
        row = {"url": item["url"], "outlet": item["outlet"],
               "published_at": item["published_at"], "title": item["title"],
               "words": item["words"]}
        row.update(dict(zip(CODE_COLUMNS, codes)))
        rows.append(row)
    qual = pd.DataFrame(rows)
    qual.to_csv(OUTPUT / "qualitative.csv", index=False)

    # --- точность эвристик
    corpus = {}
    for cid_file in (Path(__file__).resolve().parents[2] / "data" / "clean").glob("*/articles.jsonl"):
        for line in cid_file.read_text(encoding="utf-8").splitlines():
            if line.strip():
                rec = json.loads(line)
                corpus[rec["url"]] = rec
    topics = {}
    topics_path = Path(__file__).resolve().parents[2] / "data" / "clean" / "corpus-topics.jsonl"
    if topics_path.exists():
        for line in topics_path.read_text(encoding="utf-8").splitlines():
            if line.strip():
                rec = json.loads(line)
                topics[rec["url"]] = rec.get("topic")

    hits: dict[str, list[bool]] = defaultdict(list)
    confusion: dict[str, Counter] = defaultdict(Counter)
    detail = []
    for item in sample:
        rec = corpus.get(item["url"])
        if rec is None:
            continue
        auto = compute_row(rec)
        auto["topic"] = topics.get(item["url"])
        manual = dict(zip(LABEL_FIELDS, LABELS[item["url"]]))
        row = {"url": item["url"], "outlet": item["outlet"]}
        for field in LABEL_FIELDS:
            ok = auto.get(field) == manual[field]
            hits[field].append(ok)
            if not ok:
                confusion[field][f"{auto.get(field)} -> {manual[field]}"] += 1
            row[f"auto_{field}"] = auto.get(field)
            row[f"manual_{field}"] = manual[field]
            row[f"ok_{field}"] = ok
        detail.append(row)

    report = {
        "выборка": len(detail),
        "метод": "стратифицированная выборка по 8 материалов на издание, "
                 "прочитаны целиком, размечены вручную в тех же словарях, "
                 "что у автоматических эвристик",
        "точность": {f: round(sum(v) / len(v), 3) for f, v in hits.items()},
        "частые ошибки": {f: dict(c.most_common(5)) for f, c in confusion.items()},
    }
    (OUTPUT / "heuristics-validation.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    pd.DataFrame(detail).to_csv(OUTPUT / "heuristics-validation.csv", index=False)

    print(f"кодировочная таблица: {len(qual)} строк -> output/qualitative.csv")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
