---
topic: "Кыргызстан начал регистрацию жителей Чон-Гара и Таш-Тобо для гражданства"
proposedCategory: "politics"
plannedFor: "2026-08-05"
decision: "rejected"
decidedBy: "planyorka"
decidedAt: "2026-08-05T04:52:00+05:00"
reason: "Дубль. То же событие (регистрация ~2500 жителей сёл Чон-Гара и Таш-Тобо/Таш-Добо 3 августа, тот же первоисточник — Интерфакс со ссылкой на представительство президента КР в Баткенской области) LEAP уже опубликовал 4 августа. Обнаружено на этапе SEO — локальная копия content/posts/ была устаревшей на момент первичной проверки дублей (проверялась без предварительного git fetch/checkout content/posts/ из origin/main), из-за чего уже вышедшая статья не попала в сравнение. Материал прошёл полный цикл (reporter, fact-checker approve-with-downgrades 83, editor publish, bild, seo) впустую — фактической ошибки в тексте нет, снят исключительно из-за дублирования."
duplicateOf: "content/posts/2026-08-04/uz-kg-village-transfer-chongara-tashdobo.mdx"
draftPath: "content/posts/2026-08-05/uzbekistan-kyrgyzstan-chongara-transfer.mdx"
inboxItems:
  - "https://t.me/gazetauz/63346"
  - "https://t.me/RepostUZ/85143"
  - "https://kz.kursiv.media/2026-08-04/dlzh-kyrgyzstan-i-uzbekistan-nachali-obmen-territoriyami/"
  - "https://t.me/podrobno/89410"
  - "https://podrobno.uz/cat/obchestvo/posle-obmena-territoriyami-zhiteli-byvshego-uzbekskogo-sela-poluchat-grazhdanstvo-kyrgyzstana/"
  - "https://en.kabar.kg/news/two-former-uzbek-villages-officially-became-part-of-kyrgyzstan/"
  - "https://www.interfax.ru/world/1107299"
  - "https://www.kommersant.ru/doc/8861511"
  - "https://dunyo.info/en/news/prezidenty-uzbekistana-i-kyrgyzstana-podveli-itogi-proshedshih-v-cholpan"
---

# Снято: регистрация жителей Чон-Гара и Таш-Тобо для гражданства КР

Материал прошёл reporter (confidence 72), fact-checker (`approve-with-downgrades`,
confidence 83, с пометкой `POLICY_EDGE: да`), editor (`publish`, все понижения
применены), bild и seo — и только на этапе seo обнаружилось, что LEAP уже
опубликовал этот сюжет накануне.

## Основание для снятия

`content/posts/2026-08-04/uz-kg-village-transfer-chongara-tashdobo.mdx` —
publishedAt 2026-08-04T20:00:00+05:00, authors `reporter + editor`, тот же
первоисточник (Интерфакс со ссылкой на представительство президента КР в
Баткенской области), те же цифры (~2500 жителей, сёла Чон-Гара и Таш-Добо/
Таш-Тобо, 3 августа). Это не развитие сюжета с новыми фактами — повторный
проход по тому же событию.

## Почему проверка дублей его не поймала

Перед отбором тем планёрка обновила `content/state/seen-topics.json`,
`content/state/seen/` и `content/inbox/` из `origin/main` (по инструкции
шага «Перед отбором тем — перечитай состояние из origin/main»), но НЕ
`content/posts/` — эта директория не входит в список обновляемых путей.
Ручная проверка дублей по `content/posts/` за последние 3 дня прошла по
локальной (устаревшей) копии рабочего дерева, в которой опубликованной
4 августа статьи ещё не было. Тема ушла в производство, потому что на
момент отбора и клейма в журнале тем ссылки инбокса (сегодняшние
перепечатки конкурентов про регистрацию 3 августа) не совпадали хешами со
ссылками уже вышедшей статьи.

**Урок на будущее (для rationale):** проверку дублей по `content/posts/`
нужно делать после `git fetch origin main` + `git checkout origin/main --
content/posts/`, а не по локальному рабочему дереву — оно расходится с
`origin/main` в течение сессии, особенно когда параллельно работают другие
прогоны.
