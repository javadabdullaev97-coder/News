# Bild notes: us-national-debt-40-trillion

## Стратегия: primary-source

## Источник картинки
- URL: https://home.treasury.gov/system/files/2025-12/Treasury-building-snow.png
- Найдено: главная страница home.treasury.gov, ссылка ведёт к разделу "Role of the Treasury"
  (подпись "Treasury building in the winter")
- Тип: официальное фото Минфина США — здание Treasury Building в Вашингтоне,
  видна надпись "THE TREASURY DEPARTMENT" на фронтоне и статуя Альберта Галлатина
  (первый в истории министр финансов США) на переднем плане
- photo-dupes.mjs: не найдено совпадений за последние 2 дня — кадр свободен
- Обработка prepare-image.py: 1598×751 → cover, scale 1.1984 (умеренный апскейл
  в пределах MAX_UPSCALE=2.5), обрезано 16,45% по ширине (в пределах MAX_CROP=0.45)
  → 1600×900, 368 849 байт, quality 90, status: ok

## Полный JSON prepare-image.py
```json
{
  "source": {"width": 1598, "height": 751},
  "fit": {"mode": "cover", "scale": 1.1984, "cropLoss": 0.1645, "offset": [0, 0],
          "upscaled": true, "note": "обрезано 16% по ширине; окно кропа выбрано по содержимому; исходник растянут в 1.20× ради заливки кадра"},
  "output": {"path": "public/images/posts/2026-08/us-national-debt-40-trillion-01.jpg",
             "url": "/images/posts/2026-08/us-national-debt-40-trillion-01.jpg",
             "width": 1600, "height": 900, "bytes": 368849, "quality": 90},
  "status": "ok"
}
```

## Отклонённые варианты
- Wikimedia Commons не проверял целенаправленно — редполитика прямо избегает
  wikipedia.org/wikimedia-семейства из-за сложной атрибуции авторства, поэтому
  этот путь пропущен сознательно ещё до поиска.
- Пресс-релиз о выкупе облигаций (home.treasury.gov/news/press-releases/sb0607) —
  без изображений, только текст.
- Фототека редакции (config/stock-photos.json) — темы cbu/sum/fx/inflation/banking
  привязаны к Узбекистану, госдолг США не подпадает ни под одну; пропущено.
- Фото главы Минфина США Скотта Бессента с главной страницы — не ставил: у материала
  нет персонажа-героя (handoff явно указывает — «явного персонажа-героя в материале
  нет»), тема про долг и здание, не про конкретное лицо.

## Alt-текст
"Здание Министерства финансов США в Вашингтоне со статуей Альберта Галлатина,
госдолг страны впервые превысил 40 триллионов долларов"

## Уверенность в подборе: 90%
