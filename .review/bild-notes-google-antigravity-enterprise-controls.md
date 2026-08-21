# Bild notes: google-antigravity-enterprise-controls

## Стратегия: primary-source

## Источник картинки
- URL: https://storage.googleapis.com/gweb-cloudblog-publish/images/maxresdefault_R43tOCG.max-1300x1300.jpg
- Найдено на: https://cloud.google.com/blog/products/ai-machine-learning/expanding-google-antigravity-for-enterprise-customers
  (первоисточник из frontmatter.sources)
- Тип: официальный скриншот продукта Google Cloud — экран «Security settings»
  консоли Gemini Enterprise / AI developer tools: режим песочницы (Sandbox mode),
  доступ к браузеру (Browser access), доступ к MCP-серверам, политика доступа
  к файлам. Напрямую иллюстрирует раздел статьи про контроль доступа и аудит.
- Размер оригинала: 1280×720 (ровно 16:9) → cover, масштаб 1.25×, обрезка 0%
  → 1600×900 (166 КБ, q90). Апскейл умеренный (в пределах MAX_UPSCALE=2.5
  из scripts/prepare-image.py), крупных потерь резкости нет — проверено
  визуально после обработки, текст интерфейса читаем.
- Дубликат-проверка: `node scripts/photo-dupes.mjs --check` — файл свободен,
  за 2 дня такой кадр не выходил.

## Отклонённые варианты
- https://storage.googleapis.com/gweb-cloudblog-publish/images/antigravity_enterprise.max-2500x2500.jpg —
  главный hero-баннер статьи Google Cloud: глянцевый абстрактный 3D-рендер
  (частицы, радужные лиловый/синий/красный тона) с вшитым английским
  заголовком «Google Antigravity for enterprise». Отклонён: это ровно тот
  тип «дорогой рисованной заготовки» с чужим текстом на кадре и радужной
  палитрой, который правила прямо запрещают ставить даже из первоисточника.
  Кроме того, у материала нет субъекта-персоны/объекта, который бы оправдал
  абстракцию, — есть предметное содержание (реальный UI), которое сильнее.
- https://storage.googleapis.com/gweb-cloudblog-publish/original_images/Gif_1_vK8C2Nf.gif
  (демо «Create Budget», 1096×720) — тоже официальный и релевантный
  (лимиты расходов), но это кадр из анимации с курсором посреди действия и
  более узким соотношением сторон (больше обрезки). Security-скриншот дал
  точное совпадение 16:9 без кропа и более полно покрывает тему статьи
  (песочница + доступ + MCP + аудит, а не только биллинг).
- Blog antigravity.google/blog/antigravity-ide-extensions — только скриншоты
  маркетплейсов расширений (VS Code/JetBrains/Zed), это про вторичную часть
  материала (IDE-расширения), не про корпоративный контроль — тема заголовка.

## Проверка по bild-charts.md
Кандидат — скриншот интерфейса, поэтому открыт `docs/agent-playbooks/bild-charts.md`.
Кадр 1280×720 = точное соотношение 16:9, обрезка 0% — весь скриншот попадает
в кадр целиком, ничего не отрезано, подписи и элементы управления читаемы.
Подложка не потребовалась.

## Alt-текст
"Скриншот консоли Google Cloud с настройками безопасности для ИИ-агентов
Antigravity: режим песочницы, доступ к браузеру и MCP-серверам"

## Уверенность в подборе: 85%
