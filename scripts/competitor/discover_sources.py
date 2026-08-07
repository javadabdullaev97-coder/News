"""Шаг 1a. Разведка источников списка материалов.

Для каждого конкурента проверяет кандидатов из corpus-config.json в порядке
RSS -> sitemap -> листинг с пагинацией и записывает, что реально работает:
код ответа, формат тела, число найденных ссылок на материалы.

Запуск:  .venv-competitor/bin/python scripts/competitor/discover_sources.py
Результат: output/source-discovery.json
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import DATA_RAW, OUTPUT, Fetcher, load_config  # noqa: E402


def body_kind(text: str) -> str:
    head = text[:400].lstrip().lower()
    if head.startswith("<?xml") or "<rss" in head or "<feed" in head or "<urlset" in head or "<sitemapindex" in head:
        if "<sitemapindex" in text[:2000].lower():
            return "sitemapindex"
        if "<urlset" in text[:2000].lower():
            return "sitemap"
        if "<feed" in text[:2000].lower():
            return "atom"
        return "rss"
    if head.startswith("<!doctype html") or head.startswith("<html"):
        return "html"
    return "unknown"


def count_entries(text: str, kind: str) -> int:
    low = text.lower()
    if kind in {"rss"}:
        return low.count("<item>")
    if kind == "atom":
        return low.count("<entry>")
    if kind in {"sitemap", "sitemapindex"}:
        return low.count("<loc>")
    if kind == "html":
        return low.count("<a ")
    return 0


def main() -> int:
    cfg = load_config()
    report = {"generated_by": "scripts/competitor/discover_sources.py", "competitors": []}

    for comp in cfg["competitors"]:
        fetcher = Fetcher(cache_dir=DATA_RAW / comp["id"] / "index", delay=1.5, force=True)
        entry = {"id": comp["id"], "name": comp["name"], "sources": [], "telegram": None}
        for src in comp["index"]:
            url = src["url"]
            allowed = fetcher.robots_allows(url)
            rec = {"kind": src["kind"], "url": url, "robots_allowed": allowed}
            if not allowed:
                rec["status"] = "robots-disallow"
                entry["sources"].append(rec)
                continue
            text, meta = fetcher.fetch(url, suffix=".idx")
            rec["http"] = meta.get("status") or meta.get("error")
            if text is None:
                rec["ok"] = False
                entry["sources"].append(rec)
                continue
            kind = body_kind(text)
            rec["body_kind"] = kind
            rec["entries"] = count_entries(text, kind)
            rec["bytes"] = len(text)
            # Совпадает ли фактический формат с ожидаемым
            expected = {"rss": {"rss", "atom"}, "sitemap": {"sitemap", "sitemapindex"}, "listing": {"html"}}
            rec["ok"] = kind in expected.get(src["kind"], set()) and rec["entries"] > 0
            entry["sources"].append(rec)

        if comp.get("telegram"):
            tg_url = f"https://t.me/s/{comp['telegram']}"
            text, meta = fetcher.fetch(tg_url, suffix=".tg", check_robots=False)
            posts = text.count("tgme_widget_message_wrap") if text else 0
            entry["telegram"] = {
                "url": tg_url,
                "http": meta.get("status") or meta.get("error"),
                "posts_on_page": posts,
                "ok": posts > 0,
            }
        fetcher.close()
        report["competitors"].append(entry)
        print(json.dumps(entry, ensure_ascii=False, indent=2), flush=True)

    OUTPUT.mkdir(parents=True, exist_ok=True)
    (OUTPUT / "source-discovery.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
