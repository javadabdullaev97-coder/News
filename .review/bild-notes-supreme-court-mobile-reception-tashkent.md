# Bild notes: supreme-court-mobile-reception-tashkent

## Стратегия: none → очередь редактора (reason `no-image`)

STATUS: fallback-needed
Файл перемещён из `content/drafts/2026-08-08/` в
`content/needs-verification/supreme-court-mobile-reception-tashkent.mdx`
(иначе `scan-pending` его не найдёт). Frontmatter дополнен `awaitingEditor: true`
и `pendingEditorQuestion` (reason `no-image`). `frontmatter.image` остался с `null`-ами.

## mainVisualSubject (из reporter-notes)
«Здание Верховного суда или комплекс «Узэкспоцентр» (Ташкент, ул. Амира Темура шоха, 107)
— события ещё не было на момент написания, подойдёт архивное фото здания/эмблема суда».
Явный субъект — здание, не человек: людей на снимке не требуется и не искал.

## Почему не A (первоисточник)

Оба источника из `frontmatter.sources` — посты канала `@oliysuduz` (P2, `type: "source"`
в `config/telegram-channels.json`):

- `https://t.me/oliysuduz/51380` (напоминание, ЭСЛАТМА) — проверено через `t.me/s/oliysuduz`:
  чисто текстовый пост (`text_not_supported_wrap`, `media_not_supported_cont`), фото нет.
- `https://t.me/oliysuduz/51360` (первоначальный анонс, ЭЪЛОН) — есть фото 800×539
  (`cdn4.telesco.pe/.../UvfBdDr6...jpg`), но это **промо-постер**, не документальная
  фотография: крупный узбекский текст «ОММАВИЙ ҚАБУЛ», дата/время в декоративных
  плашках, QR-код, логотип ВС слева. Реальное фото здания «Ўзэкспомарказ» занимает
  только верхний правый угол коллажа.

Отклонил постер по прецеденту `bild-notes-cb-cash-fx-500-usd-no-passport.md` (там
official-инфографика ЦБ отклонена в том числе из-за «текст на узбекском, для
русскоязычного превью не годится») — тот же критерий применим и здесь: постер целиком
попадёт в кадр статьи (при `contain`, т.к. апскейл до 2× при 16,5% обрезки технически
прошёл бы `prepare-image.py`, но результат — читаемый узбекский текст на карточке
русскоязычной статьи, разрыв языка с текстом материала).

- Аватар канала (`gzj1-UrHXBXjz...jpg`, тот же URL у обоих постов через WebFetch) —
  160×160, ниже `MIN_SOURCE=600` — отбраковка `too-small` гарантирована, не пробовал.
- `sud.uz/ru` и `sud.uz/category/sayyor-qabul/` — `503 Service Unavailable` (похоже на
  Cloudflare) и у reporter'а (см. reporter-notes), и повторно у меня — недоступен.

## Почему не B (сток)

Openverse API (`api.openverse.org`, `license=cc0,pdm`):
- «Tashkent government building» → единственный релевантный по географии результат
  «Building of Government of Tashkent» — хост `upload.wikimedia.org`, источник в
  чёрном списке редполитики (раздел 2, «Википедия — не источник»). Не беру.
- «courthouse building» → «Old Courthouse Building», «Courthouse Building» (Flickr),
  два «Fireworks courthouse building, USA» (rawpixel), «Ovid — New York — Seneca County
  Courthouse» — все США, подмена географии относительно Ташкента/Узэкспоцентра.
- «Uzbekistan courthouse», «Tashkent city hall» — 0 результатов.

Тема специфична (конкретное здание в Ташкенте), а не абстрактная — общий сток «здание
суда» из США выдал бы читателю чужую архитектуру под видом узбекской, это подмена факта.

## Почему не C (AI-генерация)

Инструментов Higgsfield в наборе тулов этого прогона нет (в отличие от MCP-инструкций
в системном промпте, ни один `generate_image`/аналог не объявлен в доступных функциях).
По существу для будущего прогона: подошла бы нейтральная иллюстрация — фасад
представительского здания в духе узбекской архитектуры (купола/колонны), без людей,
без политиков, в фирменной палитре (`#FF4D2E` акцент, графит `#1A1A1A`, песочный
`#F5EFE8`, приглушённый синий `#2C3E50`), `credit: "AI generated (LEAP News)"` — но
физически недоступна в этом окружении.

## Попытка отправить в очередь редактора

```
node scripts/editor-queue.mjs push --slug=supreme-court-mobile-reception-tashkent \
  --title="Верховный суд проведёт выездной приём граждан в Ташкенте 8 августа" \
  --reason=no-image --question="test"
```
→ `Нужны TELEGRAM_BOT_TOKEN и TELEGRAM_EDITOR_CHAT_ID.` — ожидаемо (секреты доступны
только внутри GitHub Actions). Использован двухшаговый путь по регламенту: перемещение
файла в `content/needs-verification/` + `awaitingEditor`/`pendingEditorQuestion` во
frontmatter. `editor-queue.yml` подхватит материал на очередном прогоне `scan-pending`.

Отдельно: `node_modules` в рабочей копии отсутствовал (`ERR_MODULE_NOT_FOUND: yaml`
при первом вызове) — прогнал `npm install`, зависимости встали, ошибка ушла до токенов.

## Что нужно от владельца
Фото здания Верховного суда РУз или комплекса «Узэкспоцентр» (Ташкент, Юнусабадский
район, ул. Амира Темура шоха, 107) — без узнаваемых лиц крупным планом. Присланный кадр
workflow положит в `.review/editor-photo-supreme-court-mobile-reception-tashkent.jpg`
и прогонит через `prepare-image.py`. Альтернатива — подтверждение на выпуск без картинки.

## Alt-текст
Не составлен — картинки нет.

## Уверенность в решении: 82%
Первоисточник и сток проверены исчерпывающе (оба поста ВС, аватар, sud.uz, 4 запроса в
Openverse). Основная неопределённость — недоступность AI-генерации именно в этом
прогоне: с рабочим Higgsfield-тулом решение, вероятно, было бы `ai-generated`, а не
`fallback-needed`.
