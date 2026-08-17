# Bild notes: trump-cuts-south-korea-drills

## Стратегия: primary-source (косвенно, через DVIDS) — фактически ближе к B0/B1: официальный госархив, не сайт первоисточника

## Что проверено сначала
- Al Jazeera og:image → фото Трампа на борту Air Force One, но credit "Alex Brandon/AP Photo" —
  агентство AP, лицензия не подтверждена → пропустил по правилу "агентства — пропускай если не
  уверен, что открытое использование разрешено".
- CBS News og:image → South Korean Marines с K1A2 tank, но credit "Jung Yeon-je /AFP via
  Getty Images" → Getty прямо в чёрном списке ("Не тащи с Getty... платные, риск copyright-иска") —
  отклонено однозначно.
- WhiteHouse.gov briefing room — свежих фото брифинга с Трампом на странице не нашёл.

## Источник картинки (выбран)
- URL: https://www.dvidshub.net/image/9850582
  (файл: https://d1ldvf68ux039x.cloudfront.net/thumbs/photos/2608/9850582/2000w_q95.jpg)
- Тип: официальное фото U.S. Army (DVIDS — Defense Visual Information Distribution Service),
  public domain, "must comply with restrictions на dvidshub.net/about/copyright"
- Caption: "U.S. Army inspector general assigned to the 19th Expeditionary Sustainment Command
  reviews a High Mobility Multipurpose Wheeled Vehicle (HMMWV) with Soldiers during a pre-convoy
  operations inspection at the Camp Henry motor pool, Republic of Korea, on July 31, 2026."
  Photographer: Cpl. Ji Won Park.
- Найдено через поиск "Ulchi Freedom Shield 2026" на dvidshub.net — попало в выдачу по этому тегу,
  относится к периоду совместных учений США-Ю.Корея, соответствует альтернативе из handoff
  ("солдаты, техника").
- Размер оригинала: 2000×1333 → prepare-image.py: mode=cover, scale=0.8 (без апскейла),
  cropLoss=0.156 (16% по высоте, в пределах лимита 22%) → 1600×900, 355 КБ, quality 90.

## Почему не главный вариант (Трамп на брифинге)
Оба найденных фото Трампа/учений у первоисточников (AP через Al Jazeera, Getty/AFP через CBS)
попадают под ограничения по лицензии (AP — "пропускай если не уверен", Getty — прямой запрет).
Официального фото Трампа с открытой лицензией (whitehouse.gov) за отведённое время не нашёл.
Ушёл на альтернативу из handoff — учения США-Ю.Корея, солдаты и техника — которая доступна
как public domain фото Армии США.

## Отклонённые варианты
- AP Photo (Alex Brandon) via Al Jazeera — Трамп на Air Force One — лицензия AP не подтверждена.
- Getty/AFP (Jung Yeon-je) via CBS — южнокорейские морпехи с K1A2 — Getty в чёрном списке.
- DVIDS /image/9560594 (антенна, солдат крупным планом) — визуально менее читаемо как "учения
  США-Южной Кореи", дата март 2026 (другой эпизод, не Ulchi Freedom Shield), отклонено в пользу
  cand2.

## Alt-текст
"Американские военнослужащие проводят предвыездной осмотр техники — HMMWV и грузовики — на
автопарке Camp Henry в Южной Корее в рамках совместных учений с Республикой Корея"

## prepare-image.py JSON
{
  "source": {"width": 2000, "height": 1333},
  "fit": {"mode": "cover", "scale": 0.8, "cropLoss": 0.156, "offset": [0, 23], "upscaled": false,
          "note": "обрезано 16% по высоте; окно кропа выбрано по содержимому"},
  "output": {"path": "public/images/posts/2026-08/trump-cuts-south-korea-drills-01.jpg",
             "url": "/images/posts/2026-08/trump-cuts-south-korea-drills-01.jpg",
             "width": 1600, "height": 900, "bytes": 355354, "quality": 90},
  "status": "ok", "upscaled": false
}

## Уверенность в подборе: 70%
Subject-first правило соблюдено частично: это не портрет Трампа (главный субъект решения), а
альтернатива "солдаты, техника" из handoff — потому что оба доступных фото Трампа/учений у
первоисточников шли с лицензионным риском (AP/Getty). Картинка документальная, не сток,
живая фотография реальных учений США-Ю.Кореи, без Ким Чен Ына в кадре (по image-avoid),
public domain. Риск: дата съёмки (31 июля) не совпадает точно с датой публикации/учений
(17-27 августа), но контекст (тот же контингент, тот же театр, та же серия учений) сохраняется.
