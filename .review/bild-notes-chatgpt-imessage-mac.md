# Bild notes: chatgpt-imessage-mac

## Стратегия: stock (Unsplash, живая фотография)

## Контекст: дубль сюжета
Материал — третий текст про один и тот же релиз (плагин ChatGPT Apple
Messages на Mac) наравне с уже опубликованными `chatgpt-apple-messages-plugin`
и `chatgpt-imessage-apple-privacy` (оба от 2026-08-21). Обе картинки под них
уже стоят в ленте — использовать те же файлы повторно нельзя (байтовый
дубликат), нужен третий самостоятельный кадр.

## Определение субъекта
`HANDOFF_PATH` — image-hint: «Экран Mac с приложением ChatGPT рядом с иконкой
приложения «Сообщения» (Messages) — субъект интерфейс продукта, живых людей
на кадре нет». image-avoid: логотипы конкурентов (Gemini, Claude); реальная
переписка/личные сообщения человека — только интерфейс/иконки.

## Шаг A — первоисточник
- `learn.chatgpt.com/docs/plugins?surface=app` (source статьи) — проверил HTML
  напрямую (curl): og:image общий (`/og/docs/plugins.png`), встроенные
  скриншоты — только про GitHub-плагин и CLI Codex, ни одного изображения
  про Apple Messages/iMessage. Путь закрыт.
- TechCrunch (source статьи) — featured image оказался
  `GettyImages-1831275897.jpg` (Gabby Jones/Bloomberg via Getty Images,
  «Apple Messages app in the App Store on a smartphone») — отклонено: Getty
  в списке платных источников с риском иска, к тому же это App Store, а не
  сам плагин ChatGPT.
- 9to5Mac (не входит в sources этой статьи, но освещал тот же релиз) —
  проверил на предмет свежего кандидата, не занятого другими материалами:
  - `chatgpt-messages.jpg` (скриншот системного диалога macOS «Enable ChatGPT
    with Messages») — уже стоит под `chatgpt-apple-messages-plugin-01.jpg`,
    повторное использование запрещено.
  - `Screenshot-2026-08-20-at-7.39.43-PM.png` (второй встроенный скриншот,
    1576×512) — отклонён по двум причинам: (1) показывает реальное имя
    контакта «Chance Miller» и текст сообщения «lol» — прямое нарушение
    image-avoid («не показывать реальную переписку/личные сообщения»);
    (2) панорамный формат 3.08:1 потребовал бы обрезки ~42% по ширине —
    выше порога 22%, `prepare-image.py` ушёл бы в подложку.
  - `chatgpt-messages.webp` (1600×800/2000×1000, композиция «иконка OpenAI +
    иконка Messages рядом» на сером фоне, с водяным знаком 9to5Mac) — точно
    закрывает image-hint, но это глянцевый 3D-рендер иконок, а не живая
    фотография. По правилу №2 редполитики («рисованные 3D-заготовки... не
    берём даже из первоисточника») и по прецеденту в
    `bild-notes-chatgpt-apple-messages-plugin.md` (тот же файл уже
    рассматривался и был отклонён как «рендер-иконка, не живой скриншот») —
    не использовал, несмотря на точное попадание в hint.

## Фототека редакции
`config/stock-photos.json` — темы только про узбекские финансы (cbu, sum,
inflation и т.п.), тема ChatGPT/Apple не входит — `pick-stock.mjs` не
запрашивал.

## Шаг B — тематический сток
Искал на Unsplash свежий (не занятый другими материалами кластера) live-фото
ChatGPT/OpenAI на экране. Уже использованы в других постах: Levart_Photographer
(`anthropic-openai-revenue`), Andrew Neel (`openai-ipo-turmoil-safety-team`),
Rolf van Root (`chatgpt-imessage-apple-privacy`). Новый вариант — Jonathan
Kemper, фото экрана монитора со страницей блога OpenAI «Introducing ChatGPT
Plus» (2023 год, но кадр нейтральный, дата не читается как «устаревшая
новость»): виден логотип OpenAI, заголовок ChatGPT, без людей, без логотипов
конкурентов, горизонтальная ориентация (1.5:1).

Точного кадра «иконка ChatGPT рядом с иконкой Messages на экране Mac» в
живой фотографии не нашлось — как и в предыдущем прогоне для
`chatgpt-imessage-apple-privacy`, это ожидаемый пробел: subject «двух иконок
рядом» реален только как рендер/скриншот, а не как естественный
фотографируемый объект.

## Источник картинки (выбран)
- Фотограф: Jonathan Kemper (@jonathankemper), Unsplash License — свободное
  коммерческое использование с указанием автора
- Photo ID: N8AYH8R2rWQ
- raw: https://images.unsplash.com/photo-1675557010061-315772f6efef
- Проверка на повтор: `node scripts/photo-dupes.mjs --check` — свободен, за
  2 дня не выходил
- Размер оригинала: 3000×2000 (ratio 1.5, горизонтальный нативно)

```json
{
  "source": {"width": 3000, "height": 2000, "path": "/tmp/.../original.jpg"},
  "fit": {"mode": "cover", "scale": 0.5333, "cropLoss": 0.1562, "offset": [0, 158],
    "upscaled": false, "note": "обрезано 16% по высоте; окно кропа выбрано по содержимому"},
  "output": {"path": "public/images/posts/2026-08/chatgpt-imessage-mac-01.jpg",
    "url": "/images/posts/2026-08/chatgpt-imessage-mac-01.jpg",
    "width": 1600, "height": 900, "bytes": 170286, "quality": 90},
  "status": "ok",
  "upscaled": false
}
```

Апскейла нет, обрезка (15.6%) ниже порога crop-risky (0.25) и ниже порога
автоподложки (0.22). В кадре после кропа остаются: логотип OpenAI (частично),
заголовок «Introducing ChatGPT Plus», подзаголовок — самодостаточно читаемо.

## AI-генерация (Higgsfield)
Не потребовалась — нашёлся приемлемый живой вариант через Unsplash.

## Отклонённые варианты
- OpenAI docs (learn.chatgpt.com/docs/plugins) — нет изображений про Apple
  Messages на странице
- TechCrunch featured image (GettyImages-1831275897.jpg) — платный источник
  Getty, риск copyright; к тому же показывает App Store, а не плагин
- 9to5Mac `chatgpt-messages.jpg` — уже использован в `chatgpt-apple-messages-
  plugin-01.jpg`, повтор запрещён
- 9to5Mac `Screenshot-2026-08-20-at-7.39.43-PM.png` — реальное имя контакта и
  текст личного сообщения в кадре (нарушение image-avoid) + панорамный формат
  требует обрезки 42% (выше порога)
- 9to5Mac `chatgpt-messages.webp` (иконка OpenAI + иконка Messages на сером
  фоне) — точно по hint, но глянцевый 3D-рендер, не живая фотография;
  отклонено по правилу №2 и по прецеденту в bild-notes сиблинг-статьи
- Levart_Photographer, Andrew Neel, Rolf van Root (Unsplash) — уже
  использованы в других материалах кластера ChatGPT/OpenAI за последние дни

## Alt-текст
«Крупный план экрана монитора со страницей блога OpenAI «Introducing ChatGPT
Plus» — виден логотип OpenAI и заголовок ChatGPT»

## Уверенность в подборе: 55%
Живая фотография, горизонтальная, обрезка далеко ниже порога, свежий файл
(не дубликат других постов кластера), без людей и без логотипов конкурентов —
формальные критерии соблюдены. Не выше, потому что subject-first выполнен
частично: кадр показывает ChatGPT/OpenAI, но не показывает вторую половину
сюжета — иконку/интерфейс Apple Messages, как просил image-hint. Кадр,
который показывал бы обе иконки рядом, существует только как рендер
(9to5Mac, отклонён по правилу №2) — живой фотографии такого сюжета в природе
не бывает.
