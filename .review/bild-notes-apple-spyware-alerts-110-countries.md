# Bild notes: apple-spyware-alerts-110-countries

## Стратегия: primary-source

## Важное предупреждение: дубликат по теме
Этот материал — почти дословный дубликат уже опубликованной сегодня статьи
`content/posts/2026-08-18/apple-spyware-alert-2026-08.mdx` (та же тема, те же
источники TechCrunch/The Hacker News, тот же день). У опубликованного
материала уже стоит официальный скриншот Apple threat notification
(`apple-spyware-alert-2026-08-01.jpg`, источник
`cdsassets.apple.com/.../macos-tahoe-26-safari-account-apple-com-threat-notification.png`).

Проверил байты: скачал тот же официальный PNG и прогнал через
`prepare-image.py` под именем текущего slug — итоговый JPEG оказался
**побайтово идентичен** уже опубликованному файлу (md5
`384e37e59bc748c9ff39499d141b7f33` у обоих). `scripts/photo-dupes.mjs --check`
на сыром PNG сказал "свободен" — это ограничение инструмента: он сравнивает
сырой файл с уже ОБРАБОТАННЫМИ постами, а не сырой с сырым, поэтому дублирование
одного и того же официального ассета через детерминированный пайплайн он
не ловит. Дубликат подтверждён вручную через md5sum после прогона
prepare-image.py — сгенерированный тестовый файл удалён, в статью не пошёл.
Ушёл искать другой официальный кадр, чтобы не повторять снимок дважды в
один день по одной и той же новости.

Оба вертикальных скриншота Apple с той же страницы поддержки
(lock screen 640×1320, Settings 640×1320) дают `mode: contain` с подложкой —
red flag по правилу владельца от 04.08, горизонтальная альтернатива в
принципе существует (просто уже занята), поэтому подложку не беру.

## Источник картинки (итоговый выбор)
- URL: https://www.apple.com/newsroom/images/values/privacy/Apple-Lockdown-Mode-update-2022-hero.jpg.landing-big_2x.jpg
- Найдено: официальная пресс-страница Apple Newsroom
  https://www.apple.com/newsroom/2022/07/apple-expands-commitment-to-protect-users-from-mercenary-spyware/
  (запуск Lockdown Mode — прямая тематическая связь: в статье Apple
  рекомендует получившим уведомление включить именно Lockdown Mode).
- Тип: официальное пресс-фото Apple (apple.com/newsroom, тот же
  первоисточник уровня доверия, что и cdsassets.apple.com)
- Содержимое: iPhone крупным планом с открытым экраном "Lockdown Mode" в
  Настройках (иконка щита-руки, описание режима, кнопка "Turn On Lockdown
  Mode") — нейтральная иллюстрация кибербезопасности без хакера в капюшоне,
  без людей, без логотипов NSO/Pegasus.
- Проверка дублей: `node scripts/photo-dupes.mjs --check` на исходном файле —
  свободен, за 2 дня этот кадр не выходил. Также вручную проверил, что этот
  URL/сюжет (Lockdown Mode hero) раньше в content/posts не встречался.
- Обработка: `python3 scripts/prepare-image.py
  Apple-Lockdown-Mode-update-2022-hero.jpg.landing-big_2x.jpg
  apple-spyware-alerts-110-countries --month=2026-08`
  ```json
  {
    "source": {"width": 1312, "height": 738},
    "fit": {
      "mode": "cover",
      "scale": 1.2195,
      "cropLoss": 0.0,
      "offset": [0, 0],
      "note": "обрезано 0% по высоте; исходник растянут в 1.22× ради заливки кадра"
    },
    "output": {
      "path": "public/images/posts/2026-08/apple-spyware-alerts-110-countries-01.jpg",
      "width": 1600, "height": 900, "bytes": 87062, "quality": 90
    },
    "status": "ok"
  }
  ```
  Исходник уже почти ровно 16:9 (1312×738), поэтому cropLoss 0% и умеренный
  апскейл 1.22× (в пределах MAX_UPSCALE=2.5, инвариант скрипта). Подложки нет,
  обрезки нет. Визуально проверил итоговый кадр — полный экран Lockdown Mode
  виден целиком, ничего не срезано.

## Отклонённые варианты
- https://cdsassets.apple.com/live/7WUAS350/images/apple-account/macos-tahoe-26-safari-account-apple-com-threat-notification.png
  (1632×528, горизонтальный) — тот же кадр, что уже стоит у опубликованного
  сегодня дубликата темы (`apple-spyware-alert-2026-08`); повтор одного фото
  под двумя материалами об одной и той же новости — отклонён по правилу
  от 18.08 про повторяющиеся снимки.
- https://cdsassets.apple.com/live/7WUAS350/images/apple-account/ios-26-iphone-17-pro-lock-screen-threat-notification.png
  (640×1320, вертикальный) — уходит в contain-подложку (протестировал:
  `mode: contain`, дальняя альтернатива есть — горизонтальный кадр);
  отклонён.
- https://cdsassets.apple.com/live/7WUAS350/images/apple-account/ios-26-iphone-17-pro-settings-threat-notification.png
  (640×1320, вертикальный) — тот же случай, отклонён.
- https://techcrunch.com/wp-content/uploads/2026/08/iphone-spyware-alert-2024.jpg
  и .../ios-notification-threat-apple-hero.jpg — собственные hero-фото
  TechCrunch (og:image статей), не использовал: авторские редакционные
  фото стороннего СМИ, лицензия на переиздание не подтверждена (риск
  copyright), предпочёл официальный ассет Apple.
- The Hacker News og:image — общий логотип Apple с сервиса Blogger
  (900×470), не по теме, не тематическая иллюстрация — отклонён.
- Unsplash — поиск заблокирован анти-бот защитой (Anubis challenge,
  HTTP 401 на все запросы без браузерного JS), недоступен в этой среде.
- Фототека редакции (`config/stock-photos.json`) — темы cbu/sum/inflation
  и т.д., тема Apple/кибербезопасность не покрыта, `pick-stock.mjs` не
  применим.
- AI-генерация (Higgsfield) — недоступна в текущей среде выполнения (нет
  инструмента/API для генерации), поэтому не использовалась как fallback;
  в данном случае и не потребовалась — нашёлся чистый официальный вариант.

## Alt-текст
"Экран iPhone с включённым режимом Lockdown Mode — усиленной защитой Apple
от шпионского ПО"

## Уверенность в подборе: 90%
Официальный ассет Apple Newsroom, subject-first (iPhone + конкретный экран
Lockdown Mode, который статья явно упоминает как рекомендацию Apple),
идеальный 16:9 без кропа и подложки, не является повтором уже
опубликованного сегодня материала на ту же тему. Снижение с 100%: фото
из пресс-релиза 2022 года (запуск Lockdown Mode), а не свежий кадр волны
уведомлений 13 августа 2026 — это иллюстрация функции защиты, а не самого
события рассылки; если бы не было конфликта дублирования с уже
опубликованной статьёй, более точным по времени выбором остался бы
скриншот threat notification (2026), но он был занят.
