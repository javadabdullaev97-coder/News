# Bild notes: serena-venus-williams-doubles-return-loss

## Стратегия: escalate-to-owner (source-doubt)

## Что проверил
- HANDOFF: image-hint — фото Серены и/или Винус Уильямс на корте во время парного матча
  (Cincinnati Open 2026 или архивное фото сестёр в паре). NOTES не открывал: image-hint
  в handoff не пустой.
- Subject-first подтверждён: тема требует показать конкретных людей (сёстры Уильямс),
  абстрактный/сток вариант не подходит, image-avoid прямо запрещает «стоковых теннисистов».

## Источник картинки — попытки

1. **Yahoo Sports** (https://sports.yahoo.com/articles/serena-venus-williams-lose-cincinnati-161845422.html)
   — og:image найден, фото Винус и Серены на матче 17.08.2026, но credit: **Robert Prange/Getty**.
   Getty — в разделе «Никогда» редполитики bild (платный сток, риск copyright-иска).
   Отклонено.

2. **Just Women's Sports** (https://justwomenssports.com/reads/serena-venus-williams-lose-cincinnati-open-2026/)
   — og:image найден, фото сестёр во время игры 18.08.2026, credit: **Aaron Doster/Imagn Images**
   (бывший USA TODAY Sports Images). Imagn — коммерческая лицензионная фотослужба того же класса,
   что Getty/Shutterstock; явно не входит в разрешённый список (официальные пресс-службы, Reuters/AP
   при уверенности в открытом использовании). Уверенности в праве публиковать без лицензии нет.
   Отклонено.

3. **WTA** (https://www.wtatennis.com/tournaments/cincinnati-open, /news, /photos) — проверил
   обзорную страницу турнира, ленту новостей и раздел фото: упоминаний Серены/Винус на
   Cincinnati Open 2026 и парного матча с Костюк/Стернс не нашёл. Официального фото матча
   на сайте WTA нет.

4. **Cincinnati Open** (cincinnatiopen.com/en/news) — 404, страница не существует по этому пути.
   Альтернативных официальных URL с фото не нашёл в рамках отведённых источников.

## Фототека редакции / сток
Не применимо: `config/stock-photos.json` закрывает только абстрактные экономические темы
(ставка ЦБ, курс сума, инфляция и т.п.), не спортивные персоналии. `pick-stock.mjs` не вызывал.

## AI-генерация (Higgsfield)
Не применимо: правила для AI-генерации прямо запрещают показывать людей и тем более известных
лиц (риск deepfake), а материал по правилу subject-first обязан показывать именно Серену
и/или Винус Уильямс. Абстрактная замена (корт/мяч без людей) не отвечает handoff image-hint
и выглядела бы как generic-заглушка на персональную спортивную новость — решил не подменять
самостоятельно, это на усмотрение владельца.

## Отклонённые варианты
- Yahoo Sports / Getty (Robert Prange) — чёрный список редполитики (Getty)
- Just Women's Sports / Imagn Images (Aaron Doster) — платная агентская фотослужба, риск
  как у Getty, не входит в разрешённый список источников

## Решение
Оба найденных кадра требуют оплаты лицензии/несут риск copyright-иска, официального
бесплатного фото не нашлось, фототека и AI-генерация не подходят по правилам роли.
Материал перемещён в `content/needs-verification/serena-venus-williams-doubles-return-loss.mdx`
с `awaitingEditor: true` и `pendingEditorQuestion.reason: source-doubt` — решение о покупке
лицензии или присылке другого фото за владельцем. `editor-queue.mjs push` не вызывал
(нет секретов Telegram в этом окружении).

## Уверенность в подборе: 0% (кадр не поставлен, эскалация)
