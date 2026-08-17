# Bild notes: world-indonesia-earthquake-toll-53

## Стратегия: primary-source

## Задача
Четвёртый материал подряд в серии про землетрясение на Флоресе. handoff и
reporter notes (`mainVisualSubject`) прямо просили новый угол — гуманитарную
помощь: индонезийские военные разгружают C-130 Hercules на авиабазе Эль-Тари
(Купанг), альтернатива — спасатели на завалах в Манггараи/Маумере (уже
использовалось в двух предыдущих материалах серии, toll-38 и death-toll-20,
поэтому предпочёл первый вариант ради новой визуальной темы).

## Источник картинки
- URL: https://cdn.antaranews.com/cache/1200x800/2026/08/16/TNI-AU-distribusikan-bantuan-untuk-korban-gempa-Flores-160826-KH-1.jpg
- Страница-контейнер: https://en.antaranews.com/news/427349/ntt-quake-indonesia-air-force-airlifts-13-tons-of-emergency-aid
  (эта же ссылка уже в `frontmatter.sources` статьи — «Antara News, переброска ВВС»)
- Тип: официальное фото государственного агентства ANTARA, штатный фотограф
  (credit "ANTARA FOTO/Kornelis Kaha", не handout и не wire-агентство)
- Подпись источника: "Personnel of the Indonesian Air Force (TNI AU) El Tari Air
  Base and the East Nusa Tenggara (NTT) Regional Police work together to load
  logistical relief supplies into a C-130 Hercules aircraft at El Tari Air Base,
  Kupang City, East Nusa Tenggara, on Sunday (August 16, 2026)."
- Субъект: военнослужащие ВВС и полиция грузят/разгружают коробки с помощью
  через открытую рампу C-130 Hercules на аэродроме — прямое попадание в
  `mainVisualSubject` из reporter notes и в image-hint из handoff, дословно
  иллюстрирует абзац статьи про переброску 13 тонн груза с авиабазы Эль-Тари
- Ориентация: горизонтальная, 1200×800 (1.5) — соответствует правилу про
  горизонтальный кадр, подложка не понадобилась
- Проверено на отсутствие: тел погибших, лиц пострадавших крупным планом,
  кадров похорон (image-avoid из handoff) — в кадре только военнослужащие,
  полиция и волонтёры, разгружающие груз; ни один пострадавший/погибший не
  изображён. Фирменный водяной знак ANTARA в правом нижнем углу оригинала
  не попал в финальный кадр — обрезка по высоте (16%) убрала нижнюю полосу

## Обработка
`scripts/prepare-image.py`:
```json
{
  "source": {"width": 1200, "height": 800},
  "fit": {"mode": "cover", "scale": 1.3333, "cropLoss": 0.1562, "offset": [0, 0],
          "upscaled": true, "note": "обрезано 16% по высоте; окно кропа выбрано по содержимому; исходник растянут в 1.33× ради заливки кадра"},
  "output": {"path": "public/images/posts/2026-08/world-indonesia-earthquake-toll-53-01.jpg",
             "url": "/images/posts/2026-08/world-indonesia-earthquake-toll-53-01.jpg",
             "width": 1600, "height": 900, "bytes": 256059, "quality": 90},
  "status": "ok"
}
```
cropLoss 15,6% — ниже порога crop-risky (0,25), эскалация не нужна. Апскейл
1,33× в пределах MAX_UPSCALE скрипта, исходник 1200×800 достаточно чёткий.

## Отклонённые варианты
- https://cdn.antaranews.com/cache/1200x800/2026/08/17/IMG_5794.jpg (og:image
  статьи про 52 тонны помощи, credit ANTARA/HO-Presidential Secretariat) —
  отклонён: кабинетный чиновник инспектирует коробки на авиабазе Халим
  Пердана Кусума в Джакарте — слабее по subject-first (не Флорес, не место
  бедствия, студийно-протокольный кадр с чиновником вместо действия)
- Кадры завалов порта Маумере (та же галерея ANTARA, что и в toll-38/death-toll-20) —
  не рассматривал всерьёз: третий подряд повтор той же локации/композиции
  в развивающейся серии, тогда как handoff прямо просил новый угол (помощь),
  который нашёлся с первой попытки

## Alt-текст
"Военнослужащие ВВС Индонезии и полиция разгружают гуманитарную помощь из
самолёта C-130 Hercules на авиабазе Эль-Тари в Купанге после землетрясения
на острове Флорес"

## Уверенность в подборе: 90%
Официальный источник ANTARA (штатный фотограф, не wire, не handout),
subject-first и дословно совпадает с `mainVisualSubject`/image-hint,
горизонтальный кадр без апскейла выше нормы и без crop-risk, водяной знак
ушёл в обрезку, новая для серии визуальная тема (помощь, а не третий подряд
кадр завалов), в кадре нет пострадавших/погибших — image-avoid соблюдён.
