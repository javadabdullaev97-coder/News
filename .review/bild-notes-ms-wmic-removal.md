# Bild notes: ms-wmic-removal

## Стратегия: stock (Unsplash, живая фотография)

## mainVisualSubject / image-hint
Reporter-notes: «экран Windows 11 / терминал командной строки — явного
человека-субъекта в теме нет, подойдёт продуктовая иллюстрация или
нейтральная инфографика Windows 11».
Handoff (image-hint/image-avoid): «экран Windows 11 / окно командной строки
(терминал) с намёком на код или системную утилиту»; избегать стокового
«хакера в капюшоне» и логотипов BleepingComputer/сторонних СМИ.

## Почему не A (первоисточник)
Все четыре `sources` — текстовые страницы без иллюстративного контента:
две страницы Microsoft Learn release notes (списки изменений сборки,
без медиа), страница Microsoft Support (справочная статья, без фото),
BleepingComputer (СМИ-агрегатор, использовать логотип/иллюстрацию нельзя
по правилу «без логотипов сторонних СМИ»). У обновления Windows Insider/
Release Preview официального пресс-фото не бывает в природе — сразу
переход к стоку.

## Почему не B0 (фототека редакции)
`config/stock-photos.json` содержит только финансовые темы (cbu, sum,
fx, inflation, banking, payments, monetary-policy) — кибербезопасности
и IT там нет. `pick-stock.mjs` не запускал: по списку тем результата
заведомо не будет (тот же вывод, что в прецедентах
`bild-notes-microsoft-defender-shieldbreak-zeroday.md` и
`bild-notes-microsoft-patch-tuesday-august-2026.md`).

## Источник картинки
- Поиск через публичную выдачу Unsplash (`unsplash.com/s/photos/
  terminal-command-line`), запрос ориентирован на «terminal command
  line», «horizontal, no people, dark background».
- Проверено 5 кандидатов. Выбран:
  **Jake Walker**, «Green computer code text scrolling on a dark screen
  during a software installation».
  Detail page: https://unsplash.com/photos/MPKQiDpMyqU
  Direct URL: https://images.unsplash.com/photo-1608742213509-815b97c30b36
  Лицензия: Unsplash License (свободное использование), подтверждена
  через страницу фото.
- Тип: живая фотография экрана монитора крупным планом — вывод команд
  установки пакетов зелёным моноширинным шрифтом на тёмном фоне, ракурс
  под углом (боке). Не 3D-рендер, не иконка, не скриншот таблицы/
  презентации.
- Размер оригинала: 3000×2000 (соотношение 1,5 — горизонтальный, проходит
  порог «от ~1.3»).
- Содержание текста на экране не относится к Windows/WMIC буквально
  (вывод apt/Raspberry Pi bootloader) — используется как символическое
  изображение «терминал/командная строка», аналогично прецеденту
  microsoft-defender-shieldbreak-zeroday, где абстрактный код на экране
  стоял за темой уязвимости без прямой привязки к конкретному CVE.

## Обработка
```
python3 scripts/prepare-image.py original.jpg ms-wmic-removal --month=2026-08
```
```json
{
  "source": {"width": 3000, "height": 2000},
  "fit": {
    "mode": "cover",
    "scale": 0.5333,
    "cropLoss": 0.1562,
    "offset": [0, 88],
    "upscaled": false,
    "note": "обрезано 16% по высоте; окно кропа выбрано по содержимому"
  },
  "output": {
    "path": "public/images/posts/2026-08/ms-wmic-removal-01.jpg",
    "url": "/images/posts/2026-08/ms-wmic-removal-01.jpg",
    "width": 1600, "height": 900, "bytes": 311672, "quality": 90
  },
  "status": "ok",
  "upscaled": false
}
```
Cover-режим, апскейла нет, обрезка 16% (< 22% лимита скрипта и < 25%
порога crop-risky). `crop-risky` не применяю: это не фотография с
явным физическим субъектом (человек/животное/здание/документ) — это
абстрактный текст на экране, обрезка полей смысла не меняет.

`node scripts/photo-dupes.mjs --check` — до обработки (на оригинале) и
после (на готовом файле): оба раза «свободен, за 2 дн. этот кадр не
выходил». Отдельно проверено, что кадр не пересекается с
`/images/posts/2026-08/ai-infra-financing-wall-street-01.jpg` — темы и
содержание визуально и по байтам не совпадают.

## Отклонённые варианты
- Nick Karvounis, «a computer screen with a bunch of text on it» (CSS/WP
  код в редакторе, цветной синтаксис) — композиционно похож на кадр,
  уже использованный в `microsoft-defender-shieldbreak-zeroday-01.jpg`
  (крупный план цветного кода на экране); чтобы лента не выглядела
  повтором соседней темы про Microsoft, выбрал визуально другой кадр
  (монохромный зелёный терминал вместо цветного редактора кода).
- Ferenc Almasi, Bernd Dittrich, Ilnur — код на экране/ноутбуке общего
  вида, менее точно передают «командную строку» из image-hint, чем
  явный терминал с построчным выводом команд.
- Openverse (`julia terminal iterm`, `vim goyo terminal`) — формально
  CC0, но это скриншоты редактора/интерпретатора Julia, не фото живого
  экрана, и менее фотографичны (плоские скриншоты, а не съёмка монитора).
- Wikimedia («VS Code Screenshot», «Locomotive BASIC...») — чёрный
  список источников (Wikipedia/Wikimedia), не рассматривались всерьёз.
- Higgsfield AI-генерация — до неё не дошло, сток найден раньше по
  порядку попыток; инструмента генерации в наборе тулов агента нет
  (тот же вывод, что в прецедентных bild-notes).

## Alt-текст
«Крупный план тёмного экрана монитора с зелёным текстом вывода командной
строки — символическое изображение утилиты WMIC»

## Credit
`Unsplash / Jake Walker` — Unsplash License, подтверждена на странице
фото (unsplash.com/photos/MPKQiDpMyqU).

## Уверенность в подборе: 80%
Живая фотография, горизонтальная (1,5), без людей, без хакера в
капюшоне, без логотипов сторонних СМИ, тематически привязана к
«командной строке» из image-hint точнее, чем абстрактный код общего
вида. Снижение с 100%: содержимое экрана (Linux/Raspberry Pi package
install) не связано с Windows/WMIC буквально — символическое
использование, как и в прецедентах для похожих тем без физического
субъекта; более прицельного кадра (реальный Windows CMD/WMIC на
экране) в свободных источниках не нашлось.
