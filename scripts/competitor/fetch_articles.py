"""Шаг 1c. Скачивание страниц материалов.

Из data/clean/<id>/urls.jsonl берётся выборка до --limit материалов, равномерно
растянутая по периоду (не первые N подряд, иначе корпус съедет в один конец
месяца), и складывается в data/raw/<id>/articles/ как есть, до парсинга.

Запуск:
  .venv-competitor/bin/python scripts/competitor/fetch_articles.py [--competitor ID] [--limit 120]
Результат: data/raw/<id>/articles/*.html + data/clean/<id>/fetch-log.jsonl
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import (  # noqa: E402
    BROWSER_UA,
    DATA_CLEAN,
    DATA_RAW,
    USER_AGENT,
    Fetcher,
    load_config,
    read_jsonl,
    write_jsonl,
)


def spread_sample(rows: list[dict], limit: int) -> list[dict]:
    """Равномерная выборка по всему списку, отсортированному по дате.

    Материалы без даты идут в конец и добираются, только если после
    датированных остался запас.
    """
    dated = [r for r in rows if r.get("published_hint")]
    undated = [r for r in rows if not r.get("published_hint")]
    dated.sort(key=lambda r: r["published_hint"])

    if len(dated) >= limit:
        step = len(dated) / limit
        return [dated[int(i * step)] for i in range(limit)]

    out = list(dated)
    need = limit - len(out)
    if undated:
        step = max(1, len(undated) / need)
        out.extend(undated[int(i * step)] for i in range(min(need, len(undated))))
    return out


def fetch_for(comp: dict, limit: int, force: bool) -> dict:
    rows = read_jsonl(DATA_CLEAN / comp["id"] / "urls.jsonl")
    if not rows:
        return {"id": comp["id"], "available": 0, "selected": 0, "ok": 0, "failed": 0}

    selected = spread_sample(rows, limit)
    fetcher = Fetcher(
        cache_dir=DATA_RAW / comp["id"] / "articles",
        delay=1.5,
        force=force,
        user_agent=BROWSER_UA if comp.get("browser_ua") else USER_AGENT,
    )
    log, ok, failed = [], 0, 0
    for i, row in enumerate(selected, 1):
        text, meta = fetcher.fetch(row["url"])
        rec = {
            "url": row["url"],
            "published_hint": row.get("published_hint"),
            "title_hint": row.get("title_hint"),
            "discovered_via": row.get("discovered_via"),
            "raw_path": str(fetcher.cache_path(row["url"]).relative_to(DATA_RAW.parent.parent)),
            "ok": text is not None,
            "error": meta.get("error"),
            "bytes": meta.get("bytes"),
            "cached": meta.get("cached", False),
        }
        log.append(rec)
        if text is not None:
            ok += 1
        else:
            failed += 1
        if i % 25 == 0:
            print(f"     {i}/{len(selected)} (ошибок {failed})", flush=True)
    fetcher.close()

    write_jsonl(DATA_CLEAN / comp["id"] / "fetch-log.jsonl", log)
    return {
        "id": comp["id"],
        "available": len(rows),
        "selected": len(selected),
        "ok": ok,
        "failed": failed,
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--competitor", action="append")
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    cfg = load_config()
    limit = args.limit or cfg["target_per_competitor"]["max"]
    comps = cfg["competitors"]
    if args.competitor:
        wanted = set(args.competitor)
        comps = [c for c in comps if c["id"] in wanted]

    for comp in comps:
        print(f"== {comp['name']}", flush=True)
        res = fetch_for(comp, limit, args.force)
        print(
            f"   в индексе {res['available']}, выбрано {res['selected']}, "
            f"скачано {res['ok']}, ошибок {res['failed']}",
            flush=True,
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
