"""Этап 5.6. Повестка и цитируемость.

Три расчёта:

1. Кто задаёт повестку. Считается по Telegram-корпусу — он собран за период
   целиком, тогда как корпус сайта это выборка, и по ней «кто был первым»
   мерить нельзя. Посты кластеризуются как в newsbreaks.py; по кластерам,
   которые закрыли минимум два издания, считается, сколько раз издание
   выходило первым и с каким средним лагом шло следом.
   Каналы Daryo.uz и Yuz.uz узбекоязычные и с русскими кластерами почти не
   пересекаются — их цифры по повестке несопоставимы и помечены отдельно.

2. Цитируемость. Ищем упоминания издания у других: название, домен и ссылку
   в тексте материала. Считаются только упоминания в чужих материалах.

3. Обходимые темы. По каждому топику сравнивается доля издания с медианой
   рынка; если издание системно ниже — тема помечается как обойдённая.

Запуск: .venv-competitor/bin/python scripts/competitor/agenda.py
Результат: output/agenda-first-mover.csv, output/citations.csv,
           output/topic-gaps.csv, output/topics-by-week-outlet.csv
"""

from __future__ import annotations

import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

import pandas as pd
from dateutil import parser as dateparser

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import DATA_CLEAN, OUTPUT, load_config, read_jsonl  # noqa: E402
from newsbreaks import build_clusters, load_telegram, signature, tokens_of  # noqa: E402

OUTLET_MENTION = {
    "Gazeta.uz": r"gazeta\.uz|«?Gazeta\.uz»?|Газета\.uz",
    "Kun.uz": r"kun\.uz|«?Kun\.uz»?",
    "Daryo.uz": r"daryo\.uz|«?Daryo»?",
    "Spot.uz": r"spot\.uz|«?Spot\.uz»?",
    "Podrobno.uz": r"podrobno\.uz|«?Podrobno\.uz»?",
    "Repost.uz": r"repost\.uz|«?Repost»?",
    "UzNews.uz": r"uznews\.uz|«?UzNews»?",
    "Yuz.uz": r"yuz\.uz|«?Yuz\.uz»?",
    "LEAP News": r"leap\.uz|«?LEAP News»?",
}
MENTION_RE = {k: re.compile(v, re.I) for k, v in OUTLET_MENTION.items()}


def main() -> int:
    cfg = load_config()
    rows = [r for r in read_jsonl(DATA_CLEAN / "corpus-topics.jsonl") if r.get("channel") == "site"]
    if not rows:
        print("нет корпуса: сначала topics.py")
        return 1

    # --- 1. кто задаёт повестку (по Telegram) ------------------------------
    posts = load_telegram(cfg)
    df_counts: Counter[str] = Counter()
    for p in posts:
        df_counts.update(set(tokens_of(p["text"])))
    for p in posts:
        p["_dt"] = dateparser.parse(p["published_at"])
        p["_sig"] = signature(p["text"], df_counts, len(posts))

    clusters = build_clusters(posts, window_h=48, threshold=0.18)
    first_count: Counter[str] = Counter()
    follow_count: Counter[str] = Counter()
    lag_sum: dict[str, float] = defaultdict(float)
    shared = 0
    for members in clusters:
        items = sorted(members, key=lambda r: r["_dt"])
        outlets = {}
        for it in items:
            outlets.setdefault(it["outlet"], it)
        if len(outlets) < 2:
            continue
        shared += 1
        ordered = sorted(outlets.items(), key=lambda kv: kv[1]["_dt"])
        first_count[ordered[0][0]] += 1
        t0 = ordered[0][1]["_dt"]
        for outlet, it in ordered[1:]:
            follow_count[outlet] += 1
            lag_sum[outlet] += (it["_dt"] - t0).total_seconds() / 3600

    fm = pd.DataFrame(
        [
            {
                "outlet": outlet,
                "вышел_первым": first_count.get(outlet, 0),
                "шёл_следом": follow_count.get(outlet, 0),
                "доля_первых": round(
                    first_count.get(outlet, 0)
                    / max(1, first_count.get(outlet, 0) + follow_count.get(outlet, 0)), 3
                ),
                "средний_лаг_часов": round(lag_sum[outlet] / follow_count[outlet], 1)
                if follow_count.get(outlet) else None,
                "канал_на_русском": outlet not in {"Daryo.uz", "Yuz.uz"},
            }
            for outlet in sorted({p["outlet"] for p in posts})
        ]
    ).sort_values("доля_первых", ascending=False)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    fm.to_csv(OUTPUT / "agenda-first-mover.csv", index=False)

    # --- 2. цитируемость ---------------------------------------------------
    cit_rows = []
    for target, pat in MENTION_RE.items():
        for r in rows:
            if r["outlet"] == target:
                continue
            hay = (r.get("text") or "") + " " + " ".join(r.get("link_targets") or [])
            hits = len(pat.findall(hay))
            if hits:
                cit_rows.append(
                    {
                        "cited_outlet": target,
                        "citing_outlet": r["outlet"],
                        "url": r["url"],
                        "published_at": r["published_at"],
                        "mentions": hits,
                    }
                )
    cit = pd.DataFrame(cit_rows)
    if cit.empty:
        cit = pd.DataFrame(columns=["cited_outlet", "citing_outlet", "url", "published_at", "mentions"])
    cit.to_csv(OUTPUT / "citations.csv", index=False)
    cit_matrix = (
        pd.crosstab(cit["cited_outlet"], cit["citing_outlet"]) if not cit.empty else pd.DataFrame()
    )
    if not cit_matrix.empty:
        cit_matrix.to_csv(OUTPUT / "citations-matrix.csv")

    # --- 3. обходимые темы -------------------------------------------------
    site = pd.DataFrame(
        [{"outlet": r["outlet"], "topic": r["topic"], "url": r["url"],
          "published_at": r["published_at"]} for r in rows]
    )
    share = pd.crosstab(site["outlet"], site["topic"], normalize="index")
    median = share.median(axis=0)
    gaps = []
    for outlet in share.index:
        for topic in share.columns:
            own, med = share.loc[outlet, topic], median[topic]
            if med >= 0.05 and own <= med * 0.4:
                gaps.append(
                    {
                        "outlet": outlet,
                        "topic": topic,
                        "доля_издания": round(own, 3),
                        "медиана_рынка": round(med, 3),
                        "материалов": int((site[(site.outlet == outlet) & (site.topic == topic)]).shape[0]),
                    }
                )
    gaps_df = pd.DataFrame(gaps).sort_values(["outlet", "медиана_рынка"], ascending=[True, False])
    gaps_df.to_csv(OUTPUT / "topic-gaps.csv", index=False)

    site["week"] = pd.to_datetime(site["published_at"], format="ISO8601", utc=True).dt.strftime("%Y-W%V")
    site.groupby(["outlet", "week", "topic"])["url"].count().unstack(fill_value=0).to_csv(
        OUTPUT / "topics-by-week-outlet.csv"
    )

    print("Кластеров всего:", len(clusters), "| закрытых двумя и более изданиями:", shared)
    print(fm.to_string(index=False))
    print("\nЦитирований найдено:", len(cit))
    if not cit_matrix.empty:
        print(cit_matrix.to_string())
    print("\nПробелы по темам:")
    print(gaps_df.to_string(index=False) if not gaps_df.empty else "  нет")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
