"""Шаг 2. Нормализация: из сырого html в единый jsonl.

Текст извлекается trafilatura в XML-форме — так навигация, футеры, формы
подписки и блоки «читайте также» отсекаются самим экстрактором, а внутри
статьи остаются размеченными абзацы, подзаголовки, ссылки и картинки, которые
дальше и считаются. Метаданные (дата, автор, рубрика, теги) берутся из
метатегов страницы, дата из индекса используется как запасной вариант.

Одна строка результата — один материал.

Запуск:
  .venv-competitor/bin/python scripts/competitor/parse_articles.py [--competitor ID]
Результат: data/clean/<id>/articles.jsonl + data/clean/<id>/parse-report.json
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path
from urllib.parse import urlparse
from xml.etree import ElementTree as ET

import trafilatura
from dateutil import parser as dateparser
from trafilatura.metadata import extract_metadata

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import (  # noqa: E402
    DATA_CLEAN,
    ROOT,
    TASHKENT,
    load_config,
    period_bounds,
    read_jsonl,
    write_jsonl,
)

VIDEO_RE = re.compile(
    r"<(?:iframe|video)[^>]+(?:youtube|youtu\.be|vimeo|rutube|dailymotion|kinescope|"
    r"vk\.com/video|player\.)[^>]*>",
    re.I,
)
VIDEO_TAG_RE = re.compile(r"<video[\s>]", re.I)
TIME_META_RE = re.compile(
    r'<meta[^>]+(?:property|name|itemprop)=["\'](?:article:published_time|'
    r'published_time|pubdate|datePublished|dc\.date)["\'][^>]*content=["\']([^"\']+)',
    re.I,
)
MOD_META_RE = re.compile(
    r'<meta[^>]+(?:property|name|itemprop)=["\'](?:article:modified_time|'
    r'dateModified|og:updated_time)["\'][^>]*content=["\']([^"\']+)',
    re.I,
)
SECTION_META_RE = re.compile(
    r'<meta[^>]+property=["\']article:section["\'][^>]*content=["\']([^"\']+)', re.I
)
TAG_META_RE = re.compile(
    r'<meta[^>]+property=["\']article:tag["\'][^>]*content=["\']([^"\']+)', re.I
)
DESC_META_RE = re.compile(
    r'<meta[^>]+(?:name|property)=["\'](?:description|og:description)["\'][^>]*content=["\']([^"\']*)',
    re.I,
)
UPDATE_MARK_RE = re.compile(
    r"(обновлен[ои]|обновлено в|дополнено|upd\.|update:|материал дополнен|"
    r"добавлен[ыо] подробност)", re.I
)


def parse_dt(value):
    if not value:
        return None
    try:
        dt = dateparser.parse(value)
    except (ValueError, OverflowError, TypeError):
        return None
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=TASHKENT)
    return dt.astimezone(TASHKENT)


def first(pattern: re.Pattern, html: str):
    m = pattern.search(html)
    return m.group(1).strip() if m else None


def strip_ns(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def body_from_xml(xml_text: str, base_host: str) -> dict:
    """Разобрать XML-выдачу trafilatura: абзацы, подзаголовки, ссылки, картинки."""
    out = {
        "paragraphs": [],
        "headings": [],
        "links_internal": 0,
        "links_external": 0,
        "link_targets": [],
        "images": 0,
        "list_items": 0,
    }
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return out

    for node in root.iter():
        name = strip_ns(node.tag)
        if name == "p":
            text = "".join(node.itertext()).strip()
            if text:
                out["paragraphs"].append(text)
        elif name == "head":
            text = "".join(node.itertext()).strip()
            if text:
                out["headings"].append(text)
        elif name == "item":
            out["list_items"] += 1
        elif name == "graphic":
            out["images"] += 1
        elif name == "ref":
            target = node.get("target") or ""
            if not target or target.startswith(("#", "mailto:", "tel:")):
                continue
            out["link_targets"].append(target)
            host = urlparse(target).netloc.lower().removeprefix("www.")
            if not host or host == base_host:
                out["links_internal"] += 1
            else:
                out["links_external"] += 1
    return out


LD_JSON_RE = re.compile(
    r'<script type="application/ld\+json"[^>]*>(.*?)</script>', re.S
)
NUXT_BODY_RE = re.compile(r'"((?:\\u003Cp)[^"\\]*(?:\\.[^"\\]*)*)"')


def nuxt_daryo_html(html: str, url: str) -> str | None:
    """Собрать нормальную страницу из Nuxt-пейлоада Daryo.uz.

    Сайт отдаёт пустой каркас: текст материала лежит внутри инлайнового
    javascript в экранированном виде, а метаданные — в schema.org-блоке.
    Playwright ради этого не нужен: собираем из уже скачанного html
    синтетическую страницу и дальше разбираем её общим кодом.
    """
    fragments = [c for c in NUXT_BODY_RE.findall(html) if "post-content-p" in c]
    if not fragments:
        return None
    try:
        body = json.loads('"' + max(fragments, key=len) + '"')
    except json.JSONDecodeError:
        return None

    meta = {}
    for raw in LD_JSON_RE.findall(html):
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            continue
        if isinstance(data, dict) and data.get("@type") in {"NewsArticle", "Article"}:
            meta = data
            break

    images = meta.get("image") or []
    if isinstance(images, str):
        images = [images]
    img_tags = "".join(f'<img src="{src}">' for src in images[:10])
    author = meta.get("author") or {}
    author_name = author.get("name") if isinstance(author, dict) else (author or "")
    published = meta.get("datePublished", "")
    modified = meta.get("dateModified", "")
    section = meta.get("articleSection", "")

    return (
        "<html><head>"
        f'<title>{htmlescape(meta.get("headline", ""))}</title>'
        f'<meta property="og:description" content="{htmlescape(meta.get("description", ""))}">'
        f'<meta property="article:published_time" content="{htmlescape(published)}">'
        f'<meta property="article:modified_time" content="{htmlescape(modified)}">'
        f'<meta property="article:section" content="{htmlescape(section)}">'
        f'<meta name="author" content="{htmlescape(author_name or "")}">'
        f'<link rel="canonical" href="{htmlescape(url)}">'
        f"</head><body><article>{img_tags}{body}</article></body></html>"
    )


def htmlescape(value: str) -> str:
    return (
        str(value or "")
        .replace("&", "&amp;")
        .replace('"', "&quot;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def parse_one(html: str, url: str, hint: dict, site_host: str) -> dict | None:
    xml_text = trafilatura.extract(
        html,
        output_format="xml",
        include_links=True,
        include_images=True,
        include_comments=False,
        include_tables=False,
        favor_precision=True,
        url=url,
    )
    plain = trafilatura.extract(
        html, include_comments=False, include_tables=False, favor_precision=True, url=url
    )
    if not plain or len(plain.split()) < 40:
        return None

    body = body_from_xml(xml_text or "", site_host)
    meta = extract_metadata(html, default_url=url)

    published = (
        parse_dt(first(TIME_META_RE, html))
        or parse_dt(getattr(meta, "date", None))
        or parse_dt(hint.get("published_hint"))
    )
    modified = parse_dt(first(MOD_META_RE, html))

    tags = TAG_META_RE.findall(html)
    if not tags and getattr(meta, "tags", None):
        tags = list(meta.tags)

    title = (getattr(meta, "title", None) or hint.get("title_hint") or "").strip()
    # У ряда изданий в <title> приклеено название СМИ — режем хвост
    title = re.sub(r"\s*[|—–-]\s*(Kun\.uz|Gazeta\.uz|Daryo|Spot\.uz|Podrobno\.uz|"
                   r"Repost\.uz|UzNews|Yuz\.uz)[^|]*$", "", title).strip()

    return {
        "url": url,
        "channel": "site",
        "title": title,
        "subtitle": (first(DESC_META_RE, html) or getattr(meta, "description", None) or "").strip(),
        "published_at": published.isoformat() if published else None,
        "modified_at": modified.isoformat() if modified else None,
        "author": (getattr(meta, "author", None) or "").strip() or None,
        "section": first(SECTION_META_RE, html) or (getattr(meta, "categories", None) or [None])[0],
        "tags": tags[:20],
        "text": plain,
        "paragraphs": body["paragraphs"],
        "headings": body["headings"],
        "list_items": body["list_items"],
        "images": body["images"],
        "videos": len(VIDEO_RE.findall(html)) + len(VIDEO_TAG_RE.findall(html)),
        "links_internal": body["links_internal"],
        "links_external": body["links_external"],
        "link_targets": body["link_targets"][:60],
        "word_count": len(plain.split()),
        "has_update_mark": bool(UPDATE_MARK_RE.search(plain[:1200])),
        "discovered_via": hint.get("discovered_via"),
    }


def text_hash(text: str) -> str:
    norm = re.sub(r"\s+", " ", text.strip().lower())[:500]
    return hashlib.sha1(norm.encode("utf-8")).hexdigest()


def parse_for(comp: dict, cfg: dict) -> dict:
    start, end = period_bounds(cfg)
    end = end.replace(hour=23, minute=59, second=59)
    site_host = urlparse(comp["site"]).netloc.lower().removeprefix("www.")
    log = read_jsonl(DATA_CLEAN / comp["id"] / "fetch-log.jsonl")

    rows, seen_url, seen_hash = [], set(), {}
    dropped = {"no_raw": 0, "extract_failed": 0, "out_of_period": 0, "no_date": 0,
               "dup_url": 0, "dup_text": 0}

    for rec in log:
        if not rec.get("ok"):
            dropped["no_raw"] += 1
            continue
        raw = ROOT / rec["raw_path"]
        if not raw.exists():
            dropped["no_raw"] += 1
            continue
        html = raw.read_text(encoding="utf-8", errors="replace")
        if comp.get("extractor") == "nuxt-daryo":
            rebuilt = nuxt_daryo_html(html, rec["url"])
            if rebuilt is None:
                dropped["extract_failed"] += 1
                continue
            html = rebuilt
        parsed = parse_one(html, rec["url"], rec, site_host)
        if parsed is None:
            dropped["extract_failed"] += 1
            continue
        if not parsed["published_at"]:
            dropped["no_date"] += 1
            continue
        pub = parse_dt(parsed["published_at"])
        if not (start <= pub <= end):
            dropped["out_of_period"] += 1
            continue
        key = parsed["url"].rstrip("/")
        if key in seen_url:
            dropped["dup_url"] += 1
            continue
        seen_url.add(key)
        h = text_hash(parsed["text"])
        if h in seen_hash:
            dropped["dup_text"] += 1
            continue
        seen_hash[h] = parsed["url"]
        parsed["competitor"] = comp["id"]
        parsed["outlet"] = comp["name"]
        parsed["text_hash"] = h
        rows.append(parsed)

    rows.sort(key=lambda r: r["published_at"])
    write_jsonl(DATA_CLEAN / comp["id"] / "articles.jsonl", rows)
    report = {"id": comp["id"], "name": comp["name"], "fetched": len(log),
              "kept": len(rows), "dropped": dropped}
    (DATA_CLEAN / comp["id"] / "parse-report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return report


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--competitor", action="append")
    args = ap.parse_args()
    cfg = load_config()
    comps = cfg["competitors"]
    if args.competitor:
        wanted = set(args.competitor)
        comps = [c for c in comps if c["id"] in wanted]
    for comp in comps:
        rep = parse_for(comp, cfg)
        print(f"== {rep['name']}: оставлено {rep['kept']} из {rep['fetched']}; "
              f"отброшено {rep['dropped']}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
