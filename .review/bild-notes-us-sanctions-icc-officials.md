# Bild notes: us-sanctions-icc-officials

## Стратегия: primary-source

## Источник картинки
- URL: https://global.unitednations.entermediadb.net/assets/mediadb/services/module/asset/downloads/preset/Libraries/Production%20Library/17-03-2023-ICC-UN7163684_11c_.jpg/image770x420cropped.jpg
- Найдено через: og:image на странице news.un.org/feed/view/ru/story/2026/08/1468515
  (это один из sources статьи — "ООН — Новости"). Подпись на странице:
  «Фото ООН/Рик Бажорнас — Международный уголовный суд в Гааге, Нидерланды.»
- Тип: официальное фото ООН (UN Photo), эмблема МУС на стеклянном фасаде
  здания суда в Гааге, на фоне — корпуса штаб-квартиры. Людей на кадре нет.
- Соответствие image-hint: «здание МУС в Гааге, либо флаг МУС на фоне здания
  суда» — совпадает (эмблема суда + здание). image-avoid (портреты Аканэ/Сейе,
  символика Израиля/Газы) — отсутствует.
- Размер оригинала: 770×420 → cover, масштаб 2,14× (в пределах MAX_UPSCALE=2.5),
  обрезано 3% по ширине, кроп по контенту (offset 47,0) → 1600×900 (279 КБ, q90)

## Попытка A — сайт МУС (icc-cpi.int)
На главной странице icc-cpi.int нашлась ровно по теме статья "The ICC strongly
rejects new US sanctions designations" с картинкой 160729-icc_hq-02.jpg, а также
кадр здания ICC-Premises-frontfinal.jpg. Оба недоступны для скачивания: раздел
/sites/default/files/ на icc-cpi.int закрыт Cloudflare challenge (403 Attention
Required даже с cookie jar и Referer) — при этом сама HTML-страница отдаётся
нормально. Отказался от прямого скачивания, ушёл к фото ООН, где та же тема
(здание/эмблема МУС) уже покрыта официальным фото.

## Отклонённые варианты
- icc-cpi.int/.../160729-icc_hq-02.jpg — недоступен для скачивания (Cloudflare 403
  на файловый CDN сайта)
- icc-cpi.int/.../ICC-Premises-frontfinal.jpg — та же проблема

## Проверка на повтор
node scripts/photo-dupes.mjs --check → «свободен, за 2 дн. этот кадр не выходил»

## Alt-текст
"Эмблема Международного уголовного суда на стеклянном фасаде здания МУС в Гааге,
на заднем плане — корпуса штаб-квартиры суда"

## Уверенность в подборе: 90%
