# Bild notes: chatgpt-imessage-apple-privacy

## Стратегия: stock (Unsplash, живая фотография)

## Определение главного визуального субъекта
`HANDOFF_PATH` — image-hint: «Иконка ChatGPT рядом с иконкой приложения
«Сообщения» (iMessage) на экране Mac — живых людей в сюжете нет,
продуктовая/абстрактная иллюстрация». image-avoid: логотип Bloomberg,
стоковые «хакеры»/«бизнесмены за ноутбуком», любые лица (в материале нет
ни одного названного человека).

## Шаг A — первоисточник
`learn.chatgpt.com/docs/changelog` — проверено через WebFetch: запись за
20 августа про Apple Messages есть, но в тексте страницы нет ни og:image,
ни встроенных скриншотов/иконок — только текстовый список изменений.
Telegram-канала OpenAI как отдельного медиа-поста с изображением у этого
источника нет. Bloomberg (второй источник) исключён из поиска картинки
намеренно — прямой запрет из image-avoid («логотип Bloomberg»), плюс
Bloomberg обычно требует лицензию на фото. Путь A закрыт.

## Фототека редакции
`config/stock-photos.json` — темы только про узбекские финансы (cbu, sum,
inflation и т.п.), тема ChatGPT/Apple не входит в список — не применимо,
`pick-stock.mjs` не запрашивал.

## Шаг B — тематический сток
Точного кадра «иконка ChatGPT рядом с иконкой Messages на экране Mac» на
Unsplash не нашлось (проверил запросы `chatgpt-app-icon`, `imessage-icon`,
`macbook-messages-app`, `iphone-messages-app-icon`) — либо это отдельные
макро-снимки одной иконки на нейтральном фоне (не связаны с Mac/ChatGPT
сюжетом), либо фото Mac-дока 2021 года (до релиза ChatGPT, иконки в доке
физически не может быть). Композицию из двух разных фото собирать нельзя —
`prepare-image.py` принимает один исходник, ручной монтаж запрещён
правилами.
Расширил поиск до «живое фото ChatGPT/OpenAI на экране Mac» — нашёл и
выбрал кадр ниже как ближайший честный subject-first компромисс: показывает
именно ChatGPT/OpenAI (герой новости) на экране ноутбука, без обеих
запрещённых категорий (люди, Bloomberg).

## Источник картинки (выбран)
- URL: https://unsplash.com/photos/a-computer-screen-with-a-web-page-on-it-oLthDWAG244
  (raw: https://images.unsplash.com/photo-1676272682018-b1435bad1cf0)
- Фотограф: Rolf van Root (@freshvanroot), Unsplash License — свободное
  коммерческое использование с указанием автора
- Тип: живая макро-фотография экрана MacBook (клавиатура видна в кадре) с
  открытой страницей OpenAI — логотип OpenAI и заголовок «ChatGPT:
  Optimizing Language Models for Dialogue» читаются чётко. Не рендер, не
  диаграмма, не заготовка; фиолетовые полосы справа — декоративный элемент
  фона самой страницы OpenAI, не график с данными.
- Проверка на повтор: `node scripts/photo-dupes.mjs --check` — свободен,
  за 2 дня не выходил. Также сверил вручную с недавно использованными в
  других материалах кадрами ChatGPT/OpenAI (`anthropic-openai-revenue`,
  `openai-ipo-turmoil-safety-team`) — это другой файл, другой фотограф.
- Размер оригинала: 3000×2000 (ratio 1,5, горизонтальный нативно) →
  `prepare-image.py`, режим cover, масштаб 0,5333, обрезка 15,62% по высоте
  (ниже порога crop-risky 0,25 и порога автопереключения на contain 0,22) →
  1600×900 (201 378 байт, quality 90). Апскейла не было.

```json
{
  "source": {"width": 3000, "height": 2000, "path": "/tmp/original.jpg"},
  "fit": {"mode": "cover", "scale": 0.5333, "cropLoss": 0.1562, "offset": [0, 136],
    "upscaled": false, "note": "обрезано 16% по высоте; окно кропа выбрано по содержимому"},
  "output": {"path": "public/images/posts/2026-08/chatgpt-imessage-apple-privacy-01.jpg",
    "url": "/images/posts/2026-08/chatgpt-imessage-apple-privacy-01.jpg",
    "width": 1600, "height": 900, "bytes": 201378, "quality": 90},
  "status": "ok",
  "upscaled": false
}
```

## AI-генерация (Higgsfield)
Недоступна в этом прогоне: в наборе инструментов нет MCP-тула для
Higgsfield (как и в прошлых прогонах — см. `bild-notes-anthropic-openai-
revenue.md`, `bild-notes-apple-att-prompt-changes-germany-eu.md`).
Вариант C физически недостижим, иначе он закрыл бы этот сюжет точнее
(нейтральная иллюстрация «иконка ChatGPT + иконка Messages» без брендовых
рисков).

## Отклонённые варианты
- `learn.chatgpt.com/docs/changelog` — нет изображений на странице вообще
- BoliviaInteligente, «Chatgpt atlas app icon on abstract background»
  (unsplash.com/photos/k0-znb2hshs) — стилизованная иллюстрация логотипа
  на кинотеатральном экране с радужным градиентом, не про Mac/Messages,
  выглядит как рекламный ассет, а не документальное фото
- BoliviaInteligente, «Smartphone displaying chatgpt atlas app»
  (unsplash.com/photos/M50hP_OXYB4) — портретная ориентация, отклонено по
  правилу «ищи горизонталь, а не спасай вертикаль»
- Отдельные макро-фото иконки Messages (Mariia Berezovsky, Eyestetix
  Studio) — квадратный формат, изолированная иконка без контекста Mac/
  ChatGPT, монтаж с другим фото запрещён
- TheRegisti / Visual Karsa, Mac-док с иконками (2021 год) — реального
  ChatGPT-иконки в кадре быть не может: фото датировано до релиза ChatGPT
  (ноябрь 2022)
- Brett Wharton, «laptop displaying openai 4.0 chatbot interface» — по
  факту на экране Claude AI, а не ChatGPT (несовпадение подписи с
  содержимым), отклонено как вводящее в заблуждение
- Levart_Photographer, экран ChatGPT (photo-1675865254433) — уже
  использован 20.08.2026 в `content/posts/2026-08-20/anthropic-openai-
  revenue.mdx`, повтор в ленте за 2 дня, пропущен
- Andrew Neel, логотип OpenAI на мониторе (photo-1679403766665) — уже
  использован 17.08.2026 в `openai-ipo-turmoil-safety-team`, не дубликат
  по 2-дневному окну, но выбрал более свежий/менее использованный кадр
  того же типа

## Alt-текст
«Экран ноутбука Mac крупным планом с логотипом OpenAI и заголовком ChatGPT
на сайте компании»

## Уверенность в подборе: 58%
Живая фотография, горизонтальная, обрезка далеко ниже порога, свежий файл
(не дубликат за 2 дня), без людей и без запрещённого логотипа Bloomberg —
формальные критерии соблюдены. Не выше, потому что subject-first выполнен
частично: кадр показывает ChatGPT/OpenAI, но не показывает вторую половину
сюжета — интеграцию с Apple Messages/iMessage, как просил image-hint.
Точного кадра «две иконки рядом на экране Mac» в открытых источниках нет,
а AI-генерация, которая закрыла бы этот пробел нейтральной иллюстрацией,
в этой среде технически недоступна.
