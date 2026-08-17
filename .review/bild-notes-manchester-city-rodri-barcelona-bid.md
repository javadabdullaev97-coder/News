# Bild notes: manchester-city-rodri-barcelona-bid

## Стратегия: primary-source (кандидат подготовлен, публикация приостановлена — эскалация владельцу)

## Main visual subject (из reporter notes / handoff)
Родри в форме «Манчестер Сити», желательно кадр с матча АПЛ или Community Shield;
запасной вариант — Родри в форме сборной Испании. `image-avoid`: не подписывать
Родри «капитаном сборной Испании», логотипы букмекеров.

## Проверка кадра «Community Shield»
Официальный отчёт о матче mancity.com (`arsenal-manchester-city-community-shield-
match-report-63922483`, через `r.jina.ai`-прокси, прямой WebFetch на mancity.com
даёт 403 бот-защиты) — полный стартовый состав и все замены «Сити» проверены.
Родри в составе НЕТ (ни в старте, ни в заявке на замену: Donnarumma, Khusanov,
Dias, Gvardiol, O'Reilly, Kovačić, Anderson, Semenyo, Foden, Doku, Haaland +
замены Rulli/Aït-Nouri/Reis/Guéhi/Nico/Lewis/Cherki/Grealish/Marmoush). Кадра
с этого матча физически не существует — предпочтительный вариант из handoff
отпадает.

## Источники, которые проверил и отклонил
- **BBC Sport** (`ichef.bbci.co.uk/.../0b8f72c0-99a5-11f1.../jpg`, через r.jina.ai
  прокси — bbc.com отдаёт статью нормально) — чистое горизонтальное(2560px)
  фото Родри в форме Испании, подпись «Rodri captained Spain to World Cup
  glory this summer». Кредит — **Getty Images**. Чёрный список редполитики
  («не тащи с Getty... платные, риск copyright-иска») — отклонено, несмотря
  на хорошее качество и рамку.
- **Yahoo Sports / HITC** (`s.yimg.com/.../media.zenfs.com/en/hitc_articles...`)
  — тоже фото Родри в форме Сити, но кредит «Simon Stacpoole/Offside/Offside
  via **Getty Images**» — отклонено по той же причине (в отличие от прецедента
  khusanov, где Yahoo-синдикация вела на собственный клубный кадр mancity.com
  без Getty — здесь синдикация именно Getty-снимка).
- **AP News** (`apnews.com/article/rodri-barcelona-man-city-...`) — прямой
  WebFetch и через r.jina.ai не отдают тело статьи (страница недоступна из
  контура агента). Не проверено, не использовано.
- **mancity.com** — прямой WebFetch отдаёт 403 (бот-защита, как в прецеденте
  khusanov). Через r.jina.ai нашёл матч-репорт Community Shield (см. выше) и
  общий список новостей — отдельной статьи/галереи про Родри на сайте клуба
  на момент проверки нет (ушёл без прощального материала).
- **Unsplash** (`unsplash.com/s/photos/rodri`) — только абстрактные фото с
  буквой «R», спортсмена нет.
- **Flickr** (CC-поиск `Rodri football`) — ноль результатов с CC-лицензией.
- **Google-поиск через r.jina.ai** — упёрся в капчу, не сработал.

## Единственный проходной кандидат: Guardian / PA
- URL мастер-файла: `https://i.guim.co.uk/img/media/740f80136bfe4685d713165631dd2ba94f1c2694/302_0_4879_3904/master/4879.jpg`
  (найден через `r.jina.ai`-прокси Guardian-статьи — прямой WebFetch на
  theguardian.com не работает, это известное ограничение песочницы, см.
  reporter-notes к этой же статье и `citableNote` в `config/news-sources.json`).
- Guardian — источник №1 в `frontmatter.sources`, это стадия A («первоисточник»).
- Кредит по подписи Guardian: «Photograph: Martin Rickett/PA» — агентство PA
  (Press Association), НЕ в явном чёрном списке (`Getty/Shutterstock/
  Depositphotos`), но и не «официальная пресс-служба». Решил использовать
  как первоисточник уровня A, раз других легальных вариантов нет.
- Живая фотография (не рисованная заготовка) — Родри на поле в форме «Сити»,
  кулак поднят, целится в камеру, чистый фон (трибуны в боке). Полностью
  соответствует mainVisualSubject.
- Размер оригинала: 1900×1080? — фактически 1900×1520 (проверено `file`),
  соотношение сторон 1.25 — **ниже порога ~1.3 для горизонтали** из правила
  владельца от 04.08.2026. Другой (более широкой) версии того же кадра или
  другого ракурса в статье Guardian нет (проверил все image-теги статьи —
  только этот один кадр и служебные превью).
- Попытка запросить у Guardian-imaging другой (более широкий) кроп того же
  мастер-файла напрямую — отклонена сервером (401, кастомные кропы требуют
  подписи, которой у меня нет).

## prepare-image.py — фактический результат

```json
{
  "source": {"width": 1900, "height": 1520},
  "fit": {"mode": "cover", "scale": 0.8421, "cropLoss": 0.2969,
          "offset": [0, 380], "upscaled": false,
          "note": "обрезано 30% по высоте; окно кропа выбрано по содержимому"},
  "output": {"path": "public/images/posts/2026-08/manchester-city-rodri-barcelona-bid-01.jpg",
             "url": "/images/posts/2026-08/manchester-city-rodri-barcelona-bid-01.jpg",
             "width": 1600, "height": 900, "bytes": 183568, "quality": 90},
  "status": "ok", "upscaled": false
}
```

Скрипт не переключился на contain (внутренний MAX_CROP поднят до 0,45), но
это выше явного порога эскалации `crop-risky` из протокола бильда (**0,25**).
Визуально проверил итоговый файл (`public/images/posts/2026-08/manchester-
city-rodri-barcelona-bid-01.jpg`) — умный кроп срезает верхнюю часть поднятого
кулака Родри. Родри — явный объект (человек), порог применяется.

## Решение
Не публикую вслепую. Файл кандидата уже лежит в `public/images/posts/
2026-08/manchester-city-rodri-barcelona-bid-01.jpg` (для просмотра владельцем).
`frontmatter.image` оставлен с `null`-полями. Материал перемещён из
`content/drafts/2026-08-17/` в `content/needs-verification/
manchester-city-rodri-barcelona-bid.mdx` с `awaitingEditor: true` и
`pendingEditorQuestion.reason: "crop-risky"` — см. текст вопроса во
frontmatter файла. `editor-queue.mjs push` не вызывал (нет секретов
Telegram в этом контуре) — ждёт, пока workflow подхватит через `scan-pending`.

## Alt-текст (заготовка, не применён — image.url = null)
"Родри в футболке «Манчестер Сити» поднимает кулак, приветствуя болельщиков
после матча" — если владелец подтвердит кадр как есть.

## Уверенность в подборе: 40%
Субъект верный (Родри, форма «Сити», живое фото, не заготовка), источник
не в чёрном списке — но геометрия кадра не проходит порог по горизонтали и
по cropLoss без ручной проверки человеком, а более удачной альтернативы без
лицензионного риска (Getty) не нашёл.
