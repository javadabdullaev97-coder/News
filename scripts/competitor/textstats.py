"""Русскоязычные текстовые метрики: словари, эвристики, формулы.

Всё, что считается «на глаз» в обычном медиаразборе, здесь сведено к явным
правилам. Каждая эвристика описана рядом с кодом — в отчёте раздел
«Методология» ссылается именно на эти правила.

Точность эвристик проверяется скриптом validate_heuristics.py на ручной
разметке (output/heuristics-validation.json) — цифры оттуда идут в отчёт.
"""

from __future__ import annotations

import re
import statistics

VOWELS = "аеёиоуыэюяАЕЁИОУЫЭЮЯ"

SENT_SPLIT_RE = re.compile(r"(?<=[.!?…])[\s\n]+(?=[А-ЯЁA-Z«\"(\d])")
WORD_RE = re.compile(r"[А-Яа-яЁёA-Za-z]+(?:-[А-Яа-яЁёA-Za-z]+)?")
NUMBER_RE = re.compile(r"(?<![\w])[-+]?\d[\d\s.,]*(?![\w])")
PERCENT_RE = re.compile(r"\d\s*%|процент")
DATE_RE = re.compile(
    r"\b\d{1,2}\s+(?:январ|феврал|март|апрел|ма[йя]|июн|июл|август|сентябр|октябр|"
    r"ноябр|декабр)\w*|\b\d{1,2}\.\d{1,2}\.\d{2,4}\b|\b20\d{2}\s*год",
    re.I,
)

# Прямая речь: ёлочки, тире-реплики и кавычки-лапки
QUOTE_RE = re.compile(r"«[^»]{15,}»|\"[^\"]{15,}\"|“[^”]{15,}”")

# Атрибуция: глаголы и обороты, которыми в русской новости вводят источник
ATTRIBUTION_RE = re.compile(
    r"\b(сообщил\w*|сообщает|заяв(?:ил|ляет)\w*|рассказал\w*|отмет(?:ил|ила|или)\w*|"
    r"подчеркн\w+|пояснил\w*|уточнил\w*|добавил\w*|передает|передаёт|"
    r"по словам|по данным|по информации|как сообщ\w+|цитирует|"
    r"говорится в|говорилось на|указано в|со ссылкой на|признал\w*|напомнил\w*|"
    # Глаголы, которыми новость называет источник, не произнося слова «сообщил».
    # Без них половина обычных заметок выглядела как текст без источника вовсе —
    # проверено на ручной выборке, см. output/heuristics-validation.json.
    r"представил\w*|объявил\w*|опубликовал\w*|утвердил\w*|разработал\w*|"
    r"принял\w+ решение|следует из|согласно (?:данным|документу|проекту|отчёту|отчету))\b",
    re.I,
)

ANONYMOUS_SOURCE_RE = re.compile(
    r"(источник\w*\s+(?:в|близк\w+|знаком\w+|издания|агентства)|"
    r"на услови\w+ анонимност\w+|"
    r"пожелавш\w+ остаться неизвестн\w+|"
    r"собеседник\w*\s+(?:издания|агентства|в))",
    re.I,
)

# Именованный источник: должность/организация рядом с атрибуцией либо
# «Имя Фамилия» с заглавных букв внутри предложения с атрибуцией.
NAMED_ROLE_RE = re.compile(
    r"\b(министерств\w+|министр\w*|хоким\w*|президент\w*|агентств\w+|комитет\w*|"
    r"ведомств\w+|пресс-служб\w+|пресс-секретар\w+|департамент\w*|управлени\w+|"
    r"инспекци\w+|прокуратур\w+|суд\w*|банк\w*|компани\w+|директор\w*|"
    r"замести\w+|глава|руководител\w+|эксперт\w*|аналитик\w*|депутат\w*|сенатор\w*|"
    r"специалист\w*|профессор\w*|адвокат\w*|юрист\w*|"
    # Организации, которые в узбекистанской новости выступают источником и
    # называются одним словом, без слова «агентство» или «комитет» рядом.
    r"узгидромет\w*|нацкомстат\w*|узстат\w*|уза\b|дунё|минздрав\w*|мвд\b|сгб\b|"
    r"цэир\b|напп\b|uzcert\b|узэнерго\w*|узавтойул\w*|узсувтаъминот|"
    r"узбекнефтегаз|узбеккосмос|тошшахартрансхизмат|фифа\b|афц\b|магатэ\b|оон\b|"
    r"мвф\b|всемирн\w+ банк)\b",
    re.I,
)
PERSON_RE = re.compile(r"\b[А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+(?:ов|ев|ин|ко|ич|ва|на|швили|оглы|заде)?\b")

# Первичные документы и реестры: сюда ссылаются, когда факт проверяем
PRIMARY_DOC_HOSTS = (
    "lex.uz", "gov.uz", "president.uz", "senat.uz", "parliament.gov.uz",
    "stat.uz", "cbu.uz", "soliq.uz", "adliya.uz", "prokuratura.uz", "sud.uz",
    "my.gov.uz", "data.egov.uz", "regulation.gov.uz", "mf.uz", "customs.uz",
    "imf.org", "worldbank.org", "adb.org", "un.org", "who.int", "eia.gov",
)
OFFICIAL_TG_RE = re.compile(
    r"t\.me/(shmirziyoyev|huquqiyaxborot|prokuraturauz|mvd_uz|ssvuz|uzedu|eduuz|"
    r"minenergy_uz|mintrans_uz|minecofinuz|digitaluzbekistan|senat_uz|parliamentuz|"
    r"uzcosmos_official|uzgydromet|mehnatvazirligi|ecogovuz|agrouz|miituz|mcu_uz|"
    r"customs_uz|soliq_uz|cbu_uz|stat_uz)",
    re.I,
)

# Канцелярит и номинализации. Список закрытый и лежит в коде — в отчёте
# он воспроизводится дословно, чтобы цифру можно было пересчитать.
BUREAUCRATIC_TERMS = [
    "осуществление", "осуществляется", "осуществлять", "реализация", "реализуется",
    "проведение", "обеспечение", "обеспечивается", "внедрение", "функционирование",
    "использование", "выполнение", "исполнение", "формирование", "совершенствование",
    "оптимизация", "модернизация", "повышение эффективности", "принятие мер",
    "в целях", "с целью", "в рамках", "в связи с", "в настоящее время",
    "в соответствии с", "на основании", "в части", "по вопросу", "в отношении",
    "в случае необходимости", "имеет место", "является", "являются", "данный",
    "данные меры", "вышеуказанн", "нижеследующ", "путем", "посредством",
    "мероприяти", "задействован", "надлежащ", "соответствующ", "порядке, установленном",
]
NOMINALIZATION_RE = re.compile(r"\b\w{4,}(?:ание|ение|ание[мя]|ении|ения|ений|ность|ности|ностью)\b", re.I)

# Пассив: краткие страдательные причастия (принят, введено, утверждены),
# связка «был/была/были + причастие» и возвратные формы на -ся в 3-м лице.
SHORT_PASSIVE_RE = re.compile(
    r"\b\w{3,}(?:ан|ян|ен|ён|т)(?:а|о|ы)?\b(?=\s|,|\.|$)", re.I
)
BE_PASSIVE_RE = re.compile(r"\b(был[аио]?|будет|будут|бывает)\s+\w+(?:ан|ян|ен|ён|т)(?:а|о|ы)?\b", re.I)
REFLEXIVE_PASSIVE_RE = re.compile(r"\b\w{4,}(?:ет|ит|ют|ят|ется|ится|ются|ятся)ся?\b", re.I)


def sentences(text: str) -> list[str]:
    """Деление на предложения с защитой от сокращений и инициалов."""
    prepared = re.sub(r"\b([А-ЯЁ])\.\s*([А-ЯЁ])\.", r"\1․\2․", text)
    prepared = re.sub(
        r"\b(т\.\s*д|т\.\s*п|т\.\s*е|им|ул|г|гг|тыс|млн|млрд|руб|сум|проц|стр|рис)\.",
        lambda m: m.group(0).replace(".", "․"),
        prepared,
        flags=re.I,
    )
    parts = [p.strip().replace("․", ".") for p in SENT_SPLIT_RE.split(prepared)]
    return [p for p in parts if len(p.split()) >= 2]


def words(text: str) -> list[str]:
    return WORD_RE.findall(text)


def syllables(word: str) -> int:
    return sum(1 for ch in word if ch in VOWELS) or 1


def readability(text: str) -> dict:
    """Индексы читаемости в русской адаптации.

    Коэффициенты Оборневой (2006) для русского языка:
      FRE_ru  = 206.835 - 1.3*ASL - 60.1*ASW
      FKGL_ru = 0.5*ASL + 8.4*ASW - 15.59
    где ASL — средняя длина предложения в словах, ASW — среднее число слогов
    в слове. Английские коэффициенты для русского дают систематический сдвиг,
    поэтому не используются.
    """
    sents = sentences(text)
    ws = words(text)
    if not sents or not ws:
        return {"flesch_ru": None, "fkgl_ru": None, "asl": None, "asw": None}
    asl = len(ws) / len(sents)
    asw = sum(syllables(w) for w in ws) / len(ws)
    return {
        "flesch_ru": round(206.835 - 1.3 * asl - 60.1 * asw, 1),
        "fkgl_ru": round(0.5 * asl + 8.4 * asw - 15.59, 1),
        "asl": round(asl, 2),
        "asw": round(asw, 2),
    }


def per_1000(count: int, total_words: int) -> float:
    return round(count * 1000 / total_words, 2) if total_words else 0.0


def bureaucratic_hits(text: str) -> list[str]:
    low = text.lower()
    return [term for term in BUREAUCRATIC_TERMS if term in low]


def bureaucratic_count(text: str) -> int:
    low = text.lower()
    return sum(low.count(term) for term in BUREAUCRATIC_TERMS)


def passive_count(text: str) -> int:
    """Оценка числа пассивных конструкций.

    Считаем объединение трёх шаблонов: связка «был + причастие», одиночное
    краткое причастие и возвратный глагол в значении пассива. Шаблон
    заведомо шумный (краткое причастие путается с прилагательным), поэтому
    в отчёте цифра подаётся как сравнительный индекс, а не как абсолютная
    доля, и её точность измерена на ручной выборке.
    """
    be = len(BE_PASSIVE_RE.findall(text))
    short = len(SHORT_PASSIVE_RE.findall(text))
    refl = len(REFLEXIVE_PASSIVE_RE.findall(text))
    return be + short + refl


def sentence_stats(text: str) -> dict:
    sents = sentences(text)
    lengths = [len(words(s)) for s in sents]
    if not lengths:
        return {
            "sentences": 0, "sent_len_mean": None, "sent_len_median": None,
            "long_sentence_share": None,
        }
    return {
        "sentences": len(lengths),
        "sent_len_mean": round(statistics.mean(lengths), 2),
        "sent_len_median": round(statistics.median(lengths), 1),
        "long_sentence_share": round(sum(1 for x in lengths if x > 25) / len(lengths), 3),
    }


def count_named_sources(text: str) -> int:
    """Named sources: предложения с атрибуцией, где есть должность/организация
    или имя собственное из двух слов."""
    n = 0
    for sent in sentences(text):
        if not ATTRIBUTION_RE.search(sent):
            continue
        if NAMED_ROLE_RE.search(sent) or PERSON_RE.search(sent):
            n += 1
    return n


def count_anonymous_sources(text: str) -> int:
    return len(ANONYMOUS_SOURCE_RE.findall(text))


def primary_doc_links(targets: list[str]) -> int:
    n = 0
    for t in targets:
        low = t.lower()
        if any(host in low for host in PRIMARY_DOC_HOSTS) or OFFICIAL_TG_RE.search(low):
            n += 1
    return n
