# Bild notes: google-spirit-airlines-data-deal-court-challenge

## Стратегия: stock (Unsplash, живая фотография)

## Источник картинки
- URL: https://images.unsplash.com/photo-1739685689214-e2a50e5ce1ac
- Фотограф: David Syphers (Unsplash License, свободное использование)
- Тип: живая фотография самолёта Spirit Airlines (взлёт, аэропорт Лас-Вегас), не заготовка/иллюстрация
- Размер оригинала: 3000×2000 → cover, масштаб 0,5333, обрезано 16% по высоте → 1600×900 (261 КБ, q90)
- Проверка на повтор: `photo-dupes.mjs --check` — свободен, за 2 дня не выходил

## Ход подбора
1. `sources` статьи (Bloomberg Law, ppc.land, BigGo Finance, IBTimes UK, SiliconANGLE) — все
   news-аутлеты, ни один не является официальным пресс-релизом Google или Spirit Airlines
   с фотоматериалом. Проверил og:image ppc.land — оказалась стилизованная 3D-иллюстрация
   (кран поднимает "бочку данных" на фоне хвоста самолёта) — отклонена по правилу
   "никаких рисованных заготовок/глянцевого 3D".
2. og:image SiliconANGLE — скриншот, не подходит по subject-first.
3. Фототека редакции (`config/stock-photos.json`) — только темы ЦБ/сум/инфляция Узбекистана,
   не подходит к теме про Google/Spirit Airlines (США).
4. Unsplash-поиск "spirit-airlines" — нашлись живые фото самолётов Spirit с чёткой ливреей
   и логотипом "spirit" — прямое попадание в image-hint editor'а (самолёт Spirit Airlines).
   Люди не идентифицируемы, монтажей/молотков нет — соответствует image-avoid.
5. Google/офис или здание суда не потребовались — фото самолёта Spirit Airlines полностью
   закрывает subject-first (тема прежде всего про данные Spirit Airlines, Google — покупатель).

## Отклонённые варианты
- ppc.land og:image (sold-data.webp) — рисованная 3D-иллюстрация подъёмного крана и "бочки
  данных", запрещённый стиль (глянцевый рендер / заготовка)
- SiliconANGLE og:image — скриншот, не subject-first
- Unsplash "spirit2.jpg" (фото у гейта, photo-1768926886619) — рассмотрен как запасной вариант,
  не понадобился

## Alt-текст
"Жёлтый самолёт Spirit Airlines с логотипом авиакомпании взлетает в аэропорту, на заднем плане
самолёты Frontier Airlines"

## Уверенность в подборе: 80%
