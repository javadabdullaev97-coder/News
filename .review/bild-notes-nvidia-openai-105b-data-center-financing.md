# Bild notes: nvidia-openai-105b-data-center-financing

## Стратегия: primary-source

## Ход поиска
- Handoff (`image-hint`) уже дал направление: дата-центр/стройплощадка в Огайо
  либо логотипы Nvidia + OpenAI рядом, человека-субъекта в материале нет.
  `image-avoid`: не делать логотип SoftBank главным акцентом.
- Featured-картинка у TechCrunch — портрет Дженсена Хуанга, кредит
  Chesnot / Getty Images. Getty — платный банк из чёрного списка правил
  (риск copyright), плюс это человек на политически заметной теме
  и не совпадает с image-avoid/subject-guidance — пропустил.
- Официальный блог Nvidia (`blogs.nvidia.com/blog/securing-the-infrastructure-of-intelligence/`)
  — hero-картинка оказалась логотип-локапом OpenAI / SB Energy / NVIDIA
  на чёрном фоне, все три бренда равновелики (SB Energy не доминирует,
  так что image-avoid формально не нарушен) — но это чистый набор
  логотипов без содержательного визуала, отложил как запасной вариант.
- Пресс-релиз SB Energy (`sbenergy.com/nvidia-ai-compute-ports-pike-ohio/`)
  — hero: коллаж из 3 фото (групповая церемония закладки с людьми и
  флагом США, аэрофото кампуса, фото людей на выставке) + логотипы внизу,
  1088×612. Слишком низкое разрешение отдельных вставок для кропа в 1600×900
  без апскейла — пропустил как отдельный файл, но по нему нашёл ссылку
  на отдельный проектный сайт portscampus.com.
- **portscampus.com** — официальный проектный сайт PORTS-Pike Technology
  Campus (SB Energy). В HTML нашёл прямую ссылку на рендер кампуса:
  `R040_re0800_COMP_Final_t01_v01.0000.jpeg`, 2521×1198 — горизонтальная
  аэросъёмка/рендер площадки дата-центра и электроподстанции, без людей,
  без логотипов поверх кадра. Ровно то, что просит image-hint («дата-центр /
  стройплощадка ЦОД в Огайо»). Взял этот кадр.
- Также нашёл на portscampus.com живое фото церемонии закладки
  (`sbe-ports-groundbreaking...webp`, 2240×1712) — не использовал: кадр
  с крупным планом на людях (руководители, официальные лица), а
  image-hint прямо говорит, что человека-субъекта в материале нет —
  такой кадр сместил бы фокус не туда.

## Источник картинки
- URL: https://cdn-cygnus.sfo3.digitaloceanspaces.com/wp-content/uploads/2026/06/08232413/R040_re0800_COMP_Final_t01_v01.0000.jpeg
  (найден через официальный проектный сайт https://portscampus.com/, "An SB Energy Project")
- Тип: официальный рендер/аэровизуал кампуса от девелопера проекта (SB Energy),
  не фотобанк и не сгенерированная AI-картинка
- Проверка на повтор: `photo-dupes.mjs --check` — свободен, за 2 дня не выходил
- Обработка `prepare-image.py`:
```json
{
  "source": {"width": 2521, "height": 1198},
  "fit": {"mode": "cover", "scale": 0.7513, "cropLoss": 0.1552, "offset": [208, 0], "upscaled": false,
          "note": "обрезано 16% по ширине; окно кропа выбрано по содержимому"},
  "output": {"path": "public/images/posts/2026-08/nvidia-openai-105b-data-center-financing-01.jpg",
             "url": "/images/posts/2026-08/nvidia-openai-105b-data-center-financing-01.jpg",
             "width": 1600, "height": 900, "bytes": 344197, "quality": 90},
  "status": "ok", "upscaled": false
}
```

## Отклонённые варианты
- TechCrunch hero (Chesnot/Getty Images, портрет Дженсена Хуанга) — платный банк
  Getty (чёрный список платных стоков) + человек на теме без явного субъекта-человека
- Nvidia blog hero (логотип-локап NVIDIA/OpenAI/SB Energy на чёрном фоне) —
  запасной вариант по image-hint («либо логотипы рядом»), но заменён более
  содержательным визуалом реальной площадки
- SB Energy press-release hero (коллаж 1088×612) — разрешение вставок
  недостаточно для кропа 1600×900 без апскейла
- portscampus.com groundbreaking-фото (люди на церемонии закладки) — кадр
  с фокусом на людях, не соответствует image-hint («человека-субъекта нет»)

## Alt-текст
"Аэрофотосъёмка кампуса PORTS-Pike Technology Campus в округе Пайк, Огайо —
здания дата-центра и электроподстанция для проекта Nvidia, OpenAI и SB Energy"

## Уверенность в подборе: 85%
