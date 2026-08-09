# Bild notes: world-canada-bc-wildfires-evacuation

## Стратегия: stock

## Попытка A — первоисточники (Reuters через AJ/CBS/PBS)
Все три первоисточника используют одну и ту же серию фото Reuters с места
события:
- Al Jazeera / PBS NewsHour: Paige Taylor White/Reuters — RCMP перекрывает
  Highway 97 у Пентиктона (кадр RC2JUMAZQA8L / RC2IUMAB69JB).
- CBS News: «BC Wildfire Service/Handout via REUTERS» — дым над Bald Range
  северо-западнее Саммерленда, 7 августа.

Все три — фото, распространяемые по агентскому договору Reuters (в т.ч.
хендаут-фото BC Wildfire Service ушло в публикацию тоже через Reuters wire).
Правило редполитики: агентские фото «пропускай если не уверен что открытое
использование разрешено» — лицензия Reuters на такое распространение не
подтверждена, поэтому не взял ни один из трёх кадров.

## Попытка A2 — официальный канал провинции
Нашёл пресс-релиз премьера BC от 8 августа
(https://news.gov.bc.ca/releases/2026PREM0032-000932) с «hero image»
https://live.staticflickr.com/65535/55451115566_de2052f63f_b.jpg.
Скачал и открыл — это не фото, а Canva-баннер («State of emergency in effect
due to regional wildfires», текст на плашке + иконка ёлки в круге).
Отклонено по правилу «только живая фотография» — баннер-заготовка, не
документальная съёмка, ничего не показывает по смыслу subject-first.
Дальше проверил Flickr BC Wildfire Service / BC Gov Photos и X/Twitter
BCWildfireSvc — доступа к живым фото с этого пожара через открытые каналы
не нашёл (страницы недоступны/пустая выдача).

## Попытка B — тематический сток (использовано)
- URL: https://unsplash.com/photos/wildfire-burning-across-hillside-at-dusk-kbTp7dBzHyY
- Файл: https://images.unsplash.com/photo-1615092296061-e2ccfeb2f3d6
- Автор: Matt Palmer, Unsplash License (свободное использование)
- Тип: живая документальная фотография лесного пожара на склоне холма в
  сумерках (снято в Тасмании, Австралия — НЕ конкретно Bald Range/BC).
  Использовано как тематическая иллюстрация, alt-текст явно помечен
  «(иллюстративное фото)», не выдаёт кадр за фотографию с места события.
  Соответствует mainVisualSubject от reporter: «дым и зарево лесного пожара
  над холмами».
- Размер оригинала: 3000×2001 (landscape, AR 1.499) → cover, масштаб 0.5333,
  обрезано 15.67% по высоте (в пределах MAX_CROP), апскейла нет →
  1600×900, 169 916 байт, quality 90.

## Полный JSON от prepare-image.py
{
  "source": {"width": 3000, "height": 2001},
  "fit": {"mode": "cover", "scale": 0.5333, "cropLoss": 0.1567,
          "offset": [0, 141], "upscaled": false,
          "note": "обрезано 16% по высоте; окно кропа выбрано по содержимому"},
  "output": {"path": "public/images/posts/2026-08/world-canada-bc-wildfires-evacuation-01.jpg",
             "url": "/images/posts/2026-08/world-canada-bc-wildfires-evacuation-01.jpg",
             "width": 1600, "height": 900, "bytes": 169916, "quality": 90},
  "status": "ok", "upscaled": false
}

## Отклонённые варианты
- Paige Taylor White/Reuters (via Al Jazeera и PBS) — агентское фото,
  лицензия на публикацию не подтверждена.
- BC Wildfire Service/Handout via REUTERS (via CBS) — тоже распространено
  по Reuters wire, та же причина отказа.
- Canva-баннер BC Gov (Flickr, пресс-релиз премьера) — не фотография, а
  текстово-иконочная заготовка, не проходит правило «только живая
  фотография».
- AI-генерация (Higgsfield) не потребовалась — реальное тематическое фото
  оказалось доступно и предпочтительнее по правилу subject-first
  («живая фотография» > генерация).

## Alt-текст
"Лесной пожар на склоне лесистого холма в сумерках: языки пламени тянутся
вдоль гребня, над местностью стоит густой оранжевый дым (иллюстративное
фото)"

## Уверенность в подборе: 65%
Кадр точно передаёт суть события (дым и зарево лесного пожара над холмами,
как просил reporter в mainVisualSubject) и технически чистый (живое фото,
горизонтальная ориентация, обрезка 15.67% < порога). Уверенность не выше,
потому что это НЕ фото именно с Bald Range/Summerland — географическая
привязка иллюстративная, честно отражено в alt-тексте и в этих notes.
