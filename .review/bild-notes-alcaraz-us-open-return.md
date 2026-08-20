# Bild notes: alcaraz-us-open-return

## Стратегия: stock (Unsplash)

## Ход поиска
1. **Первоисточники (path A).** Все три официальных канала недоступны технически:
   - `atptour.com/en/players/carlos-alcaraz/...` — HTTP 403 (бот-защита)
   - `usopen.org/en_US/players/overview/...` — HTTP 403
   - `x.com/usopen` — HTTP 402, `instagram.com/carlosalcaraz` — HTTP 429
   Прямого Instagram-поста Алькараса ("Here we go") с Фабрицио Романо не нашёл
   (сам репортёр тоже не нашёл — см. reporter-notes). А по image-avoid коллаж
   с Романо в любом случае под запретом.
2. Проверил медийные источники статьи (Sky Sports, Yahoo/USA Today via Zenfs,
   AP News, Forbes) — везде фото либо кадр эфира Sky Sports, либо
   Getty/USA Today Sports через синдикацию. Это копирайтные редакционные фото
   без открытой лицензии — по правилам агентства/платные фото пропускаем при
   сомнении в правах. Не брал.
3. Стоковые «безымянные теннисисты» — прямо в image-avoid, отбросил такой
   вариант в Pexels (кадр со счётом Sock–Cilic, старый матч, вводит в
   заблуждение).
4. Handoff прямо называет легитимную альтернативу: «стадион Артура Эша
   (US Open)» — это конкретный субъект (здание турнира), не абстракция.
   Нашёл живое фото на Unsplash: экстерьер Arthur Ashe Stadium с читаемой
   вывеской, свободная лицензия Unsplash License.

## Источник картинки
- URL: https://unsplash.com/photos/people-walk-outside-a-large-stadium-with-a-unique-roof-wzVNUQS5sAU
- Файл: https://images.unsplash.com/photo-1773271636336-80a64b505491
- Автор: Ana Garnica (@garnicanetwork), лицензия — Unsplash License (свободное использование)
- Тип: живая фотография (не рендер, не инфографика)
- Проверка дублей: `photo-dupes.mjs` — свободен, за 2 дня не выходил
- Обработка `prepare-image.py`:
```json
{
  "source": {"width": 3264, "height": 2448},
  "fit": {"mode": "cover", "scale": 0.4902, "cropLoss": 0.25, "offset": [0, 90], "upscaled": false,
          "note": "обрезано 25% по высоте; окно кропа выбрано по содержимому"},
  "output": {"path": "public/images/posts/2026-08/alcaraz-us-open-return-01.jpg",
             "url": "/images/posts/2026-08/alcaraz-us-open-return-01.jpg",
             "width": 1600, "height": 900, "bytes": 385753, "quality": 86},
  "status": "ok", "upscaled": false
}
```
cropLoss ровно 0.25 — граница `crop-risky` (> 0.25), не превышена, кадр не
уходит на подтверждение.

## Отклонённые варианты
- ATP Tour / US Open / X / Instagram (официальные каналы) — все вернули
  403/429/402, физически недоступны в этой сессии.
- Sky Sports og:image — кадр из эфира Sky Sports (собственный копирайт
  broadcaster'а), не первоисточник по теме, лицензия не подтверждена.
- Yahoo/USA Today (Zenfs) галерея — синдицированные Getty/USA Today Sports
  фото, копирайт, не брал.
- Pexels «Thrilling tennis match at US Open» (Rajtatavarthy) — виден старый
  матч Sock–Cilic со счётом на табло, вводит в заблуждение по теме статьи.

## Alt-текст
«Стадион Артура Эша на территории USTA Billie Jean King National Tennis
Center в Нью-Йорке, где Карлос Алькарас сыграет на US Open 2026»

## Уверенность в подборе: 65%
Кадр — легитимная альтернатива из handoff (стадион US Open), живое фото,
свободная лицензия, без нарушений image-avoid. Понижает уверенность то, что
это не сам Алькарас (mainVisualSubject), а разрешённая замена — фото самого
теннисиста из проверенного открытого источника найти не удалось.
