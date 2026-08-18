# Bild notes: kuvonchbek-ismoilov-u20-world-champion

## Стратегия: не найдено (fallback-needed → no-image, отправлено на подтверждение владельцу)

## A. Первоисточник — UWW (uww.org)
- `https://uww.org/athletes/ismoilov-kuvonchbek` — профиль спортсмена. Единственная
  найденная в HTML ссылка на фото — `https://athena.uww.org/public/person/117221/picture.jpg`.
  Скачал и открыл: это generic-силуэт-заглушка UWW (500×500 PNG, серый контур человека
  в майке), не фотография атлета. Не использовано.
- Собрал сырой HTML (curl, не WebFetch-суммаризация) для четырёх статей UWW и профиля,
  вытащил все `cdn.uww.org/.../2026-08/*.jpg` пути:
  - `u20-world-championships-2026-entries`
  - `u20-world-championships-2026-day1-greco-roman-results-video-highlights`
  - `2026-u20-world-championships-live-day-two-greco-roman`
  - `u20-world-championships-2026-live-blog-day-three-bratislava`
  - Единственное живое фото по категории до 63 кг греко-римского стиля во всех
    четырёх статьях — одно и то же: `63kg_gr_-_salim_kazmakhov_rus_df._ali_mehr_ali_gharibi_iri_856.jpg`
    (полуфинал Салима Казмахова (RUS) против иранца Али Мехра Али Гарибов). Это
    соперник по финалу — по `image-avoid` из handoff нельзя ставить его главным кадром.
    Фото самого Исмоилова ни в одной из статей нет.
  - Поиск по подстроке `ismoilov` во всех скачанных страницах — 0 совпадений.
- `photo.uww.org` (официальный фотопортал UWW) — через WebFetch отдал только
  header/footer без содержимого галерей; прямой curl вернул 403 (бот-защита).

## Федерация борьбы Узбекистана / НОК
- `wrestling.uz` — DNS timeout (ETIMEOUT).
- `gres.uz` — DNS не резолвится (ENOTFOUND).
- `noc.uz` (Национальный олимпийский комитет) — HTTP 503 на двух попытках.
- Telegram `@minsportuz` (Министерство спорта, в каталоге как P3 source) — в ленте
  на момент проверки только волейбольные новости, публикации про Исмоилова нет.
- Telegram `@tribunauznews` (P2, специально отмечен в конфиге как канал для тем
  «узбекский спортсмен за рубежом») — в ленте только футбольные трансферы, про
  Исмоилова тоже нет.

## B0. Фототека редакции
`config/stock-photos.json` — темы только монетарные (cbu/sum/fx/inflation/banking),
спортивной категории нет. Не применимо.

## B1. Публичные банки (Unsplash/Pexels)
Ключей `UNSPLASH_ACCESS_KEY`/`PEXELS_API_KEY` в окружении нет — искал вручную через
WebFetch по сайтам.
- Unsplash «greco-roman wrestling», ориентация landscape — топ-кандидаты
  (`photo-1764908912212-...`, `photo-1764908912202-...`, автор C.F. Photography)
  при просмотре оказались фото американской школьной борьбы вольного/фолкстайл
  стиля (наголовники-эргаген, майки со школьными логотипами, трибуны спортзала) —
  не тот стиль борьбы (greco-roman запрещает захваты за ноги, кадры явно с
  вольной/фолкстайл разновидностью), к тому же в кадре узнаваемые лица, похожие
  на несовершеннолетних, в полностью не относящемся к теме контексте (US high
  school, не Братислава) — риск некорректной атрибуции и этическая проблема
  использования чужого/детского лица для иллюстрации не связанной с ними новости.
  Не использовано.
- Pexels «wrestling» / «greco-roman wrestling» — результаты той же природы
  (американская школьная борьба, Cupertino, California) плюс кадры Celio Junior
  (Бразилия, `pexels-photo-38163412/415/416`) — при проверке размеров все три
  вертикальные (1200×1501, 1200×1500), не проходят по ориентации (нужен
  горизонтальный кадр ≥1.3 по правилу владельца от 04.08.2026). Не использовано.

## C. AI-генерация
Higgsfield/`generate_image` не подключён к тулсету этого прогона (доступны только
Read/Edit/WebFetch/Bash/Grep/Glob) — техническая невозможность, не редакционный отказ.

## Решение
Все источники (A/B0/B1/C) исчерпаны без результата, отвечающего и `image-hint`,
и `image-avoid` из handoff. Материал перемещён в
`content/needs-verification/kuvonchbek-ismoilov-u20-world-champion.mdx` с
`awaitingEditor: true` и `pendingEditorQuestion.reason: "no-image"` — по прецеденту
`tashkent-mahalla-improvement-dolzarb-40-kunlik` (та же причина: сток недоступен без
ключа, Higgsfield не подключён к сессии).

## Alt-текст
Не заполнен — `frontmatter.image` остаётся с `null`-полями.

## Уверенность в подборе: n/a (fallback)
