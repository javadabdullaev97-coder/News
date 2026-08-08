"""Разбор пропущенных инфоповодов: что мы не закрыли и на каком шаге потеряли.

По каждому событию из output/newsbreaks-headtohead-detail.json, которое закрыл
рынок и не закрыли мы, скрипт ищет следы темы в четырёх местах конвейера:

  опубликовано      — content/posts (корпус data/clean/leap/articles.jsonl);
  в очереди         — content/queue, content/needs-verification, content/rework;
  отклонено         — content/rejected (вместе с файлом .reason.txt);
  разбиралось       — .review: заметки корреспондента, фактчек, вердикт редактора
                      без итогового решения в content/;
  был в инбоксе     — content/inbox/*.jsonl, то есть фетчер тему принёс;
  не было вовсе     — ни одного следа: тема не дошла до редакции.

Последние две категории требуют разного лечения, поэтому и разделены:
«был в инбоксе, но не взят» — это отбор, «не было вовсе» — это источники.

Запуск: .venv-competitor/bin/python scripts/competitor/missed_topics.py
Результат: output/missed-topics.csv
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import DATA_CLEAN, OUTPUT, ROOT, read_jsonl  # noqa: E402

CONTENT = ROOT / "content"

# Поисковые термины по каждому сюжету задаются руками: сигнатура кластера
# состоит из редких токенов и для поиска по редакционным записям слишком узкая.
# Ключ — не event_id: нумерация меняется при каждой пересборке кластеров.
# Сюжет опознаётся по совпадению терминов с меткой и заголовком события.
# Термин — регулярное выражение: одно и то же издание пишет «десяти районов»,
# «10 районов» и «10 из 12», и буквальное совпадение теряет след темы.
EVENT_TERMS: dict[str, list[str]] = {
    "спутник Samarkand-2028": ["samarkand", "спутник", "орбит"],
    "служебная проверка хокимов 10 районов": [
        "хоким", "служебн", r"десяти|10 район|10 из 12", "проверк"],
    "приговор по обрушению путепровода": ["путепровод", "обрушени", "приговор", "малик"],
    "визовые залоги США": ["визов", "залог", "стран"],
    "штраф девушке в Сырдарье": ["сырдар", "домогател", r"кричал|крик|защища", "штраф"],
    "уголовное дело по ЖК New Port": ["port", "снос", r"застройщик|жильц", "прокуратура"],
    "рассрочка Kia Uzbekistan": ["kia", "рассрочк", "sonet"],
    "гибель блогерши в ДТП в Джизаке": ["джизак", "блогер", "погибла"],
    "депортация граждан чартером из США": ["депортирован", "чартер", "сша"],
    "выдача разыскиваемых из Турции": ["турци", "розыск", "доставили"],
}


def match_event(event: dict) -> tuple[str, list[str]]:
    """Подобрать набор терминов по метке и заголовку события."""
    hay = (event.get("label", "") + " " + event.get("first_text", "")).lower()
    best, best_score = "", 0
    for name, terms in EVENT_TERMS.items():
        score = sum(1 for t in terms if re.search(t, hay))
        if score > best_score:
            best, best_score = name, score
    return (best, EVENT_TERMS[best]) if best_score >= 2 else ("", [])


def read_texts(paths) -> list[tuple[str, str]]:
    out = []
    for p in paths:
        if p.is_file():
            try:
                out.append((str(p.relative_to(ROOT)), p.read_text(encoding="utf-8", errors="replace")))
            except OSError:
                continue
    return out


def find(terms: list[str], haystacks: list[tuple[str, str]], min_hits: int | None = None) -> list[str]:
    """Файлы, где встретилось не меньше min_hits разных терминов события.

    По умолчанию требуются все термины. Порог в два термина даёт ложные
    срабатывания на длинных текстах: «визовые залоги США» находились в
    материале про ипотеку, а «приговор по путепроводу» — в отчёте
    «Узбекнефтегаза». Для инбокса порог мягче: там одна строка-заголовок.
    """
    need = len(terms) if min_hits is None else min(min_hits, len(terms))
    hits = []
    for name, text in haystacks:
        low = text.lower()
        if sum(1 for t in terms if re.search(t, low)) >= need:
            hits.append(name)
    return hits


def main() -> int:
    detail_path = OUTPUT / "newsbreaks-headtohead-detail.json"
    if not detail_path.exists():
        print("нет разбора инфоповодов: сначала newsbreaks.py --out-prefix newsbreaks-headtohead")
        return 1
    events = json.loads(detail_path.read_text(encoding="utf-8"))

    published = [
        (r["url"], (r.get("title") or "") + " " + (r.get("text") or ""))
        for r in read_jsonl(DATA_CLEAN / "leap" / "articles.jsonl")
    ]
    queue = read_texts(
        list((CONTENT / "queue").rglob("*"))
        + list((CONTENT / "needs-verification").rglob("*"))
        + list((CONTENT / "rework").rglob("*"))
    )
    rejected = read_texts(list((CONTENT / "rejected").rglob("*")))
    review = read_texts(list((ROOT / ".review").glob("*.md")) + list((ROOT / ".review").glob("*.mdx")))
    inbox_items: list[tuple[str, str]] = []
    for path in sorted((CONTENT / "inbox").glob("*.jsonl")):
        for line in path.read_text(encoding="utf-8").splitlines():
            if line.strip():
                inbox_items.append((f"{path.name}", line))

    rows = []
    for ev in events:
        name, terms = match_event(ev)
        if not terms:
            rows.append({
                "событие": ev["first_text"], "сюжет": "не опознан",
                "первым": ev["first_outlet"], "изданий": ev["outlets"],
                "дата": ev["first_at"][:16], "где потеряли": "нет словаря терминов",
                "следы": "", "в_инбоксе": 0,
            })
            continue
        in_published = find(terms, published)
        in_queue = find(terms, queue)
        in_rejected = find(terms, rejected)
        in_review = find(terms, review)
        in_inbox = find(terms, inbox_items, min_hits=2)

        if in_published:
            stage, evidence = "опубликовано", in_published[:3]
        elif in_queue:
            stage, evidence = "осталось в очереди", in_queue[:3]
        elif in_rejected:
            stage, evidence = "отклонено редакцией", in_rejected[:3]
        elif in_review:
            stage, evidence = "разбиралось, решения нет", in_review[:3]
        elif in_inbox:
            stage, evidence = "был в инбоксе, не взят в работу", sorted({x for x in in_inbox})[:3]
        else:
            stage, evidence = "не дошло до редакции", []

        rows.append({
            "событие": ev["first_text"],
            "сюжет": name,
            "первым": ev["first_outlet"],
            "изданий": ev["outlets"],
            "дата": ev["first_at"][:16],
            "где потеряли": stage,
            "следы": "; ".join(evidence),
            "в_инбоксе": len(in_inbox),
        })

    df = pd.DataFrame(rows)
    df.to_csv(OUTPUT / "missed-topics.csv", index=False)
    print(df.to_string(index=False, max_colwidth=46))
    print("\nсводка по стадиям:")
    print(df["где потеряли"].value_counts().to_string())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
