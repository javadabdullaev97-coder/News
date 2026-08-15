# Bild notes: world-saudi-turkey-pakistan-defense-pact

## Стратегия: primary-source

## Main visual subject (из reporter-notes)
Церемония подписания в Мекке — Мухаммед бин Салман, Эрдоган и Шехбаз Шариф.
Найдено точное совпадение: живое фото самой церемонии с рукопожатием и
папками документов.

## Источник картинки
- Статья: Arab News — «Saudi Arabia, Turkiye and Pakistan sign Makkah joint
  defense agreement» — https://www.arabnews.com/node/2653753/middle-east
- Прямой файл (оригинал, без Drupal image-style обрезки):
  https://www.arabnews.com/sites/default/files/main-image/2026/08/07/4738743-1355886083.png
- Credit по Arab News: **SPA (Saudi Press Agency)** — официальное
  государственное агентство Саудовской Аравии, приоритет №1 по правилам
  (официальная пресс-служба).
- Содержание: Эрдоган (слева) пожимает руку Мухаммеду бин Салману (в центре),
  Шехбаз Шариф (справа) — все трое с папками подписанных документов, на фоне
  панорамы Мекки. Ровно main visual subject из reporter-notes.
- Размер оригинала: 1000×633 (соотношение 1.58 — горизонтальный, выше порога
  1.3) → prepare-image.py: cover, scale 1.60× (в пределах MAX_UPSCALE=2.5),
  обрезано 11% по высоте (cropLoss 0.1114, ниже порога crop-risky 0.25) →
  1600×900, 284 КБ, quality 90.
- prepare-image.py JSON:
  ```json
  {
    "source": {"width": 1000, "height": 633},
    "fit": {
      "mode": "cover",
      "scale": 1.6,
      "cropLoss": 0.1114,
      "offset": [0, 0],
      "upscaled": true,
      "note": "обрезано 11% по высоте; окно кропа выбрано по содержимому; исходник растянут в 1.60× ради заливки кадра"
    },
    "output": {
      "path": "public/images/posts/2026-08/world-saudi-turkey-pakistan-defense-pact-01.jpg",
      "url": "/images/posts/2026-08/world-saudi-turkey-pakistan-defense-pact-01.jpg",
      "width": 1600, "height": 900, "bytes": 284265, "quality": 90
    },
    "status": "ok"
  }
  ```
- Визуальная проверка результата: головы всех трёх лидеров, руки, папки
  документов и панорама Мекки на заднем плане — полностью в кадре, обрезаны
  только верх/низ композиции (люстры сверху, пол снизу), лица не задеты.

## Отклонённые варианты
- CBS News hero image — то же событие, но credit
  «TUR Presidency / Murat Cetinmuhurdar / Anadolu **via Getty Images**» —
  пропущено: Getty в чёрном списке источников (платный, риск иска).
- Al Jazeera hero image — то же событие, credit «Murat Cetinmuhurdar/Turkish
  Presidential Press Office/Handout **via Reuters**» — пропущено: агентское
  фото через Reuters, лицензия на переиспользование не подтверждена
  (правило «пропускай если не уверен»).
- МИД Пакистана (mofa.gov.pk) — пресс-релиз без изображений (только логотипы
  и иконки навигации) — не подошло технически.
- tccb.gov.tr, spa.gov.sa (напрямую), pid.gov.pk, aa.com.tr — недоступны
  через WebFetch (503/403) или не содержат материала о саммите — Arab News
  с прямой атрибуцией SPA закрыл потребность без обращения к Reuters/Getty.

## Alt-текст
«Президент Турции Реджеп Тайип Эрдоган пожимает руку наследному принцу
Саудовской Аравии Мухаммеду бин Салману, премьер-министр Пакистана Шехбаз
Шариф стоит рядом с папкой документов — церемония подписания оборонного
пакта в Мекке»

## Уверенность в подборе: 95%
Точное совпадение с mainVisualSubject reporter'а, официальный государственный
источник (SPA через Arab News), горизонтальный кадр, обрезка 11% (далеко от
порога 25%), апскейл 1.6× в пределах допустимого. Снижение 5% — картинка
получена не напрямую с spa.gov.sa (сайт агентства был недоступен через
WebFetch), а через republish на Arab News с явной атрибуцией SPA.
