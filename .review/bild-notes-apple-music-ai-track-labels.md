# Bild notes: apple-music-ai-track-labels

## Стратегия: stock (Unsplash, живая фотография)

## Ход отбора
1. Прочитал `HANDOFF_PATH`: image-hint — «интерфейс Apple Music с меткой/
   тегом AI-контента, либо нейтральная иллюстрация «AI и музыка» — явного
   человека-субъекта в теме нет»; image-avoid — не показывать логотипы
   Variety/Engadget как главный сюжет, без стоковых «роботов-музыкантов».
2. Проверил `sources` на официальные фото (пункт A):
   - Engadget og:image — `intro-1787262611.jpg`, кредит «Kevin Carter/Getty
     Images» → чёрный список (Getty), отклонил.
   - TechCrunch og:image — обычная иконка приложения Apple Music на экране
     iPhone (`apple-music-icon-ios-2020.jpg`, 2020 год), не относится к теме
     Transparency Tags конкретно, кредит просто «TechCrunch» без ясной
     лицензии на переиспользование → не взял, предпочёл проверенный
     Unsplash-источник с явной лицензией.
   - Variety — сама статья за пейволом (402), og:image не проверял смысла
     нет: как источник для лицензии не годится в любом случае.
   - Apple Newsroom — официальной пресс-страницы про Transparency Tags не
     нашёл (404): фича ещё не анонсирована официально, это утечка.
3. `config/stock-photos.json` / `pick-stock.mjs --list` — темы фототеки
   только денежно-кредитные (cbu, sum, инфляция и т.п.), тема Apple/AI-музыки
   не входит → не применимо.
4. AI-генерация (Higgsfield): инструмента генерации в наборе тулов агента
   нет — физически недоступна в этой среде (тот же вывод, что в прежних
   прогонах, см. bild-notes-anthropic-openai-revenue.md,
   bild-notes-microsoft-defender-shieldbreak-zeroday.md). Пропустил как
   недоступную опцию, перешёл к публичному стоку (B1).
5. Искал на Unsplash: запросы «apple-music», «ai-music», «music-streaming-app»,
   «apple-music-app-screen». Отклонённые кандидаты:
   - «robot playing piano» — ровно тот стоковый «робот-музыкант», который
     запрещён явно в handoff.
   - Несколько результатов «AI» объёмными металлическими буквами — рисованная
     3D-заготовка, запрещена правилом №2.
   - 3D-рендер значка Apple Music (Mariia Shalabaieva, Blender) — глянцевый
     3D-рендер, запрещён правилом №2, несмотря на точное попадание в тему.
   - «turned-on smartphone with music display» (Tyler Lastovich) — экран
     показывает интерфейс Spotify, не Apple Music: неверный бренд для темы
     про Apple Music.
   - «space gray iphone x showing spotify application» — тоже Spotify.
6. Выбрал: реальное фото домашнего экрана iPhone крупным планом, в фокусе —
   иконка приложения Music (красный квадрат с белой нотой), подпись «Music»
   видна частично, вокруг — иконки Notes/Contacts/SoundCloud не мешают
   восприятию. Живая макросъёмка экрана, не рендер, не скриншот.

## Источник картинки
- URL: https://unsplash.com/photos/black-and-red-digital-device-IHecRXio89c
  (raw: https://images.unsplash.com/photo-1600783245357-dae0e49605aa)
- Автор: Brett Jordan, Unsplash License (свободное коммерческое использование)
- Тип: живая макросъёмка экрана iPhone с иконкой Apple Music, не рендер
- Проверка на повтор: `photo-dupes.mjs --check` — свободен, за 2 дня не выходил
- Размер оригинала: 5184×3888 → `prepare-image.py` mode=cover, scale=0,3086,
  cropLoss=0,25 (обрезка 25% по высоте, в пределах MAX_CROP=0,45 скрипта) →
  1600×900, 373 465 байт, quality 90, upscaled=false

```json
{
  "source": {"width": 5184, "height": 3888},
  "fit": {"mode": "cover", "scale": 0.3086, "cropLoss": 0.25, "offset": [0, 0], "upscaled": false},
  "output": {
    "path": "public/images/posts/2026-08/apple-music-ai-track-labels-01.jpg",
    "url": "/images/posts/2026-08/apple-music-ai-track-labels-01.jpg",
    "width": 1600, "height": 900, "bytes": 373465, "quality": 90
  },
  "status": "ok"
}
```

## Отклонённые варианты
- Engadget og:image — «Apple Music logo on red wall screen», кредит Kevin
  Carter/Getty Images → чёрный список источников (Getty)
- TechCrunch og:image — общая иконка Apple Music 2020 года без ясной лицензии
  переиспользования, не про Transparency Tags конкретно
- Unsplash «robot playing piano» — стоковый робот-музыкант, прямой запрет
  handoff
- Unsplash 3D-рендер значка Apple Music (Blender, Mariia Shalabaieva) —
  глянцевый 3D-рендер, запрещён правилом №2
- Unsplash фото с интерфейсом Spotify (2 варианта) — неверный бренд для
  материала про Apple Music
- Apple Newsroom — официальной страницы анонса не существует (утечка,
  не подтверждённая функция)

## Alt-текст
«Значок приложения Apple Music крупным планом на экране iPhone — красная
иконка с белой нотой среди других иконок домашнего экрана»

## Уверенность в подборе: 70%
Живая фотография, горизонтальная, узнаваемый и точный по теме бренд (Apple
Music), без роботов, без 3D-рендера, без логотипов Variety/Engadget, без
конкурентных брендов. Не хватает прямой привязки к самой фиче Transparency
Tags/AI-меток — такого кадра в открытом доступе не существует, потому что
фича ещё не запущена официально (это утечка). Иконка приложения — второй
по силе вариант из handoff («нейтральная иллюстрация Apple Music») и лучший
доступный live-фото компромисс.
