#!/usr/bin/env python3
"""Карточка 1080×1350 для ленты Instagram и Facebook.

ЗАЧЕМ ОТДЕЛЬНЫЙ КАДР. Статейная картинка — 1600×900 (1.78:1). Instagram её
примет (лимит 1.91:1), но в вертикальной ленте она занимает примерно вдвое
меньше экрана, чем кадр 4:5. Соотношение 4:5 — максимальная разрешённая
высота, то есть максимум площади под один пост.

КАК УСТРОЕН КАДР. Фотография занимает верх и уходит в тёмное градиентом,
заголовок лежит на затемнении. Жёсткой границы между фото и текстом нет.

Залить 1080×1350 целиком исходником 1.78:1 нельзя — срезало бы 55% ширины,
это уже другой снимок. Поэтому фотография заполняет только верх, а её
высота подбирается под каждый снимок так, чтобы обрезка укладывалась
в те же 22%, что и в prepare-image.py. Градиент делает разницу в высоте
незаметной, и лента остаётся однородной.

НОЛЬ ТОКЕНОВ. Заголовок берётся из frontmatter как есть, рубрика — по словарю
из config/social.json. Модель в рендере не участвует: это Pillow и данные,
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

# Высота фото НЕ фиксирована. Кадр «фото уходит в тёмное» тем сильнее,
# чем выше фотография, но чем она выше, тем уже кадрируется исходник:
# при 900 px из 16:9 срезается 32% ширины, а это на новостном снимке
# запросто уносит человека или вывеску за край.
#
# Поэтому высота подбирается под каждый снимок: берём максимум, при
# котором обрезка укладывается в 22% (тот же потолок, что в
# prepare-image.py), и зажимаем в разумные границы. Для обычного 16:9
# выходит около 780 px. Читатель разницы не видит — низ фотографии
# всё равно уведён в чёрное градиентом, жёсткой границы нет.
PHOTO_H_MIN, PHOTO_H_MAX = 700, 900

# Длина растушёвки: на сколько пикселей вверх от низа фотографии
# тянется уход в фон. Константа, а не доля, — иначе при разной высоте
# фото градиент читался бы по-разному.
FADE_H = 470

# Цвет, в который уходит фотография и на котором лежит текст.
GROUND = (8, 8, 10)

PAD = 72  # поля текстовой зоны
TEXT_W = CARD_W - PAD * 2

# ─── Цвета ───
BRAND = (255, 77, 46)  # #FF4D2E, тот же, что в tailwind.config.ts
TEXT = (255, 255, 255)
MUTED = (138, 143, 152)

FONT_PATH = Path(__file__).resolve().parent.parent / "assets" / "fonts" / "Manrope[wght].ttf"
MARK_PATH = Path(__file__).resolve().parent.parent / "public" / "brand" / "mark.png"

# Сколько по высоте отдано заголовку. Ограничение нужно, чтобы длинный
# заголовок не полез на середину фотографии: он тогда упирается в светлую
# часть снимка и перестаёт читаться.
HEADLINE_ZONE = 430

# Прозрачность подписи в подвале. Знак и «LEAP NEWS» не должны спорить
# с заголовком: это выходные данные, а не второй заголовок.
FOOTER_ALPHA = 0.72

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


def photo_height(src_path):
    """Максимальная высота фото, при которой обрезка укладывается в MAX_CROP.

    Обрезка по ширине = 1 - (кадр / исходник) по соотношению сторон. Чем
    ниже кадр, тем он шире по пропорции и тем меньше срезается. Отсюда
    прямая формула, без перебора.
    """
    im = Image.open(src_path)
    sw, sh = im.size
    src_ratio = sw / sh
    if src_ratio <= 1:
        # Вертикальный или квадратный исходник заполняет кадр без потерь
        # по ширине — берём максимум.
        return PHOTO_H_MAX
    min_ratio = src_ratio * (1 - MAX_CROP)
    h = CARD_W / min_ratio
    return int(max(PHOTO_H_MIN, min(PHOTO_H_MAX, h)))


def fit_photo(src_path, photo_h):
    """Кадрирует фото под 1080×photo_h.

    Возвращает (изображение, отчёт). Режим cover — обычный кадр с обрезкой,
    contain — исходник вписан целиком на размытую подложку из самого себя.
    """
    im = Image.open(src_path)
    if im.mode != "RGB":
        im = im.convert("RGB")
    sw, sh = im.size
    target_ratio = CARD_W / photo_h
    src_ratio = sw / sh

    # Сколько срежется, если заполнять кадр целиком.
    if src_ratio > target_ratio:
        crop_share = 1 - (target_ratio / src_ratio)  # режем по ширине
        axis = "width"
    else:
        crop_share = 1 - (src_ratio / target_ratio)  # режем по высоте
        axis = "height"

    # Масштаб, необходимый для режима cover.
    scale = max(CARD_W / sw, photo_h / sh)

    if crop_share <= MAX_CROP and scale <= MAX_UPSCALE:
        new = (max(CARD_W, round(sw * scale)), max(photo_h, round(sh * scale)))
        resized = im.resize(new, Image.LANCZOS)
        left = (new[0] - CARD_W) // 2
        # Кадрируем от верхней трети, а не от центра: на новостном фото
        # значимое (лицо, вывеска, трибуна) почти всегда выше геометрического
        # центра, и симметричная обрезка срезает именно его.
        top = min(max((new[1] - photo_h) // 3, 0), new[1] - photo_h)
        photo = resized.crop((left, top, left + CARD_W, top + photo_h))
        return photo, {
            "mode": "cover",
            "scale": round(scale, 3),
            "cropped": round(crop_share, 3),
            "cropAxis": axis,
        }

    # contain: вписываем целиком, фон — размытая растянутая копия.
    backdrop = im.resize((CARD_W, photo_h), Image.LANCZOS).filter(
        ImageFilter.GaussianBlur(40)
    )
    fit = min(CARD_W / sw, photo_h / sh, MAX_UPSCALE)
    inner = im.resize((round(sw * fit), round(sh * fit)), Image.LANCZOS)
    backdrop.paste(inner, ((CARD_W - inner.width) // 2, (photo_h - inner.height) // 2))
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


def load_mark(height):
    """Знак из public/brand/mark.png, вписанный по высоте.

    Тот же файл, что в шапке сайта: репост без подписи всё равно опознаётся.
    Если файла нет — возвращаем None, карточка важнее логотипа.
    """
    if not MARK_PATH.exists():
        return None
    mark = Image.open(MARK_PATH).convert("RGBA")
    box = mark.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    if box:
        mark = mark.crop(box)
    scale = height / mark.height
    return mark.resize((round(mark.width * scale), height), Image.LANCZOS)


def draw_footer(card, x, center_y, text, mark_h=46):
    """Знак и подпись на одной оптической линии, слегка прозрачные.

    Рисуется на отдельном слое RGBA и накладывается с общей прозрачностью:
    так знак и текст гаснут одинаково. Если гасить их по отдельности,
    оранжевый уходит в фон быстрее белого и подпись начинает разъезжаться
    по яркости.

    Выравнивание по РЕАЛЬНЫМ границам букв (textbbox), а не по кеглю:
    у прописных без выносных элементов верх строки далеко от верха кегля,
    и выравнивание по строке уводит текст вниз.
    """
    layer = Image.new("RGBA", card.size, (0, 0, 0, 0))
    dr = ImageDraw.Draw(layer)

    mark = load_mark(mark_h)
    if mark is not None:
        layer.paste(mark, (x, int(center_y - mark.height / 2)), mark)
        x += mark.width + 18

    font = load_font(28, "ExtraBold")
    box = dr.textbbox((0, 0), text, font=font)
    y = center_y - (box[1] + box[3]) / 2

    # Прописные без разрядки сбиваются в пятно, поэтому посимвольно.
    for ch in text:
        dr.text((x, y), ch, font=font, fill=(*TEXT, 255))
        x += dr.textlength(ch, font=font) + 2.2

    layer.putalpha(layer.getchannel("A").point(lambda a: int(a * FOOTER_ALPHA)))
    return Image.alpha_composite(card.convert("RGBA"), layer).convert("RGB")


def render(source, title, kicker, out_path, footer="LEAP NEWS"):
    """Фото уходит в тёмное, заголовок лежит на затемнении.

    Жёсткой границы между фотографией и текстом нет — вместо плашки
    градиент, который начинается внутри снимка. Поэтому высота фото может
    меняться от материала к материалу (см. photo_height), а лента при этом
    выглядит однородной.
    """
    photo_h = photo_height(source)
    card = Image.new("RGB", (CARD_W, CARD_H), GROUND)
    photo, photo_report = fit_photo(source, photo_h)
    card.paste(photo, (0, 0))

    # Растушёвка: маска яркости от прозрачной к сплошной, с показателем
    # больше единицы — иначе затемнение наползает на снимок слишком рано
    # и съедает его середину.
    fade = min(FADE_H, photo_h)
    ramp = Image.new("L", (1, fade))
    for i in range(fade):
        ramp.putpixel((0, i), int(255 * (i / fade) ** 1.6))
    card.paste(
        Image.new("RGB", (CARD_W, fade), GROUND),
        (0, photo_h - fade),
        ramp.resize((CARD_W, fade)),
    )

    draw = ImageDraw.Draw(card)

    # Собираем снизу вверх: подвал прижат к низу, над ним заголовок,
    # над заголовком рубрика. При коротком заголовке текст опускается
    # ниже и открывает больше фотографии — это правильно.
    footer_h = 46
    footer_y = CARD_H - PAD - footer_h
    font, lines, leading, size = fit_headline(draw, title, TEXT_W, HEADLINE_ZONE)
    y = footer_y - 52 - len(lines) * leading

    if kicker:
        draw.text((PAD, y - 54), kicker.upper(), font=load_font(28, "Bold"), fill=BRAND)

    for line in lines:
        draw.text((PAD, y), line, font=font, fill=TEXT)
        y += leading

    card = draw_footer(card, PAD, footer_y + footer_h / 2, footer, mark_h=footer_h)

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
    ap.add_argument("--footer", default="LEAP NEWS")
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
