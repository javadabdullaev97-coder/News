"""Сводные графики: output/dashboard.html.

Один самодостаточный html: объём и ритм публикаций, длина и читаемость,
жанры и первичность, плотность источников, топики, скорость по инфоповодам.
Все цифры берутся из csv, посчитанных предыдущими шагами, — дашборд ничего
не пересчитывает по-своему.

Запуск: .venv-competitor/bin/python scripts/competitor/dashboard.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import plotly.io as pio

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import OUTPUT  # noqa: E402

PALETTE = ["#3b82f6", "#f97316", "#10b981", "#a855f7", "#ef4444",
           "#14b8a6", "#eab308", "#6366f1", "#ec4899"]

LAYOUT = dict(
    template="plotly_white",
    font=dict(family="Inter, system-ui, sans-serif", size=13, color="#1f2937"),
    margin=dict(l=60, r=30, t=60, b=60),
    colorway=PALETTE,
    plot_bgcolor="#ffffff",
    paper_bgcolor="#ffffff",
)


def fig_html(fig: go.Figure, title: str, note: str) -> str:
    fig.update_layout(title=dict(text=title, font=dict(size=17)), **LAYOUT)
    body = pio.to_html(fig, include_plotlyjs=False, full_html=False, config={"displayModeBar": False})
    return f'<section class="card"><div class="chart">{body}</div><p class="note">{note}</p></section>'


def main() -> int:
    metrics = pd.read_csv(OUTPUT / "articles-metrics.csv")
    site = metrics[metrics["channel"] == "site"]
    order = site.groupby("outlet")["url"].count().sort_values(ascending=False).index.tolist()

    blocks = []

    # 1. объём в корпусе и ритм по дням
    site = site.copy()
    site["date"] = pd.to_datetime(site["published_at"], format="ISO8601", utc=True).dt.date
    daily = site.groupby(["outlet", "date"])["url"].count().reset_index()
    fig = px.line(daily, x="date", y="url", color="outlet", category_orders={"outlet": order},
                  labels={"date": "", "url": "материалов в выборке", "outlet": ""})
    fig.update_traces(line=dict(width=2))
    blocks.append(fig_html(
        fig, "Ритм публикаций внутри выборки",
        "Не общий выпуск издания, а распределение выборки (до 120 материалов на конкурента) "
        "по дням. Ровная линия означает, что выборка равномерно покрыла период."))

    # 2. длина материала
    fig = px.box(site, x="outlet", y="words", category_orders={"outlet": order},
                 labels={"outlet": "", "words": "слов в материале"}, points=False, color="outlet")
    fig.update_layout(showlegend=False)
    blocks.append(fig_html(fig, "Длина материала, слов",
                           "Коробка — межквартильный размах, линия внутри — медиана."))

    # 3. читаемость
    read = site.groupby("outlet")[["flesch_ru", "sent_len_mean", "long_sentence_share"]].median().reindex(order)
    fig = go.Figure()
    fig.add_bar(x=read.index, y=read["flesch_ru"], name="Flesch (рус.)", marker_color=PALETTE[0])
    fig.add_bar(x=read.index, y=read["sent_len_mean"], name="слов в предложении", marker_color=PALETTE[1])
    fig.update_layout(barmode="group", yaxis_title="")
    blocks.append(fig_html(
        fig, "Читаемость: индекс Флеша (русская адаптация) и длина предложения",
        "Чем выше Flesch, тем легче текст. Коэффициенты Оборневой для русского языка."))

    # 4. канцелярит и пассив
    style = site.groupby("outlet")[["bureaucratic_per_1000", "passive_per_1000",
                                    "nominalization_per_1000"]].median().reindex(order)
    fig = go.Figure()
    for i, (col, name) in enumerate([
        ("bureaucratic_per_1000", "канцелярит"),
        ("nominalization_per_1000", "номинализации"),
        ("passive_per_1000", "пассив"),
    ]):
        fig.add_bar(x=style.index, y=style[col], name=name, marker_color=PALETTE[i])
    fig.update_layout(barmode="group", yaxis_title="на 1000 слов")
    blocks.append(fig_html(fig, "Канцелярит, номинализации и пассив на 1000 слов",
                           "Медианы по изданию. Словарь канцелярита закрыт и лежит в scripts/competitor/textstats.py."))

    # 5. жанры
    genres = pd.crosstab(site["outlet"], site["genre"], normalize="index").reindex(order)
    fig = go.Figure()
    for i, col in enumerate(genres.columns):
        fig.add_bar(x=genres.index, y=genres[col], name=col, marker_color=PALETTE[i % len(PALETTE)])
    fig.update_layout(barmode="stack", yaxis_title="доля материалов", yaxis_tickformat=".0%")
    blocks.append(fig_html(fig, "Жанровая структура", "Жанр определяется эвристикой, точность указана в отчёте."))

    # 6. первичность
    prim = pd.crosstab(site["outlet"], site["primacy"], normalize="index").reindex(order)
    fig = go.Figure()
    for i, col in enumerate(prim.columns):
        fig.add_bar(x=prim.index, y=prim[col], name=col, marker_color=PALETTE[i % len(PALETTE)])
    fig.update_layout(barmode="stack", yaxis_title="доля материалов", yaxis_tickformat=".0%")
    blocks.append(fig_html(fig, "Первичность фактуры",
                           "Откуда взят материал: собственная работа, первоисточник, эксперт, рерайт."))

    # 7. источники и проверяемость
    src = site.groupby("outlet").agg(
        named=("named_sources_per_1000", "median"),
        verifiable=("verifiable", "mean"),
        links=("links_external", "median"),
    ).reindex(order)
    fig = go.Figure()
    fig.add_bar(x=src.index, y=src["named"], name="named sources на 1000 слов", marker_color=PALETTE[2])
    fig.add_trace(go.Scatter(x=src.index, y=src["verifiable"] * 10, name="доля со ссылкой на документ (×10)",
                             mode="markers+lines", marker=dict(size=11, color=PALETTE[4])))
    blocks.append(fig_html(fig, "Плотность источников и проверяемость",
                           "Доля материалов со ссылкой на первичный документ умножена на 10, чтобы поместиться на одну шкалу."))

    # 8. топики
    topics = pd.read_csv(OUTPUT / "topics-by-outlet-share.csv", index_col=0).reindex(order)
    fig = px.imshow(topics, aspect="auto", color_continuous_scale="Blues",
                    labels=dict(color="доля"), text_auto=".0%")
    fig.update_layout(coloraxis_showscale=False, xaxis_title="", yaxis_title="")
    blocks.append(fig_html(fig, "Карта покрытия тем",
                           "Доля материалов издания по топикам. Пустая клетка — тема не закрывается."))

    # 9. скорость по инфоповодам
    nb_path = OUTPUT / "newsbreaks.csv"
    if nb_path.exists():
        nb = pd.read_csv(nb_path)
        fig = px.strip(nb, x="lag_hours", y="outlet", color="depth",
                       labels={"lag_hours": "лаг от первой публикации, часов", "outlet": "", "depth": ""},
                       category_orders={"outlet": order})
        fig.update_traces(marker=dict(size=11, opacity=0.85))
        blocks.append(fig_html(fig, "Скорость выхода по общим инфоповодам",
                               "Каждая точка — материал издания по одному из общих событий периода."))

        first = nb[nb["first"]].groupby("outlet")["event_id"].count().reindex(order).fillna(0)
        fig = go.Figure(go.Bar(x=first.index, y=first.values, marker_color=PALETTE[0]))
        fig.update_layout(yaxis_title="раз вышел первым")
        blocks.append(fig_html(fig, "Кто выходит первым по общим событиям",
                               "Считается по эталонным инфоповодам этапа 5.5."))

    fm_path = OUTPUT / "agenda-first-mover.csv"
    if fm_path.exists():
        fm = pd.read_csv(fm_path)
        fig = px.scatter(fm, x="доля_первых", y="средний_лаг_часов", text="outlet",
                         size="шёл_следом", color="outlet", category_orders={"outlet": order},
                         labels={"доля_первых": "доля событий, где вышел первым",
                                 "средний_лаг_часов": "средний лаг, когда шёл следом (часы)"})
        fig.update_traces(textposition="top center")
        fig.update_layout(showlegend=False)
        blocks.append(fig_html(fig, "Повестка: кто задаёт, кто догоняет",
                               "Правый нижний угол — издание и первое, и быстрое."))

    html = f"""<meta charset="utf-8">
<title>Анализ конкурентов LEAP News — сводные графики</title>
<script src="https://cdn.plot.ly/plotly-2.35.2.min.js"></script>
<style>
  :root {{ color-scheme: light; }}
  body {{ margin:0; background:#f8fafc; color:#1f2937;
         font-family: Inter, system-ui, -apple-system, sans-serif; }}
  header {{ padding:40px 24px 16px; max-width:1100px; margin:0 auto; }}
  h1 {{ font-size:28px; margin:0 0 8px; }}
  header p {{ margin:0; color:#64748b; }}
  main {{ max-width:1100px; margin:0 auto; padding:0 24px 60px;
          display:flex; flex-direction:column; gap:22px; }}
  .card {{ background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:12px 16px 16px; }}
  .chart {{ overflow-x:auto; }}
  .note {{ margin:6px 4px 0; color:#64748b; font-size:13px; line-height:1.5; }}
</style>
<header>
  <h1>Контент конкурентов: сводные графики</h1>
  <p>Период 08.07.2026 — 07.08.2026, до 120 материалов на издание. Цифры пересчитываются
     скриптами scripts/competitor/. Метод и ограничения — в output/report.md.</p>
</header>
<main>
{''.join(blocks)}
</main>
"""
    (OUTPUT / "dashboard.html").write_text(html, encoding="utf-8")
    print(f"готово: {OUTPUT / 'dashboard.html'} ({len(blocks)} графиков)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
