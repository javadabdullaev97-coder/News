# Bild notes: world-west-bank-settler-siege

## Стратегия: stock

## Проверка первоисточников (шаг A)
Обе статьи Al Jazeera из `sources` открыты через WebFetch, у обеих нашлось
предметное фото события:
- https://www.aljazeera.com/news/2026/8/13/israeli-settlers-besiege-three-palestinian-families-in-occupied-west-bank
  → фото AP, подпись "Israeli settlers besiege three Palestinian families in West Bank"
- https://www.aljazeera.com/news/2026/8/13/us-diplomat-calls-israeli-settler-siege-of-west-bank-homes-act-of-terror
  → фото AFP, подпись "Israeli settlers gathered in front of Palestinian houses in the
  village of Qusra, south of Nablus, in the occupied West Bank, on August 12, 2026"

Оба фото — предметно точно то, что нужно (subject-first, конкретное событие
и место), но это фото агентств AP/AFP, лицензированные Al Jazeera для своего
сайта. У LEAP нет собственной лицензии на переиздание фото AP/AFP — по
редполитике агентские фото пропускаем при отсутствии уверенности в разрешении
на открытое использование. Не скачивал и не использовал ни одно из двух.

BBC (bbc.co.uk) не открылась через WebFetch — домен недоступен инструменту,
как и у reporter'а ранее.

Официального пресс-релиза со своим фото для этого события не существует —
это не заявление ведомства, а инцидент с поселенцами, ни у одной стороны
конфликта нет пресс-фото, которое стоило бы брать.

## Higgsfield / AI-генерация — недоступна
Пытался вызвать `generate_image` (fallback C по инструкции), но у меня в
этой сессии инструмент MCP Higgsfield фактически не подключён (вызов
`mcp__Higgsfield__generate_image` вернул "No such tool available" несмотря
на инструкции в system prompt). Перешёл к стратегии B — тематический сток.

## Источник картинки (стратегия B — сток)
- URL: https://www.pexels.com/photo/aerial-view-of-rugged-terrain-in-palestine-3469467/
  (прямая ссылка на файл: https://images.pexels.com/photos/3469467/pexels-photo-3469467.jpeg)
- Автор: Fadi Abuqare, Pexels License (бесплатно для коммерческого использования)
- Тег локации на странице Pexels: Palestine. Подпись автора: "Aerial view of the
  rugged, rocky terrain with a winding dirt road in the Palestinian countryside"
- Содержимое: холмистая каменистая местность Западного берега, оливковые террасы,
  грунтовая дорога, скопление домов деревни на возвышенности вдалеке (мелко,
  не идентифицируемо как конкретная деревня — это ожидаемо, конкретно Кусру
  найти не удалось)
- Ориентация горизонтальная (7967×4536, соотношение 1,76) — подходит под
  правило «ищи горизонталь, а не спасай вертикаль»
- Обработка: `python3 scripts/prepare-image.py`
```json
{
  "source": {"width": 7967, "height": 4536},
  "fit": {"mode": "cover", "scale": 0.2008, "cropLoss": 0.012, "offset": [0, 11],
          "upscaled": false, "note": "обрезано 1% по высоте; окно кропа выбрано по содержимому"},
  "output": {"path": "public/images/posts/2026-08/world-west-bank-settler-siege-01.jpg",
             "url": "/images/posts/2026-08/world-west-bank-settler-siege-01.jpg",
             "width": 1600, "height": 900, "bytes": 397632, "quality": 70},
  "status": "ok", "upscaled": false
}
```
cropLoss 0,012 — далеко ниже порога 0,25, `crop-risky` не применяется.

## Отклонённые варианты
- AP-фото у Al Jazeera (осада, три семьи) — точный subject, но лицензия
  агентства, не наша; не уверен в праве переиздания → пропустил.
- AFP-фото у Al Jazeera (поселенцы у домов в Кусре, 12 августа) — тот же
  повод отказа, лицензия AFP.
- Unsplash "Jerusalem old city skyline" (Getty Images) — в чёрном списке
  платных агентств, пропустил.
- Unsplash premium ("A view of a small town in the mountains", Ahmed) —
  Unsplash+ платный контент, не бесплатная лицензия, пропустил.
- Pexels "Jericho Farmland Aerial" (id 6223925, Michalis Pafralis) —
  вертикальная ориентация (3024×4032, портрет) — отклонено по правилу
  горизонтали.
- Pexels "Rural Village Hills" (id 1697935, Samer Daboul) — на фото виден
  водяной знак фотографа "SamerDaboul" в кадре, к тому же похоже на сельскую
  местность Сирии/Идлиба, а не Западный берег — отклонено.
- Tekoa Landscape (Pexels, Shay Safrai) — Текоа израильское поселение на
  Западном берегу, не палестинская деревня — не подходит теме про палестинских
  жителей под осадой, не рассматривал всерьёз.

## Alt-текст
"Каменистый холмистый ландшафт Западного берега с грунтовой дорогой,
оливковыми террасами и палестинской деревней на возвышенности вдалеке"

## Соответствие handoff
image-hint просил патруль/военных у блокированного дома — такого предметного
кадра без агентской лицензии или узнаваемых лиц не нашлось. Выбран ближайший
законный вариант: подлинный ландшафт Западного берега (не абстрактная
"карта конфликта" и не вид Земли из космоса), с деревней на заднем плане —
удерживает локацию материала, не показывая при этом лиц заблокированных
жителей или посла Хакаби (image-avoid соблюдён), логотипов AJ/BBC нет.

## Уверенность в подборе: 55%
Локация верна (Западный берег), кадр честный (не стоковая 3D-заготовка,
живая фотография), права чистые (Pexels License). Но это не фото самого
события осады — только тематический ландшафт, ближе к «последнему ресорту»,
чем к subject-first. Причина — лицензионные ограничения на фото самого
события (AP/AFP) и недоступность AI-генерации в этой сессии. Если у editor'а
есть возможность вызвать Higgsfield или подтвердить право на агентское фото —
итог можно улучшить.
