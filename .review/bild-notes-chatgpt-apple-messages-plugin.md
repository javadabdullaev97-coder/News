# Bild notes: chatgpt-apple-messages-plugin

## Стратегия: primary-source

## Источник картинки
- URL: https://9to5mac.com/wp-content/uploads/sites/6/2026/08/chatgpt-messages.jpg?quality=82&strip=all
- Тип: скриншот реального интерфейса — системный диалог macOS «Enable ChatGPT with Messages» (запрос разрешений Automation / Contacts / Full Disk Access), опубликован в статье 9to5mac из числа sources статьи
- Прямо соответствует основному image-hint из handoff: «интерфейс ChatGPT на Mac поверх приложения Apple Messages»
- Размер оригинала: 1424×1115 → cover, масштаб 1,1236 (лёгкий апскейл в пределах MAX_UPSCALE), обрезано 28% по высоте (окно кропа по содержимому, сохранены заголовок и иконка Messages) → 1600×900 (96,4 КБ, q90)
- Итог prepare-image.py: status ok, режим cover, апскейл 1.12× (не превышает лимит), без подложки/леттербоксинга

## Промпт (если AI-генерация)
Не применимо — использован скриншот первоисточника, до AI-генерации (Higgsfield) не дошло.

## Отклонённые варианты
- TechCrunch featured image (GettyImages-1831275897.jpg, стоковое фото приложения Messages в App Store на телефоне) — отклонено: платный источник Getty, риск copyright, к тому же не показывает сам плагин ChatGPT
- 9to5mac featured/hero image (chatgpt-messages.webp, 1600×800, композиция «иконка OpenAI + иконка Messages рядом» с водяным знаком 9TO5Mac) — держал как запасной вариант по fallback-формулировке хинта («логотипы рядом»), но не использовал: это рендер-иконка, не «живой» скриншот интерфейса, а первый кандидат (реальный UI-диалог) прошёл без проблем и точнее соответствует hint

## Alt-текст
"Диалоговое окно macOS «Enable ChatGPT with Messages» — запрос разрешений ChatGPT на отправку сообщений, поиск контактов и доступ к переписке в Apple Messages"

## Уверенность в подборе: 85%
