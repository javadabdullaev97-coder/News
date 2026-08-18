# Bild notes: garcia-benn-wbc-welterweight-title-reaction

## Стратегия: stock

## Определение главного визуального субъекта
Reporter notes (mainVisualSubject) и handoff editor'а совпадают: Райан Гарсия —
портрет крупным планом или кадр с пресс-конференции/промо боя 12 сентября;
альтернатива — совместное промо-фото Гарсия/Бенн. image-avoid: постановочные
стоковые кадры без привязки к бою, логотипы букмекеров.

## Шаг A — первоисточники (не сработал)
- Boxing News Online (https://boxingnewsonline.net/news/garcia-on-weights-concerns-for-benn/)
  — og:image есть: `Conor-Benn-and-Ryan-Garcia.jpg`, но credit **Getty** —
  чёрный список платных источников (Getty/Shutterstock/Depositphotos), не берём
  даже с первоисточника.
- Sky Sports (https://www.skysports.com/boxing/news/12183/13561973/...) —
  единственное изображение на странице:
  `skysports-conor-benn-ryan-garcia_7294334.jpg` (Бенн и Гарсия на раздельных
  фото). Уже стоит сегодня в другом материале того же дня —
  `content/posts/2026-08-18/garcia-benn-wbc-crawford-prediction.mdx`
  (`image.credit: "Sky Sports"`, тот же файл 1600×900) — повтор кадра, не берём.
- CBS Sports (https://www.cbssports.com/boxing/news/jai-opetaia-next-fight-noel-mikaelian-ryan-garcia-vs-conor-benn-undercard/)
  — og:image это Джай Опетайя (не наш субъект) и снова credit Getty.
- WBC (wbcboxing.com), Golden Boy Promotions, DAZN, Ring Magazine — сайты либо
  403 (блокируют бота), либо не дали релевантной страницы через доступные
  инструменты. Официального фото Гарсии/постера боя достать не удалось.

## Шаг B — тематический сток (сработал)
Прямого фото Гарсии не нашлось без риска (Getty) или без повтора кадра дня.
Искал горизонтальный живой фотоснимок по теме «боксёр выходит на ринг перед
боем» — ближайшее субъект-first приближение без человека с узнаваемым лицом
(что и снимает риск ошибочной атрибуции конкретному боксёру).
- Кандидат: Attentie Attentie, «Boxer walking toward ring surrounded by
  spectators» — свободная Unsplash License, 2400×1600 (AR 1.5), живое фото
  (не рисованный сток/график), силуэт боксёра в перчатках на подиуме к рингу
  сквозь дым и прожекторы — прямая иллюстрация темы «титульный бой».
  URL: https://images.unsplash.com/photo-1552072092-7f9b8d63efcb

## Проверка на повтор
`node scripts/photo-dupes.mjs --check` — «свободен, за 2 дн. этот кадр не выходил».

## Обработка (scripts/prepare-image.py)
```json
{
  "source": {"width": 2400, "height": 1600},
  "fit": {
    "mode": "cover",
    "scale": 0.6667,
    "cropLoss": 0.1562,
    "offset": [0, 133],
    "upscaled": false,
    "note": "обрезано 16% по высоте; окно кропа выбрано по содержимому"
  },
  "output": {
    "path": "public/images/posts/2026-08/garcia-benn-wbc-welterweight-title-reaction-01.jpg",
    "url": "/images/posts/2026-08/garcia-benn-wbc-welterweight-title-reaction-01.jpg",
    "width": 1600,
    "height": 900,
    "bytes": 199247,
    "quality": 90
  },
  "status": "ok",
  "upscaled": false
}
```
cropLoss 15,6% — ниже порога 25% для `crop-risky`; кадр — сцена с толпой и
силуэтом на подиуме, не лицо/животное крупным планом, риск обрезки смысла
низкий.

## Отклонённые варианты
- Boxing News Online / Getty фото Гарсия+Бенн — чёрный список платных
  источников (Getty).
- Sky Sports фото Бенн+Гарсия — уже использовано сегодня в материале
  `garcia-benn-wbc-crawford-prediction`, повтор кадра дня недопустим.
- CBS Sports / Getty фото Опетайи — не тот субъект и снова Getty.
- AI-генерация (Higgsfield) — недоступна в рамках инструментов этого прогона
  (нет скрипта/API-обвязки в репозитории); стоковый вариант B закрыл задачу
  раньше, чем понадобился бы этот fallback.

## Alt-текст
"Силуэт боксёра в перчатках идёт по подиуму к рингу сквозь дым и свет
прожекторов перед боем"

## Уверенность в подборе: 55%
Правило subject-first не выполнено буквально: на фото не Райан Гарсия, а
безымянный силуэт боксёра — единственные доступные фото самого Гарсии либо
Getty (запрещено), либо уже стоят сегодня под другим материалом того же
сюжета. Кадр тематически точен (титульный бой, выход на ринг) и не абстрактен
(не карта/космос/3D-график), что и есть требуемый «последний ресорт» при
недоступности прямого фото субъекта.
