"""Этап 2 (сведение). Единый корпус, дедупликация, разметка кросспостов.

На вход — data/clean/<id>/articles.jsonl и telegram.jsonl каждого издания.
На выходе — data/clean/corpus.jsonl (одна строка = один материал) и отчёт
о том, сколько собрано и сколько отброшено с указанием причины.

Кросспост определяется двумя способами:
  1. пост в Telegram ссылается на url материала того же издания;
  2. первые 200 знаков текста поста и текста материала совпадают после
     нормализации пробелов и регистра.

Запуск: .venv-competitor/bin/python scripts/competitor/normalize.py
Результат: data/clean/corpus.jsonl, output/corpus-report.json
"""

from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import DATA_CLEAN, OUTPUT, load_config, read_jsonl, write_jsonl  # noqa: E402


def norm_url(url: str) -> str:
    """Схема, www и хвостовой слеш не должны мешать сопоставлению."""
    url = re.sub(r"^https?://", "", (url or "").split("?")[0].split("#")[0])
    return url.removeprefix("www.").rstrip("/").lower()


def norm_prefix(text: str, n: int = 200) -> str:
    return re.sub(r"[^\w\s]", "", re.sub(r"\s+", " ", (text or "").lower())).strip()[:n]


def prefix_hash(text: str, n: int = 200) -> str:
    p = norm_prefix(text, n)
    return hashlib.sha1(p.encode("utf-8")).hexdigest() if len(p) >= 60 else ""


def main() -> int:
    cfg = load_config()
    ids = [c["id"] for c in cfg["competitors"]] + ["leap"]
    corpus, report = [], {}

    hosts = {c["id"]: c["site"].split("//")[-1].removeprefix("www.") for c in cfg["competitors"]}
    hosts["leap"] = cfg["us"]["site"].split("//")[-1].removeprefix("www.")

    for cid in ids:
        site_host = hosts[cid]
        articles = read_jsonl(DATA_CLEAN / cid / "articles.jsonl")
        tg = read_jsonl(DATA_CLEAN / cid / "telegram.jsonl")

        # Ссылку из Telegram сверяем со всем индексом издания (несколько сотен
        # url), а не с выборкой в 120 материалов — иначе доля кросспостов
        # оказалась бы заниженной ровно во столько раз, во сколько урезана выборка.
        index_urls = {
            norm_url(u["url"]) for u in read_jsonl(DATA_CLEAN / cid / "urls.jsonl")
        }
        by_url = {norm_url(a["url"]): a for a in articles}
        index_urls.update(by_url)

        # Короткие ссылки Kun.uz, Daryo.uz и Yuz.uz, разрешённые resolve_links.py
        resolutions_path = DATA_CLEAN / cid / "link-resolutions.json"
        resolutions = (
            json.loads(resolutions_path.read_text(encoding="utf-8"))
            if resolutions_path.exists() else {}
        )
        # У Yuz.uz материал существует в нескольких языковых версиях под общим id:
        # ссылку из канала сводим к паре «раздел + id», чтобы /oz/news/147244
        # сопоставлялся с русской версией того же материала.
        index_ids = {
            m.group(1)
            for u in index_urls
            if (m := re.search(r"/(?:news|articles)/(\d+)$", u))
        }
        by_prefix = {}
        for a in articles:
            h = prefix_hash(a.get("text", ""))
            if h:
                by_prefix.setdefault(h, a["url"])

        cross_link, cross_text, unresolved = 0, 0, 0
        for post in tg:
            matched = None
            has_own_link = False
            for link in post.get("outbound_links") or []:
                resolved = resolutions.get(link, link)
                if resolved.startswith("error:"):
                    resolved = link
                key = norm_url(resolved)
                if site_host not in key:
                    continue
                has_own_link = True
                if key in index_urls:
                    matched = key
                    cross_link += 1
                    break
                m = re.search(r"/(?:news|articles)/(\d+)$", key)
                if m and m.group(1) in index_ids:
                    matched = key
                    cross_link += 1
                    break
            if matched is None and has_own_link:
                unresolved += 1
            if matched is None:
                h = prefix_hash(post.get("text", ""))
                if h and h in by_prefix:
                    matched = by_prefix[h]
                    cross_text += 1
            post["crosspost_of"] = matched
            post["is_crosspost"] = matched is not None

        for a in articles:
            corpus.append(a)
        for post in tg:
            corpus.append(post)

        posts_with_own_link = sum(
            1
            for p in tg
            if any(site_host in norm_url(resolutions.get(x, x)) for x in (p.get("outbound_links") or []))
        )
        # На какую языковую версию сайта ведёт канал. У Yuz.uz это единственный
        # способ увидеть, что канал гонит трафик на узбекскую версию, а не на ту,
        # по которой мы считаем стилевые метрики.
        lang_split: dict[str, int] = {}
        for p in tg:
            for link in p.get("outbound_links") or []:
                resolved = norm_url(resolutions.get(link, link))
                if site_host not in resolved:
                    continue
                m = re.search(rf"^{re.escape(site_host)}/(ru|uz|oz|en|kr)(?:/|$)", resolved)
                lang_split[m.group(1) if m else "без языка"] = (
                    lang_split.get(m.group(1) if m else "без языка", 0) + 1
                )
        report[cid] = {
            "site_articles": len(articles),
            "telegram_posts": len(tg),
            "posts_with_own_link": posts_with_own_link,
            "crossposts_by_link": cross_link,
            "crossposts_by_text": cross_text,
            "unmatched_own_links": unresolved,
            "crosspost_share_of_tg": round((cross_link + cross_text) / len(tg), 3) if tg else None,
            "own_link_share_of_tg": round(posts_with_own_link / len(tg), 3) if tg else None,
            "resolved_short_links": len([v for v in resolutions.values() if not v.startswith("error:")]),
            "own_links_by_lang": dict(sorted(lang_split.items(), key=lambda kv: -kv[1])),
        }
        # переписываем telegram.jsonl с проставленной разметкой кросспостов
        if tg:
            write_jsonl(DATA_CLEAN / cid / "telegram.jsonl", tg)

        parse_report = DATA_CLEAN / cid / "parse-report.json"
        if parse_report.exists():
            report[cid]["parse"] = json.loads(parse_report.read_text(encoding="utf-8"))

    write_jsonl(DATA_CLEAN / "corpus.jsonl", corpus)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    (OUTPUT / "corpus-report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))
    print(f"\nвсего записей в корпусе: {len(corpus)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
