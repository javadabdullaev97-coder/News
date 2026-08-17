# Bild notes: tesla-crystal-sun-solar-factory-texas

## Стратегия: primary-source (архивное фото существующей Tesla Gigafactory Texas)

`mainVisualSubject` из reporter-notes: «здание Tesla Gigafactory / производство
солнечных панелей — конкретного фото площадки нет (она ещё не построена),
подойдёт архивное фото Tesla Gigafactory Texas в Остине или нейтральное фото
производства солнечных модулей». Handoff `image-hint` подтверждает то же самое
и явно требует не подписывать снимок как «завод в Ричмонде» — площадка Project
Crystal Sun физически не существует, это только поданная заявка.

## Порядок попыток

### A — официальный источник по теме (не сработал буквально)
Все пять `sources` — это Texas Comptroller (два госдокумента без иллюстраций),
PV Magazine, ABC13 Houston. Проверил оба СМИ на предмет фото:
- **PV Magazine** — featured image берёт «A Tesla Gigafactory» с **Wikimedia
  Commons** (`Tesla_Gigafactory_1_-_December_2019...jpg`, автор Smnt, CC BY-SA
  4.0). Отклонено: политика прямо запрещает Wikipedia/Wikimedia — лицензия
  требует атрибуции конкретному автору, автоматически не валидируется.
- **ABC13 Houston** — featured image оказался составным телевизионным графическим
  роликом (`...composite-img.png`, 1920×1080): поле рядом с Ричмондом с вшитой
  цитатной плашкой поверх кадра. Отклонено дважды: (1) текст встроен в
  изображение — не наш формат; (2) авторские права локального телеканала
  (KTRK-TV/ABC13) на переиспользование не проверены — `source-doubt`, риск
  не оправдан при наличии лучшей альтернативы.

### B0/B1 — фототека редакции и тематический сток (не сработали)
Тема нерелевантна `config/stock-photos.json` (там только курс сума/ЦБ/инфляция
для узбекской экономики). Дальше проверял Unsplash, Pexels и Openverse на
живые фото производства солнечных панелей/фотоэлементов:
- Unsplash: «solar panel manufacturing», «solar cell factory», «photovoltaic
  factory», «solar panel production line», «tesla gigafactory» — почти вся
  бесплатная выдача это установка панелей на крышах или солнечные фермы
  (готовый продукт), не производство. Специфично для Gigafactory Texas на
  Unsplash фото здания нет вообще (только фото машин Tesla).
- Pexels: то же самое — инсталляция/солнечные поля, не заводские цеха.
- Openverse (`license=cc0,pdm,by`, `orientation=landscape`): нашёл «Vapor
  deposition and thermal ovens» (U.S. Department of Energy, CC0, заявлено
  4898×2583) — по содержанию отличный кадр цеха с промышленными печами,
  похожими на линию производства фотоэлементов. Но раздаётся только через
  `images.rawpixel.com/image_1300/...` — при проверке на кадре виден
  повторяющийся полупрозрачный водяной знак rawpixel (та же проблема, что
  зафиксирована в bild-notes `school-security-requirements-425`). Отклонено:
  вотермарк на редакционной картинке недопустим, оригинал без него отдаётся
  только через rawpixel.com с логином (403 без него).
  - Остальные запросы («NREL solar manufacturing», «solar wafer factory»,
    «solar module assembly», «jurvetson Tesla factory/gigafactory») — либо
    нерелевантно (спутники NASA, LEGO, портреты), либо снова зеркала на
    Wikimedia Commons (снимки Стива Джурветсона на Gigafactory 2014 года —
    все хостятся через `upload.wikimedia.org`, отклонены по той же причине).
  - `nrel.gov` / `images.nrel.gov` — DNS не резолвится в этом окружении
    (`ENOTFOUND`), недоступен.

### C — AI-генерация (Higgsfield)
Инструментов генерации в наборе тулов этого прогона нет (как и в прежних
прогонах — см. bild-notes `school-security-requirements-425`,
`supreme-court-mobile-reception-tashkent`): ни один `generate_image`/аналог не
объявлен в доступных функциях. Вариант физически недоступен, к делу не
подошёл.

## Выбранный вариант

Официальный сайт Tesla, `tesla.com/gigatexas` — hero-фото раздела:
- Прямой файл: `https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/GigaTexas-Hero-Desktop.jpg`
- Тип: живая аэрофотосъёмка (дрон) существующей Tesla Gigafactory Texas в
  Остине — солнечные панели на крыше здания выложены в виде надписи «TESLA»,
  закат на заднем плане. Subject-first: прямое, узнаваемое изображение
  компании и её производственной площадки, тематически перекликается с
  историей (Tesla + солнечная энергетика), без риска подмены факта — это
  РЕАЛЬНО существующий завод Tesla в Техасе, а не место в Форт-Бенде.
- Источник — официальный сайт компании, аналог «пресс-службы» по приоритету A1.
  Права: маркетинговый материал компании, используется редакционно с прямой
  атрибуцией источника (без подписи «фото завода в Ричмонде» — так и не
  подписано).
- Размер оригинала: 2880×1800 (landscape, ratio 1.6), апскейл не нужен.

## Обработка

```bash
python3 scripts/prepare-image.py /tmp/.../tesla-hero.jpg tesla-crystal-sun-solar-factory-texas --month=2026-08
```

```json
{
  "source": {"width": 2880, "height": 1800},
  "fit": {"mode": "cover", "scale": 0.5556, "cropLoss": 0.1, "offset": [0, 100], "upscaled": false,
          "note": "обрезано 10% по высоте; окно кропа выбрано по содержимому"},
  "output": {"path": "public/images/posts/2026-08/tesla-crystal-sun-solar-factory-texas-01.jpg",
             "url": "/images/posts/2026-08/tesla-crystal-sun-solar-factory-texas-01.jpg",
             "width": 1600, "height": 900, "bytes": 265807, "quality": 90},
  "status": "ok",
  "upscaled": false
}
```

`cropLoss` 10% — ниже порога 22% и ниже порога `crop-risky` (0,25); визуально
проверил результат — вся надпись «TESLA» на крыше и здание целиком остались в
кадре, обрезаны только небо сверху и дорога снизу.

## Отклонённые варианты
- Wikimedia Commons (`Tesla_Gigafactory_1...jpg` через PV Magazine, серия фото
  Стива Джурветсона 2014 года на Gigafactory Nevada) — политика запрещает
  Wikipedia/Wikimedia целиком.
- ABC13 composite-графика — вшитый текст цитаты в кадр + непроверенные права
  локального телеканала.
- Openverse/rawpixel «Vapor deposition and thermal ovens» (U.S. DOE, CC0) —
  водяной знак rawpixel виден на кадре при проверке, отдать чистый файл без
  логина нельзя.
- Unsplash/Pexels: только фото установки готовых панелей на крышах/солнечные
  фермы — не производство, тематически мимо главного визуального субъекта.

## Alt-текст
«Аэросъёмка действующей Tesla Gigafactory Texas в Остине на закате: солнечные
панели на крыше здания выложены в виде надписи TESLA»

## Credit
`Tesla, официальный сайт`

## Уверенность в подборе: 75%

Снимок subject-first (Tesla, живая фотография, узнаваемый объект), горизонтальный,
без апскейла и без риска обрезки. Минус к уверенности: это архивное фото ДРУГОЙ,
уже существующей площадки Tesla (Остин), а не Project Crystal Sun в Форт-Бенде —
именно так и оговорено в alt-тексте, чтобы не создавать ложного впечатления, что
завод в Ричмонде уже построен. Это компромисс, прямо предусмотренный
image-hint из handoff.
