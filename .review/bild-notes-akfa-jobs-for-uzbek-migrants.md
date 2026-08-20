# Bild notes: akfa-jobs-for-uzbek-migrants

## Стратегия: none — эскалация владельцу (no-image)

## Что проверено

### A. Первоисточник (пресс-служба президента, Telegram)
- `https://t.me/shmirziyoyev/35206` («Открытый диалог Президента с предпринимателями») —
  og:image/twitter:image отдают превью **320×180 px** (JPEG, 14 КБ). Ниже порога 600px по
  длинной стороне — `prepare-image.py` отбраковал бы как `too-small`. Полноразмерное
  фото Telegram отдаёт только через MTProto/бот-API, к которому в этой сессии нет доступа.
  Виджет `/s/shmirziyoyev` рендерит сообщение как `text_not_supported_wrap` (грид-альбом),
  без доступной ссылки на оригинал.
- `https://t.me/shmirziyoyev/35200` (награждение предпринимателей Хорезма) — тот же результат:
  og:image 180×320 px, и вторая попытка скачивания вернула 500 от CDN (`nginx/1.0.11`),
  повторная попытка отдала те же 180×320.
- `https://president.uz/ru` — отдал закэшированную страницу с новостью от 10.06.2025,
  релевантного материала об августовском визите в Хорезм не нашлось за разумное время.
- `https://akfaholding.com` — HTTP 503 (сервис недоступен) при прямом запросе и через WebFetch.
- `https://akfa.uz` — редирект на `akfaaluminium.com` (одно бизнес-направление, не холдинг).
- Официальный Telegram-канал AKFA Holding не найден: `@akfa_holding` существует, но это
  захваченный канал с 1 подписчиком и сообщением «username sotiladi» (продаётся) —
  не источник. Другие варианты имени канала (`akfaholding`, `akfa_group`, `akfauz`,
  `AKFAHolding`) отдают личные контакты, не публичные каналы.

### B0. Фототека редакции
- `config/stock-photos.json` покрывает только `cbu`, `monetary-policy`, `fx`, `sum`,
  `inflation`, `banking`, `payments` — тема материала (компания, трудовые мигранты) не
  входит в список. Скрипт не запускал: `--topic` для этой темы не существует.

### B1. Unsplash / Pexels
- Прямой запрос к Unsplash API (`unsplash.com/napi/search/photos`) заблокирован
  бот-защитой (Anubis challenge), без официального API-ключа в этой среде обхода нет.
  Pexels API-ключа тоже нет в окружении.

### C. Higgsfield AI-генерация
- Инструмент Higgsfield (generate_image и т.д.), упомянутый в системных инструкциях
  MCP, **не подключён к этой сессии** — в списке доступных инструментов его нет.
  Технически вызвать нельзя.

## Отклонённые варианты
- Telegram og:image `t.me/shmirziyoyev/35206` — 320×180, ниже порога 600px.
- Telegram og:image `t.me/shmirziyoyev/35200` — 180×320, ниже порога 600px.

## Решение
Материал перемещён `content/drafts/2026-08-20/akfa-jobs-for-uzbek-migrants.mdx` →
`content/needs-verification/akfa-jobs-for-uzbek-migrants.mdx`, добавлены
`awaitingEditor: true` и `pendingEditorQuestion` с `reason: "no-image"` — по playbook
`docs/agent-playbooks/bild-ask-owner.md`. `editor-queue.mjs push` не вызывался (нет
токена в этой сессии) — ожидается, что `editor-queue.yml` подхватит материал через
`scan-pending`.

## Alt-текст
Не заполнен — `frontmatter.image` остаётся с `null`-полями до ответа владельца.

## Уверенность в подборе: 0% (кадр не подобран)
