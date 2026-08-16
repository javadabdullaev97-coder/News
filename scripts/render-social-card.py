#!/usr/bin/env python3
"""Карточка 1080×1350 для ленты Instagram и Facebook.

ЗАЧЕМ ОТДЕЛЬНЫЙ КАДР. Статейная картинка — 1600×900 (1.78:1). Instagram её
примет (лимит 1.91:1), но в вертикальной ленте она занимает примерно вдвое
меньше экрана, чем кадр 4:5. Соотношение 4:5 — максимальная разрешённая
высота, то есть максимум площади под один пост.

ПОЧЕМУ НЕ ФОТО НА ВЕСЬ КАДР С ТЕКСТОМ ПОВЕРХ. Чтобы залить 1080×1350 (0.8:1)
исходником 1.78:1, пришлось бы срезать 55% ширины — это не кадрирование,
а другой снимок. Поэтому кадр разделён: фото сверху, заголовок на плашке
снизу. Обрезка фото при этом укладывается в те же 22%, что и в
prepare-image.py.

НОЛЬ ТОКЕНОВ. Заголовок берётся из frontmatter как есть, рубрика — по словарю
из config/instagram.json. Модель в рендере не участвует: это Pillow и данные,
уже произведённые редакцией.

Использование:

    python3 scripts/render-social-card.py \\
        --source public/images/posts/2026-08/<slug>.jpg \\
        --title "Заголовок статьи" \\
        --kicker "ЭКОНОМИКА" \\
        --out public/images/social/2026-08/<slug>.jpg

Печатает JSON с итогом: режим кадрирования, сколько срезано, размер шрифта
заголовка, вес файла.
"""

import argparse
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

# ─── Геометрия кадра ───
#
# Полотно 1080×1350 — 4:5, максимум площади в ленте Instagram.
CARD_W, CARD_H = 1080, 1350

# Фото занимает верхние 760 px (1080×760 ≈ 1.42:1). Высота подобрана так,
# чтобы обрезка исходника 1.78:1 по ширине укладывалась в 22% — тот же
# потолок, что в prepare-image.py. Ниже 720 обрезка выходит за него.
PHOTO_H = 760

# Брендовая полоса между фото и текстом.
RULE_H = 6

PAD = 72  # поля текстовой зоны
TEXT_W = CARD_W - PAD * 2

# ─── Цвета ───
BRAND = (255, 77, 46)  # #FF4D2E, тот же, что в tailwind.config.ts
PANEL = (17, 19, 24)  # почти чёрный, читается в обеих темах ленты
TEXT = (255, 255, 255)
MUTED = (138, 143, 152)

FONT_PATH = Path(__file__).resolve().parent.parent / "assets" / "fonts" / "Manrope[wght].ttf"

# Максимальная доля исходника, которую разрешено срезать по любой оси.
# Больше — переходим в contain на размытую подложку. Правило и порог
# повторяют prepare-image.py: карточка не должна резать иначе, чем статья.
MAX_CROP = 0.22

# Апскейл ограничен: растянутый мелкий исходник в ленте виден сразу.
# Небольшой запас оставлен, потому что 1600×900 после кадрирования даёт
# 1280 px ширины при нужных 1080 — то есть работает на уменьшение.
MAX_UPSCALE = 1.15


def load_font(size, weight="Bold"):
    """Manrope нужного начертания.

    Файл вариативный: одно начертание на диске, вес выставляется осью wght.
    Если сборка Pillow собрана без поддержки вариаций, шрифт всё равно
    отрисуется — просто в начертании по умолчанию. Это хуже на вид, но
    карточка выходит, а не падает весь выпуск.
    """
    font = ImageFont.truetype(str(FONT_PATH), size)
    try:
        font.set_variation_by_name(weight)
    except Exception:
        pass
    return font


def fit_photo(src_path):
    """Кадрирует фото под 1080×760.

    Возвращает (изображение, отчёт). Режим cover — обычный кадр с обрезкой,
    contain — исходник вписан целиком на размытую подложку из самого себя.
    """
    im = Image.open(src_path)
    if im.mode != "RGB":
        im = im.convert("RGB")
    sw, sh = im.size
    target_ratio = CARD_W / PHOTO_H
    src_ratio = sw / sh

    # Сколько срежется, если заполнять кадр целиком.
    if src_ratio > target_ratio:
        crop_share = 1 - (target_ratio / src_ratio)  # режем по ширине
        axis = "width"
    else:
        crop_share = 1 - (src_ratio / target_ratio)  # режем по высоте
        axis = "height"

    # Масштаб, необходимый для режима cover.
    scale = max(CARD_W / sw, PHOTO_H / sh)

    if crop_share <= MAX_CROP and scale <= MAX_UPSCALE:
        new = (max(CARD_W, round(sw * scale)), max(PHOTO_H, round(sh * scale)))
        resized = im.resize(new, Image.LANCZOS)
        left = (new[0] - CARD_W) // 2
        # Кадрируем от верхней трети, а не от центра: на новостном фото
        # значимое (лицо, вывеска, трибуна) почти всегда выше геометрического
        # центра, и симметричная обрезка срезает именно его.
        top = min(max((new[1] - PHOTO_H) // 3, 0), new[1] - PHOTO_H)
        photo = resized.crop((left, top, left + CARD_W, top + PHOTO_H))
        return photo, {
            "mode": "cover",
            "scale": round(scale, 3),
            "cropped": round(crop_share, 3),
            "cropAxis": axis,
        }

    # contain: вписываем целиком, фон — размытая растянутая копия.
    backdrop = im.resize((CARD_W, PHOTO_H), Image.LANCZOS).filter(
        ImageFilter.GaussianBlur(40)
    )
    fit = min(CARD_W / sw, PHOTO_H / sh, MAX_UPSCALE)
    inner = im.resize((round(sw * fit), round(sh * fit)), Image.LANCZOS)
    backdrop.paste(inner, ((CARD_W - inner.width) // 2, (PHOTO_H - inner.height) // 2))
    return backdrop, {
        "mode": "contain",
        "scale": round(fit, 3),
        "cropped": 0.0,
        "cropAxis": axis,
        "reason": "crop-limit" if crop_share > MAX_CROP else "upscale-limit",
    }


def wrap(draw, text, font, max_width):
    """Переносит текст по словам под ширину max_width."""
    words = text.split()
    lines, cur = [], ""
    for w in words:
        probe = f"{cur} {w}".strip()
        if draw.textlength(probe, font=font) <= max_width or not cur:
            cur = probe
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def fit_headline(draw, title, max_width, max_height, max_lines=5):
    """Подбирает наибольший кегль, при котором заголовок влезает в зону.

    Перебор идёт сверху вниз: крупный заголовок в ленте важнее, чем
    единообразие кегля между постами. Если не влез даже минимальный —
    обрезаем по последней строке многоточием, а не выкидываем карточку.
    """
    for size in (68, 62, 56, 50, 46, 42, 38):
        font = load_font(size, "ExtraBold")
        leading = round(size * 1.18)
        lines = wrap(draw, title, font, max_width)
        if len(lines) <= max_lines and len(lines) * leading <= max_height:
            return font, lines, leading, size

    font = load_font(38, "ExtraBold")
    leading = round(38 * 1.18)
    lines = wrap(draw, title, font, max_width)[:max_lines]
    if lines:
        last = lines[-1]
        while last and draw.textlength(last + "…", font=font) > max_width:
            last = last.rsplit(" ", 1)[0] if " " in last else last[:-1]
        lines[-1] = last + "…"
    return font, lines, leading, 38


def render(source, title, kicker, out_path, footer="leap.uz"):
    card = Image.new("RGB", (CARD_W, CARD_H), PANEL)
    photo, photo_report = fit_photo(source)
    card.paste(photo, (0, 0))

    draw = ImageDraw.Draw(card)
    draw.rectangle([0, PHOTO_H, CARD_W, PHOTO_H + RULE_H], fill=BRAND)

    zone_top = PHOTO_H + RULE_H
    y = zone_top + 44

    if kicker:
        kf = load_font(28, "Bold")
        draw.text((PAD, y), kicker.upper(), font=kf, fill=BRAND)
        y += 28 + 26

    # Подвал прижат к низу, заголовок занимает всё, что осталось между ним
    # и рубрикой.
    footer_font = load_font(30, "Bold")
    footer_y = CARD_H - PAD - 30
    headline_zone = footer_y - y - 32

    font, lines, leading, size = fit_headline(draw, title, TEXT_W, headline_zone)
    for line in lines:
        draw.text((PAD, y), line, font=font, fill=TEXT)
        y += leading

    draw.text((PAD, footer_y), footer, font=footer_font, fill=MUTED)

    out = Path(out_path)
    out.parent.mkdir(parents=True, exist_ok=True)

    # Instagram принимает только JPEG. Качество подбирается вниз, пока файл
    # не уложится в 8 МБ — практический потолок, при котором контейнер
    # создаётся без нареканий.
    quality = 90
    while True:
        card.save(out, "JPEG", quality=quality, optimize=True, progressive=True)
        if out.stat().st_size <= 8 * 1024 * 1024 or quality <= 60:
            break
        quality -= 10

    return {
        "status": "ok",
        "out": str(out),
        "size": [CARD_W, CARD_H],
        "photo": photo_report,
        "headlineSize": size,
        "headlineLines": len(lines),
        "quality": quality,
        "bytes": out.stat().st_size,
    }


def main():
    ap = argparse.ArgumentParser(description="Карточка 1080×1350 для Instagram и Facebook")
    ap.add_argument("--source", required=True, help="исходная картинка статьи")
    ap.add_argument("--title", required=True, help="заголовок из frontmatter")
    ap.add_argument("--kicker", default="", help="рубрика, выводится капсом")
    ap.add_argument("--footer", default="leap.uz")
    ap.add_argument("--out", required=True, help="куда положить карточку")
    args = ap.parse_args()

    src = Path(args.source)
    if not src.exists():
        print(json.dumps({"status": "no-source", "source": str(src)}, ensure_ascii=False))
        return 2

    try:
        report = render(src, args.title.strip(), args.kicker.strip(), args.out, args.footer)
    except Exception as err:  # noqa: BLE001 — отчёт важнее трассировки
        print(json.dumps({"status": "error", "error": str(err)}, ensure_ascii=False))
        return 1

    print(json.dumps(report, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
