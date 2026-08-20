# Bild notes: amazon-prime-air-expansion

## Стратегия: primary-source

## Источник картинки
- URL: https://assets.aboutamazon.com/3d/80/59d5c2b94125b5453c07b30e2904/about-amazon-hero-prime-air-amazon-news-wl-20260817.jpg
- Тип: официальное hero-фото пресс-релиза Amazon (og:image страницы https://www.aboutamazon.com/news/transportation/amazon-prime-air-drone-delivery-expansion)
- Размер оригинала: 2000×1125 → cover, масштаб 0,8, обрезка 0% по высоте → 1600×900 (275 КБ, q90)

## Проверка на повтор
- `node scripts/photo-dupes.mjs --check` — свободен, за 2 дня этот кадр не выходил

## Отклонённые варианты
- https://assets.aboutamazon.com/f6/36/e65c48ed4d2a8388a018bcd7742b/about-amazon-inline-prime-air-amazon-news-wl-20260817.jpg — скриншот интерфейса приложения (выбор зоны доставки дроном), не живая фотография, не подходит по правилу №2
- https://assets.aboutamazon.com/19/51/89b9c87745e3b98f7b24baa9b432/tk-collage-hero-2000x1125.jpg — не проверялся детально, коллаж операций, менее прямой субъект, чем hero-фото
- https://assets.aboutamazon.com/26/a8/e717618b4a92982267f91e408d09/drone4-hero.gif — анимация посадки, формат GIF не годится для статичного превью
- https://assets.aboutamazon.com/ee/11/b18cad634710bc822b3bf361312d/prime-air-uk-hero-2.jpg — фото сотрудника UK-подразделения с дроном, не про американское расширение из статьи, hero-фото точнее соответствует subject-first (дрон MK30 в полёте)

## Alt-текст
"Дрон Amazon Prime Air MK30 с фирменным логотипом-«улыбкой» летит над полем на закате"

## Уверенность в подборе: 90%
Официальное hero-фото самого пресс-релиза Amazon, на котором прямо и без правок компания
показывает дрон Prime Air (модель соответствует линейке MK, логотип Amazon виден). Не показывает
жилую застройку (как хотелось бы по image-hint), но это прямой субъект темы, живая фотография,
без конкурентов и без людей — все жёсткие требования handoff выполнены.
