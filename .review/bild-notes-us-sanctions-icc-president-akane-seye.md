# Bild notes: us-sanctions-icc-president-akane-seye

## Стратегия: stock (Openverse / Flickr CC)

## Handoff
- image-hint: здание МУС в Гааге либо портрет председателя Томоко Аканэ на заседании/пресс-конференции
- image-avoid: не ставить Госдеп США/Трампа или Нетаньяху главным образом — санкционированы Аканэ и Сейе, а не они

## Проверка первоисточников (§Шаг 2, A)
- Al Jazeera #1 (`.../8/19/icc-condemns-us-sanctions-...`) — og:image `ICC-THUMB-1787109875.jpeg`,
  подпись в теле статьи: *"The International Criminal Court in The Hague, Netherlands, on
  September 22, 2025 [Piroschka van de Wouw/**Reuters**]"* — фото Reuters, лицензия не подтверждена
  → пропустил по правилу "международные агентства — пропускай, если нет уверенности в разрешении".
- Al Jazeera #2 (`.../8/18/us-sanctions-international-criminal-court-...`) — og:image
  `afp_6a84b67c9420-1787082364.jpg`, alt="ICC President Tomoko Akane" — файл с префиксом `afp_`,
  агентство **AFP** → тот же риск лицензии, пропустил.
- Euronews (ru) — og:image это фото Марко Рубио, слушающего Трампа на мероприятии Госдепа
  7 августа — прямое нарушение `image-avoid` (Госдеп/Трамп как главный образ), пропустил.
- Портрет Томоко Аканэ в открытых банках (Openverse) нашёлся только на Wikimedia Commons
  (`Tomoko_Akane_2015.jpg`) — источник в чёрном списке (`wikipedia.org`), не беру.

## Источник картинки
- Openverse ID: `f11fb1fe-a5e6-49e8-a592-2e90115aee70`
- Название: "International Criminal Court Building", автор **theglobalpanorama** (Flickr)
- Landing page: https://www.flickr.com/photos/121483302@N02/14019551741
- CDN-URL: https://live.staticflickr.com/7447/14019551741_410ace76ff_b.jpg
- Лицензия: CC BY-SA 2.0 (атрибуция обязательна, указана в credit)
- Тип: живая фотография здания ICC в Гааге (не рендер, не карта, не инфографика)
- Проверка на повтор: `photo-dupes.mjs --check` → свободен, за 2 дня этот кадр не выходил

## Обработка (`prepare-image.py`)
```json
{
  "source": {"width": 1024, "height": 733},
  "fit": {"mode": "cover", "scale": 1.5625, "cropLoss": 0.2142, "offset": [0, 245],
          "upscaled": true,
          "note": "обрезано 21% по высоте; окно кропа выбрано по содержимому; исходник растянут в 1.56× ради заливки кадра"},
  "output": {"path": "public/images/posts/2026-08/us-sanctions-icc-president-akane-seye-01.jpg",
             "url": "/images/posts/2026-08/us-sanctions-icc-president-akane-seye-01.jpg",
             "width": 1600, "height": 900, "bytes": 327402, "quality": 90},
  "status": "ok"
}
```
Апскейл 1.56× — в пределах MAX_UPSCALE скрипта (2.5×). Обрезка 21% по высоте (в пределах
MAX_CROP 45%) — срезано небо сверху, здание целиком в кадре, ничего значимого не потеряно.

## Отклонённые варианты
- AJ og:image (Reuters) — лицензия агентства не подтверждена.
- AJ og:image (AFP) — лицензия агентства не подтверждена.
- Euronews og:image — Рубио/Трамп на мероприятии Госдепа, прямо запрещено handoff (`image-avoid`).
- Wikimedia "Tomoko Akane 2015" (портрет) — источник в чёрном списке редполитики.
- Openverse Flickr "UN International Criminal Tribunal for the Former Yugoslavia" (*rboed*) —
  это здание МТБЮ (ICTY), другая организация, не ICC — subject mismatch, отклонил.
- Openverse Flickr "ICC Construction: June/November 2014" (*rboed*) — здание на этапе
  строительства (леса, техника), не финальный вид — менее узнаваемо, отклонил в пользу
  готового фасада.
- Openverse Flickr "The International Criminal Court (ICC)" (Alkan de Beaumont Chaglar) —
  вертикальная ориентация (768×1024), потребовала бы подложку — предпочёл горизонтальный кадр.
- `config/stock-photos.json` — тем world/politics там нет, только экономические (cbu/sum/...);
  B0 пропустил.
- AI-генерацию (Higgsfield) не потребовалось — живое фото первоисточника (по субъекту) нашлось
  через открытый банк.

## Alt-текст
"Здание Международного уголовного суда в Гааге, вид с улицы на фасад из белых панелей и стекла"

## Уверенность в подборе: 75%

Показывает ровно тот субъект, что в image-hint (здание МУС в Гааге), живая фотография,
горизонтальная ориентация, обрезка и апскейл в пределах допусков скрипта, лицензия открытая
с прозрачной атрибуцией, без людей — политически нейтрально относительно вовлечённых сторон
(не Трамп/Рубио/Нетаньяху). Не выше 75%, потому что: (1) снимок 2014 года, не текущий; здание
не менялось, но дата не самая свежая; (2) не удалось поставить портрет самой Аканэ (handoff
допускал оба варианта) — открытого источника с её фото не нашлось, только Wikimedia.
