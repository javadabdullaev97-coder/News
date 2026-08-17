# Bild notes: apple-houston-manufacturing-center

## Стратегия: primary-source

## Источник картинки
- URL: https://www.apple.com/newsroom/images/2026/08/apple-opens-advanced-manufacturing-center-in-houston/article/Apple-Advanced-Manufacturing-Center-Houston-hero_big.jpg.large_2x.jpg
- Тип: официальное фото из пресс-кита Apple Newsroom (hero-изображение статьи)
- Alt в оригинале: "Three people stand in front of a glowing holographic table at Apple's Advanced Manufacturing Center in Houston."
- Размер оригинала: 1960×1307 → cover, масштаб 0,8163, обрезано 15,65% по высоте → 1600×900 (196 КБ, q90)
- JSON prepare-image.py: {"source":{"width":1960,"height":1307},"fit":{"mode":"cover","scale":0.8163,"cropLoss":0.1565,"offset":[0,167],"upscaled":false,"note":"обрезано 16% по высоте; окно кропа выбрано по содержимому"},"output":{"width":1600,"height":900,"bytes":196144,"quality":90},"status":"ok","upscaled":false}

## Почему не фото Кука и Латника (mainVisualSubject reporter'а)
Прочитал сам пресс-релиз Apple Newsroom (P0-источник) целиком — в HTML 7
изображений (hero, factory-floor-01/02, classroom-session, lobby,
interactive-floor-plan, scale-model-of-factory-floor). Ни одно не подписано
и не показывает Тима Кука или Говарда Латника лично — это подборка фото
самого объекта и обучающихся сотрудников, без порт­ретов спикеров церемонии
(нетипично для Apple, но факт для этого конкретного релиза). То же
подтвердил MacRumors — та же фотография facility, без Кука/Латника.
Нашёл фото Латника на трибуне (Houston Public Media, credit "Natalie Weber /
Houston Public Media", есть баннер "Advanced Manufacturing Center" на фоне) —
но не стал брать: это авторская фотожурналистика регионального СМИ вне
одобренных категорий источников (не официальная пресс-служба, не Reuters/AP,
не сток), лицензия на переиспользование не подтверждена — при сомнении
выбрал источник понадёжнее.
Госсайт commerce.gov (официальная пресс-служба Латника) отдаёт 403/Cloudflare
challenge на все запросы — не смог проверить, есть ли там официальное фото
без риска для лицензии.

## Итоговый выбор
Hero-фото из пресс-кита Apple Newsroom: реальная документальная съёмка (не
рисованный сток), показывает само здание/объект Advanced Manufacturing
Center в Хьюстоне — субъект "здание/событие" из правила subject-first,
раз портрет говорящих голов недоступен через одобренные источники. Кадр
прямо иллюстрирует деталь текста — "голографический демонстрационный стол".
Права чистые: официальный пресс-кит компании, лицензия для журналистского
использования подразумевается.

## Отклонённые варианты
- Houston Public Media (Natalie Weber) — фото Латника на трибуне с баннером
  AMC, лучший subject-match, но вне одобренных категорий источников,
  лицензия не подтверждена → source-doubt, не взял.
- Apple factory-floor-01 (= фото MacRumors) — тоже валиден, но hero чуть
  точнее ложится на текст (голографический стол упомянут в статье).
- classroom-session, lobby, factory-floor-02, interactive-floor-plan,
  scale-model — тот же объект, hero даёт наиболее презентабельный кадр 16:9.
- commerce.gov — недоступен (403/Cloudflare), не проверен.

## Alt-текст
"Сотрудники Apple у голографического демонстрационного стола, показывающего
производственную линию, в Advanced Manufacturing Center в Хьюстоне"

## Уверенность в подборе: 65%
Снижена из-за отсутствия портрета Кука/Латника — mainVisualSubject
репортёра не выполнен буквально, потому что у P0-источника таких фото не
оказалось, а у альтернативного источника (Houston Public Media) не удалось
подтвердить права на переиспользование.
