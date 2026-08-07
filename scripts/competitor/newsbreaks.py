"""Этап 5.5. Инфоповоды: скорость против глубины.

Почему события ищутся по Telegram, а не по сайтам. Корпус сайта — выборка
(до 120 материалов из 500-1000 за период), и одно конкретное событие попадает
в неё у одного издания и не попадает у другого. Сравнивать по такой выборке,
кто вышел первым, нельзя. Telegram-корпус собран за период целиком по всем
восьми изданиям (6 тысяч постов), поэтому лаг публикации измеряется по нему.

Алгоритм:
  1. посты всех каналов кластеризуются по сигнатуре из редких токенов
     в окне ±48 часов;
  2. рутинные сюжеты (погода, курс валют, гороскоп, афиша) исключаются —
     они закрываются ежедневно всеми и меряют не редакционную стратегию,
     а наличие ленты автопостинга; список шаблонов открыт в коде;
  3. остаются события, которые закрыли минимум --min-outlets изданий;
  4. по каждому событию берётся первый пост каждого издания — это скорость;
  5. для глубины подтягивается материал на сайте: ссылка из поста
     разрешается и страница скачивается адресно (fetch_event_articles).

LEAP News своего Telegram в корпусе не имеет, поэтому наши материалы
привязываются к событию по той же сигнатуре, но по сайту.

Запуск:
  .venv-competitor/bin/python scripts/competitor/newsbreaks.py --top 8
Результат: output/newsbreaks.csv, output/newsbreaks-detail.json
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter, defaultdict
from datetime import timedelta
from pathlib import Path

import pandas as pd
from dateutil import parser as dateparser

sys.path.insert(0, str(Path(__file__).resolve().parent))

import textstats as ts  # noqa: E402
from common import DATA_CLEAN, OUTPUT, load_config, read_jsonl  # noqa: E402

STOPWORDS = set("""
который которая которые этого этому этот эта эти также более менее самый очень когда
после перед около через между вместе против можно нужно будет были было есть стало
сообщил сообщила сообщили заявил заявила рассказал отметил передает передаёт словам
данным информации году года месяца сегодня вчера завтра также однако поэтому потому
таким образом кроме того при этом например частности время течение области районе
подробнее читайте новости телеграм канал подписаться источник фото видео
""".split())

TOKEN_RE = re.compile(r"[А-ЯЁа-яёA-Za-z][А-ЯЁа-яёA-Za-z-]{4,}|\d[\d.,]{2,}")

# Рутина: закрывается ежедневно и всеми, сравнивать по ней скорость бессмысленно
ROUTINE_RE = re.compile(
    r"курс(?:ы)? валют|обменн\w+ курс|погод|температур\w+ воздуха|синоптик|узгидромет|"
    r"жара до|ожидается дождь|гороскоп|афиша|розыгрыш|прогноз погоды|"
    r"осадк|градус|метеоролог", re.I
)

CLICKBAIT_RE = re.compile(
    r"^(вот что|что случилось|это изменит|назван[ыао]?|стало известно|"
    r"появились подробности|раскрыт[аыо]?|шок|неожиданно)\b|"
    r"\b(кое-что|нечто|один нюанс|вы не поверите)\b", re.I
)


def tg_headline(text: str) -> str:
    """Заголовок поста: первая содержательная строка, не длиннее 15 слов.

    Первая строка у половины каналов состоит из эмодзи-маркеров, поэтому
    берётся первая строка минимум из четырёх слов.
    """
    for line in (text or "").split("\n"):
        words = line.strip().split()
        if len(words) >= 4:
            return " ".join(words[:15])
    return " ".join((text or "").split()[:15])


def tokens_of(text: str) -> list[str]:
    return [t.lower() for t in TOKEN_RE.findall(text or "") if t.lower() not in STOPWORDS]


def signature(text: str, df_counts: Counter, n_docs: int, size: int = 12) -> set[str]:
    scored = Counter()
    for t in tokens_of(text):
        if df_counts.get(t, 1) > n_docs * 0.03:
            continue
        scored[t] += 1
    return {t for t, _ in scored.most_common(size)}


def jaccard(a: set, b: set) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def build_clusters(items: list[dict], window_h: int, threshold: float) -> list[list[dict]]:
    items = sorted(items, key=lambda r: r["_dt"])
    clusters: list[dict] = []
    for row in items:
        best, best_score = None, 0.0
        for cl in clusters:
            if row["_dt"] - cl["last"] > timedelta(hours=window_h):
                continue
            score = jaccard(row["_sig"], cl["sig"])
            if score > best_score:
                best, best_score = cl, score
        if best is not None and best_score >= threshold:
            best["members"].append(row)
            best["last"] = max(best["last"], row["_dt"])
        else:
            clusters.append({"members": [row], "sig": set(row["_sig"]), "last": row["_dt"]})
    return [cl["members"] for cl in clusters]


def load_telegram(cfg) -> list[dict]:
    out = []
    for comp in cfg["competitors"]:
        for post in read_jsonl(DATA_CLEAN / comp["id"] / "telegram.jsonl"):
            if post.get("is_forward") or not post.get("text"):
                continue
            if len(post["text"].split()) < 8:
                continue
            out.append(post)
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--top", type=int, default=8)
    ap.add_argument("--window", type=int, default=48)
    ap.add_argument("--threshold", type=float, default=0.18)
    ap.add_argument("--min-outlets", type=int, default=5)
    ap.add_argument("--since", help="ISO-дата: сузить окно (для сравнения с нашим корпусом)")
    ap.add_argument("--out-prefix", default="newsbreaks")
    args = ap.parse_args()

    cfg = load_config()
    posts = load_telegram(cfg)
    if args.since:
        posts = [p for p in posts if p["published_at"] >= args.since]
    if not posts:
        print("нет Telegram-корпуса: сначала collect_telegram.py")
        return 1

    df_counts: Counter[str] = Counter()
    for p in posts:
        df_counts.update(set(tokens_of(p["text"])))
    for p in posts:
        p["_dt"] = dateparser.parse(p["published_at"])
        p["_sig"] = signature(p["text"], df_counts, len(posts))

    clusters = build_clusters(posts, args.window, args.threshold)

    ranked = []
    routine_dropped = 0
    for members in clusters:
        outlets = {m["outlet"] for m in members}
        if len(outlets) < args.min_outlets:
            continue
        blob = " ".join(m["text"][:200] for m in members)
        if len(ROUTINE_RE.findall(blob)) >= max(2, len(members) // 2):
            routine_dropped += 1
            continue
        ranked.append(members)
    ranked.sort(key=lambda m: (len({x["outlet"] for x in m}), -min(x["_dt"] for x in m).timestamp()),
                reverse=True)
    ranked = ranked[: args.top]

    # материалы LEAP News привязываем к событию по сигнатуре
    leap = list(read_jsonl(DATA_CLEAN / "leap" / "articles.jsonl"))
    if args.since:
        leap = [r for r in leap if r["published_at"] >= args.since]
    for r in leap:
        r["_dt"] = dateparser.parse(r["published_at"])
        r["_sig"] = signature((r.get("title") or "") + " " + (r.get("text") or "")[:1200],
                              df_counts, len(posts))

    table, detail = [], []
    for rank, members in enumerate(ranked, 1):
        members = sorted(members, key=lambda m: m["_dt"])
        label_tokens = Counter()
        for m in members:
            label_tokens.update(m["_sig"])
        label = ", ".join(t for t, _ in label_tokens.most_common(6))
        event_sig = {t for t, _ in label_tokens.most_common(14)}

        first = members[0]
        by_outlet: dict[str, list[dict]] = defaultdict(list)
        for m in members:
            by_outlet[m["outlet"]].append(m)

        # наш материал по этому событию, если он есть
        leap_hits = sorted(
            (r for r in leap if jaccard(r["_sig"], event_sig) >= 0.14),
            key=lambda r: r["_dt"],
        )
        if leap_hits:
            by_outlet["LEAP News"] = leap_hits

        event = {
            "event_id": rank,
            "label": label,
            "first_outlet": first["outlet"],
            "first_at": first["published_at"],
            # Не длиннее 15 слов: в output/ уходят только короткие выдержки
            # чужих материалов, полные тексты остаются в data/ вне репозитория.
            "first_text": tg_headline(first["text"]),
            "first_url": first.get("url"),
            "outlets": len(by_outlet),
            "posts": len(members),
            "leap_covered": bool(leap_hits),
            "coverage": [],
        }
        for outlet, its in sorted(by_outlet.items(), key=lambda kv: kv[1][0]["_dt"]):
            lead = its[0]
            is_site = lead.get("channel") == "site"
            text = lead.get("text") or ""
            headline = lead.get("title") or tg_headline(text)
            row = {
                "event_id": rank,
                "event": label,
                "outlet": outlet,
                "channel": "сайт" if is_site else "telegram",
                "url": lead.get("url"),
                "headline": headline,
                "published_at": lead["published_at"],
                "lag_hours": round((lead["_dt"] - first["_dt"]).total_seconds() / 3600, 1),
                "first": outlet == first["outlet"],
                "words": lead.get("word_count", len(text.split())),
                "named_sources": ts.count_named_sources(text),
                "quotes": len(ts.QUOTE_RE.findall(text)),
                "primary_doc_links": ts.primary_doc_links(
                    lead.get("link_targets") or lead.get("outbound_links") or []
                ),
                "clickbait_headline": bool(CLICKBAIT_RE.search(headline)),
                "returns": len(its) - 1,
                "return_at": its[1]["published_at"] if len(its) > 1 else None,
            }
            row["depth"] = (
                "контекст" if row["words"] >= 120 or row["named_sources"] >= 2 else "только факт"
            )
            table.append(row)
            event["coverage"].append(row)
        detail.append(event)

    df = pd.DataFrame(table)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUTPUT / f"{args.out_prefix}.csv", index=False)
    (OUTPUT / f"{args.out_prefix}-detail.json").write_text(
        json.dumps(detail, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print(f"кластеров всего {len(clusters)}, рутинных отброшено {routine_dropped}, "
          f"отобрано событий {len(ranked)}")
    for ev in detail:
        print(f"\n#{ev['event_id']} [{ev['outlets']} изданий] {ev['label']}")
        print(f"   первым: {ev['first_outlet']} — {ev['first_text'][:110]}")
        for c in ev["coverage"]:
            print(f"     {c['outlet']:13} {c['channel']:8} +{c['lag_hours']:7}ч  {c['words']:5} сл  "
                  f"ист.{c['named_sources']}  док.{c['primary_doc_links']}  {c['depth']:11} "
                  f"возвратов {c['returns']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
