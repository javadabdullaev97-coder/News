"""Сверка цифр отчёта с посчитанными таблицами.

Отчёт output/report.md написан прозой, но каждая цифра в нём должна
пересчитываться скриптом. Здесь зафиксированы ключевые утверждения отчёта
и их источник в csv: если пайплайн перезапустят на новом периоде и цифра
уедет, проверка это покажет, а не оставит в тексте старое число.

Запуск: .venv-competitor/bin/python scripts/competitor/verify_report.py
Код возврата 1, если хоть одно расхождение.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import OUTPUT  # noqa: E402


def main() -> int:
    metrics = pd.read_csv(OUTPUT / "articles-metrics.csv")
    site = metrics[metrics["channel"] == "site"]
    summary = pd.read_csv(OUTPUT / "summary-by-outlet.csv", index_col=0)
    primacy = pd.read_csv(OUTPUT / "share-primacy.csv", index_col=0) * 100
    topics = pd.read_csv(OUTPUT / "topics-by-outlet-share.csv", index_col=0) * 100
    first_mover = pd.read_csv(OUTPUT / "agenda-first-mover.csv").set_index("outlet")
    citations = pd.read_csv(OUTPUT / "citations.csv")
    validation = json.loads((OUTPUT / "heuristics-validation.json").read_text(encoding="utf-8"))

    def share(outlet: str, mask) -> float:
        d = site[site["outlet"] == outlet]
        return float(mask(d).mean() * 100)

    # (утверждение отчёта, посчитанное значение, значение в тексте, допуск)
    checks = [
        ("LEAP: медиана слов", summary.loc["LEAP News", "слов_медиана"], 290, 1),
        ("Gazeta: медиана слов", summary.loc["Gazeta.uz", "слов_медиана"], 330, 1),
        ("Repost: медиана слов", summary.loc["Repost.uz", "слов_медиана"], 129, 1),
        ("Yuz: индекс Флеша", summary.loc["Yuz.uz", "flesch_ru"], 1.35, 0.05),
        ("Yuz: канцелярит на 1000", summary.loc["Yuz.uz", "канцелярит_1000"], 9.66, 0.05),
        ("LEAP: проверяемых", summary.loc["LEAP News", "проверяемых_доля"], 0.62, 0.01),
        ("Repost: проверяемых", summary.loc["Repost.uz", "проверяемых_доля"], 0.18, 0.01),
        ("Spot: проверяемых", summary.loc["Spot.uz", "проверяемых_доля"], 0.38, 0.01),
        ("LEAP: внешних ссылок", summary.loc["LEAP News", "ссылок_наружу"], 5, 0.01),
        ("Yuz: без named sources, %", share("Yuz.uz", lambda d: d.named_sources == 0), 64, 1),
        ("LEAP: два и более источника, %", share("LEAP News", lambda d: d.named_sources >= 2), 63, 1),
        ("Gazeta: с подзаголовками, %", share("Gazeta.uz", lambda d: d.headings > 0), 32, 1),
        ("LEAP: с подзаголовками, %", share("LEAP News", lambda d: d.headings > 0), 98, 1),
        ("Kun: короче 150 слов, %", share("Kun.uz", lambda d: d.words < 150), 51, 1),
        ("Repost: короче 150 слов, %", share("Repost.uz", lambda d: d.words < 150), 62, 1),
        ("LEAP: длинных предложений", summary.loc["LEAP News", "длинных_предложений"], 0.20, 0.01),
        ("Gazeta: пресс-релизов, %", primacy.loc["Gazeta.uz", "пресс-релиз без обработки"], 25, 1),
        ("Spot: пресс-релизов, %", primacy.loc["Spot.uz", "пресс-релиз без обработки"], 17, 1),
        ("Yuz: без источника, %", primacy.loc["Yuz.uz", "источник не указан"], 44, 1),
        ("Spot: доля экономики, %", topics.loc["Spot.uz", "economy"], 43, 1),
        ("LEAP: доля экономики, %", topics.loc["LEAP News", "economy"], 36, 1),
        ("UzNews: доля ЧП, %", topics.loc["UzNews.uz", "incidents"], 24, 1),
        ("UzNews: доля первых", first_mover.loc["UzNews.uz", "доля_первых"], 0.50, 0.01),
        ("Kun: доля первых", first_mover.loc["Kun.uz", "доля_первых"], 0.20, 0.01),
        ("Цитирований всего", len(citations), 17, 0),
        ("Daryo цитируют, раз", (citations.cited_outlet == "Daryo.uz").sum(), 8, 0),
        ("Spot цитируют, раз", (citations.cited_outlet == "Spot.uz").sum(), 4, 0),
        ("Точность: тип лида", validation["точность"]["lead_type"], 0.83, 0.01),
        ("Точность: жанр", validation["точность"]["genre"], 0.85, 0.01),
        ("Точность: первичность", validation["точность"]["primacy"], 0.83, 0.01),
        ("Точность: топик", validation["точность"]["topic"], 0.74, 0.01),
    ]

    bad = 0
    for name, actual, expected, tol in checks:
        actual = float(actual)
        ok = abs(actual - float(expected)) <= tol
        if not ok:
            bad += 1
        print(f"{'OK  ' if ok else 'РАСХ'} {name:34} посчитано={actual:9.3f}  в отчёте={expected}")

    print(f"\nпроверено {len(checks)}, расхождений {bad}")
    return 1 if bad else 0


if __name__ == "__main__":
    raise SystemExit(main())
