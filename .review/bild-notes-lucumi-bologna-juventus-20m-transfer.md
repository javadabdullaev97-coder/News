# Bild notes: lucumi-bologna-juventus-20m-transfer

## Стратегия: primary-source

## Источник картинки
- URL: https://www.juventus.com/images/image/private/t_editorial_landscape_12_desktop/f_auto/dev/tmr8fvjp8bodyg7vkjqk.jpg
  (найдено на официальной странице https://www.juventus.com/en/news/articles/jhon-lucumi-joins-juventus,
  один из sources в frontmatter)
- Тип: официальное фото клуба, презентация трансфера — Джон Лукуми держит футболку
  «Ювентуса» вместе с четырьмя представителями клубного руководства
- Размер оригинала: 1280×900... фактически 1280×720 (готовое 16:9) → cover, масштаб 1,25×
  (апскейл в пределах MAX_UPSCALE=2,5 из prepare-image.py), обрезка 0% → 1600×900
  (140 107 байт, quality 90)

Полный вывод prepare-image.py:
{
  "source": {"width": 1280, "height": 720},
  "fit": {"mode": "cover", "scale": 1.25, "cropLoss": 0.0, "offset": [0, 0],
          "upscaled": true, "note": "обрезано 0% по высоте; окно кропа выбрано
          по содержимому; исходник растянут в 1.25× ради заливки кадра"},
  "output": {"path": "public/images/posts/2026-08/lucumi-bologna-juventus-20m-transfer-01.jpg",
             "url": "/images/posts/2026-08/lucumi-bologna-juventus-20m-transfer-01.jpg",
             "width": 1600, "height": 900, "bytes": 140107, "quality": 90},
  "status": "ok",
  "upscaled": false
}

## Отклонённые варианты
- https://icdn.football-italia.net/wp-content/uploads/2026/06/uzbekistan-v-colombia-group-k-fi.jpg
  — фото Лукуми в форме сборной Колумбии на ЧМ-2026 (запасной вариант из image-hint).
  Не понадобился: официальное фото Juventus.com оказалось доступным напрямую, subject-first
  выполнен точнее (трансфер именно в «Ювентус», а не общий кадр сборной).
- Логотипы «Ноттингем Форест» и «Сандерленд» не рассматривались — прямой запрет в
  image-avoid (отклонённые клубом предложения, не участники сделки).

## Alt-текст
"Джон Лукуми держит футболку «Ювентуса» вместе с руководителями клуба на официальной
презентации трансфера"

## Уверенность в подборе: 95%
Официальное фото с juventus.com (один из указанных в sources первоисточников),
горизонтальная ориентация без кропа, прямое изображение главного субъекта материала —
Джона Лукуми в контексте перехода в «Ювентус».
