# Bild notes: openai-gains-on-anthropic-ramp-data

## Стратегия: stock (Unsplash, живая фотография)

## Ход отбора
1. Прочитал `HANDOFF_PATH`: image-hint — логотипы/бренд-знаки OpenAI и
   Anthropic рядом или график доли корпоративных клиентов, явного живого
   субъекта нет; image-avoid — не брать стоковых «бизнесменов», не подписывать
   фото как официальное изображение Ramp (Ramp — источник данных, не
   ньюсмейкер с публичным лицом).
2. Официальный источник (шаг A): `sources` — TechCrunch (деловое СМИ,
   пересказ) и Ramp AI Index (аналитическая страница-индекс, не пресс-релиз
   с фото). Официального фото под тему «доля рынка среди бизнес-клиентов»
   в природе не бывает — пропустил этот пункт по существу задачи.
3. Фототека редакции (`config/stock-photos.json` / `pick-stock.mjs --list`):
   темы только денежно-кредитные (cbu, sum, cash, inflation, prices, budget,
   salaries, payments, banking) — тема AI-компаний не входит в список, не
   применимо.
4. AI-генерация (Higgsfield): в наборе тулов этого прогона нет вызываемой
   функции генерации изображений и нет соответствующего скрипта в
   репозитории — физически недоступна в этой среде (тот же вывод, что и в
   прежних прогонах по AI/tech темам, см. bild-notes-anthropic-openai-revenue.md,
   bild-notes-nvidia-amd-open-model-race.md). Пропустил как недоступную опцию,
   перешёл к B1.
5. Unsplash-поиск:
   - Запрос «chatgpt» дал кандидат `fvxNerA8uk0` (Emiliano Vittoriosi,
     MacBook с домашним экраном ChatGPT) — визуально почти повторяет уже
     опубликованный вчера кадр `anthropic-openai-revenue` (тот же экран
     «Examples/Capabilities/Limitations» ChatGPT, другой фотограф) → отклонил
     из соображений визуального разнообразия ленты, даже при формально другом
     файле.
   - Запрос «claude-ai» дал серию кадров Solen Feyissa — среди них
     `zQvPAtGxQh0`: реальное фото экрана смартфона с папкой приложений «AI»,
     в которой видны иконки ChatGPT, Claude, Gemini, DeepSeek, Copilot,
     Mistral AI, Poe. Показывает ОБА героя материала (OpenAI и Anthropic)
     на одном живом кадре — сильнее subject-first, чем скриншот одного
     интерфейса, и прямо иллюстрирует тезис статьи о том, что бизнесы
     держат/сравнивают несколько ИИ-провайдеров одновременно. Людей в кадре
     нет (image-avoid соблюдён), рендеров/3D-заготовок нет — это документальная
     фотография экрана телефона.
6. Проверка на повтор: `photo-dupes.mjs --check` — свободен, за 2 дня этот
   кадр не выходил.

## Источник картинки
- Страница: https://unsplash.com/photos/zQvPAtGxQh0
- Прямая ссылка: https://images.unsplash.com/photo-1738107450304-32178e2e9b68
- Автор: Solen Feyissa (@solenfeyissa), Unsplash License (свободное
  коммерческое использование с атрибуцией), опубликовано 28.01.2025
- Тип: живая фотография экрана смартфона (папка приложений «AI»), не
  рендер, не иллюстрация, без людей в кадре
- Размер оригинала: 3000×2001 (ratio 1,4996) → `prepare-image.py` mode=cover,
  scale=0,5333, cropLoss=0,1567 (обрезка ~16% по высоте, ниже лимита 0,45) →
  1600×900, 112 937 байт, quality 90
- Визуально проверил итоговый кадр: иконки ChatGPT и Claude полностью в
  кадре и читаемы, ключевая композиция не срезана

## Обработка
```
curl -sL "https://images.unsplash.com/photo-1738107450304-32178e2e9b68?q=90&w=3000&auto=format&fit=max" -o /tmp/original2.jpg
node scripts/photo-dupes.mjs --check /tmp/original2.jpg   # свободен
python3 scripts/prepare-image.py /tmp/original2.jpg openai-gains-on-anthropic-ramp-data --month=2026-08
```
```json
{
  "source": {"width": 3000, "height": 2001},
  "fit": {"mode": "cover", "scale": 0.5333, "cropLoss": 0.1567, "offset": [0, 0],
    "upscaled": false, "note": "обрезано 16% по высоте; окно кропа выбрано по содержимому"},
  "output": {"path": "public/images/posts/2026-08/openai-gains-on-anthropic-ramp-data-01.jpg",
    "url": "/images/posts/2026-08/openai-gains-on-anthropic-ramp-data-01.jpg",
    "width": 1600, "height": 900, "bytes": 112937, "quality": 90},
  "status": "ok", "upscaled": false
}
```

## Отклонённые варианты
- Unsplash `fvxNerA8uk0` (Emiliano Vittoriosi, MacBook с домашним экраном
  ChatGPT) — визуально дублирует по сюжету кадр, уже опубликованный
  накануне под `anthropic-openai-revenue` (тот же тип кадра — экран
  ChatGPT «Capabilities/Limitations»); отклонил ради разнообразия ленты
- Unsplash поиск «artificial intelligence office» (`YI_9SivVt_s`,
  `U2BI3GMnSSE`, `QBpZGqEMsKg`, `kN_kViDchA0`, `pYlBAu3de0w`) — generic
  фото офисных людей, нарушает image-avoid («не стоковых бизнесменов»),
  не показывает субъект темы напрямую
- Unsplash `RwoT2g5SGRw` (Solen Feyissa) — экран телефона с ChatGPT и
  DeepSeek в мультизадачности, Claude в кадре нет — слабее по subject-first,
  чем выбранный вариант
- Higgsfield-генерация — инструмент недоступен в этой среде (нет MCP-тула,
  нет скрипта в репозитории)

## Alt-текст
«Экран смартфона с папкой приложений «AI»: рядом видны значки ChatGPT
(OpenAI), Claude (Anthropic), Gemini, DeepSeek, Copilot, Mistral AI и Poe»

## Уверенность в подборе: 74%
Живая документальная фотография, горизонтальная (1600×900 без риска
кропа), открытая лицензия с понятной атрибуцией, без людей и без
рисованных 3D-заготовок. Показывает оба героя материала (ChatGPT и Claude)
одновременно — сильный subject-first результат для темы без единого явного
героя. Минус от 100%: это иконки приложений на экране телефона, а не прямая
иллюстрация именно корпоративных карточных платежей Ramp или графика доли
рынка; связь с темой — символическая («бизнесы выбирают между несколькими
ИИ-провайдерами»), а не буквальная иллюстрация метрики Ramp.
