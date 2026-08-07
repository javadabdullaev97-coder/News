"""Шаг 2 (наш корпус). content/posts/**/*.mdx -> тот же jsonl, что у конкурентов.

Русские версии материалов LEAP News: файлы без языкового суффикса
(<slug>.uz.mdx и <slug>.en.mdx — переводы, в корпус не идут).

Схема результата совпадает с parse_articles.py, чтобы метрики считались одним
и тем же кодом и цифры были сопоставимы.

Запуск: .venv-competitor/bin/python scripts/competitor/parse_ours.py
Результат: data/clean/leap/articles.jsonl
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

import yaml
from dateutil import parser as dateparser

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import (  # noqa: E402
    DATA_CLEAN,
    ROOT,
    TASHKENT,
    load_config,
    period_bounds,
    write_jsonl,
)
from parse_articles import text_hash  # noqa: E402

FRONTMATTER_RE = re.compile(r"^---\n(.*?)\n---\n", re.S)
MD_LINK_RE = re.compile(r"\[([^\]]*)\]\(([^)\s]+)[^)]*\)")
MD_IMAGE_RE = re.compile(r"!\[[^\]]*\]\([^)]+\)")
JSX_RE = re.compile(r"<[A-Z][A-Za-z0-9]*\b[^>]*/?>")
HEADING_RE = re.compile(r"^#{2,4}\s+(.+)$", re.M)
LIST_ITEM_RE = re.compile(r"^\s*(?:[-*]|\d+\.)\s+", re.M)
VIDEO_HINT_RE = re.compile(r"(youtube|youtu\.be|vimeo|rutube|<video)", re.I)


def strip_markdown(md: str) -> str:
    text = MD_IMAGE_RE.sub("", md)
    text = MD_LINK_RE.sub(r"\1", text)
    text = JSX_RE.sub("", text)
    text = re.sub(r"^#{1,6}\s+", "", text, flags=re.M)
    text = re.sub(r"[*_`>]", "", text)
    return text.strip()


def parse_file(path: Path, site_host: str) -> dict | None:
    raw = path.read_text(encoding="utf-8")
    m = FRONTMATTER_RE.match(raw)
    if not m:
        return None
    try:
        fm = yaml.safe_load(m.group(1)) or {}
    except yaml.YAMLError:
        return None
    body_md = raw[m.end():]

    headings = HEADING_RE.findall(body_md)
    body_no_headings = HEADING_RE.sub("", body_md)
    paragraphs = [
        strip_markdown(block).strip()
        for block in re.split(r"\n\s*\n", body_no_headings)
        if strip_markdown(block).strip() and not LIST_ITEM_RE.match(block)
    ]
    text = strip_markdown(body_md)

    links = MD_LINK_RE.findall(body_md)
    internal = external = 0
    targets = []
    for _, target in links:
        if not target.startswith("http"):
            internal += 1
            targets.append(target)
            continue
        targets.append(target)
        host = urlparse(target).netloc.lower().removeprefix("www.")
        if host == site_host:
            internal += 1
        else:
            external += 1

    published = fm.get("publishedAt")
    dt = dateparser.parse(published) if published else None
    if dt is not None and dt.tzinfo is None:
        dt = dt.replace(tzinfo=TASHKENT)

    slug = path.stem
    day = path.parent.name
    url = f"https://leap.uz/ru/{day.replace('-', '/')}/{slug}"

    image_count = len(MD_IMAGE_RE.findall(body_md))
    if isinstance(fm.get("image"), dict) and fm["image"].get("url"):
        image_count += 1

    return {
        "url": url,
        "competitor": "leap",
        "outlet": "LEAP News",
        "channel": "site",
        "title": (fm.get("title") or "").strip(),
        "subtitle": (fm.get("description") or "").strip(),
        "published_at": dt.astimezone(TASHKENT).isoformat() if dt else None,
        "modified_at": None,
        "author": ", ".join(fm.get("authors") or []) or None,
        "section": fm.get("category"),
        "tags": fm.get("tags") or [],
        "text": text,
        "paragraphs": paragraphs,
        "headings": headings,
        "list_items": len(LIST_ITEM_RE.findall(body_md)),
        "images": image_count,
        "videos": len(VIDEO_HINT_RE.findall(body_md)),
        "links_internal": internal,
        "links_external": external,
        "link_targets": targets[:60],
        "word_count": len(text.split()),
        "has_update_mark": False,
        "discovered_via": "repo",
        "sources_declared": [
            s.get("url") for s in (fm.get("sources") or []) if isinstance(s, dict) and s.get("url")
        ],
        "text_hash": text_hash(text),
    }


def main() -> int:
    cfg = load_config()
    start, end = period_bounds(cfg)
    end = end.replace(hour=23, minute=59, second=59)
    content_dir = ROOT / cfg["us"]["content_dir"]
    site_host = urlparse(cfg["us"]["site"]).netloc.lower().removeprefix("www.")

    rows, skipped_lang, skipped_period, skipped_bad = [], 0, 0, 0
    for path in sorted(content_dir.rglob("*.mdx")):
        if re.search(r"\.(uz|en)\.mdx$", path.name):
            skipped_lang += 1
            continue
        parsed = parse_file(path, site_host)
        if parsed is None or not parsed["published_at"]:
            skipped_bad += 1
            continue
        pub = dateparser.parse(parsed["published_at"])
        if not (start <= pub <= end):
            skipped_period += 1
            continue
        rows.append(parsed)

    rows.sort(key=lambda r: r["published_at"])
    write_jsonl(DATA_CLEAN / "leap" / "articles.jsonl", rows)
    report = {
        "id": "leap",
        "name": "LEAP News",
        "kept": len(rows),
        "skipped_translations": skipped_lang,
        "skipped_out_of_period": skipped_period,
        "skipped_unparsed": skipped_bad,
    }
    (DATA_CLEAN / "leap" / "parse-report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
