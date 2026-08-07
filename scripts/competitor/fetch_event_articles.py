"""Этап 5.5, глубина. Адресная докачка материалов по отобранным инфоповодам.

Скорость меряется по Telegram (корпус полный), а глубина — по сайту: объём,
именованные источники, ссылки на первичные документы, возвращение к теме.
Здесь по каждому событию из output/newsbreaks-detail.json берётся ссылка из
поста, разрешается редирект и скачивается сама страница материала.

Это адресный дозабор поверх выборки: 8 событий на 6-8 изданий, порядка
полусотни страниц.

Запуск:
  .venv-competitor/bin/python scripts/competitor/fetch_event_articles.py \
      [--input output/newsbreaks-detail.json] [--output output/newsbreaks-depth.csv]
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))

import textstats as ts  # noqa: E402
from common import (  # noqa: E402
    BROWSER_UA,
    DATA_CLEAN,
    DATA_RAW,
    OUTPUT,
    ROOT,
    USER_AGENT,
    Fetcher,
    load_config,
    read_jsonl,
)
from parse_articles import nuxt_daryo_html, parse_one  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", default=str(OUTPUT / "newsbreaks-detail.json"))
    ap.add_argument("--output", default=str(OUTPUT / "newsbreaks-depth.csv"))
    args = ap.parse_args()

    cfg = load_config()
    by_name = {c["name"]: c for c in cfg["competitors"]}
    events = json.loads(Path(args.input).read_text(encoding="utf-8"))

    # ссылки на материалы берём из постов канала
    tg_by_url = {}
    for comp in cfg["competitors"]:
        for post in read_jsonl(DATA_CLEAN / comp["id"] / "telegram.jsonl"):
            if post.get("url"):
                tg_by_url[post["url"]] = post

    rows = []
    for ev in events:
        for cov in ev["coverage"]:
            outlet = cov["outlet"]
            comp = by_name.get(outlet)
            if comp is None:  # LEAP News — материал уже разобран из репозитория
                rows.append({**cov, "site_url": cov.get("url"), "site_words": cov["words"],
                             "site_named_sources": cov["named_sources"],
                             "site_primary_links": cov["primary_doc_links"],
                             "site_quotes": cov["quotes"], "source": "repo"})
                continue

            post = tg_by_url.get(cov.get("url") or "")
            links = (post or {}).get("outbound_links") or []
            host = urlparse(comp["site"]).netloc.removeprefix("www.")
            own = [x for x in links if host in x.lower()]
            if not own:
                rows.append({**cov, "site_url": None, "source": "нет ссылки в посте"})
                continue

            resolutions_path = DATA_CLEAN / comp["id"] / "link-resolutions.json"
            resolutions = (
                json.loads(resolutions_path.read_text(encoding="utf-8"))
                if resolutions_path.exists() else {}
            )
            fetcher = Fetcher(
                cache_dir=DATA_RAW / comp["id"] / "events",
                delay=1.5,
                user_agent=BROWSER_UA if comp.get("browser_ua") else USER_AGENT,
            )
            target = resolutions.get(own[0], own[0])
            if target.startswith("error:"):
                target = own[0]
            html, meta = fetcher.fetch(target)
            fetcher.close()
            if html is None:
                rows.append({**cov, "site_url": target, "source": f"ошибка: {meta.get('error')}"})
                continue
            if comp.get("extractor") == "nuxt-daryo":
                rebuilt = nuxt_daryo_html(html, target)
                if rebuilt:
                    html = rebuilt
            parsed = parse_one(html, target, {}, host)
            if parsed is None:
                rows.append({**cov, "site_url": target, "source": "текст не извлёкся"})
                continue
            text = parsed["text"]
            rows.append({
                **cov,
                "site_url": target,
                "site_title": parsed["title"],
                "site_published_at": parsed["published_at"],
                "site_words": parsed["word_count"],
                "site_named_sources": ts.count_named_sources(text),
                "site_quotes": len(ts.QUOTE_RE.findall(text)),
                "site_primary_links": ts.primary_doc_links(parsed["link_targets"]),
                "site_links_external": parsed["links_external"],
                "source": "сайт",
            })

    df = pd.DataFrame(rows)
    df["site_depth"] = df.apply(
        lambda r: "контекст"
        if (r.get("site_words") or 0) >= 350 or (r.get("site_named_sources") or 0) >= 2
        else "только факт",
        axis=1,
    )
    df.to_csv(args.output, index=False)
    cols = ["event_id", "outlet", "lag_hours", "site_words", "site_named_sources",
            "site_primary_links", "site_quotes", "site_depth", "returns", "source"]
    print(df[[c for c in cols if c in df.columns]].to_string(index=False))
    print(f"\nсохранено: {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
