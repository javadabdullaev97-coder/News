# Bild notes: apple-spyware-alert-2026-08

## Стратегия: primary-source

## Источник картинки
- URL: https://cdsassets.apple.com/live/7WUAS350/images/apple-account/macos-tahoe-26-safari-account-apple-com-threat-notification.png
- Найдено: прямым парсингом HTML страницы https://support.apple.com/en-us/102174
  (WebFetch дважды обрезал body до навигации, поэтому скачал HTML напрямую curl'ом
  и вытащил `<img>` теги руками — на странице три официальных скриншота Apple threat
  notification: lock screen iPhone 640×1320, Settings iPhone 640×1320, оба вертикальные,
  и account.apple.com в Safari 1632×528, горизонтальный).
- Тип: официальный скриншот Apple (cdsassets.apple.com — CDN самой Apple, тот же
  первоисточник, что уже в sources статьи)
- Содержимое: браузерное окно Safari с alert-блоком "Threat Notification — Apple
  sent you a threat notification via email and iPhone alert on [date]. View Details"
  на account.apple.com — прямая иллюстрация темы статьи, без людей и без логотипов
  NSO/Pegasus.
- Обработка: `python3 scripts/prepare-image.py /tmp/apple-threat-safari.png
  apple-spyware-alert-2026-08 --month=2026-08`
  ```json
  {
    "source": {"width": 1632, "height": 528},
    "fit": {
      "mode": "cover",
      "scale": 1.7045,
      "cropLoss": 0.4248,
      "offset": [517, 0],
      "note": "обрезано 42% по ширине; окно кропа выбрано по содержимому; исходник растянут в 1.70× ради заливки кадра"
    },
    "output": {
      "path": "public/images/posts/2026-08/apple-spyware-alert-2026-08-01.jpg",
      "width": 1600, "height": 900, "bytes": 85967, "quality": 90
    },
    "status": "ok"
  }
  ```
  Проверил визуально итоговый кадр: блок "Threat Notification" с полным читаемым
  текстом остался в кадре целиком (умный кроп по содержимому попал точно в центр
  масс alert-блока), обрезаны только пустые поля браузера по краям. Подложки/леттербокса
  нет — залито кроем (cover), горизонтальный исходник, как и требуется.

## Отклонённые варианты
- https://cdsassets.apple.com/live/7WUAS350/images/apple-account/ios-26-iphone-17-pro-lock-screen-threat-notification.png
  (640×1320) — вертикальный портретный скриншот iPhone lock screen, при заливке
  16:9 потерял бы больше половины кадра; ушёл бы в contain-подложку, что red flag
  по правилу владельца от 04.08 — предпочёл горизонтальный вариант.
- https://cdsassets.apple.com/live/7WUAS350/images/apple-account/ios-26-iphone-17-pro-settings-threat-notification.png
  (640×1320) — тот же случай, вертикальный, отклонён по той же причине.
- TechCrunch — картинки самой статьи не использовались как источник (не в
  приоритете, официальный скриншот Apple лучше по субъекту и лицензионно чище).

## Alt-текст
"Скриншот официального предупреждения Apple о слежке (Threat Notification)
в разделе Apple Account на account.apple.com"

## Уверенность в подборе: 92%
Официальный ассет Apple (тот же first-party источник, что уже в sources статьи),
прямое попадание в subject-first (показывает именно то предупреждение, о котором
статья), нет людей и нет логотипов NSO/Pegasus. Снижение с 100%: дата на скриншоте
(6 февраля 2026) — иллюстративный пример из документации Apple, не дата волны
14 августа; это нормально для официального UI-примера, но если владелец сочтёт
несовпадение даты в кадре критичным — можно заменить на один из iPhone-скриншотов
с подложкой.
