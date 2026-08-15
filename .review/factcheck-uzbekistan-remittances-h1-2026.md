# Fact-check: uzbekistan-remittances-h1-2026

**Вердикт:** approve
**Confidence:** 90
**Резюме:** skipped: P0 primary source, single-source article.

Проверка пропущена планёркой по правилу `factCheckSkip` (§Шаг5
docs/routine-prompts/planyorka-run.md): драфт пересказывает единственный
официальный документ ЦБ РУз (обзор внутреннего валютного рынка за
I полугодие 2026, PDF на cbu.uz), 2 источника (оба cbu.uz, ≤3), первый —
P0/type=source по config/news-sources.json, категория economy (не world),
тема не из forbiddenTopics, ни один источник не типа attributed, все
цифры взяты из одного и того же первоисточника (numbers-outside-primary
не применяется), материал не в rework. Reporter уже прочитал PDF целиком
— условия для пропуска повторной проверки выполнены.

Понижений формулировок нет (verdict approve, не approve-with-downgrades).

Слабые места, которые reporter отметил сам (см.
`.review/reporter-notes-uzbekistan-remittances-h1-2026.md`): перевод
узбекских терминов PDF на русский стоит перепроверить построчно (иjobiy
saldo → сальдо, suzuvchi → плавающий); дата публикации (23 июля) взята
из метаданных страницы cbu.uz, а не из самого PDF.
