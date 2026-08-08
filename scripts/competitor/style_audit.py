"""Аудит по нормативам академического обзора журналистской стилистики.

Обзор (docs/journalism-style-review-2026.md) задаёт конкретные проверяемые
нормы: длина лида, длина заголовка под выдачу, нейтральность глаголов
атрибуции, запрет цепочек родительного падежа и расщеплённых сказуемых,
типовые ошибки лида, структура концовки по жанрам. Здесь эти нормы
превращены в метрики и посчитаны на том же корпусе, что и остальной отчёт:
восемь конкурентов и мы.

Смысл ровно в том, чтобы не пересказывать теорию, а увидеть, где мы
нарушаем норму чаще рынка, а где рынок нарушает её чаще нас.

Запуск: .venv-competitor/bin/python scripts/competitor/style_audit.py
Результат: output/style-audit.csv, output/style-audit-by-outlet.csv
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))

import textstats as ts  # noqa: E402
from common import DATA_CLEAN, OUTPUT, load_config, read_jsonl  # noqa: E402

# ── глаголы атрибуции ───────────────────────────────────────────────────
# Обзор, §«Русская новостная стилистика»: глаголы варьируются, но требуют
# строгой смысловой нейтральности. Англоязычный стандарт — 90% нейтрального
# said. Делим наши глаголы на три группы по тому, что они добавляют к факту.
ATTRIB_NEUTRAL = re.compile(
    r"\b(сообщ(?:ил|ила|или|ает|ают)|заяв(?:ил|ила|или|ляет)|сказал\w*|"
    r"говорится|указа(?:л|ла|ли|но)|передаёт|передает|опубликовал\w*|"
    r"объявил\w*|представил\w*)\b", re.I)
ATTRIB_EMPHATIC = re.compile(
    r"\b(подчеркнул\w*|отмет(?:ил|ила|или)\w*|акцентировал\w*|напомнил\w*|"
    r"обратил внимание|особо отмет\w+)\b", re.I)
ATTRIB_LOADED = re.compile(
    r"\b(призна(?:л|ла|ли)\w*|вынужден\w* был\w* призна|заверил\w*|"
    r"пообещал\w*|утвержда(?:ет|ют)|настаива(?:ет|ют)|оправдыва\w+)\b", re.I)

# ── ошибки лида из обзора ───────────────────────────────────────────────
QUOTE_LEAD = re.compile(r'^\s*[«"„]')
QUESTION_LEAD = re.compile(r"\?\s*$")
CLERKY_LEAD = re.compile(
    r"^\s*(вчера|сегодня|накануне)?\s*(состоял(?:ось|ась|ся)|прошл[оа]|"
    r"было проведено|проведено|организовано|в рамках|в целях|"
    r"в соответствии с|во исполнение)\b", re.I)

# ── синтаксические болезни, названные в обзоре ──────────────────────────
# Цепочка родительного падежа: три и более подряд идущих существительных
# в родительном («процесс повышения эффективности работы органов»).
GENITIVE_CHAIN = re.compile(
    r"\b\w+(?:ния|ния|ции|сти|ства|ения|ания|ости|ений|аний|ов|ей|ий)\s+"
    r"\w+(?:ния|ции|сти|ства|ения|ания|ости|ений|аний|ов|ей|ий)\s+"
    r"\w+(?:ния|ции|сти|ства|ения|ания|ости|ений|аний|ов|ей|ий)\b", re.I)
# Расщеплённое сказуемое: «осуществил проверку» вместо «проверил».
#
# Список закрытый, а не порождающий. Порождающий шаблон «глагол + слово на -ю»
# ловил прилагательные («проведём разъяснительную», «осуществлять авторский»)
# и давал завышенную цифру. Здесь перечислены обороты, у которых есть точный
# однословный заменитель, — именно их и требует убирать обзор.
SPLIT_PREDICATES = [
    (r"осуществ\w+\s+проверк", "проверить"),
    (r"провод\w+\s+проверк|провест\w*\s+проверк|провед\w+\s+проверк", "проверить"),
    (r"осуществ\w+\s+контрол", "контролировать"),
    (r"произв\w+\s+оплат|осуществ\w+\s+оплат", "оплатить"),
    (r"произв\w+\s+отчислени", "отчислять"),
    (r"провед\w+\s+демонтаж|осуществ\w+\s+демонтаж", "демонтировать"),
    (r"оказ\w+\s+помощ|оказ\w+\s+содействи|оказ\w+\s+поддержк", "помочь / поддержать"),
    (r"дал\w*\s+оценк|дат[ьи]\s+оценк", "оценить"),
    (r"принял\w*\s+участие|принима\w+\s+участие|принят[ьи]\s+участие", "участвовать"),
    (r"внёс\w*\s+изменени|внест[ьи]\s+изменени|вносит\s+изменени", "изменить"),
    (r"осуществ\w+\s+строительств|вест[иь]\s+строительств", "строить"),
    (r"произв\w+\s+задержани|осуществ\w+\s+задержани", "задержать"),
    (r"осуществ\w+\s+реализаци|провод\w+\s+реализаци", "реализовать / продавать"),
    (r"провед\w+\s+обсуждени|провод\w+\s+обсуждени", "обсудить"),
    (r"осуществ\w+\s+финансировани", "финансировать"),
    (r"провед\w+\s+инвентаризаци|провод\w+\s+инвентаризаци", "инвентаризировать"),
]
SPLIT_PREDICATE = re.compile("|".join(f"(?:{p})" for p, _ in SPLIT_PREDICATES), re.I)

# ── концовка (kicker) ───────────────────────────────────────────────────
# Обзор, матрица жанров: у каждого формата своя функция концовки.
KICKER_WHATNEXT = re.compile(r"^(что дальше|что будет дальше|дальнейшие шаги|следующий шаг)", re.I)
KICKER_CONTEXT = re.compile(r"^(контекст|предыстория|справка|как было раньше|напомним)", re.I)
KICKER_CHECKLIST = re.compile(r"^(что делать|как оформить|как получить|памятка|коротко)", re.I)


def analyse(row: dict) -> dict:
    text = row.get("text") or ""
    title = row.get("title") or ""
    paragraphs = row.get("paragraphs") or []
    headings = row.get("headings") or []
    lead = paragraphs[0] if paragraphs else ""
    lead_sentences = ts.sentences(lead)
    words_total = row.get("word_count") or len(text.split())

    neutral = len(ATTRIB_NEUTRAL.findall(text))
    emphatic = len(ATTRIB_EMPHATIC.findall(text))
    loaded = len(ATTRIB_LOADED.findall(text))
    attrib_total = neutral + emphatic + loaded

    syll = [ts.syllables(w) for w in ts.words(text)]

    return {
        "outlet": row["outlet"],
        "url": row["url"],
        "published_at": row["published_at"],
        # заголовок: норматив выдачи 50-60 знаков, наша редполитика 60-90
        "title_chars": len(title),
        "title_le_60": len(title) <= 60,
        "title_60_90": 60 < len(title) <= 90,
        "title_gt_90": len(title) > 90,
        # лид: обзор — 20-35 слов либо не больше 200-250 знаков
        "lead_chars": len(lead),
        "lead_words": len(lead.split()),
        "lead_words_in_norm": 20 <= len(lead.split()) <= 35,
        "lead_chars_in_norm": len(lead) <= 250,
        "lead_sentences": len(lead_sentences),
        "lead_one_sentence": len(lead_sentences) <= 1,
        # четыре ошибки лида из обзора
        "err_quote_lead": bool(QUOTE_LEAD.search(lead)),
        "err_question_lead": bool(QUESTION_LEAD.search(lead)),
        "err_clerky_lead": bool(CLERKY_LEAD.search(lead)),
        "err_clutter_lead": len(lead.split()) > 40,
        # атрибуция
        "attrib_total": attrib_total,
        "attrib_neutral_share": round(neutral / attrib_total, 3) if attrib_total else None,
        "attrib_emphatic": emphatic,
        "attrib_loaded": loaded,
        "has_emphatic": emphatic > 0,
        "has_loaded": loaded > 0,
        # синтаксис
        "genitive_chains": len(GENITIVE_CHAIN.findall(text)),
        "split_predicates": len(SPLIT_PREDICATE.findall(text)),
        "has_genitive_chain": bool(GENITIVE_CHAIN.search(text)),
        "has_split_predicate": bool(SPLIT_PREDICATE.search(text)),
        "genitive_chains_per_1000": ts.per_1000(len(GENITIVE_CHAIN.findall(text)), words_total),
        "split_predicates_per_1000": ts.per_1000(len(SPLIT_PREDICATE.findall(text)), words_total),
        # читаемость: обзор даёт норму 2,3-2,4 слога на слово для русского
        "syllables_per_word": round(sum(syll) / len(syll), 2) if syll else None,
        "syll_in_norm": bool(syll) and 2.3 <= (sum(syll) / len(syll)) <= 2.4,
        # концовка
        "kicker_whatnext": any(KICKER_WHATNEXT.search(h) for h in headings),
        "kicker_context": any(KICKER_CONTEXT.search(h) for h in headings),
        "kicker_checklist": any(KICKER_CHECKLIST.search(h) for h in headings),
        "has_any_kicker": any(
            p.search(h) for h in headings
            for p in (KICKER_WHATNEXT, KICKER_CONTEXT, KICKER_CHECKLIST)
        ),
    }


def main() -> int:
    cfg = load_config()
    ids = [c["id"] for c in cfg["competitors"]] + ["leap"]
    rows = []
    for cid in ids:
        for row in read_jsonl(DATA_CLEAN / cid / "articles.jsonl"):
            rows.append(analyse(row))
    if not rows:
        print("нет корпуса: сначала parse_articles.py и parse_ours.py")
        return 1

    df = pd.DataFrame(rows)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUTPUT / "style-audit.csv", index=False)

    agg = df.groupby("outlet").agg(
        материалов=("url", "count"),
        заголовок_знаков=("title_chars", "median"),
        заголовок_до_60=("title_le_60", "mean"),
        заголовок_свыше_90=("title_gt_90", "mean"),
        лид_слов=("lead_words", "median"),
        лид_знаков=("lead_chars", "median"),
        лид_в_норме_слов=("lead_words_in_norm", "mean"),
        лид_одно_предложение=("lead_one_sentence", "mean"),
        ошибка_цитата=("err_quote_lead", "mean"),
        ошибка_вопрос=("err_question_lead", "mean"),
        ошибка_протокол=("err_clerky_lead", "mean"),
        ошибка_перегруз=("err_clutter_lead", "mean"),
        атрибуций=("attrib_total", "median"),
        нейтральных_доля=("attrib_neutral_share", "mean"),
        с_усилительными=("has_emphatic", "mean"),
        с_оценочными=("has_loaded", "mean"),
        с_родит_цепочкой=("has_genitive_chain", "mean"),
        с_расщепл_сказуемым=("has_split_predicate", "mean"),
        слогов_на_слово=("syllables_per_word", "median"),
        есть_концовка=("has_any_kicker", "mean"),
    ).round(3)
    agg.to_csv(OUTPUT / "style-audit-by-outlet.csv")

    pd.set_option("display.width", 250)
    print(agg.to_string())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
