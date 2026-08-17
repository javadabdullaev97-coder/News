# Bild notes: rakuten-helsing-drones-japan

## Стратегия: primary-source

## mainVisualSubject (из reporter notes / handoff)
Ударный беспилотник Helsing HX-2 (продуктовый рендер/промо-фото), либо логотипы
Rakuten и Helsing рядом. Публично доступных фото представителя Rakuten нет.

## Источник картинки
- Прямого доступа к helsing.ai не было: домен на Vercel, все запросы (products/hx-2,
  главная, /hx-2, r.jina.ai-прокси) вернули 429 / "Vercel Security Checkpoint" —
  похоже на блокировку по репутации exit-IP прокси, не наша обрезка попыток.
- Rakuten newsroom (global.rakuten.com, corp.rakuten.co.jp) — релиза о Helsing
  в архиве пресс-релизов 2026 года нет вообще (проверил оба раздела).
- Bloomberg — 403 Forbidden (как и у reporter).
- Nikkei Asia og:image — фото логотипа Rakuten авторства Mayumi Tsumita
  (собственная съёмка Nikkei), копирайт агентства — пропустил.
- Reuters/Yahoo (media.zenfs.com) — две фотографии солдат Сухопутных сил
  самообороны Японии на учениях, не дрон, лицензия Reuters — пропустил
  по правилу "международные агентства, пропускай если не уверен".
- Найдено через TechCrunch: статья от 13.02.2025 "Germany's Helsing doubles
  down on drones for Ukraine, scales up manufacturing" — featured image
  `https://techcrunch.com/wp-content/uploads/2025/02/Helsing_Drone_HX-2.jpg`,
  подпись "Image Credits: Helsing" — официальное промо-фото HX-2 от самой
  компании, переданное в прессу. Это ровно то, что просил handoff
  (продуктовый рендер/промо-фото HX-2), и это subject-first: сам аппарат
  с читаемой маркировкой "HX-2" на фюзеляже.
- Проверка на image-avoid: на фото нет ни автономного целеуказания, ни боевого
  применения, ни намёка на контракт с Японией — студийная съёмка в тёмном
  ангаре, нейтральный продуктовый ракурс. Условию handoff соответствует.

## Обработка
- Оригинал 3543×2587 (альбомная ориентация, AR ≈1.37 — горизонталь, без подложки).
- `scripts/prepare-image.py`:
```json
{
  "source": {"width": 3543, "height": 2587},
  "fit": {"mode": "cover", "scale": 0.4516, "cropLoss": 0.2296, "offset": [0, 97], "upscaled": false,
    "note": "обрезано 23% по высоте; окно кропа выбрано по содержимому"},
  "output": {"path": "public/images/posts/2026-08/rakuten-helsing-drones-japan-01.jpg",
    "url": "/images/posts/2026-08/rakuten-helsing-drones-japan-01.jpg", "width": 1600, "height": 900,
    "bytes": 92878, "quality": 90},
  "status": "ok", "upscaled": false
}
```
- cropLoss 0.2296 — ниже порога crop-risky (0.25), эскалация не нужна. Дрон и
  маркировка "HX-2" полностью в кадре после обрезки (проверил визуально).

## Отклонённые варианты
- helsing.ai/products/hx-2 и главная — недоступны (429/Vercel checkpoint).
- Rakuten newsroom (global + corp.rakuten.co.jp) — нет релиза о Helsing.
- Bloomberg og:image — 403.
- Nikkei Asia og:image — фото логотипа Rakuten, копирайт Nikkei (Mayumi Tsumita), не берём.
- Reuters/Yahoo carousel — фото солдат JGSDF на учениях, не по теме и лицензия агентства.
- AI-генерация не понадобилась — нашёлся официальный промо-кадр.

## Alt-текст
"Студийное фото ударного беспилотника Helsing HX-2 с маркировкой «HX-2» на
фюзеляже, тёмный ангар с подсветкой"

## Уверенность в подборе: 85%
Официальное промо-фото HX-2 от Helsing (credit подтверждён TechCrunch), subject-first,
без намёка на боевое применение или контракт с Японией — соответствует и hint, и avoid
из handoff. Снижаю с 95 до 85: фото 2025 года (более раннее промо), не свежий кадр
именно под японские испытания, но HX-2 — та же модель, о которой статья.
