# Bild notes: unitree-robotics-shanghai-ipo

## Стратегия: fallback-needed (ask-owner, reason: stock-render)

## Main visual subject (из handoff / notes)
Робот Unitree (гуманоид) на демонстрации/презентации, либо биржевое табло
STAR Market с тикером 688836. Резерв — здание Шанхайской биржи.
image-avoid: пустые стоковые «бизнесмены», графики без подписи, логотипы
конкурирующих СМИ (Bloomberg/Fortune/CoinDesk), люди как центральный объект.

## Ход подбора

### A — первоисточники (sources из frontmatter)
- **Fortune** (fortune.com/2026/08/19/...) — og:image
  `GettyImages-2290520856...jpg`, подпись «Two robots produced by Unitree
  take part in a fighting demonstration during the 2026 World Robot
  Conference in Beijing, August 19, 2026», кредит **Adek Berry—AFP via Getty
  Images**. Отклонено: Getty — чёрный список платных стоков (риск
  copyright-иска), правило запрещает брать независимо от того, что это
  первоисточник статьи.
- **AI Business** (aibusiness.com/robotics/unitree-shares-surge...) —
  og:image на contentstack CDN, подпись «Superman robot», кредит указан как
  «Unitree» в тексте статьи, но при просмотре файла оказался явно другой
  дизайн (человекоподобное лицо, открытая механика плеча) — не похож на
  реальные модели Unitree (G1/H1/H2), несовпадение описаний между двумя
  фетчами того же URL. Отклонено по `source-doubt`: нет уверенности, что это
  действительно Unitree, а не архивная иллюстрация другого робота под чужим
  кредитом — риск подписать чужого робота как Unitree.
- **CoinDesk** — WebFetch вернул HTTP 429 (rate limit), повтор не помог в
  рамках сессии.
- **Bloomberg** (обе статьи и видео) — WebFetch вернул HTTP 403.
- **Проспект эмиссии SSE** (PDF, sse.com.cn) — не источник фото.
- **unitree.com** (официальный сайт, /g1, /h1) — только CGI product-рендеры
  (`.../images/a20ba1ebc0724df8a8135744dee8bbea_2740x1720.jpg` и ещё ~7
  аналогичных: робот на однотонном градиентном фоне, поза «шагает»/«сидит на
  корточках»). Технически landscape 2740×1720 (ratio 1.59), прошли бы
  `prepare-image.py` без проблем с кропом — но это не живая фотография, а
  рисованная 3D-визуализация продукта. По правилу «только живая фотография»
  (§ Что мы хотим от картинки, правило №2) такие кадры не берём **даже из
  первоисточника**: «пресс-службы часто украшают релизы именно ими» — ровно
  этот случай. Отклонено.
- unitree.com/news — WebFetch вернул пустой контент (JS-рендер), листинг
  новостей не читается без браузера.

### B0 — фототека редакции
`config/stock-photos.json`: темы `cbu, monetary-policy, fx, sum, inflation,
banking, payments` — про робототехнику/IPO/tech ничего нет.
`pick-stock.mjs` не запускал — тема заведомо не входит в список тем.

### B1 — Unsplash / Pexels
- Unsplash `humanoid-robot`: реальные фото есть, но не Unitree — ASIMO
  (Honda) и снимок «девочка с роботом» — не тот бренд, публиковать под
  темой Unitree-IPO значило бы показать чужой продукт как Unitree.
  Остальные релевантные результаты — CGI-рендеры (Cash Macanaya, Gabriele
  Malaspina, Aideal Hwa, Julien Tromeur) — тот же запрет, что и для
  официального рендера.
- Unsplash/Pexels `shanghai stock exchange`: результатов по факту почти
  нет — выдаётся не то здание (Capital Market Authority, premium/платный),
  Shanghai Gold Exchange вместо Stock Exchange, общий скайлайн Shanghai
  World Financial Center. Ничего похожего на реальное здание/табло SSE не
  нашлось.

### C — AI-генерация (Higgsfield)
Согласованный в задании fallback. **Технически недоступна в этой сессии** —
ни MCP-инструмента, ни скрипта в репозитории для вызова Higgsfield нет
(проверено по списку доступных инструментов и подтверждено прецедентом в
`.review/bild-notes-tashkent-mahalla-improvement-dolzarb-40-kunlik.md` и
`.review/bild-notes-alibaba-qwen-license-large-companies.md` — тот же вывод
в других прогонах). Промпт подготовлен, но выполнить его нечем:

> humanoid robot silhouette in front of an abstract stock exchange ticker
> board, muted editorial palette, warm orange-red #FF4D2E accent, deep
> charcoal and sand tones, no rainbow colours, no glossy 3D render,
> documentary photography look, soft natural light, no people, no visible
> exchange or company logos

## Решение
Ни один живой кадр с чёткими правами не найден; единственный технически
пригодный кандидат — официальный CGI-рендер Unitree G1
(`https://www.unitree.com/images/a20ba1ebc0724df8a8135744dee8bbea_2740x1720.jpg`,
2740×1720, landscape) — отклонён по правилу «только живая фотография».
AI-генерация недоступна физически. По playbook
`docs/agent-playbooks/bild-ask-owner.md` материал переведён в
`content/needs-verification/unitree-robotics-shanghai-ipo.mdx` с
`awaitingEditor: true` и `pendingEditorQuestion.reason: "stock-render"`.
`frontmatter.image` оставлен с `null`-полями — публикация без картинки
исключена по инструкции задания.

## Отклонённые варианты (сводка)
- Fortune og:image — Getty Images / AFP, чёрный список.
- AI Business og:image — заявлен кредит «Unitree», но визуально не совпадает
  с продуктовой линейкой Unitree, `source-doubt`.
- unitree.com/g1, /h1 — 8 официальных CGI-рендеров, все `stock-render`.
- Unsplash ASIMO / «девочка с роботом» — реальные фото, но не тот бренд.
- Unsplash CGI-рендеры роботов — `stock-render`.
- Unsplash/Pexels «Shanghai Stock Exchange» — нерелевантные здания
  (Gold Exchange, Capital Market Authority, World Financial Center).
- Bloomberg (403), CoinDesk (429) — страницы не открылись.

## Уверенность в подборе: n/a (fallback-needed, кадр не выбран)
