# Bild notes: windows-task-host-flaw-ransomware-cisa

## Стратегия: stock (тематический, живая фотография)

## mainVisualSubject
Явного физического субъекта нет — материал про CVE в системном компоненте
Windows (`taskhostw.exe`), которую теперь используют вымогатели. Handoff
(`image-hint`) прямо предлагает: экран с предупреждением о шифровании файлов
на фоне логотипа Windows, либо официальный логотип CISA. `image-avoid`:
«хакер в капюшоне», стоковые киберпреступники, логотипы конкурирующих
антивирусов.

## Ход подбора

### A — первоисточники
- `cisa.gov/known-exploited-vulnerabilities-catalog` — HTTP 403 и через curl,
  и через WebFetch (подтверждает то же самое, что уже отмечено в
  `handoff-*.md`: страница CISA недоступна). Проверил и общий логотип CISA
  (`cisa-logo.png`) — тоже 403.
- `msrc.microsoft.com/update-guide/vulnerability/CVE-2025-60710` — страница
  открывается (HTTP 200), но это SPA, отдающая пустой HTML-шелл (71 строка)
  без `og:image` и без встроенных изображений — нечего взять.
- Источник A отклонён целиком: ни CISA, ни MSRC не дали пригодной картинки.

### B0 — фототека редакции
`config/stock-photos.json` содержит только темы `cbu/monetary-policy/fx/sum/
inflation/banking/payments` — кибербезопасности и Windows там нет,
`pick-stock.mjs` не запускал, тема явно не входит в список тем фототеки.

### C — AI-генерация (Higgsfield)
Инструмента нет в этом прогоне — ни MCP-тула, ни скрипта в репозитории
(та же ситуация, что фиксировали предыдущие bild-notes: `higgsfield`
встречается только в тексте промпта агента). Вариант физически недоступен.

### B1 — Unsplash (выбранный вариант)
Поиск через `unsplash.com/s/photos/ransomware`, `.../computer-screen-warning`,
`.../cyberattack-warning`, `.../data-encrypted`, `.../windows-11-laptop`,
`.../windows-update-screen`.

Отклонённые варианты:
- `photo-1762340916350-ad5a3d620c16` (Zulfugar Karimov, «Security, privacy,
  and performance status with fix options») — родовая рекламная 3D-иконочная
  панель абстрактного «PC-оптимайзера» без привязки к Windows/CVE, похоже на
  стоковую заготовку, а не документальный кадр — отклонил.
- `photo-1614064641938-3bbee52942c7` (FlyD, красный навесной замок на
  клавиатуре в драматичной красно-зелёной подсветке) — визуально это клише
  «взлом/киберпреступность» того же типа, что запрещённый «хакер в
  капюшоне», плюс японская раскладка клавиатуры не по теме — отклонил.
- `photo-1633265486064-086b219458ec` (Towfiqu barbhuiya, замок и банковские
  карты на клавиатуре) — тема про кражу банковских данных, не про Windows/
  вымогателей — отклонил как нерелевантный.
- `photo-1624571395775-253d9666612b` («person using Windows 11 computer on
  lap») — вероятно попадает лицо человека, а материал не про конкретного
  человека — не брал.

Выбран: **`photo-1642783327432-d269921e0f20`** — фото экрана ноутбука
крупным планом с открытым системным уведомлением Windows Security:
«Threats found — Microsoft Defender Antivirus found threats. Get details.»
Живая фотография (не рендер и не скриншот-коллаж), без людей, без чужих
антивирусных логотипов, без клише «хакер». Прямая связь с темой: реальное
предупреждение системы безопасности Windows — ровно то, что просил
image-hint («экран с предупреждением... на фоне логотипа Windows»).

- Страница: https://unsplash.com/photos/Y5PSyMm8nMk
- Прямая ссылка: https://images.unsplash.com/photo-1642783327432-d269921e0f20
- Автор: Ed Hardie, Unsplash License (свободное использование с атрибуцией)
- Размер оригинала: 3000×2000 (landscape, ratio 1,5)
- Проверено `photo-dupes.mjs` — свободен, за 2 дня не выходил.

## Обработка

```bash
curl -sL "https://images.unsplash.com/photo-1642783327432-d269921e0f20?q=90&w=3000&auto=format&fit=max" -o /tmp/original.jpg
node scripts/photo-dupes.mjs --check /tmp/original.jpg   # свободен
python3 scripts/prepare-image.py /tmp/original.jpg windows-task-host-flaw-ransomware-cisa --month=2026-08
```

```json
{
  "source": {"width": 3000, "height": 2000},
  "fit": {"mode": "cover", "scale": 0.5333, "cropLoss": 0.1562, "offset": [0, 135],
    "upscaled": false, "note": "обрезано 16% по высоте; окно кропа выбрано по содержимому"},
  "output": {"path": "public/images/posts/2026-08/windows-task-host-flaw-ransomware-cisa-01.jpg",
    "url": "/images/posts/2026-08/windows-task-host-flaw-ransomware-cisa-01.jpg",
    "width": 1600, "height": 900, "bytes": 254320, "quality": 90},
  "status": "ok", "upscaled": false
}
```

`cropLoss 0.1562` — ниже общего лимита 0,22 и ниже порога `crop-risky` (0,25).
Правило `crop-risky` формально применимо (в кадре есть конкретный объект —
диалоговое окно уведомления), но обрезка срезала только фон сверху/снизу
экрана — сам текст уведомления «Windows Security / Threats found» и кнопка
«Dismiss» видны полностью, ничего значимого не потеряно. Проверил визуально
после обработки.

## Отклонённые варианты (сводка)
- cisa.gov — 403 при прямом запросе и через WebFetch.
- msrc.microsoft.com — SPA без изображений в HTML.
- Zulfugar Karimov «Security/Privacy dashboard» — родовая 3D-иконочная
  рекламная панель, не по теме конкретной уязвимости.
- FlyD «Red padlock on keyboard» — драматичное клише взлома, японская
  раскладка не по теме.
- Towfiqu barbhuiya «padlock + bank cards» — про банковские данные, не про
  Windows/вымогателей.
- Higgsfield-генерация — инструмент недоступен в этом прогоне.

## Alt-текст
«Уведомление Windows Security на экране ноутбука: «Threats found —
Microsoft Defender Antivirus found threats»»

## Credit
`Unsplash / Ed Hardie`

## Уверенность в подборе: 78%

Кадр — живая фотография реального экрана с системным предупреждением
Windows Security, горизонтальная ориентация, открытая лицензия с понятной
атрибуцией, без людей, без клише «хакер в капюшоне» и без логотипов
конкурирующих антивирусов — выполняет все условия `image-avoid`. Минус от
100%: показано предупреждение Microsoft Defender об обнаруженных угрозах
(антивирусное ПО), а не конкретно экран блокировки/шифрования файлов
вымогателем и не логотип CISA — прямого визуала под конкретный CVE-2025-60710
в открытом доступе нет, поэтому связь тематическая, а не буквальная.
