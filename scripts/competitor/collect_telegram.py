"""Шаг 1d + 2. Telegram-каналы конкурентов через публичное веб-превью.

t.me/s/<канал> отдаёт последние ~20 постов и листается назад параметром
?before=<id>. Идём назад, пока не уйдём за начало периода.

С каждого поста снимаем: id, ссылку, дату и время, текст, число фото и видео,
просмотры, ссылку на сайт издания (по ней потом ищутся кросспосты).

Запуск:
  .venv-competitor/bin/python scripts/competitor/collect_telegram.py [--competitor ID]
Результат: data/raw/<id>/telegram/*.html + data/clean/<id>/telegram.jsonl
"""

from __future__ import annotations

import argparse
import html as htmllib
import re
import sys
from pathlib import Path

from bs4 import BeautifulSoup
from dateutil import parser as dateparser

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import (  # noqa: E402
    BROWSER_UA,
    DATA_CLEAN,
    DATA_RAW,
    TASHKENT,
    Fetcher,
    load_config,
    period_bounds,
    write_jsonl,
)

VIEWS_RE = re.compile(r"([\d.,]+)\s*([KMК М]?)", re.I)


def parse_views(text: str) -> int | None:
    if not text:
        return None
    m = VIEWS_RE.search(text.strip())
    if not m:
        return None
    num = float(m.group(1).replace(",", ".").replace(" ", ""))
    mult = {"k": 1000, "к": 1000, "m": 1_000_000, "м": 1_000_000}.get(m.group(2).lower().strip(), 1)
    return int(num * mult)


def parse_page(html: str, channel: str) -> list[dict]:
    soup = BeautifulSoup(html, "lxml")
    posts = []
    for wrap in soup.select(".tgme_widget_message_wrap"):
        msg = wrap.select_one(".tgme_widget_message")
        if msg is None:
            continue
        data_post = msg.get("data-post", "")
        try:
            msg_id = int(data_post.split("/")[-1])
        except (ValueError, IndexError):
            continue

        time_el = wrap.select_one("time[datetime]")
        published = None
        if time_el and time_el.get("datetime"):
            dt = dateparser.parse(time_el["datetime"])
            published = dt.astimezone(TASHKENT).isoformat() if dt else None

        text_el = wrap.select_one(".tgme_widget_message_text")
        text = ""
        if text_el:
            for br in text_el.find_all("br"):
                br.replace_with("\n")
            text = htmllib.unescape(text_el.get_text("\n")).strip()

        outbound = [
            a["href"]
            for a in (text_el.find_all("a", href=True) if text_el else [])
            if a["href"].startswith("http") and "t.me" not in a["href"]
        ]

        posts.append(
            {
                "channel": "telegram",
                "tg_channel": channel,
                "tg_id": msg_id,
                "url": f"https://t.me/{data_post}" if data_post else None,
                "published_at": published,
                "text": text,
                "word_count": len(text.split()),
                "photos": len(wrap.select(".tgme_widget_message_photo_wrap")),
                "videos": len(wrap.select(".tgme_widget_message_video_player, .tgme_widget_message_document_wrap")),
                "views": parse_views(
                    (wrap.select_one(".tgme_widget_message_views") or {}).get_text()
                    if wrap.select_one(".tgme_widget_message_views")
                    else ""
                ),
                "is_forward": bool(wrap.select_one(".tgme_widget_message_forwarded_from")),
                "outbound_links": outbound[:10],
            }
        )
    return posts


def collect_for(comp: dict, cfg: dict, force: bool, max_pages: int) -> dict:
    channel = comp.get("telegram")
    if not channel:
        return {"id": comp["id"], "channel": None, "posts": 0}
    start, end = period_bounds(cfg)
    end = end.replace(hour=23, minute=59, second=59)

    fetcher = Fetcher(
        cache_dir=DATA_RAW / comp["id"] / "telegram",
        delay=2.0,
        force=force,
        user_agent=BROWSER_UA,
    )
    all_posts: dict[int, dict] = {}
    before: int | None = None
    pages = 0
    reached_start = False
    while pages < max_pages:
        url = f"https://t.me/s/{channel}"
        if before is not None:
            url += f"?before={before}"
        text, meta = fetcher.fetch(url, suffix=".html", check_robots=False)
        pages += 1
        if text is None:
            print(f"    ! {url}: {meta.get('error')}", flush=True)
            break
        posts = parse_page(text, channel)
        if not posts:
            break
        new = [p for p in posts if p["tg_id"] not in all_posts]
        for p in posts:
            all_posts[p["tg_id"]] = p
        oldest = min(p["tg_id"] for p in posts)
        dates = [p["published_at"] for p in posts if p["published_at"]]
        if dates and min(dates) < start.isoformat():
            reached_start = True
            break
        if not new:
            break
        before = oldest

    fetcher.close()
    in_period = [
        p
        for p in all_posts.values()
        if p["published_at"] and start.isoformat() <= p["published_at"] <= end.isoformat()
    ]
    in_period.sort(key=lambda p: p["published_at"])
    for p in in_period:
        p["competitor"] = comp["id"]
        p["outlet"] = comp["name"]
    write_jsonl(DATA_CLEAN / comp["id"] / "telegram.jsonl", in_period)
    return {
        "id": comp["id"],
        "channel": channel,
        "pages": pages,
        "collected": len(all_posts),
        "in_period": len(in_period),
        "reached_period_start": reached_start,
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--competitor", action="append")
    ap.add_argument("--max-pages", type=int, default=60)
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    cfg = load_config()
    comps = cfg["competitors"]
    if args.competitor:
        wanted = set(args.competitor)
        comps = [c for c in comps if c["id"] in wanted]
    for comp in comps:
        res = collect_for(comp, cfg, args.force, args.max_pages)
        print(
            f"== {comp['name']} @{res['channel']}: страниц {res.get('pages')}, "
            f"постов всего {res.get('collected')}, в периоде {res.get('in_period')}, "
            f"дошли до начала периода: {res.get('reached_period_start')}",
            flush=True,
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
