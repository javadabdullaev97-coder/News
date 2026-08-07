"""Выборки для ручной работы: качественное кодирование и проверка эвристик.

Два режима.

  --qualitative  стратифицированная выборка по --per-outlet материалов на
                 издание: покрывает все топики и весь период, отдаётся с
                 полным текстом для чтения (этап 4).
  --validation   выборка для измерения точности эвристик: авторазметка
                 (тип заголовка, тип лида, структура, жанр, первичность,
                 топик) плюс текст, чтобы проставить ручные метки.

Выборка детерминированная: seed фиксирован, повторный запуск даёт тот же набор.

Запуск:
  .venv-competitor/bin/python scripts/competitor/sample.py --qualitative --per-outlet 8
  .venv-competitor/bin/python scripts/competitor/sample.py --validation --size 64
"""

from __future__ import annotations

import argparse
import json
import random
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import DATA_CLEAN, OUTPUT, read_jsonl  # noqa: E402
from metrics import compute_row  # noqa: E402

SEED = 20260807


def stratified(rows: list[dict], per_outlet: int) -> list[dict]:
    """По изданию: разложить по (топик, неделя) и брать по кругу."""
    rnd = random.Random(SEED)
    by_outlet: dict[str, list[dict]] = defaultdict(list)
    for r in rows:
        by_outlet[r["outlet"]].append(r)

    out = []
    for outlet, items in sorted(by_outlet.items()):
        buckets: dict[tuple, list[dict]] = defaultdict(list)
        for r in items:
            week = r["published_at"][:10]
            buckets[(r.get("topic", "other"), week[:7] + "-" + str(int(week[8:10]) // 8))].append(r)
        keys = sorted(buckets)
        rnd.shuffle(keys)
        picked, i = [], 0
        while len(picked) < per_outlet and keys:
            key = keys[i % len(keys)]
            bucket = buckets[key]
            if bucket:
                picked.append(bucket.pop(rnd.randrange(len(bucket))))
            else:
                keys.remove(key)
                if not keys:
                    break
                i -= 1
            i += 1
        out.extend(picked)
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--qualitative", action="store_true")
    ap.add_argument("--validation", action="store_true")
    ap.add_argument("--per-outlet", type=int, default=8)
    ap.add_argument("--size", type=int, default=64)
    args = ap.parse_args()

    rows = [r for r in read_jsonl(DATA_CLEAN / "corpus-topics.jsonl") if r.get("channel") == "site"]
    OUTPUT.mkdir(parents=True, exist_ok=True)

    if args.qualitative:
        picked = stratified(rows, args.per_outlet)
        payload = [
            {
                "url": r["url"],
                "outlet": r["outlet"],
                "published_at": r["published_at"],
                "topic": r.get("topic"),
                "section": r.get("section"),
                "author": r.get("author"),
                "title": r.get("title"),
                "subtitle": r.get("subtitle"),
                "words": r.get("word_count"),
                "headings": r.get("headings"),
                "text": r.get("text"),
            }
            for r in picked
        ]
        path = OUTPUT / "qualitative-sample.json"
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"качественная выборка: {len(payload)} материалов -> {path}")

    if args.validation:
        rnd = random.Random(SEED + 1)
        picked = stratified(rows, max(1, args.size // max(1, len({r['outlet'] for r in rows}))))
        rnd.shuffle(picked)
        picked = picked[: args.size]
        payload = []
        for r in picked:
            auto = compute_row(r)
            payload.append(
                {
                    "url": r["url"],
                    "outlet": r["outlet"],
                    "title": r.get("title"),
                    "lead": (r.get("paragraphs") or [""])[0],
                    "text_head": (r.get("text") or "")[:1500],
                    "headings": r.get("headings"),
                    "words": r.get("word_count"),
                    "auto": {
                        "title_type": auto["title_type"],
                        "lead_type": auto["lead_type"],
                        "structure": auto["structure"],
                        "genre": auto["genre"],
                        "primacy": auto["primacy"],
                        "topic": r.get("topic"),
                    },
                }
            )
        path = OUTPUT / "validation-sample.json"
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"выборка для проверки эвристик: {len(payload)} материалов -> {path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
