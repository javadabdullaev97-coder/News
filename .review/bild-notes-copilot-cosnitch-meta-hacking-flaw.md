# Bild notes: copilot-cosnitch-meta-hacking-flaw

## Стратегия: stock

## Почему не первоисточник
- Varonis (https://www.varonis.com/blog/cosnitch): хиро-картинка —
  фирменная брендированная иллюстрация Varonis Threat Labs с крупным
  логотипом/названием CoSnitch — противоречит image-avoid («логотип
  Varonis крупным планом», продвижение вендора). Остальные встроенные
  картинки — скриншоты с реальными данными, включая пароль в открытом
  виде («Hey, My password is !214SDBG!!!») — прямой image-avoid из
  handoff.
- The Register (https://www.theregister.com/research/2026/08/18/copilot-tricked-into-telling-reseachers-how-to-hack-itself/5288857):
  единственная найденная превью-картинка отдаёт файл 100×59 px —
  ниже порога too-small (600px по длинной стороне), не проверял дальше.
- mainVisualSubject явного человека или здания нет (reporter notes и
  handoff это подтверждают) — subject-first правило не применимо,
  переходим к нейтральному визуалу кибербезопасности per image-hint.
- Фототека редакции (config/stock-photos.json) закрывает только
  cbu/monetary-policy/fx/sum/inflation/banking/payments — тема
  кибербезопасности/ИИ туда не попадает, pick-stock.mjs не вызывал.

## Источник картинки
- URL: https://images.unsplash.com/photo-1614064641938-3bbee52942c7
- Автор: FlyD (@flyd2069), Unsplash License (свободное коммерческое
  использование), опубликовано на Unsplash 23.02.2021
- Тип: живая фотография (не рендер, не иллюстрация) — красный замок на
  чёрной клавиатуре ноутбука с красно-зелёной подсветкой
- Соответствует part image-hint «нейтральный визуал кибербезопасности
  (замок, код...)», без хакера в капюшоне, без логотипов, без пароля
- Проверка на повтор: node scripts/photo-dupes.mjs --check — свободен,
  за 2 дня этот кадр не выходил
- Обработка (prepare-image.py, --month=2026-08):
```json
{
  "source": {"width": 1600, "height": 1067, "path": "/tmp/padlock_test.jpg"},
  "fit": {"mode": "cover", "scale": 1.0, "cropLoss": 0.1565, "offset": [0, 0], "upscaled": false,
    "note": "обрезано 16% по высоте; окно кропа выбрано по содержимому"},
  "output": {"path": "public/images/posts/2026-08/copilot-cosnitch-meta-hacking-flaw-01.jpg",
    "url": "/images/posts/2026-08/copilot-cosnitch-meta-hacking-flaw-01.jpg",
    "width": 1600, "height": 900, "bytes": 220368, "quality": 90},
  "status": "ok", "upscaled": false
}
```
Исходник горизонтальный (1600×1067, соотношение 1.5), обрезка 15,65% —
ниже порога 22%, cover сработал штатно, подложка не понадобилась.

## Отклонённые варианты
- Varonis hero-иллюстрация — брендированная графика с логотипом
  Varonis/названием CoSnitch, image-avoid
- Varonis скриншоты CoSnitch-3/CoSnitch-4 — содержат реальный пароль
  из примера в статье, image-avoid
- The Register превью 100×59 px — too-small
- Unsplash-фото интерфейса ChatGPT (не Copilot) — отклонено: неверный
  субъект, вводит читателя в заблуждение (материал про Microsoft
  Copilot, а не OpenAI ChatGPT)

## Alt-текст
"Замок на клавиатуре ноутбука с красно-зелёной подсветкой — символ
кибербезопасности и защиты данных"

## Уверенность в подборе: 70%
Нейтральный визуал совпадает с image-hint от editor, живая фотография,
лицензия открытая. Не 100%, потому что это не
subject-specific картинка (нет явного логотипа Copilot и нет прямой
привязки к конкретной уязвимости) — но у материала по reporter notes и
handoff нет явного визуального субъекта, поэтому нейтральный вариант
кибербезопасности — штатный путь, а не компромисс.
