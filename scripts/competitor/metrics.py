"""Этапы 3 и 3.5. Количественные и медийные метрики по каждому материалу.

Считается скриптом целиком: ни одна цифра в отчёте не берётся из чтения глазами.
Эвристики (тип заголовка, тип лида, структура, жанр, первичность) описаны
здесь же и проверяются на ручной разметке в validate_heuristics.py.

Запуск: .venv-competitor/bin/python scripts/competitor/metrics.py
Результат: output/articles-metrics.csv, output/summary-by-outlet.csv
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import pandas as pd
from dateutil import parser as dateparser

sys.path.insert(0, str(Path(__file__).resolve().parent))

import textstats as ts  # noqa: E402
from common import DATA_CLEAN, OUTPUT, load_config, read_jsonl  # noqa: E402

# ---------------------------------------------------------------- заголовки

HOWTO_RE = re.compile(r"^(как|что делать|куда|где|зачем|почему)\b|\bинструкц|\bпамятк", re.I)
LISTICLE_RE = re.compile(r"^\d+\s|\b(\d+)\s+(способ|причин|факт|вещ|шаг|правил|совет|пункт)", re.I)
CASE_RE = re.compile(r"^(как\s+\w+\s+(?:стал|смог|построил|заработал)|истори[яи]\s|опыт\s)", re.I)


def headline_type(title: str) -> str:
    t = (title or "").strip()
    if not t:
        return "нет"
    if t.endswith("?"):
        return "вопрос"
    if LISTICLE_RE.search(t):
        return "листикл"
    if CASE_RE.search(t):
        return "кейс"
    if HOWTO_RE.search(t):
        return "how-to"
    return "утверждение"


# --------------------------------------------------------------------- лид

SCENIC_RE = re.compile(
    r"\b(утром|вечером|ночью|на прошлой неделе|когда|стоял\w*|шёл|шел|сидел\w*|"
    r"вошёл|вошел|у входа|на пороге|представьте|казалось)\b", re.I
)
ANECDOTE_RE = re.compile(
    r"\b(рассказывает|вспоминает|признаётся|признается|говорит\s+[А-ЯЁ]|"
    r"[А-ЯЁ][а-яё]+\s+живёт|[А-ЯЁ][а-яё]+\s+работает|историю)\b"
)


def lead_type(lead: str) -> str:
    """Тип лида по составу первого абзаца.

    фактологический — есть число или дата и атрибуция/действие;
    сценический     — обстоятельство места и времени, описание без цифр;
    анекдотический  — частный герой и его история;
    отложенный      — общее рассуждение или вопрос без конкретики.
    """
    if not lead:
        return "нет"
    has_num = bool(ts.NUMBER_RE.search(lead)) or bool(ts.DATE_RE.search(lead))
    has_attr = bool(ts.ATTRIBUTION_RE.search(lead))
    if ANECDOTE_RE.search(lead):
        return "анекдотический"
    if SCENIC_RE.search(lead) and not has_num:
        return "сценический"
    if has_num or has_attr:
        return "фактологический"
    if lead.strip().endswith("?") or len(lead.split()) > 45:
        return "отложенный"
    return "отложенный"


# ---------------------------------------------------------------- структура


def structure_type(row: dict, paragraphs: list[str], headings: list[str]) -> str:
    """Композиция материала.

    разбор по пунктам — подзаголовки или список занимают большую часть;
    nut graf        — первый абзац без цифр, во втором-третьем появляется
                      суть с цифрами (отложенное ядро);
    перевёрнутая пирамида — суть в первом абзаце, дальше детали, абзацы
                      укорачиваются;
    нарратив        — длинные абзацы, мало цифр, нет подзаголовков.
    """
    n_par = len(paragraphs)
    if not n_par:
        return "нет"
    if row["list_items"] >= 5 or (len(headings) >= 3 and n_par >= 6):
        return "разбор по пунктам"
    first = paragraphs[0]
    first_has_core = bool(ts.NUMBER_RE.search(first) or ts.ATTRIBUTION_RE.search(first))
    if not first_has_core and n_par >= 3:
        nxt = " ".join(paragraphs[1:3])
        if ts.NUMBER_RE.search(nxt) or ts.ATTRIBUTION_RE.search(nxt):
            return "nut graf"
    if first_has_core:
        return "перевёрнутая пирамида"
    return "нарратив"


# ------------------------------------------------------------------- жанры

INTERVIEW_RE = re.compile(r"^\s*[—–-]\s+", re.M)
OPINION_RE = re.compile(r"\b(мнени|колонк|блог|редакц\w+ может не разделять|я считаю|по-моему)\b", re.I)
EXPLAINER_RE = re.compile(r"\b(объясня\w+|разбираем|что это значит|как это работает|"
                          r"что изменится|подробн\w+ разбор|ликбез|что нужно знать)\b", re.I)
DIGEST_RE = re.compile(r"\b(дайджест|главное за|итоги (?:дня|недели)|обзор недели|коротко)\b", re.I)
REPORTAGE_RE = re.compile(r"\b(корреспондент\w*\s+(?:побывал|посетил|наблюдал)|наш\w+ корреспондент|"
                          r"репортаж|с места событий|побывал\w* на)\b", re.I)
ANALYTICS_RE = re.compile(r"\b(анализ|аналитик\w+|динамик\w+|тенденци\w+|прогноз\w*|"
                          r"по итогам года|в сравнении с|доля рынка|структур\w+ расход)\b", re.I)
PRESS_RELEASE_RE = re.compile(r"\b(пресс-релиз|пресс-служба сообщает|на правах рекламы|"
                              r"партнёрск\w+ материал|реклам\w+)\b", re.I)
TRANSLATION_RE = re.compile(r"\b(перевод\s+(?:материала|статьи)|по материалам\s+\w+|"
                            r"источник:\s*(?:reuters|bloomberg|bbc|afp|ap\b))", re.I)
EXCLUSIVE_RE = re.compile(r"\b(эксклюзив\w*|в распоряжении редакции|редакци\w+ удалось|"
                          r"только у нас|специально для)\b", re.I)


def genre(row: dict, text: str, headings: list[str]) -> str:
    if OPINION_RE.search(row.get("section") or "") or OPINION_RE.search(" ".join(row.get("tags") or [])):
        return "мнение"
    dialogue = len(INTERVIEW_RE.findall(text))
    if dialogue >= 4 and row["word_count"] > 400:
        return "интервью"
    if DIGEST_RE.search(row.get("title") or ""):
        return "дайджест"
    if REPORTAGE_RE.search(text):
        return "репортаж"
    if EXPLAINER_RE.search((row.get("title") or "") + " " + " ".join(headings)):
        return "объяснитель"
    if OPINION_RE.search(text[:600]):
        return "мнение"
    if row["word_count"] >= 700 and ANALYTICS_RE.search(text):
        return "аналитика"
    if row["word_count"] >= 350:
        return "расширенная новость"
    return "новость"


def primacy(row: dict, text: str, named: int, primary_links: int) -> str:
    """Первичность материала: откуда взята фактура."""
    if PRESS_RELEASE_RE.search(text[:800]):
        return "пресс-релиз без обработки"
    if TRANSLATION_RE.search(text):
        return "перевод"
    if EXCLUSIVE_RE.search(text[:800]):
        return "эксклюзив"
    if REPORTAGE_RE.search(text):
        return "собственный сбор"
    if primary_links >= 1 and named >= 1:
        return "собственный сбор"
    if named >= 2:
        return "комментарий эксперта"
    if primary_links >= 1:
        return "работа с первоисточником"
    return "рерайт"


# ------------------------------------------------------------------ расчёт

EVALUATIVE_RE = re.compile(
    r"\b(к сожалению|к счастью|увы|скандальн\w+|возмутительн\w+|шокирующ\w+|"
    r"провальн\w+|блестящ\w+|позорн\w+|очевидно, что|разумеется|конечно же)\b", re.I
)


def compute_row(row: dict) -> dict:
    text = row.get("text") or ""
    paragraphs = row.get("paragraphs") or []
    headings = row.get("headings") or []
    title = row.get("title") or ""
    wc = row.get("word_count") or len(text.split())
    chars = len(text)

    sent = ts.sentence_stats(text)
    read = ts.readability(text)
    lead = paragraphs[0] if paragraphs else ""

    par_sent_lengths = [len(ts.sentences(p)) for p in paragraphs if p.strip()]
    numbers = len(ts.NUMBER_RE.findall(text))
    percents = len(ts.PERCENT_RE.findall(text))
    dates = len(ts.DATE_RE.findall(text))
    quotes = len(ts.QUOTE_RE.findall(text))
    attributions = len(ts.ATTRIBUTION_RE.findall(text))
    named = ts.count_named_sources(text)
    anon = ts.count_anonymous_sources(text)
    targets = row.get("link_targets") or []
    prim_links = ts.primary_doc_links(targets)
    bureau = ts.bureaucratic_count(text)
    nominal = len(ts.NOMINALIZATION_RE.findall(text))
    passive = ts.passive_count(text)

    out = {
        "outlet": row["outlet"],
        "competitor": row["competitor"],
        "url": row["url"],
        "published_at": row["published_at"],
        "channel": row.get("channel", "site"),
        "section": row.get("section"),
        "author": row.get("author"),
        # --- этап 3
        "words": wc,
        "chars": chars,
        "sentences": sent["sentences"],
        "sent_len_mean": sent["sent_len_mean"],
        "sent_len_median": sent["sent_len_median"],
        "long_sentence_share": sent["long_sentence_share"],
        "paragraphs": len(paragraphs),
        "par_len_sentences_mean": round(sum(par_sent_lengths) / len(par_sent_lengths), 2)
        if par_sent_lengths else None,
        "flesch_ru": read["flesch_ru"],
        "fkgl_ru": read["fkgl_ru"],
        "passive_per_1000": ts.per_1000(passive, wc),
        "bureaucratic_per_1000": ts.per_1000(bureau, wc),
        "nominalization_per_1000": ts.per_1000(nominal, wc),
        "numbers_per_1000": ts.per_1000(numbers, wc),
        "percents_per_1000": ts.per_1000(percents, wc),
        "dates_per_1000": ts.per_1000(dates, wc),
        "quotes": quotes,
        "attributions": attributions,
        "links_external": row.get("links_external", 0),
        "links_internal": row.get("links_internal", 0),
        "images": row.get("images", 0),
        "videos": row.get("videos", 0),
        "title_words": len(title.split()),
        "title_chars": len(title),
        "title_type": headline_type(title),
        "lead_words": len(lead.split()),
        "lead_type": lead_type(lead),
        "headings": len(headings),
        "headings_per_1000": ts.per_1000(len(headings), wc),
        "structure": structure_type(row, paragraphs, headings),
        # --- этап 3.5
        "genre": genre(row, text, headings),
        "named_sources": named,
        "named_sources_per_1000": ts.per_1000(named, wc),
        "anonymous_sources": anon,
        "primary_doc_links": prim_links,
        "verifiable": bool(prim_links > 0),
        "opinion_marked": bool(
            OPINION_RE.search((row.get("section") or "") + " " + " ".join(row.get("tags") or []))
        ),
        "evaluative_in_news": len(EVALUATIVE_RE.findall(text)),
        # Два разных сигнала, которые нельзя складывать.
        # update_mark — редакция сама пометила правку в тексте.
        # modified_meta — CMS проставила og:updated_time. У Gazeta.uz, Spot.uz,
        # Daryo.uz и Repost.uz этот метатег стоит почти на каждом материале
        # (иногда с временем раньше публикации), то есть отражает
        # перегенерацию страницы, а не редакционное обновление.
        "update_mark": bool(row.get("has_update_mark")),
        "modified_meta": bool(row.get("modified_at")),
        "modified_gap_hours": None,
    }
    if row.get("modified_at") and row.get("published_at"):
        try:
            gap = (
                dateparser.parse(row["modified_at"]) - dateparser.parse(row["published_at"])
            ).total_seconds() / 3600
            out["modified_gap_hours"] = round(gap, 2)
        except (ValueError, TypeError):
            pass
    out["primacy"] = primacy(row, text, named, prim_links)
    out["fact_opinion_mixed"] = bool(
        out["evaluative_in_news"] > 0 and not out["opinion_marked"] and out["genre"] in
        {"новость", "расширенная новость"}
    )
    return out


def main() -> int:
    cfg = load_config()
    ids = [c["id"] for c in cfg["competitors"]] + ["leap"]
    rows = []
    for cid in ids:
        for row in read_jsonl(DATA_CLEAN / cid / "articles.jsonl"):
            rows.append(compute_row(row))
    if not rows:
        print("нет данных: сначала parse_articles.py и parse_ours.py")
        return 1

    df = pd.DataFrame(rows)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUTPUT / "articles-metrics.csv", index=False)

    agg = df.groupby("outlet").agg(
        материалов=("url", "count"),
        слов_медиана=("words", "median"),
        слов_среднее=("words", "mean"),
        предложение_слов=("sent_len_mean", "median"),
        длинных_предложений=("long_sentence_share", "median"),
        абзац_предложений=("par_len_sentences_mean", "median"),
        flesch_ru=("flesch_ru", "median"),
        fkgl_ru=("fkgl_ru", "median"),
        пассив_1000=("passive_per_1000", "median"),
        канцелярит_1000=("bureaucratic_per_1000", "median"),
        номинализации_1000=("nominalization_per_1000", "median"),
        цифры_1000=("numbers_per_1000", "median"),
        цитат=("quotes", "median"),
        атрибуций=("attributions", "median"),
        ссылок_наружу=("links_external", "median"),
        ссылок_внутрь=("links_internal", "median"),
        картинок=("images", "median"),
        заголовок_слов=("title_words", "median"),
        лид_слов=("lead_words", "median"),
        подзаголовков_1000=("headings_per_1000", "median"),
        named_sources_1000=("named_sources_per_1000", "median"),
        проверяемых_доля=("verifiable", "mean"),
        помечено_обновление=("update_mark", "mean"),
        метка_CMS_modified=("modified_meta", "mean"),
    ).round(2)
    agg.to_csv(OUTPUT / "summary-by-outlet.csv")

    for col in ["genre", "primacy", "title_type", "lead_type", "structure"]:
        share = pd.crosstab(df["outlet"], df[col], normalize="index").round(3)
        share.to_csv(OUTPUT / f"share-{col}.csv")

    print(agg.to_string())
    print(f"\nвсего материалов: {len(df)}")
    print(json.dumps(df.groupby("outlet")["url"].count().to_dict(), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
