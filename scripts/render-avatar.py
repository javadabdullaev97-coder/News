#!/usr/bin/env python3
"""Аватарки 1080×1080 для профилей Instagram и Facebook.

ЗАЧЕМ СКРИПТОМ, А НЕ КАРТИНКОЙ. Знак живёт в components/brand/Logos.tsx как
SVG-геометрия. Если аватар нарисовать руками и положить рядом, он молча
разойдётся с сайтом при первой же правке логотипа. Здесь та же геометрия
в одном месте с пометкой, откуда она взята, — расхождение хотя бы заметно.

Instagram обрезает аватар в круг, поэтому знак сжат к центру: содержимое
укладывается в окружность, вписанную в квадрат, и углы не задеваются.

    python3 scripts/render-avatar.py --out public/brand
"""

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

SIZE = 1080
BRAND = (255, 77, 46)  # #FF4D2E, тот же, что в tailwind.config.ts
WHITE = (255, 255, 255)

FONT_PATH = Path(__file__).resolve().parent.parent / "assets" / "fonts" / "Manrope[wght].ttf"

# Геометрия из IconChevron (components/brand/Logos.tsx): viewBox 64×64,
# два шеврона M 14 18 L 28 32 L 14 46 со сдвигом, толщина обводки 8.
# Здесь шевроны дополнительно центрированы по холсту: в иконке сайта они
# смещены влево, потому что стоят рядом со словом LEAP, а в аватаре слова нет.
VIEWBOX = 64
STROKE = 8
CHEVRON_OFFSETS = (1, 17)


def chevron_avatar():
    k = SIZE / VIEWBOX
    img = Image.new("RGB", (SIZE, SIZE), BRAND)
    dr = ImageDraw.Draw(img)
    width = int(STROKE * k)
    radius = width // 2
    for dx in CHEVRON_OFFSETS:
        pts = [
            (int((14 + dx) * k), int(18 * k)),
            (int((28 + dx) * k), int(32 * k)),
            (int((14 + dx) * k), int(46 * k)),
        ]
        for a, b in zip(pts, pts[1:]):
            dr.line([a, b], fill=WHITE, width=width)
        # Pillow не умеет круглые концы у line(), поэтому вершины и концы
        # закругляются кружками — иначе стыки выходят рублеными.
        for x, y in pts:
            dr.ellipse([x - radius, y - radius, x + radius, y + radius], fill=WHITE)
    return img


def wordmark_avatar():
    img = Image.new("RGB", (SIZE, SIZE), BRAND)
    dr = ImageDraw.Draw(img)
    font = ImageFont.truetype(str(FONT_PATH), 300)
    try:
        font.set_variation_by_name("ExtraBold")
    except Exception:
        pass
    text = "LEAP"
    box = dr.textbbox((0, 0), text, font=font)
    dr.text(
        ((SIZE - (box[2] - box[0])) // 2 - box[0], (SIZE - (box[3] - box[1])) // 2 - box[1]),
        text,
        font=font,
        fill=WHITE,
    )
    return img


def main():
    ap = argparse.ArgumentParser(description="Аватарки для профилей соцсетей")
    ap.add_argument("--out", default="public/brand", help="каталог назначения")
    args = ap.parse_args()

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    for name, img in (("avatar-chevron", chevron_avatar()), ("avatar-wordmark", wordmark_avatar())):
        path = out / f"{name}.jpg"
        img.save(path, "JPEG", quality=95, optimize=True)
        print(f"{path} — {path.stat().st_size} байт")


if __name__ == "__main__":
    main()
