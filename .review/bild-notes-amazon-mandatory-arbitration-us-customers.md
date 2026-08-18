# Bild notes: amazon-mandatory-arbitration-us-customers

## Стратегия: primary-source

## Источник картинки
- URL: https://assets.aboutamazon.com/6b/0a/1fe173f44deea4d7a1f6fa06557a/about-amazon-inline-amazonhq2-metropolitanpark-464-z9a3282.jpg
- Найдено через: WebFetch/curl главной страницы официального пресс-ньюсрума
  Amazon (press.aboutamazon.com) — картинка с alt="Amazon's HQ2 buildings in
  Metropolitan Park in Arlington, Virginia", инлайн-иллюстрация в материале
  ньюсрума. Оригинальный asset-URL на S3/CloudFront Amazon отдал файл
  напрямую (200, image/jpeg), метадата `x-amz-meta-originalfilename: About
  Amazon Inline-AmazonHQ2-MetropolitanPark-464-_Z9A3282.jpg` подтверждает
  происхождение из официального медиабанка Amazon.
- Тип: официальное фото компании (пресс-ньюсрум aboutamazon.com), живая
  документальная съёмка зданий, не рендер и не диаграмма.
- Почему это здание, а не логотип: `image-hint` из handoff допускал оба
  варианта («логотип Amazon или здание штаб-квартиры Amazon»). Нашлось
  официальное фото именно здания HQ2 — предпочёл его логотипу, т.к. это
  более выразительная subject-first картинка (правило: явный субъект,
  здание компании лучше плоского лого).
- Размер оригинала: 1600×900 (уже готовый горизонтальный 16:9 кроп из
  собственного медиабанка Amazon) → `prepare-image.py` вернул scale 1.0,
  cropLoss 0.0, апскейла нет → выход 1600×900, 364 841 байт, quality 90.
  JSON prepare-image.py:
  {"source":{"width":1600,"height":900},"fit":{"mode":"cover","scale":1.0,
  "cropLoss":0.0,"offset":[0,0],"upscaled":false},"output":{"width":1600,
  "height":900,"bytes":364841,"quality":90},"status":"ok","upscaled":false}
- Проверка на повтор: `node scripts/photo-dupes.mjs --check` — свободен, за
  2 дня этот кадр не выходил.

## Отклонённые варианты
- og:image spokesman.com (Reuters/Eduardo Munoz, "Amazon box moves along a
  conveyor belt at fulfillment center, Robbinsville, New Jersey") — реальное
  фото, горизонтальное (2500×1405, почти точный 16:9), но это синдицированный
  Reuters-снимок без подтверждённой открытой лицензии на переиспользование
  (правило: агентские фото пропускать при сомнении в лицензии). Заменил
  официальным фото Amazon, как только оно нашлось.
- claimsjournal.com og:image "Amazon-shopper-Bloomberg-photo" — фото
  покупателя, приписано Bloomberg (тоже платное агентство, лицензия не
  подтверждена); к тому же субъект «покупатель» слабее, чем здание/логотип
  компании, которое явно требовал image-hint.
- Логотип Amazon отдельно (SVG из шапки aboutamazon.com) — не использовал:
  нашлось более выразительное живое фото здания HQ2 того же официального
  источника, оно ближе к «фото», а не «графический элемент».

## Alt-текст
"Здания штаб-квартиры Amazon HQ2 в комплексе Metropolitan Park, Арлингтон,
штат Вирджиния"

## Credit
"Amazon" — официальный пресс-ньюсрум компании (press.aboutamazon.com),
собственный медиабанк, права на использование в редакционном контексте
подразумеваются пресс-китом.

## Уверенность в подборе: 85%
Официальный источник (собственный ньюсрум Amazon), живое фото здания,
готовый горизонтальный 16:9 без обрезки и без апскейла, дубликатов не
найдено. Минус к уверенности — на кадре не видно логотипа Amazon (только
здания HQ2), поэтому без подписи субъект не считывается мгновенно; это
компенсируется прозрачным alt-текстом и credit.
