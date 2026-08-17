# Bild notes: mckenna-ibf-middleweight-crown-dublin

## Стратегия: primary-source

## Источник картинки
- URL: https://e0.365dm.com/26/08/2048x1152/skysports-aaron-mckenna-etinosa-oliha_7317250.jpg?20260808225439
- Страница-источник: https://www.skysports.com/boxing/news/12183/13571057/aaron-mckenna-wins-dream-homecoming-bout-against-etinosa-oliha-to-become-ibf-middleweight-world-champion-in-dublin
  (один из `frontmatter.sources` статьи)
- Тип: живая репортажная фотография боя (не постановка, не графика)
- Размер оригинала: 2048×1152 → cover, масштаб 0,7812, обрезка 0% → 1600×900 (237 513 байт, q90)

```json
{
  "source": {"width": 2048, "height": 1152, "path": "/tmp/original.jpg"},
  "fit": {"mode": "cover", "scale": 0.7812, "cropLoss": 0.0, "offset": [0, 0], "upscaled": false,
          "note": "обрезано 0% по высоте; окно кропа выбрано по содержимому"},
  "output": {"path": "public/images/posts/2026-08/mckenna-ibf-middleweight-crown-dublin-01.jpg",
             "url": "/images/posts/2026-08/mckenna-ibf-middleweight-crown-dublin-01.jpg",
             "width": 1600, "height": 900, "bytes": 237513, "quality": 90},
  "status": "ok",
  "upscaled": false
}
```

## Отклонённые варианты
- Sky Sports og:image (skysports-aaron-mckenna_7317266.jpg, 1600×900) — отклонён:
  это не чистая фотография, а промо-коллаж «MIDDLEWEIGHT Highlights MCKENNA OLIHA»
  с крупным текстовым блоком и логотипом Sky Sports на ~40% кадра — нарушает
  правило «только живая фотография», выглядит как рекламная плашка.
- RTE (images/0024d12a-*.jpg и images/0024d108-*.jpg, до 2400×1350) — качественные
  документальные фото Маккенны с поясом и флагом после победы, subject-first
  идеально. Отклонены из-за `source-doubt`: подпись «Photo by David
  Fitzgerald/Sportsfile» — Sportsfile платное фотоагентство ирландского спорта,
  лицензионный риск аналогичен Reuters/AP («пропускай, если не уверен, что
  открытое использование разрешено»). При сомнении в лицензии — другой источник.
- UFC.com (hero zuffa-boxing-10-results, weigh-in фото Олихи «Photo by Joshua
  Shepard/Zuffa Boxing») — недоступны для скачивания (Akamai 403, error 54113,
  бот-защита CDN даже с browser UA и referer); к тому же hero-изображение по
  описанию оказалось чёрно-белым дизайн-постером на цветном фоне, а не прямым
  фото.
- Sky Sports skysports-aaron-mckenna-etinosa-oliha_7317246.jpg — тоже чистое
  фото боя без графики, запасной вариант; не выбран, т.к. на 7317250 лицо
  Маккенны развёрнуто к камере и удар акцентирован лучше (более сильный
  subject-first кадр).
- BoxingScene (исходный источник инбокса) — страница отдаёт 403 через WebFetch
  и curl (антибот), картинку получить не удалось.

## Alt-текст
"Аарон Маккенна наносит удар Этиносе Олихе во время боя за титул IBF в среднем
весе на арене 3Arena в Дублине"

## Credit
"Sky Sports" — в HTML статьи отдельного credit/figcaption (Getty/PA/Sportsfile
и т.п.) для этого конкретного фото не найдено; указан источник публикации как
наиболее прозрачная и проверяемая атрибуция.

## Уверенность в подборе: 85%
Subject-first полностью выполнен (оба боксёра в кадре, лицо Маккенны хорошо
видно, момент боя). Горизонталь 16:9 нативная, апскейла и заметной обрезки
нет. Минус 15% — отсутствие явного фотоагентства в credit (у Sky Sports на
странице явной подписи под фото нет), поэтому атрибуция дана по изданию, а
не по фотографу.
