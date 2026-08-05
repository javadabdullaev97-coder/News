# Bild notes: uzbekistan-palov-index-regions-july2026

## Стратегия: primary-source

## Источник картинки
- URL поста: https://t.me/uzstataxborot/69172 (тот же пост, который стоит в `frontmatter.sources` как основной первоисточник)
- Прямой URL фото (CDN Telegram, извлечён из `background-image` в `tgme_widget_message_photo_wrap` при загрузке `?embed=1`):
  https://cdn4.telesco.pe/file/cOMAruLYR6x9-4-CWfjNYE3quYeikRDE1VQIlTnno-AjVVuOVU88EyuQ3iARE9uD63WXq4S5iOfohZFrDSwQSkDDzyTcOtX8cEhriZ7dLuSf_D95rx3HmMYhH9tRzsX0RcJEIA74Eh0Z2kL0POzhB_JwOM7QzVwTyI4GrJho2K92NSXYMx82Y5nj0JrY-oNeRoIEFriQbcQEspucSlr853VLiiucuIPVDTs0b-umrsAYjxqlWPohzodU7xssJQtruuPh_i_gI5cglclPP3X7lmskw8l6HURAF0cDrLpO3VxCLdjcnqimObYD-fGSLwEnWS-fYaouVCnDwh1vTud41w.jpg
- Тип: живое фото, официальный пост Нацкомстата РУз (Telegram-канал uzstataxborot) — иллюстрация к тому же релизу об «индексе плова», не сток и не сгенерировано.
- Содержание: повар раскладывает плов половником из большого казана в тарелку с нутом/морковью на поверхности, рядом весы — точное совпадение с `mainVisualSubject` из reporter-notes («плов в казане / готовка плова»).
- Обработка `prepare-image.py`:
```json
{
  "source": {"width": 800, "height": 533, "path": "/tmp/palov_source.jpg"},
  "fit": {
    "mode": "cover",
    "scale": 2.0,
    "cropLoss": 0.1557,
    "offset": [0, 166],
    "upscaled": true,
    "note": "обрезано 16% по высоте; окно кропа выбрано по содержимому; исходник растянут в 2.00× ради заливки кадра"
  },
  "output": {
    "path": "public/images/posts/2026-08/uzbekistan-palov-index-regions-july2026-01.jpg",
    "url": "/images/posts/2026-08/uzbekistan-palov-index-regions-july2026-01.jpg",
    "width": 1600, "height": 900, "bytes": 301553, "quality": 90
  },
  "status": "ok"
}
```
- cropLoss 15,6% — ниже порога `crop-risky` (0,25), просмотрел итоговый кадр вручную: казан, тарелка и руки повара полностью в кадре, ничего важного не срезано.
- Апскейл 2,0× — в пределах `MAX_UPSCALE=2.5` текущей версии скрипта; на 1600×900 картинка читается чётко, мыла не видно.

## Почему не инфографика/таблица Нацкомстата
Основной пост t.me/uzstataxborot/69172 и зеркало на stat.uz содержат только текстовую таблицу цифр по регионам — не картинку с диаграммой/столбиками, так что вопрос «резать инфографику или нет» не стоял вообще. Само фото плова в том же посте оказалось живой фотографией, а не рисованной 3D-заготовкой — обошлось без похода к стоку/генерации.

## Отклонённые варианты
- stat.uz (зеркало) — страница на JS-рендере, WebFetch отдал только заголовок/дату, изображение не обнаружено — не стал использовать как источник картинки.
- Генерация через Higgsfield не понадобилась: subject-first фото нашлось прямо в первоисточнике.

## Alt-текст
"Повар раскладывает плов с нутом и морковью по тарелке рядом с казаном на рынке"

## Уверенность в подборе: 92%
Фото — прямая иллюстрация к тому же официальному релизу, о котором статья; полностью соответствует mainVisualSubject; единственный минус — апскейл 2× (источник Telegram отдаёт максимум 800px), но итоговый кадр визуально чистый.
