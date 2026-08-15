# Bild notes: obituary-abdumannon-ubaydullaev

## Стратегия: primary-source

## Источник картинки
- URL поста: https://t.me/madaniyatvazirligi/60972 (Telegram Министерства культуры Узбекистана, sources[0])
- CDN URL фото: https://cdn4.telesco.pe/file/dXbBxmpQiedaL8P_6ttKYiFurUqPnkUxHBJcdu6xSMUZ6YUwvjJIz_l4ViuSOboQmAmCM7L1YT95cKh8gl-YT4lEL0gRt19_lJCHxHtf7J48xjCPtZpOfvBfW8ar4QvvlehHWzEOl-hZmDwWwWR-q7mOk1lR7e4XWaScHf8MvN5NnOAelGguhWPUhWmN82KovHG5T9aB3zD_gdGpIqHFA8HrZ3cSD33zwZTm7XOeie2UDlO0I9I6pVZOlz5Oj93WRoumNfJnGBhGtg7Pr_IQVam2vT23FDgE67w0uBTFY3XWdTqqS454aN4_vc0upVcFd_wZn4xcLP0q77WUtlhixg.jpg
- Тип: официальное чёрно-белое фото Абдуманнона Убайдуллаева из поста-соболезнования Минкультуры («Ta'ziya»). Прямой субъект — сам покойный, крупный портрет.
- Как найден: og:image/тег обычной WebFetch не отдал (рендер Telegram Widget через JS), поэтому запросил `t.me/<slug>/<id>?embed=1` напрямую через curl — сервер отдаёт статичный HTML-виджет с `background-image:url(...)` в `tgme_widget_message_photo_wrap`. Скачал и визуально проверил (Read на .jpg) — подтвердил, что это портрет человека, а не абстрактная графика/герб/логотип.
- Результат prepare-image.py:
```json
{
  "source": {"width": 800, "height": 522},
  "fit": {
    "mode": "cover",
    "scale": 2.0,
    "cropLoss": 0.1379,
    "offset": [0, 0],
    "upscaled": true,
    "note": "обрезано 14% по высоте; окно кропа выбрано по содержимому; исходник растянут в 2.00× ради заливки кадра"
  },
  "output": {
    "path": "public/images/posts/2026-08/obituary-abdumannon-ubaydullaev-01.jpg",
    "url": "/images/posts/2026-08/obituary-abdumannon-ubaydullaev-01.jpg",
    "width": 1600,
    "height": 900,
    "bytes": 250674,
    "quality": 90
  },
  "status": "ok"
}
```
cropLoss 13.8% — заметно ниже порога 25% для crop-risky. Визуально проверил итоговый 1600×900 кадр: лицо целиком в кадре (лоб, оба глаза, нос, рот, часть плеч), ничего важного не срезано.

## Отклонённые варианты
- Второй официальный источник — https://t.me/dsmi_uz/58926 (соболезнование ОʻzDSMI, sources[1]) — тоже содержит чёрно-белый портрет Убайдуллаева (800×561, JPEG). Не выбран как основной: композиция более тесная (голова ближе к правому/верхнему краю кадра, волосы уже касаются границы), расчётный cropLoss при cover 1600×900 выше (~19,8% против 13,8% у варианта Минкультуры), выше риск задеть край причёски при обрезке. Оставляю про запас, если потребуется альтернатива.
- Stock/Higgsfield не рассматривались — официальное фото самого субъекта нашлось и прошло проверку с первой попытки, необходимости в fallback не было.

## Alt-текст
"Портрет актёра и режиссёра Абдуманнона Убайдуллаева крупным планом, чёрно-белая съёмка"

## Уверенность в подборе: 90%
Прямое фото самого субъекта некролога из официального первоисточника (Минкультуры), горизонтальная ориентация, умеренный кроп (13,8%) без риска для композиции, полное соответствие правилу subject-first.
