# Bild notes: windows-11-august-update-games

## Стратегия: stock (Pexels, живая фотография)

## mainVisualSubject / image-hint
Handoff (`image-hint`): «Экран ноутбука с открытым центром обновлений Windows 11
или логотип Windows 11 на мониторе. Явного визуального субъекта у темы нет».
`image-avoid`: скриншоты/кадры конкретных игр (ARC Raiders, The Finals, MARVEL
Tōkon) — права издателей; стоковые «геймеры в наушниках»; синий экран смерти —
такого симптома в источнике нет. NOTES_PATH (`Main visual subject`) дублирует
ту же формулировку — отдельно не открывал, handoff был непустым.

## Почему не A (первоисточник)
Оба `sources` — страницы Microsoft Learn (`status-windows-11-25h2`,
`status-windows-11-24h2`), проверены через WebFetch. Это текстовые
release-health страницы: таблица известных проблем, никаких фото/скриншотов
в разметке — только два маленьких UI-значка (`device-desktop-download-blue.png`,
`whats-new-megaphone-blue.png`), это не иллюстрация для статьи, а иконки
навигации. Официального пресс-фото у записи о расследуемой проблеме не
бывает в природе — переход к стоку.

## Почему не B0 (фототека редакции)
`config/stock-photos.json` — темы `cbu/monetary-policy/fx/sum/inflation/
banking/payments`, IT/Windows там нет. `pick-stock.mjs` не запускал — тема
заведомо не входит в список.

## Источник картинки
Поиск: Unsplash (`windows-11-laptop`, `windows-update-screen`,
`windows-11-desktop`, `windows-11-taskbar`, `computer-restart`,
`laptop-screen-code`, `error-message-screen`, `gaming-pc-setup`,
`windows-key-keyboard`) и Openverse API (`windows 11 update screen`,
`windows update laptop`) — нигде не нашлось живой фотографии реального
экрана с открытым Windows Update/десктопом Windows 11 без риска нарушить
`image-avoid` (BSOD, геймерский сток, чужие скриншоты игр) или чёрный
список (Wikimedia). Поиск на Pexels («windows 11 laptop», «windows 11 start
menu») дал похожий результат — реальных скриншотов десктопа не нашлось,
один кандидат (Huawei-ноутбук с Deepin/Linux, не Windows) отклонён как
вводящий в заблуждение.

Выбран: **Ruben Boekeloo, Pexels**, макро-фото клавиши с логотипом Windows
на клавиатуре ноутбука. Живая фотография (не рендер, не иконка), горизонтальная
(5958×3972, ratio 1.5), без людей, без RGB-подсветки/«геймерского» стока,
без BSOD и без скриншотов конкретных игр — символически представляет
«Windows» точнее и нейтральнее, чем абстрактный сток, и полностью укладывается
в `image-avoid`. Прямая привязка к логотипу Windows соответствует второй
части `image-hint` («логотип Windows 11 на мониторе») — используется как
физический аналог логотипа (клавиша с тем же символом), а не сам монитор.

- Страница: https://www.pexels.com/photo/windows-pictograph-on-keyboard-18641167/
- Прямая ссылка: https://images.pexels.com/photos/18641167/pexels-photo-18641167.jpeg
- Автор: Ruben Boekeloo, Pexels License (бесплатное использование,
  атрибуция не обязательна по лицензии, но указана для прозрачности)
- Размер оригинала: 5958×3972 (landscape, ratio 1,5)
- Проверено `photo-dupes.mjs` до и после обработки — свободен, за 2 дня
  этот кадр не выходил.

## Обработка
```bash
curl -sL "https://images.pexels.com/photos/18641167/pexels-photo-18641167.jpeg?cs=srgb&dl=pexels-ruben-boekeloo-521336009-18641167.jpg&fm=jpg" -o /tmp/original.jpg
node scripts/photo-dupes.mjs --check /tmp/original.jpg   # свободен
python3 scripts/prepare-image.py /tmp/original.jpg windows-11-august-update-games --month=2026-08
```

```json
{
  "source": {"width": 5958, "height": 3972},
  "fit": {"mode": "cover", "scale": 0.2685, "cropLoss": 0.1562, "offset": [0, 56],
    "upscaled": false, "note": "обрезано 16% по высоте; окно кропа выбрано по содержимому"},
  "output": {"path": "public/images/posts/2026-08/windows-11-august-update-games-01.jpg",
    "url": "/images/posts/2026-08/windows-11-august-update-games-01.jpg",
    "width": 1600, "height": 900, "bytes": 175835, "quality": 90},
  "status": "ok", "upscaled": false
}
```
Cover-режим, апскейла нет, обрезка 16% (< 22% лимита и < 25% порога
crop-risky). Проверено визуально: клавиша с логотипом Windows и соседние
клавиши (Z, X, Alt, Fn) остались в кадре полностью, ничего значимого не
срезано.

## Отклонённые варианты
- Zulfugar Karimov, «Software updater with refresh arrows icon» — рисованная
  3D-иконочная панель «PC-оптимайзера», не живая фотография; тот же тип
  заготовки, что уже отклонялся в прецеденте `windows-task-host-flaw-
  ransomware-cisa` — не берём даже если формально «по теме».
- Sunny Hassan, «Windows 10 logo on black» — рендеренный wallpaper-ассет,
  не фотография, плюс логотип Windows 10, а не 11.
- Ed Hardie, «laptop with windows security button highlighted» — уже
  использован в `windows-task-host-flaw-ransomware-cisa-01.jpg` (18.08.2026);
  не переиспользовал, чтобы избежать визуального повтора соседней Windows-темы.
- Flickr/campuscodi, «Windows update» (CC0, via Openverse) — уже использован
  в `microsoft-patch-tuesday-august-2026-01.jpg` (17.08.2026); тот же повод
  отказа.
- Joshua Hoehne, «black flat screen computer monitor» — это фактически синий
  экран смерти (BSOD); прямой запрет в `image-avoid` («такого симптома в
  источнике нет»).
- Resul Kaya, «gaming setup, RGB monitor+keyboard» — на экране виден
  Windows 10 (не 11), таскбар и ярлыки лаунчеров игр (Epic, Steam), плюс
  разноцветная RGB-подсветка радугой — визуально «дёшево» и близко к
  запрещённому клише геймерского стока; отклонён.
- Andrey Matveev (zeleboba), «modern laptop with app menu» — на экране
  Huawei-ноутбука не Windows, а Deepin OS (Linux) — вводит в заблуждение,
  отклонён.
- cookiecutter, «blue screen error on data center terminal» — снова BSOD,
  отклонён по той же причине.
- Wikimedia, «Windows 10-11 update screen notice» — чёрный список
  источников (Wikipedia/Wikimedia), не рассматривался всерьёз.
- Getty/Shutterstock/Depositphotos — не искал намеренно (чёрный список
  платных стоков).
- Higgsfield AI-генерация — до неё не дошло: живой сток нашёлся раньше по
  порядку попыток (B1 сработал); инструмента генерации в наборе тулов
  агента к тому же нет в этом прогоне (та же ситуация, что в прецедентных
  bild-notes по темам Microsoft/Windows).

## Alt-текст
«Крупный план клавиши с логотипом Windows на клавиатуре ноутбука»

## Credit
`Pexels / Ruben Boekeloo`

## Уверенность в подборе: 75%
Живая фотография, горизонтальная (1,5), без людей, без BSOD, без
геймерского RGB-клише, без чужих игровых скриншотов — выполняет все условия
`image-avoid`. Логотип Windows на клавише прямо и однозначно указывает на
предмет статьи (Windows). Минус от 100%: это не буквально «экран с центром
обновлений Windows 11», как первая часть `image-hint` предлагала в
идеале, — такого кадра в открытых источниках не нашлось; использован
альтернативный, но столь же прямой визуальный маркер бренда Windows.
