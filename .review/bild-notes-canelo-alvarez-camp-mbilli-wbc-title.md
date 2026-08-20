# Bild notes: canelo-alvarez-camp-mbilli-wbc-title

## Стратегия: primary-source

## Источник картинки
- URL: https://wbcboxing.com/wp-content/uploads/2026/07/MbillivsCanelo-.jpeg
  (найден через og:image страницы https://wbcboxing.com/en/canelo-alvarez-vs-christian-mbilli-rescheduled-for-october-31/,
  один из `sources` статьи)
- Тип: официальное промо-фото WBC (face-off съёмка Канело Альвареса и Кристиана Мбилли
  на фоне пирамид Гизы), не сток и не рендер — живая фотография с узнаваемыми лицами обоих боксёров
- photo-dupes: проверено ДО обработки — `node scripts/photo-dupes.mjs --check` →
  "свободен, за 2 дн. этот кадр не выходил"
- Размер оригинала: 1200×675 → cover, scale 1.3333 (умеренный апскейл в пределах
  MAX_UPSCALE=2.5, задокументированного в prepare-image.py), обрезка 0% →
  1600×900, 157 827 байт, quality 90

## Отклонённые варианты
- Страница https://wbcboxing.com/saul-canelo-alvarez-alista-campamento-en-busca-de-reconquistar-el-campeonato-mundial-supermedio-del-wbc-ante-christian-mbilli/
  (первый source) — отдала анти-бот заглушку "One moment, please..." при прямом
  запросе, og:image извлечь не удалось; страница с датой боя (второй source)
  сработала и дала нужный кадр
- Sky Sports (третий source) не проверялся отдельно — задача закрыта первым же
  official-фото WBC, приоритет отдан пресс-источнику

## Alt-текст
«Сауль «Канело» Альварес и Кристиан Мбилли лицом к лицу на промо-съёмке у пирамид Гизы
перед боем за титул WBC»

## Соответствие image-hint / image-avoid
- image-hint просил портрет Канело в стойке, запасной вариант — Мбилли на ринге;
  найденный кадр — совместное официальное промо-фото обоих бойцов лицом к лицу,
  оба узнаваемы, subject-first выполнен даже полнее, чем просил hint
- image-avoid: постановочный сток без лиц — не подходит под это описание (лица
  реальные, узнаваемые, съёмка официальная); других боксёров (Кроуфорда и т.п.)
  на фото нет

## Уверенность в подборе: 90%
