# Bild notes: world-hormuz-adnoc-tanker-attacks-us-iran-control-claims

## Стратегия: stock (Unsplash)

## Шаг A — первоисточники (не сработала)
Проверил og:image всех четырёх citable-источников через WebFetch:
- Al Jazeera (14.08, основная статья) — `getty_6a7e5499b4-1786664089.jpg`, кредит
  "File: Ali Saeedi/Getty Images" — Getty, пропускаю по правилу.
- Al Jazeera (13.08, «Iran says under control») — `getty_6a7dd54f5f-...jpg`,
  кредит "Ali Saeedi/Getty Images", в кадре ещё и человек на берегу — Getty +
  посторонний человек в кадре, пропускаю по обеим причинам.
- Al Jazeera (12.08, «transit drops») — `afp_6a7c8b1b6ba5-...jpg`: Трамп у трапа
  Air Force One, credit AFP. Это (а) человек/политик — по правилу не берём
  фото людей на политически чувствительном материале, (б) снимок не показывает
  ни пролив, ни танкер, mainVisualSubject не совпадает.
- CBS News (live updates) — `gettyimages-2289371588.jpg`, credit "Atta
  KENARE/AFP via Getty Images", скульптура на набережной Бендер-Аббаса — опять
  Getty-лицензия.
- DW — WebFetch недоступен для dw.com («unable to fetch», как и у reporter'а).

Итог: все доступные официальные/агентские фото инцидента идут через Getty
(включая AFP-фото, реализованное через Getty) — по правилу «не тащи с Getty»
использовать нельзя ни одно, независимо от того, что оно взято из
первоисточника.

## Шаг B — Unsplash: использован
- Автор: Georg Eiermann — https://unsplash.com/photos/a-large-boat-floating-on-top-of-a-body-of-water-Cjro-J9z6ZA
- Прямой файл: https://images.unsplash.com/photo-1687276740103-660a6a34bb67
- Лицензия: Unsplash License (свободное использование, коммерческое и
  некоммерческое)
- Тип: живая фотография — аэросъёмка гружёного нефтяного танкера («DIA»,
  Euronav) на входе в порт Europoort (Нидерланды) на фоне нефтехранилищ,
  вечернее освещение
- Размер оригинала: 7410×4945 (соотношение 1,50, горизонтальная ориентация)
- Обработка prepare-image.py: mode=cover, scale=0,2159, cropLoss=0,1571 (15,7%,
  ниже порога 22%), upscaled=false → 1600×900, 279 363 байт, quality 90.
  cropLoss в допуске, `crop-risky` не требуется.

```json
{
  "source": {"width": 7410, "height": 4945, "path": "/tmp/.../original.jpg"},
  "fit": {"mode": "cover", "scale": 0.2159, "cropLoss": 0.1571, "offset": [0, 0],
          "upscaled": false, "note": "обрезано 16% по высоте; окно кропа выбрано по содержимому"},
  "output": {"path": "public/images/posts/2026-08/world-hormuz-adnoc-tanker-attacks-us-iran-control-claims-01.jpg",
             "url": "/images/posts/2026-08/world-hormuz-adnoc-tanker-attacks-us-iran-control-claims-01.jpg",
             "width": 1600, "height": 900, "bytes": 279363, "quality": 90},
  "status": "ok",
  "upscaled": false
}
```

## Почему не первоисточник (учитывая явные фото в статьях) и не AI-генерация
Первоисточники физически показали изображения — но все под Getty/AFP-Getty
лицензией или с посторонним человеком/политиком в кадре, что запрещено
правилами. AI-генерация не понадобилась: mainVisualSubject из handoff
(«танкер/нефтеналивное судно в Ормузском проливе... либо карта пролива») —
конкретный физический объект, для которого нашлось уместное живое фото
нефтяного танкера с чёткой геометрией и деталями; генерация — fallback именно
для тем без уместного стока, здесь это не тот случай.

## Отклонённые варианты Unsplash
- Enguerrand Photography, «a large cargo ship in a harbor at night»
  (Cjro→ymfqtJMQXzE, «Petrel Pacific», Мельбурн) — свободная лицензия,
  горизонтальная (3000×2000, 1,5), но съёмка в глубоких сумерках/тёмное небо,
  визуально менее выразительна и хуже читается как «нефтеналивное судно» на
  превью-миниатюре — предпочёл более контрастный дневной снимок Eiermann.
- SJ Objio, «a large boat in the middle of the ocean» — Unsplash+ (платная
  лицензия), пропустил.
- Planet Volumes, «Strait of Hormuz between Iran and Oman» — спутниковый
  рендер Земли, уже отклонённый класс изображений (см. правило
  subject-first / живой пример 02.08.2026).
- Shaah Shahidh «aerial photography of tanker ship» (ранее отклонён в
  bild-notes-iran-missile-strike-adnoc-tanker-hormuz из-за cropLoss ~25% при
  соотношении 4:3) — не пересматривал, тот же файл.

## Alt-текст
«Гружёный нефтяной танкер на входе в порт на фоне нефтехранилищ —
иллюстративное фото»

Текст alt намеренно не называет Ормузский пролив, конкретное судно ADNOC
или название «DIA»/Euronav — на фото не тот танкер, не тот регион (Europoort,
Нидерланды) и не то происшествие, это иллюстрация темы (гружёный нефтяной
танкер), а не документальный кадр события 13–14 августа.

## Уверенность в подборе: 78%
Технически кадр сильный: нативная почти-16:9 геометрия у исходника (1,50),
низкий cropLoss (15,7%), высокое разрешение без апскейла, чёткий
самодостаточный субъект (нефтяной танкер целиком в кадре), никаких людей и
конкурентных логотипов. Не 90%+ — это иллюстративный сток из другого региона
(Роттердам, а не Ормузский пролив), а не фото конкретного инцидента: все
доступные фото инцидента заблокированы лицензией Getty/AFP.
