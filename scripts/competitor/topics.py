"""Этап 5. Классификация корпуса по топикам.

Метод: словарь ключевых слов по каждому топику, взвешенное совпадение по
заголовку (вес 3) и тексту (вес 1); при отсутствии совпадений — рубрика
издания, если она отображается на топик. Точность оценивается на ручной
разметке в output/topic-validation.csv (скрипт validate_heuristics.py).

Запуск: .venv-competitor/bin/python scripts/competitor/topics.py
Результат: output/topics-by-outlet.csv, output/topics-by-month.csv,
           data/clean/corpus-topics.jsonl
"""

from __future__ import annotations

import re
import sys
from collections import Counter
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import DATA_CLEAN, OUTPUT, load_config, read_jsonl, write_jsonl  # noqa: E402

# Ключевые слова подобраны по частотным спискам корпуса, а не выдуманы:
# см. output/topic-keyword-audit.csv, который пишет этот же скрипт.
TOPIC_KEYWORDS = {
    "economy": [
        "инфляц", "ставк", "бюджет", "налог", "экспорт", "импорт", "инвестиц", "банк",
        "кредит", "тариф", "цена", "цены", "подорожа", "сум", "доллар", "валют", "биржа",
        "бизнес", "предприним", "ввп", "рынок", "торгов", "пошлин", "субсиди", "акциз",
        "зарплат", "пенси", "долг", "лизинг", "страхов",
    ],
    "gov": [
        "президент", "мирзиёев", "указ", "постановлен", "закон", "кабинет министров",
        "министерств", "парламент", "сенат", "депутат", "хоким", "реформ", "госорган",
        "ведомств", "назначен", "отставк", "администрац", "регламент", "госслужб",
        "олий мажлис", "конституц",
    ],
    "society": [
        "школ", "учител", "образован", "студент", "вуз", "больниц", "врач", "здравоохран",
        "пациент", "пенсионер", "пособи", "многодетн", "инвалид", "мигрант", "трудоустрой",
        "безработ", "бедност", "махалл", "семь", "детск", "материнск", "вакцин", "лекарств",
    ],
    "city": [
        "ташкент", "метро", "автобус", "дорог", "стройк", "строительств", "снос", "жиль",
        "квартир", "коммунал", "отоплен", "водоснабжен", "электроэнерг", "свет отключ",
        "парк", "сквер", "дерев", "генплан", "застройщик", "тротуар", "пробк", "парковк",
        "мусор", "канализац",
    ],
    "incidents": [
        "погиб", "пострадал", "дтп", "авари", "пожар", "взрыв", "задержан", "арестован",
        "приговор", "суд", "уголовн", "мошенн", "взятк", "коррупц", "хищен", "убийств",
        "изнасилов", "наркотик", "прокуратур", "следств", "обвинен", "штраф", "колони",
    ],
    "tech": [
        "it-park", "айти", "стартап", "цифров", "искусственн интеллект", "нейросет",
        "интернет", "мобильн связ", "оператор связи", "крипт", "блокчейн", "спутник",
        "космос", "робот", "дата-центр", "программист", "приложен", "кибер", "хакер",
        "технолог", "инновац",
    ],
    "world": [
        "россия", "китай", "сша", "казахстан", "кыргызстан", "таджикистан", "туркменистан",
        "афганистан", "турци", "евросоюз", "оон", "мид", "визит", "переговор", "саммит",
        "санкци", "война", "израил", "иран", "украин", "внешнеполитич", "посол", "соглашен",
    ],
    "culture": [
        "фильм", "кино", "театр", "концерт", "выставк", "музе", "книг", "фестивал",
        "футбол", "матч", "чемпионат", "олимпиад", "сборная", "спортсмен", "медал",
        "туризм", "турист", "ресторан", "музык", "певец", "певиц", "блогер", "мода",
    ],
}

SECTION_MAP = {
    "экономика": "economy", "бизнес": "economy", "финансы": "economy", "iqtisodiyot": "economy",
    "политика": "gov", "власть": "gov", "общество": "society", "социальная": "society",
    "город": "city", "ташкент": "city", "недвижимость": "city", "urbanistika": "city",
    "происшествия": "incidents", "криминал": "incidents", "суд": "incidents",
    "технологии": "tech", "it": "tech", "наука": "tech", "texnologiya": "tech",
    "мир": "world", "в мире": "world", "международные": "world", "dunyo": "world",
    "культура": "culture", "спорт": "culture", "жизнь": "culture", "афиша": "culture",
}

PATTERNS = {
    topic: [re.compile(re.escape(kw), re.I) for kw in kws]
    for topic, kws in TOPIC_KEYWORDS.items()
}


def classify(title: str, text: str, section: str | None, tags: list[str] | None) -> tuple[str, float]:
    """Вернуть (топик, уверенность). Уверенность — доля веса победителя."""
    haystack_title = (title or "") + " " + " ".join(tags or [])
    haystack_body = (text or "")[:4000]
    scores: Counter[str] = Counter()
    for topic, pats in PATTERNS.items():
        s = 0
        for p in pats:
            s += 3 * len(p.findall(haystack_title))
            s += len(p.findall(haystack_body))
        if s:
            scores[topic] = s
    if scores:
        total = sum(scores.values())
        topic, best = scores.most_common(1)[0]
        return topic, round(best / total, 3)

    sec = (section or "").lower()
    for key, topic in SECTION_MAP.items():
        if key in sec:
            return topic, 0.4
    return "other", 0.0


def main() -> int:
    cfg = load_config()
    rows = read_jsonl(DATA_CLEAN / "corpus.jsonl")
    if not rows:
        print("нет корпуса: сначала normalize.py")
        return 1

    out = []
    for row in rows:
        topic, conf = classify(
            row.get("title") or row.get("text", "")[:120],
            row.get("text", ""),
            row.get("section"),
            row.get("tags"),
        )
        row["topic"] = topic
        row["topic_confidence"] = conf
        out.append(row)
    write_jsonl(DATA_CLEAN / "corpus-topics.jsonl", out)

    df = pd.DataFrame(
        [
            {
                "outlet": r["outlet"],
                "competitor": r["competitor"],
                "channel": r.get("channel", "site"),
                "topic": r["topic"],
                "confidence": r["topic_confidence"],
                "published_at": r["published_at"],
                "words": r.get("word_count", 0),
                "url": r.get("url"),
            }
            for r in out
        ]
    )
    df["month"] = pd.to_datetime(df["published_at"], format="ISO8601", utc=True).dt.strftime("%Y-%m")
    df["week"] = pd.to_datetime(df["published_at"], format="ISO8601", utc=True).dt.strftime("%Y-W%V")

    OUTPUT.mkdir(parents=True, exist_ok=True)
    site = df[df["channel"] == "site"]
    pd.crosstab(site["outlet"], site["topic"]).to_csv(OUTPUT / "topics-by-outlet.csv")
    pd.crosstab(site["outlet"], site["topic"], normalize="index").round(3).to_csv(
        OUTPUT / "topics-by-outlet-share.csv"
    )
    site.groupby(["week", "topic"])["url"].count().unstack(fill_value=0).to_csv(
        OUTPUT / "topics-by-week.csv"
    )
    df.groupby(["outlet", "channel"])["url"].count().unstack(fill_value=0).to_csv(
        OUTPUT / "volume-by-channel.csv"
    )

    print(pd.crosstab(site["outlet"], site["topic"]).to_string())
    print("\nсредняя уверенность классификатора:", round(site["confidence"].mean(), 3))
    print("доля материалов без топика:", round((site["topic"] == "other").mean(), 3))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
