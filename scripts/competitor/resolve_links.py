"""Разрешение коротких ссылок из Telegram (для подсчёта кросспостов).

Kun.uz, Daryo.uz и Yuz.uz дают в канале не адрес материала, а короткий
редирект (kun.uz/ru/91612512, daryo.uz/y9A77mLvg) или ссылку на другую
языковую версию. Сопоставить их с индексом по строке нельзя, поэтому
ссылки разрешаются запросом с обрывом на первом редиректе.

Чтобы не гонять полторы тысячи запросов, разрешается случайная выборка
(--sample, по умолчанию 200 ссылок на издание) — доля кросспостов
считается по ней, размер выборки указывается в отчёте.

Запуск: .venv-competitor/bin/python scripts/competitor/resolve_links.py
Результат: data/clean/<id>/link-resolutions.json
"""

from __future__ import annotations

import argparse
import json
import random
import sys
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import BROWSER_UA, DATA_CLEAN, load_config, read_jsonl  # noqa: E402

SEED = 20260807


def own_link(link: str, host: str) -> bool:
    return host in link.lower()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--competitor", action="append")
    ap.add_argument("--sample", type=int, default=200)
    args = ap.parse_args()

    cfg = load_config()
    comps = [c for c in cfg["competitors"] if c.get("short_links")]
    if args.competitor:
        wanted = set(args.competitor)
        comps = [c for c in comps if c["id"] in wanted]

    for comp in comps:
        cid = comp["id"]
        host = comp["site"].split("//")[-1].removeprefix("www.")
        posts = read_jsonl(DATA_CLEAN / cid / "telegram.jsonl")
        links = sorted({
            link
            for p in posts
            for link in (p.get("outbound_links") or [])
            if own_link(link, host)
        })
        rnd = random.Random(SEED)
        rnd.shuffle(links)
        sample = links[: args.sample]

        out_path = DATA_CLEAN / cid / "link-resolutions.json"
        known = json.loads(out_path.read_text(encoding="utf-8")) if out_path.exists() else {}
        todo = [x for x in sample if x not in known]

        with httpx.Client(
            follow_redirects=True, timeout=25,
            headers={"User-Agent": BROWSER_UA}
        ) as client:
            for i, link in enumerate(todo, 1):
                try:
                    resp = client.head(link)
                    if resp.status_code >= 400:
                        resp = client.get(link)
                    known[link] = str(resp.url)
                except Exception as exc:
                    known[link] = f"error:{type(exc).__name__}"
                if i % 50 == 0:
                    print(f"   {cid}: {i}/{len(todo)}", flush=True)

        out_path.write_text(json.dumps(known, ensure_ascii=False, indent=2), encoding="utf-8")
        resolved = sum(1 for v in known.values() if not v.startswith("error:"))
        print(f"== {comp['name']}: своих ссылок {len(links)}, разрешено {resolved} "
              f"(выборка {len(sample)})", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
