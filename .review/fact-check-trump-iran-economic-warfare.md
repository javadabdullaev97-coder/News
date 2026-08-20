# Fact-check (второй проход, целевой): trump-iran-economic-warfare

## Общий вердикт: APPROVE-WITH-DOWNGRADES

Обе критические проблемы первого прохода (SCMP и Anadolu Agency — источники вне белого списка §2) в переработанном драфте устранены полностью: во frontmatter и в теле статьи остались только Al Jazeera (4 ссылки) и Bloomberg (1 ссылка), оба `citable:true` в `config/generated/source-index.json`. Новые цитаты дословно подтверждены. Единственная находка этого прохода — дата у одной статичной цитаты не совпадает с первоисточником.

## Проверенные утверждения (только новая фактура)

| # | Утверждение | Источник | Вердикт | Комментарий |
|---|-------------|----------|---------|-------------|
| 1 | Бессент: «Китай получает 50% энергии из Персидского залива» | AJ 8/20 «US Treasury secretary...» | ✅ CONFIRMED | Дословно: "Keep in mind that the Chinese get 50 percent … of their energy from inside the Gulf" |
| 2 | Бессент: «крупнейшая скоординированная экономическая изоляция в истории» | AJ 8/20 «US Treasury secretary...» | ✅ CONFIRMED | Дословно: "the greatest coordinated economic isolation in the history of the world" |
| 3 | «Экспорт нефти... упал на фоне войны и санкций» — формулировка не сильнее источника | AJ 8/20 «Tremendous costs...» | ✅ CONFIRMED (по силе формулировки) | Дословно: "oil exports have fallen amid the war and sanctions" — понижение с «до нуля» выполнено корректно, атрибуция Хемати на месте |
| 3а | Дата заявления Хемати — «20 августа» | AJ 8/20 «Tremendous costs...» | ❌ **CONTRADICTED (дата)** | Источник дословно: «On Wednesday, Iran's Central Bank Governor Abdolnaser Hemmati said…». Статья опубликована в четверг 20.08.2026 (проверено: арифметика подтверждена), значит «Wednesday» = 19 августа, тот же день, что и пост Трампа в Truth Social. Драфт и таблица цитат ошибочно указывают 20 августа |
| 4 | Линь Цзянь, официальный представитель МИД Китая: «Китай призывает... решить проблему дипломатическими и политическими средствами» | AJ 8/20 «How China and Russia...» | ✅ CONFIRMED | Дословно: "China calls on relevant parties to take responsible measures and solve the issues through diplomatic and political means"; должность — "China's Foreign Ministry spokesman" переведена корректно; транслитерация «Линь Цзянь» стандартна для Lin Jian |
| 5 | Цитата Трампа про «любую страну» — присутствует в статье AJ от 19 августа (не только в SCMP) | AJ 8/19 «Trump announces...» | ✅ CONFIRMED | Цитата дословно в статье; датировка в драфте («19 августа», не «20-го») верна |
| 6 | Нецитируемых источников не осталось | frontmatter.sources + текст | ✅ CONFIRMED | Ни SCMP, ни Anadolu Agency, ни lufkindailynews.com нигде не встречаются. Все 5 источников — Al Jazeera (`citable:true`) и Bloomberg (`citable:true`) по `source-index.json` |
| 7 | «...война США и Израиля против Ирана... с конца февраля 2026 года» без свежей дословной цитаты | leap.uz/ru/2026/08/17/iran-oman-hormuz-escalation (собственный материал) | ⚠️ ACCEPTABLE, не блокирует | Фоновая (не центральная) информация, привязана в том же абзаце к ссылке на уже проверенный материал LEAP News. Формально не нарушает §1, но стилистически можно подтянуть ближе |

## Список понижений для editor'а

1. **[ЕДИНСТВЕННОЕ ФАКТИЧЕСКОЕ]** Абзац 2: «20 августа глава Центробанка Ирана Абдольнасер Хемати заявил, что экспорт нефти из страны упал на фоне войны и санкций» → заменить дату на «19 августа» (источник AJ дословно говорит «On Wednesday», а 20 августа 2026 — четверг, значит речь о среде 19 августа, том же дне, что и пост Трампа). Альтернатива — убрать конкретную дату и написать «на этой неделе», если хочется избежать путаницы с постом Трампа в тот же день.
2. Необязательно: переставить ссылку на `leap.uz/ru/2026/08/17/iran-oman-hormuz-escalation` так, чтобы она стояла сразу после фразы «...идёт с конца февраля 2026 года», а не после следующего предложения про Оман — для более точной локальной атрибуции. Не блокирует публикацию.

## Ссылки в статье (сверка source-index.json)

- ✅ `aljazeera.com/.../8/19/trump-announces-most-crushing-economic-operation-ever-against-iran` — Al Jazeera, `citable:true`
- ✅ `aljazeera.com/.../8/20/us-treasury-secretary-says-new-economic-measures-will-collapse-iran` — Al Jazeera, `citable:true`, обе цитаты Бессента подтверждены дословно
- ✅ `aljazeera.com/.../8/20/tremendous-costs-can-trump-stop-other-countries-from-trading-with-iran` — Al Jazeera, `citable:true`, формулировка про нефть корректно понижена, но дата в тексте статьи не совпадает с драфтом (см. п.1 списка понижений)
- ✅ `aljazeera.com/.../8/20/how-china-and-russia-could-hobble-trumps-plans-to-isolate-iran` — Al Jazeera, `citable:true`, цитата Линь Цзяня подтверждена дословно
- ✅ `bloomberg.com/.../2026-08-17/...` — Bloomberg, `citable:true`, уже использовалась в опубликованном материале LEAP
- ✅ SCMP, Anadolu Agency, lufkindailynews.com — отсутствуют полностью

## Уровень доверия к драфту: 88%

Обе критические проблемы первого прохода закрыты, все новые прямые цитаты (Бессент ×2, Линь Цзянь, Трамп «любая страна») подтверждены дословно и корректно атрибутированы. Единственная находка — расхождение в один день у даты заявления главы ЦБ Ирана, легко устраняемое точечной правкой без повторной проверки.

---

FACT_CHECK_PATH: .review/fact-check-trump-iran-economic-warfare.md
VERDICT: approve-with-downgrades
ISSUES_TOTAL: 1
ISSUES_CRITICAL: 0
CONFIDENCE: 88
FETCHES: 4
SUMMARY: Новые источники (Al Jazeera ×3, все citable:true) дословно подтверждают обе цитаты Бессента, новую цитату Линь Цзяня и цитату Трампа «любая страна» с верной датой 19 августа; критические нарушения цитируемости (SCMP, Anadolu Agency) устранены полностью, но дата заявления главы ЦБ Ирана Хемати в тексте (20 августа) расходится с источником, где дословно указано «Wednesday» = 19 августа.
