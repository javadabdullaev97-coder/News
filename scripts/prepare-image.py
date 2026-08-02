#!/usr/bin/env python3
"""Готовит главную картинку статьи из исходника: приводит к кадру статьи,
никогда не растягивая оригинал.

Зачем отдельный скрипт. Раньше бильд-редактор каждый раз собирал команду
руками, и правило было одно на все случаи: `-resize '1200x630^' -extent 1200x630`,
то есть «залить кадр и обрезать по центру». На широком исходнике это работало,
а на всём остальном ломалось:

  * квадратная карточка госканала 800×800 растягивалась до 1200×1200 и теряла
    47% высоты — у карточки срезало и заголовок, и подпись;
  * Telegram отдаёт публично максимум 800px по длинной стороне (проверено:
    `t.me/<slug>/<id>?embed=1` даёт ровно 800, второй вариант в HTML — аватар
    канала 160×160), поэтому апскейл получала почти каждая картинка из ТГ;
  * итоговые 1200×630 не совпадали с og:image, объявленным в
    app/article/[slug]/page.tsx как 1600×900.

Политика этого скрипта:

  1. Кадр заливается целиком (cover). Это главное правило: картинка в посте
     должна быть цельной, без полей и без размытых боковин.
  2. Кадр — 1600×900 (совпадает с объявленным og:image).
  3. Ради заливки допускается умеренный апскейл — до MAX_UPSCALE. Прежняя
     версия запрещала апскейл вовсе, и любой исходник меньше 1600×900 по
     ширине уезжал в contain: в канале это выглядело как марка по центру
     с размытой кашей по краям. Растянуть официальную карточку 950×534
     до кадра в 1.7× визуально дешевле, чем обрамить её блюром.
  4. Размытая подложка (contain) остаётся ТОЛЬКО для вертикальных исходников
     (см. PORTRAIT_AR) — телефонная съёмка портретом, которую иначе пришлось
     бы резать наполовину. Это редкий случай и единственный законный.
     Подложка берётся из самого изображения (усреднённый цвет рамки), а не
     из бренд-цвета: фирменный #FF4D2E рядом с фотографией читается как
     ошибка вёрстки, а нейтральная подложка из кадра — как поле.
  5. Если исходник меньше MIN_SOURCE по длинной стороне — это не картинка
     для главной. Скрипт выходит с кодом 2, чтобы бильд пошёл искать другую.

Использование:
    python3 scripts/prepare-image.py <исходник> <slug> [--month YYYY-MM]
    python3 scripts/prepare-image.py /tmp/original.jpg codd-akkurgan-parkent-closure

Печатает JSON с тем, что реально произошло, — бильд копирует это в свои notes.
"""

import json
import os
import sys
from pathlib import Path

try:
    from PIL import Image, ImageFilter, ImageStat
except ImportError:
    print(json.dumps({"error": "Pillow не установлен: pip install Pillow"}), file=sys.stderr)
    sys.exit(1)

# Кадр статьи. Совпадает с og:image в app/article/[slug]/page.tsx.
TARGET_W, TARGET_H = 1600, 900

# Ниже этого по длинной стороне картинка не годится в главную: на ретине
# она будет мылом при любой обработке.
MIN_SOURCE = 600

# Сколько исходника допустимо срезать при cover у НЕвертикального исходника.
# Поднято с 0.22 до 0.45: на 0.22 не проходил ни обычный кадр 4:3 (теряет 25%
# по высоте), ни квадрат (44%) — оба уезжали в блюр. Срезанные сверху и снизу
# поля читатель не замечает, а размытые поля по бокам — замечает сразу.
# Выше 0.45 остаются только панорамы, где кроп до 16:9 действительно теряет
# сюжет, — там подложка честнее.
MAX_CROP = 0.45

# Во сколько максимум допустимо растянуть исходник ради заливки кадра.
# 2.5 покрывает всё, что проходит MIN_SOURCE=600 по длинной стороне при
# разумных пропорциях. Выше — уже мыло, там честнее подложка.
MAX_UPSCALE = 2.5

# Ниже этого отношения ширины к высоте исходник считаем вертикальным
# (телефонная съёмка портретом). Только для таких разрешена подложка:
# заливка кадра 16:9 вертикальным снимком срезала бы больше половины кадра.
PORTRAIT_AR = 0.95

# Бюджет веса. Прежние 200 КБ заставляли ронять quality до 72 и ниже;
# 420 КБ на кадр 1600×900 — это всё ещё быстрая загрузка, но без каши
# на градиентах и мелком тексте инфографики.
MAX_BYTES = 420_000
QUALITY_LADDER = [90, 86, 82, 78, 74, 70]


def edge_color(im):
    """Усреднённый цвет рамки изображения — для подложки при contain."""
    w, h = im.size
    band = max(2, min(w, h) // 40)
    edges = [
        im.crop((0, 0, w, band)),
        im.crop((0, h - band, w, h)),
        im.crop((0, 0, band, h)),
        im.crop((w - band, 0, w, h)),
    ]
    acc = [0, 0, 0]
    for e in edges:
        st = ImageStat.Stat(e.convert("RGB"))
        for i in range(3):
            acc[i] += st.mean[i]
    return tuple(int(c / len(edges)) for c in acc)


def blurred_backdrop(im, size):
    """Подложка из самого кадра: растянуть, размыть, притушить.

    Используется, когда исходник заметно у́же или ниже кадра. Читается как
    осознанный приём, а не как дыра в вёрстке, и не тащит в макет чужой цвет.
    """
    tw, th = size
    src = im.convert("RGB")
    scale = max(tw / src.width, th / src.height)
    bw, bh = max(1, int(src.width * scale)), max(1, int(src.height * scale))
    back = src.resize((bw, bh), Image.LANCZOS)
    left, top = (bw - tw) // 2, (bh - th) // 2
    back = back.crop((left, top, left + tw, top + th))
    back = back.filter(ImageFilter.GaussianBlur(radius=max(12, tw // 60)))
    # притушить, чтобы основной кадр читался поверх
    return Image.blend(back, Image.new("RGB", (tw, th), edge_color(src)), 0.45)


def smart_crop_offset(im, target_w, target_h):
    """Выбирает окно кропа по содержимому кадра, а не по центру.

    Центральный кроп ломается ровно там, где смысловой центр не совпадает
    с геометрическим. Живой пример: фотография коровы с биркой в ухе —
    голова занимает верхние две трети кадра, центр приходится на шею, и
    обрезка по центру срезает морду. Формально всё правильно, смотреть
    невозможно.

    Как считаем. Строим карту градиентов яркости и сворачиваем её в одномерный
    профиль вдоль оси обрезки: где деталей много — там предмет съёмки (морда,
    лицо, текст на схеме), где мало — фон: небо, трава, размытие. Дальше берём
    **центр масс** этого профиля и ставим окно серединой на него.

    Важно, что именно центр масс, а не максимум. Первая версия двигала окно и
    выбирала положение с наибольшей суммарной энергией — и на тестовом кадре
    уехала в самый верх, к фактурным ушам, обрезав низ головы. Максимум тянет
    окно к самой контрастной полосе, а центр масс ставит его посередине
    объекта целиком. Для кадра с животным это разница между «голова целиком»
    и «голова без морды».
    """
    w, h = im.size
    horizontal = w > target_w
    span = (w - target_w) if horizontal else (h - target_h)
    if span <= 0:
        return max(0, (w - target_w) // 2), max(0, (h - target_h) // 2)

    # Карта градиентов на уменьшенной копии — по полному кадру считать незачем.
    SCALE_TO = 320
    k = min(1.0, SCALE_TO / max(w, h))
    sw, sh = max(2, int(w * k)), max(2, int(h * k))
    edges = im.convert("L").resize((sw, sh), Image.BILINEAR).filter(ImageFilter.FIND_EDGES)
    px = edges.load()

    # Одномерный профиль энергии вдоль оси обрезки.
    n = sw if horizontal else sh
    profile = [0.0] * n
    for i in range(n):
        s = 0
        if horizontal:
            for y in range(sh):
                s += px[i, y]
        else:
            for x in range(sw):
                s += px[x, i]
        profile[i] = float(s)

    # Слабые значения — это фон; вычитаем медиану, чтобы он не тянул центр масс
    # к геометрической середине кадра.
    ordered = sorted(profile)
    base = ordered[len(ordered) // 2]
    weights = [max(0.0, v - base) for v in profile]
    total = sum(weights)
    if total <= 0:
        return ((span // 2, (h - target_h) // 2) if horizontal
                else ((w - target_w) // 2, span // 2))

    com_small = sum(i * wt for i, wt in enumerate(weights)) / total
    com_full = com_small / k                       # обратно в координаты кадра
    window = target_w if horizontal else target_h
    off = int(round(com_full - window / 2))
    off = max(0, min(span, off))                   # не вылезать за пределы

    return (off, (h - target_h) // 2) if horizontal else ((w - target_w) // 2, off)


def prepare(src_path, slug, month=None, out_root="public/images/posts"):
    im = Image.open(src_path)
    if im.mode not in ("RGB", "L"):
        im = im.convert("RGB")
    elif im.mode == "L":
        im = im.convert("RGB")

    ow, oh = im.size
    report = {"source": {"width": ow, "height": oh, "path": str(src_path)}}

    if max(ow, oh) < MIN_SOURCE:
        report["status"] = "too-small"
        report["reason"] = (
            f"исходник {ow}×{oh}, длинная сторона меньше {MIN_SOURCE}px — "
            "в главную не годится, нужен другой источник"
        )
        return report, None, None

    src_ar = ow / oh
    tgt_ar = TARGET_W / TARGET_H

    # Во сколько нужно масштабировать, чтобы залить кадр целиком (cover).
    cover_scale = max(TARGET_W / ow, TARGET_H / oh)
    # ...и чтобы вписать целиком (contain).
    contain_scale = min(TARGET_W / ow, TARGET_H / oh)

    # Доля, которая срезалась бы при cover без апскейла.
    if src_ar > tgt_ar:
        crop_loss = 1 - (tgt_ar / src_ar)  # режем по ширине
        crop_axis = "ширине"
    else:
        crop_loss = 1 - (src_ar / tgt_ar)  # режем по высоте
        crop_axis = "высоте"

    # Вертикальный исходник — единственный случай, где подложка законна:
    # заливка кадра 16:9 вертикальным снимком срезала бы больше половины.
    is_portrait = src_ar < PORTRAIT_AR

    can_cover = cover_scale <= MAX_UPSCALE   # заливка не требует чрезмерного растягивания
    crop_ok = crop_loss <= MAX_CROP and not is_portrait

    if can_cover and crop_ok:
        mode = "cover"
        scale = cover_scale
        nw, nh = max(1, round(ow * scale)), max(1, round(oh * scale))
        resized = im.resize((nw, nh), Image.LANCZOS)
        left, top = smart_crop_offset(resized, TARGET_W, TARGET_H)
        canvas = resized.crop((left, top, left + TARGET_W, top + TARGET_H))
        note = f"обрезано {crop_loss:.0%} по {crop_axis}; окно кропа выбрано по содержимому"
        if scale > 1.0:
            note += f"; исходник растянут в {scale:.2f}× ради заливки кадра"
        report["fit"] = {
            "mode": "cover",
            "scale": round(scale, 4),
            "cropLoss": round(crop_loss, 4),
            "offset": [left, top],
            "upscaled": scale > 1.0,
            "note": note,
        }
    else:
        mode = "contain"
        # Не растягиваем: коэффициент ограничен единицей.
        scale = min(contain_scale, 1.0)
        nw, nh = max(1, round(ow * scale)), max(1, round(oh * scale))
        resized = im.resize((nw, nh), Image.LANCZOS) if scale < 1.0 else im.copy()
        canvas = blurred_backdrop(im, (TARGET_W, TARGET_H))
        canvas.paste(resized, ((TARGET_W - nw) // 2, (TARGET_H - nh) // 2))
        why = []
        if is_portrait:
            why.append(
                f"вертикальный исходник {ow}×{oh} (соотношение {src_ar:.2f}) — "
                "заливка кадра 16:9 срезала бы большую часть снимка"
            )
        if not can_cover:
            why.append(
                f"заливка кадра потребовала бы растянуть исходник в {cover_scale:.2f}× "
                f"при допустимых {MAX_UPSCALE}×"
            )
        if not crop_ok and not is_portrait:
            why.append(f"обрезка съела бы {crop_loss:.0%} по {crop_axis}")
        report["fit"] = {
            "mode": "contain",
            "scale": round(scale, 4),
            "placed": [nw, nh],
            "note": "вписано целиком на размытую подложку из самого кадра; "
            + "; ".join(why),
        }

    month = month or "2026-08"
    out_dir = Path(out_root) / month
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{slug}-01.jpg"

    chosen_q = None
    for q in QUALITY_LADDER:
        canvas.save(out_path, "JPEG", quality=q, optimize=True, progressive=True)
        if out_path.stat().st_size <= MAX_BYTES:
            chosen_q = q
            break
    if chosen_q is None:
        chosen_q = QUALITY_LADDER[-1]

    report["output"] = {
        "path": str(out_path),
        "url": "/" + str(out_path.relative_to("public")).replace(os.sep, "/"),
        "width": TARGET_W,
        "height": TARGET_H,
        "bytes": out_path.stat().st_size,
        "quality": chosen_q,
    }
    report["status"] = "ok"
    report["upscaled"] = False
    return report, out_path, canvas


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) < 2:
        print(__doc__)
        sys.exit(1)
    month = None
    for a in sys.argv[1:]:
        if a.startswith("--month="):
            month = a.split("=", 1)[1]

    report, out_path, _ = prepare(args[0], args[1], month=month)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if report["status"] == "too-small":
        sys.exit(2)


if __name__ == "__main__":
    main()
