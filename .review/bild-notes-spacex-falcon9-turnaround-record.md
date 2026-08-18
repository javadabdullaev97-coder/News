# Bild notes: spacex-falcon9-turnaround-record

## Стратегия: stock (Unsplash, официальный аккаунт SpaceX)

## Источник картинки
- URL: https://unsplash.com/photos/rocket-launch-arc-over-dark-water-TV2gg2kZD1o
- Прямая ссылка на файл: https://images.unsplash.com/photo-1457364887197-9150188c107b
- Автор/аккаунт: SpaceX (@spacex) — официальный профиль компании на Unsplash,
  лицензия Unsplash License (свободное использование)
- Локация по метаданным Unsplash: Cape Canaveral Air Force Station
- Тип: живая фотография (длинная выдержка, дуговой след Falcon 9 при ночном/сумеречном
  пуске над океаном), не рисованная заготовка
- Размер оригинала: 3000×2000 (landscape, ratio 1.5) → prepare-image.py, cover,
  scale 0,5333, обрезано 15,62% по высоте (offset y=167) → 1600×900 (116 425 байт, quality 90)

```json
{
  "source": {"width": 3000, "height": 2000},
  "fit": {"mode": "cover", "scale": 0.5333, "cropLoss": 0.1562, "offset": [0, 167],
          "upscaled": false, "note": "обрезано 16% по высоте; окно кропа выбрано по содержимому"},
  "output": {"path": "public/images/posts/2026-08/spacex-falcon9-turnaround-record-01.jpg",
             "url": "/images/posts/2026-08/spacex-falcon9-turnaround-record-01.jpg",
             "width": 1600, "height": 900, "bytes": 116425, "quality": 90},
  "status": "ok", "upscaled": false
}
```

Проверка на повтор (`scripts/photo-dupes.mjs --check`) — пройдена, кадр за 2 дня
в других материалах не использовался.

## Почему не кадр конкретно этого пуска (15 августа)
- Spaceflightnow.com — единственный источник с фото именно этого пуска
  (Globalstar/USSF-366). Оба доступных кадра — "streak shot" авторства
  собственных фотографов издания (Michael Cain/Spaceflight Now,
  Adam Bernstein/Spaceflight Now). Это не официальная пресс-служба и не
  международное агентство из белого списка — авторские права принадлежат
  частному изданию, лицензия на переиздание не подтверждена. Пропущено
  по правилу «при сомнении в лицензии — другой источник» (source-doubt риск).
- spacex.com/launches — страница рендерится через JS, WebFetch не отдал
  ни фотогалереи, ни ссылок на конкретный пуск.
- DVIDS (публичные фото Космических сил США) — поиск по USSF-366 не дал
  релевantных карточек по пуску 15 августа (выдал материалы 366th Training
  Wing/Fighter Wing — не относится к делу).
- Flickr «Official SpaceX Photos» — фотопоток не даёт метаданных/дат через
  WebFetch, конкретный кадр под этот пуск не идентифицирован.

По правилам handoff (`image-hint`) допускалось нейтральное фото ночного
пуска Falcon 9 — использован именно такой вариант.

## Отклонённые варианты
- spaceflightnow.com — 2 фото пуска 15.08, отклонены (авторское право частного
  издания, не в белом списке источников для картинок)
- Unsplash, Kurt Cotoaga "low-angle photography of red space shuttle" —
  не Falcon 9 (шаттл), не по теме
- Unsplash, Tim Mossholder "photo of space shuttle launching rocket" —
  архивный шаттл, не Falcon 9

## Alt-текст
"Ночной запуск ракеты Falcon 9 SpaceX с мыса Канаверал — светящийся
дугообразный след двигателя на фоне сумеречного неба и океана"

## Уверенность в подборе: 80%
Кадр показывает главный визуальный субъект (Falcon 9, ночной/сумеречный пуск,
мыс Канаверал — совпадает с одной из двух площадок материала), лицензия
чистая (официальный аккаунт SpaceX на Unsplash), горизонтальная ориентация,
обрезка в пределах нормы. Минус 20% — это не кадр именно пуска 15 августа
2026 года, а иллюстративный аналог с той же площадки (Cape Canaveral), что
прямо разрешено инструкцией при отсутствии доступного лицензионно чистого
кадра конкретного пуска.
