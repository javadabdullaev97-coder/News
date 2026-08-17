# Bild notes: apple-cook-steps-down-ternus-ceo

## Стратегия: primary-source

## Источник картинки
- URL: https://www.apple.com/newsroom/images/2026/04/tim-cook-to-become-apple-executive-chairman-john-ternus-to-become-apple-ceo/article/Apple-John-Ternus-Tim-Cook_Full-Bleed-Image.jpg.large.jpg
- Тип: официальное фото Apple Newsroom (hero-изображение того же пресс-релиза, что указан в `frontmatter.sources`)
- Subject-first: в кадре оба героя статьи — Тим Кук и Джон Тернус, в Apple Park. Соответствует `mainVisualSubject` из reporter-notes и `image-hint` из handoff.
- Размер оригинала: 1440×810 (горизонтальный, соотношение 1.78 ≈ 16:9) → prepare-image.py, режим cover, масштаб 1.1111× (в пределах MAX_UPSCALE=2.5 из скрипта), cropLoss 0.0 → 1600×900 (365 КБ, quality 86)

```json
{
  "source": {"width": 1440, "height": 810},
  "fit": {"mode": "cover", "scale": 1.1111, "cropLoss": 0.0, "offset": [0, 0], "upscaled": true,
          "note": "обрезано 0% по высоте; окно кропа выбрано по содержимому; исходник растянут в 1.11× ради заливки кадра"},
  "output": {"path": "public/images/posts/2026-08/apple-cook-steps-down-ternus-ceo-01.jpg",
             "url": "/images/posts/2026-08/apple-cook-steps-down-ternus-ceo-01.jpg",
             "width": 1600, "height": 900, "bytes": 365158, "quality": 86},
  "status": "ok"
}
```

## Отклонённые варианты
- https://www.apple.com/newsroom/images/2026/04/.../Apple-John-Ternus_inline.jpg.large.jpg (портрет только Тернуса, без Кука) — не взял: full-bleed фото с обоими даёт более точный subject-first кадр для темы «передача поста CEO», плюс горизонтальная ориентация full-bleed изображения (1440×810) лучше подходит под 16:9, чем инлайн-портрет.
- Apple Vision Pro в кадре — по `image-avoid` из handoff исключено намеренно (Тернус не подтверждён как куратор продукта в тексте); на выбранном фото продукта в кадре нет.

## Alt-текст
"Тим Кук и Джон Тернус в кампусе Apple Park — Кук передаёт пост CEO Apple Тернусу"

## Уверенность в подборе: 95%
Официальное фото из того же пресс-релиза, что уже в sources; горизонтальный кадр без кропа; оба субъекта статьи видны напрямую — соответствует правилу subject-first.
