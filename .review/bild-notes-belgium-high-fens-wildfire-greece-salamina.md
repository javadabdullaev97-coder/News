# Bild notes: belgium-high-fens-wildfire-greece-salamina

## Стратегия: stock

## Почему не первоисточник
Проверил все 4 sources из frontmatter на предмет собственных фото:
- Al Jazeera — og:image есть, но это `reuters_6a819f3d-1786879805.jpg`,
  подпись «Yves Herman/Reuters» — фото фермера, опрыскивающего поля у Ваймес.
  Reuters wire, лицензия не наша.
- News4Jax (AP wire) — og:image `IDU6WOGG5NFN7IEZ7U227LUARM.jpg`, это на самом
  деле кадр с Саламина (вертолёт сбрасывает воду), подпись «AP Photo/Michael
  Varaklas», в JSON явно `"copyright":"Copyright 2026 The Associated Press.
  All rights reserved"`.
- Euronews — og:image `...9876156.jpg`, подпись «AP Photo/Valentin Bianchi.
  Copyright 2026 The Associated Press. All rights reserved», кадр пожарных
  у Эйпена, размер ровно 1536×864 (идеальный 16:9), но опять AP-wire с
  явным «all rights reserved».
- WHTC (Reuters) — не проверял отдельно, редакция та же, что и остальные
  Reuters/AP материалы — wire-фото с тем же ограничением.

Все три доступных фото первоисточников — агентские (Reuters/AP) с явной
пометкой «all rights reserved», лицензии на них у редакции нет → по
правилу «пропускай если не уверен, что открытое использование разрешено»
не беру ни одно. Официальной пресс-службы с собственным фото (Protection
civile Wallonie / Πυροσβεστική) найти не удалось — это репортаж агентств,
а не пресс-релиз ведомства с фото.

Фототека редакции (`config/stock-photos.json`) — тем «wildfire/fire» там
нет, все темы про ЦБ/сум/инфляцию. B0 не подошло.

## Источник картинки
- URL: https://unsplash.com/photos/a-helicopter-flying-through-the-air-with-a-hose-attached-to-it-zBqKRSSHYGQ
- Фотограф: Mike Newbry (@mikenewbry), Unsplash License (free to use)
- Тип: тематический сток — пожарный вертолёт с водяным баком над дымом
  лесного пожара. Локация на Unsplash не привязана к Бельгии/Греции,
  alt-текст сформулирован нейтрально, без привязки к конкретному месту —
  соответствует main visual subject reporter'а («пожарный вертолёт/
  самолёт-водолив над лесным пожаром... нейтральный кадр пожара в Европе»).
- Размер оригинала: 2400×1600 (ratio 1.5, горизонталь) → cover, масштаб
  0,6667, обрезано 15,6% по высоте (< порога 22%) → 1600×900 (87 КБ, q90).
- prepare-image.py: status ok, upscaled: false, cropLoss 0.1562.

## Отклонённые варианты
- Al Jazeera og:image (Reuters/Yves Herman) — wire-фото, «all rights reserved», без лицензии не беру.
- News4Jax og:image (AP/Michael Varaklas, снимок с Саламина) — AP-wire, «all rights reserved».
- Euronews og:image (AP/Valentin Bianchi, идеальный 16:9 кадр пожарных у Эйпена) — тоже AP-wire с «all rights reserved», несмотря на удобный формат отклонил по той же причине лицензии.
- Unsplash `gAKBZPMJXVs` (helicopter over burning field) — plus.unsplash.com премиум-сток, photographer «Getty Images» — платный/Getty, пропустил.
- Unsplash `eAKDzK4lo4o` «Burning Forrest» (Matt Howard, 6000×3376) — запасной вариант, тоже подходил (горящий лес без вертолёта), выбрал вертолёт как более точное совпадение с mainVisualSubject.

## Alt-текст
"Пожарный вертолёт с водяным баком на тросе летит над густым дымом от лесного пожара"

## Уверенность в подборе: 70%
Понижает уверенность то, что фото не с места события (Бельгия/Греция), а
тематический сток — но это соответствует прямой рекомендации reporter'а
(«нейтральный кадр пожара в Европе») и правилу редполитики не использовать
AP/Reuters wire-фото без подтверждённой лицензии. Все доступные фото
первоисточников были агентскими с явным «all rights reserved».
