"""Шаг 1b. Сбор списка URL материалов за период.

Три стратегии, порядок задан в corpus-config.json для каждого конкурента:
  rss      — фид, даёт url + дату публикации сразу;
  sitemap  — рекурсивный обход sitemapindex -> sitemap, даты из lastmod
             или news:publication_date;
  listing  — лента с пагинацией, дата на этом шаге неизвестна и берётся
             позже со страницы материала (шаг parse_articles).

Всё сырьё (фиды, sitemap-файлы, страницы лент) кладётся в
data/raw/<competitor>/index/, чтобы повторный прогон не ходил в сеть.

Запуск:
  .venv-competitor/bin/python scripts/competitor/collect_index.py [--competitor ID] [--force]
Результат: data/clean/<competitor>/urls.jsonl
"""

from __future__ import annotations

import argparse
import re
import sys
from datetime import datetime, timedelta
from pathlib import Path
from xml.etree import ElementTree as ET

from dateutil import parser as dateparser

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import (  # noqa: E402
    BROWSER_UA,
    DATA_CLEAN,
    DATA_RAW,
    TASHKENT,
    USER_AGENT,
    Fetcher,
    load_config,
    period_bounds,
    write_jsonl,
)

HREF_RE = re.compile(r'href="([^"#]+)"')

# Даты, зашитые в имена дочерних sitemap-файлов. Нужны, чтобы не скачивать
# всю историю издания: у Spot.uz и Gazeta.uz таких недельных файлов сотни.
ISO_IN_NAME_RE = re.compile(r"(\d{4})-(\d{2})-(\d{2})")
KUN_DAY_RE = re.compile(r"day_(\d{1,2})_year_(\d{4})_month_(\d{1,2})")
YEAR_IN_NAME_RE = re.compile(r"year_(\d{4})")


def date_from_name(url: str) -> tuple[datetime | None, str]:
    """Дата из имени sitemap-файла и её точность: day | week | year | none.

    Недельные файлы (materials-ru-2026-08-03.xml) названы по началу недели,
    поэтому при отборе к ним добавляется запас в неделю.
    """
    m = KUN_DAY_RE.search(url)
    if m:
        day, year, month = (int(x) for x in m.groups())
        try:
            return datetime(year, month, day, tzinfo=TASHKENT), "day"
        except ValueError:
            return None, "none"
    m = ISO_IN_NAME_RE.search(url)
    if m:
        try:
            return datetime(*(int(x) for x in m.groups()), tzinfo=TASHKENT), "week"
        except ValueError:
            return None, "none"
    m = YEAR_IN_NAME_RE.search(url)
    if m:
        return datetime(int(m.group(1)), 1, 1, tzinfo=TASHKENT), "year"
    return None, "none"


def child_in_period(url: str, lastmod: datetime | None, start: datetime, end: datetime) -> bool:
    """Стоит ли вообще открывать дочерний sitemap."""
    dt, precision = date_from_name(url)
    if dt is not None:
        if precision == "year":
            return dt.year >= start.year and dt.year <= end.year
        slack = timedelta(days=8 if precision == "week" else 1)
        return (dt + slack) >= start and (dt - slack) <= end
    if lastmod is not None:
        return lastmod >= start
    # Ни даты в имени, ни lastmod — открываем, отфильтруем по записям внутри.
    return True


def parse_date(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        dt = dateparser.parse(value)
    except (ValueError, OverflowError):
        return None
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=TASHKENT)
    return dt.astimezone(TASHKENT)


def strip_ns(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def iter_xml_records(text: str):
    """Отдать плоские словари из RSS/Atom/sitemap без возни с namespace."""
    try:
        root = ET.fromstring(text.encode("utf-8"))
    except ET.ParseError:
        return
    containers = {"item", "entry", "url", "sitemap"}
    for node in root.iter():
        if strip_ns(node.tag) not in containers:
            continue
        rec: dict[str, str] = {"_kind": strip_ns(node.tag)}
        for child in node.iter():
            name = strip_ns(child.tag)
            if name == rec["_kind"]:
                continue
            if child.text and child.text.strip():
                rec.setdefault(name, child.text.strip())
            if name == "link" and child.get("href"):
                rec.setdefault("link", child.get("href"))
        yield rec


def from_feed(text: str, article_re: re.Pattern) -> list[dict]:
    rows = []
    for rec in iter_xml_records(text):
        if rec["_kind"] not in {"item", "entry"}:
            continue
        url = rec.get("link") or rec.get("guid") or ""
        url = url.strip()
        if not article_re.match(url):
            continue
        rows.append(
            {
                "url": url,
                "title_hint": rec.get("title"),
                "published_hint": rec.get("pubDate")
                or rec.get("published")
                or rec.get("updated")
                or rec.get("date"),
                "category_hint": rec.get("category"),
                "author_hint": rec.get("creator") or rec.get("author"),
                "discovered_via": "rss",
            }
        )
    return rows


def from_sitemap(
    fetcher: Fetcher,
    url: str,
    article_re: re.Pattern,
    child_include: re.Pattern | None,
    start: datetime,
    end: datetime,
    depth: int = 0,
    seen: set[str] | None = None,
) -> list[dict]:
    seen = seen if seen is not None else set()
    if url in seen or depth > 3:
        return []
    seen.add(url)
    text, meta = fetcher.fetch(url, suffix=".xml")
    if text is None:
        print(f"    ! sitemap {url}: {meta.get('error')}", flush=True)
        return []

    rows: list[dict] = []
    children: list[tuple[str, datetime | None]] = []
    for rec in iter_xml_records(text):
        loc = (rec.get("loc") or "").strip()
        if not loc:
            continue
        lastmod = parse_date(rec.get("lastmod"))
        if rec["_kind"] == "sitemap":
            children.append((loc, lastmod))
            continue
        published = parse_date(rec.get("publication_date")) or lastmod
        if not article_re.match(loc):
            continue
        if published is not None and not (start <= published <= end):
            continue
        rows.append(
            {
                "url": loc,
                "title_hint": rec.get("title"),
                "published_hint": published.isoformat() if published else None,
                "discovered_via": "sitemap",
            }
        )

    for loc, lastmod in children:
        if child_include is not None and not child_include.search(loc):
            continue
        if not child_in_period(loc, lastmod, start, end):
            continue
        rows.extend(
            from_sitemap(fetcher, loc, article_re, child_include, start, end, depth + 1, seen)
        )
    return rows


def from_listing(
    fetcher: Fetcher, spec: dict, article_re: re.Pattern, base: str
) -> list[dict]:
    rows: list[dict] = []
    seen: set[str] = set()
    param = spec.get("page_param", "page")
    max_pages = int(spec.get("max_pages", 10))
    for page in range(1, max_pages + 1):
        url = spec["url"] if page == 1 else f"{spec['url']}{'&' if '?' in spec['url'] else '?'}{param}={page}"
        text, meta = fetcher.fetch(url, suffix=".html")
        if text is None:
            print(f"    ! listing {url}: {meta.get('error')}", flush=True)
            break
        found = 0
        for href in HREF_RE.findall(text):
            if href.startswith("/"):
                href = base.rstrip("/") + href
            href = href.split("?")[0]
            if not article_re.match(href) or href in seen:
                continue
            seen.add(href)
            found += 1
            rows.append({"url": href, "discovered_via": "listing", "published_hint": None})
        if found == 0:
            # Пагинация кончилась или отдаёт то же самое — дальше не идём
            break
    return rows


def collect_for(comp: dict, cfg: dict, force: bool) -> dict:
    start, end = period_bounds(cfg)
    end = end.replace(hour=23, minute=59, second=59)
    article_re = re.compile(comp["article_re"])
    fetcher = Fetcher(
        cache_dir=DATA_RAW / comp["id"] / "index",
        delay=1.5,
        force=force,
        user_agent=BROWSER_UA if comp.get("browser_ua") else USER_AGENT,
    )

    rows: list[dict] = []
    stats = []
    for spec in comp["index"]:
        before = len(rows)
        if spec["kind"] == "rss":
            text, meta = fetcher.fetch(spec["url"], suffix=".xml")
            if text is None:
                print(f"    ! rss {spec['url']}: {meta.get('error')}", flush=True)
            else:
                rows.extend(from_feed(text, article_re))
        elif spec["kind"] == "sitemap":
            child = re.compile(spec["child_include"]) if spec.get("child_include") else None
            rows.extend(
                from_sitemap(fetcher, spec["url"], article_re, child, start, end)
            )
        elif spec["kind"] == "listing":
            rows.extend(from_listing(fetcher, spec, article_re, comp["site"]))
        stats.append({"kind": spec["kind"], "url": spec["url"], "found": len(rows) - before})
    fetcher.close()

    # Дедуп по url: приоритет у записи с датой
    best: dict[str, dict] = {}
    for row in rows:
        url = row["url"].rstrip("/")
        row["url"] = url
        old = best.get(url)
        if old is None or (not old.get("published_hint") and row.get("published_hint")):
            best[url] = row

    # Фильтр по периоду там, где дата уже известна. Записи без даты
    # оставляем — период проверит parse_articles по дате со страницы.
    kept, dropped_period = [], 0
    for row in best.values():
        pub = parse_date(row.get("published_hint"))
        if pub is not None:
            if not (start <= pub <= end):
                dropped_period += 1
                continue
            row["published_hint"] = pub.isoformat()
        kept.append(row)

    kept.sort(key=lambda r: (r.get("published_hint") or "", r["url"]), reverse=True)
    out = DATA_CLEAN / comp["id"] / "urls.jsonl"
    write_jsonl(out, kept)
    return {
        "id": comp["id"],
        "name": comp["name"],
        "sources": stats,
        "raw_rows": len(rows),
        "unique": len(best),
        "dropped_out_of_period": dropped_period,
        "kept": len(kept),
        "with_date": sum(1 for r in kept if r.get("published_hint")),
        "output": str(out.relative_to(out.parents[3])),
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--competitor", action="append", help="id конкурента; можно повторять")
    ap.add_argument("--force", action="store_true", help="игнорировать кеш сырья")
    args = ap.parse_args()

    cfg = load_config()
    comps = cfg["competitors"]
    if args.competitor:
        wanted = set(args.competitor)
        comps = [c for c in comps if c["id"] in wanted]

    for comp in comps:
        print(f"== {comp['name']}", flush=True)
        res = collect_for(comp, cfg, args.force)
        print(
            f"   найдено {res['raw_rows']}, уникальных {res['unique']}, "
            f"вне периода {res['dropped_out_of_period']}, оставлено {res['kept']} "
            f"(с датой {res['with_date']})",
            flush=True,
        )
        for s in res["sources"]:
            print(f"     {s['kind']:8} +{s['found']:5}  {s['url']}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
