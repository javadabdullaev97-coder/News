# Bild notes: openai-ipo-turmoil-safety-team

## Стратегия: stock (Unsplash)

## Почему не primary-source
Материал корпоративный, без явного человека-героя — reporter (`mainVisualSubject`) и editor (`image-hint`) сходятся: логотип OpenAI или нейтральный корпоративный визуал/офис компании.
- openai.com — 403 (антибот), как и у reporter'а на этапе фактчека.
- cnbc.com (обе статьи — Lightcap, red-flag) — 403 через curl, подтверждает 403 из reporter-notes.
- fortune.com — 403.
- the-decoder.com — доступен, `og:image` есть (`openai_logo_orange.png`, 1376×768, горизонтальный), но это декоративный плоский паттерн логотипа (не фотография, не официальный ассет OpenAI, а собственная иллюстрация The Decoder) — отклонён по правилу «только живая фотография» и по image-avoid из handoff («логотипы CNBC/The Decoder/Engadget/Fortune — конкурентные СМИ, только источники»).
- engadget.com — доступен, `og:image` есть (1600×899, монитор с логотипом OpenAI на синем фоне), но в HTML прямо указан credit «Samuel Bovin/Shutterstock» — платный сток, прямой запрет правил («Не тащи с Getty, Shutterstock, Depositphotos»). Отклонён.

## Фототека редакции
`config/stock-photos.json` — темы только про узбекские финансы (cbu, sum, cash, inflation и т.п.), для OpenAI/tech тем не подходит. Не запрашивал `pick-stock.mjs`.

## Источник картинки (выбран)
- URL: https://images.unsplash.com/photo-1679403766665-67ed6cd2df30
- Найдена через поиск Unsplash по запросу "openai", orientation=landscape.
- Фотограф: Andrew Neel (@andrewtneel), страница https://unsplash.com/photos/the-open-ai-logo-is-displayed-on-a-computer-screen-hZkOZGtlA5w — подтверждено «Free to use under the Unsplash License».
- Тип: живая фотография — монитор с логотипом OpenAI на экране, синий градиентный фон студийной съёмки. Не рендер, не диаграмма, не заготовка.
- Размер оригинала: 5724×3816 (соотношение 1,5, горизонтальный нативно) → prepare-image.py cover, scale 0.2795, cropLoss 15.62% (< 22%, лимит не задет), апскейла нет → 1600×900 (110 КБ, q90).

```json
{
  "source": {"width": 5724, "height": 3816},
  "fit": {"mode": "cover", "scale": 0.2795, "cropLoss": 0.1562, "offset": [0, 167], "upscaled": false},
  "output": {"width": 1600, "height": 900, "bytes": 109645, "quality": 90},
  "status": "ok"
}
```

## Отклонённые варианты
- the-decoder.com og:image — декоративный плоский паттерн логотипа (не фото), не официальный ассет OpenAI.
- engadget.com og:image — Shutterstock-лицензия (Samuel Bovin/Shutterstock), платный сток — запрещён правилами.
- images.unsplash.com/photo-1745674684468-b9fc392fda3f (ноутбук с интерфейсом ChatGPT, Aerps.com) — уже использован сегодня же (17.08.2026) в другой статье про OpenAI (`openai-enterprise-revenue-bigger-consumer`), опубликованной в тот же день — повтор в ленте, пропущен в пользу другого кадра.
- images.unsplash.com/photo-1679403766680-9aa2b959417d (тот же монитор, светлый экран, Andrew Neel) — равноценный вариант того же фотографа, не выбран, оставлен как альтернатива при необходимости.

## Alt-текст
"Логотип OpenAI светится на экране тёмного монитора на синем фоне"

## Уверенность в подборе: 70%
Картинка — нейтральный логотип-визуал компании, ровно то, что просят handoff и reporter при отсутствии героя-человека. Снижение от 100%: абстрактный корпоративный кадр не передаёт конкретику сюжета (роспуск команды безопасности, уходы топ-менеджеров) — это ожидаемый компромисс для новости без публичного события/лица, живой фотографии по существу темы (офис, реальное совещание) не нашлось ни в одном доступном источнике.
