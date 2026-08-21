# Fact-check: broadcom-ai-chip-debt-financing

## Общий вердикт: APPROVE-WITH-DOWNGRADES

## Проверенные утверждения

| # | Утверждение | Источник | Вердикт | Комментарий |
|---|---|---|---|---|
| 1 | Broadcom ведёт переговоры о долге до $100 млрд на ИИ-чипы (по данным Bloomberg) | Bloomberg (via SiliconANGLE verbatim quote), sources[0] | ✅ CONFIRMED | SiliconANGLE дословно цитирует Bloomberg: «Broadcom Inc. is reportedly seeking to borrow up to $100 billion...». Bloomberg-страница вернула 403 (paywall), но атрибуция подтверждена независимой прямой цитатой источника. |
| 2 | Долг предназначен для роста Anthropic и «других компаний» | SiliconANGLE, sources[1] | ✅ CONFIRMED | Дословная цитата в таблице claims совпадает. |
| 3 | Среди «других компаний» может быть OpenAI Group PBC | SiliconANGLE | ✅ CONFIRMED | Дословно: «Those companies may include OpenAI Group PBC» — формулировка возможности сохранена и в драфте («может входить»). |
| 4 | Младший транш ≈ $30 млрд | SiliconANGLE | ✅ CONFIRMED | Проверено прямым WebFetch: «could add about $30 billion in junior notes». |
| 5 | Старший транш $60–70 млрд, часть гарантирует Broadcom | SiliconANGLE | ⚠️ PARTIAL | Сумма подтверждена дословно. Но гарантия Broadcom в источнике — предположительная: «It's believed that Broadcom **may** guarantee a portion of the debt». Драфт пишет «готов гарантировать» — модальность завышена. |
| 6 | Blackstone и Apollo «ведут переговоры с Broadcom как партнёры по сделке июня 2026 года» | SiliconANGLE, sources[1] | ⚠️ PARTIAL | Источник мягче: «Blackstone and Apollo Global Management are among the investors from which the chipmaker **hopes to raise the funds**» — Broadcom надеется привлечь средства, а не подтверждённые переговоры. |
| 7 | Июнь 2026: Broadcom, Apollo, Blackstone создали AI XPV, дали Anthropic $35 млрд на дата-центры | SiliconANGLE | ✅ CONFIRMED | Дословное совпадение. |
| 8 | Дата «20 августа» | SiliconANGLE (URL/dateline) | ✅ CONFIRMED | Дата публикации и «Bloomberg today» в цитате согласуются. |

**Противоречие $100 млрд vs «more than $60 billion» в заголовке Bloomberg:** реального противоречия нет — заголовок Bloomberg описывает только старший транш, $100 млрд — сумма обоих траншей. Драфт корректно разводит это через разбивку по траншам.

**vendorSpeaksAboutItself:** ни Broadcom, ни Anthropic не процитированы как источник собственного заявления. Нарушения нет.

**techLeakAndRumor:** citable:true источник назван и процитирован (Bloomberg + SiliconANGLE); атрибуция «по данным Bloomberg» стоит первым элементом в лиде; глагол «ищет» правильно подаёт стадию переговоров.

## Чек-лист редполитики

- [✓] Заголовок 60–90 символов (~75), без CAPS, без «!»
- [✓] Субъект и глагол действия — в первых 60 знаках
- [✓] Лид 27 слов, есть дата
- [✓] Глаголы атрибуции нейтральны
- [✓] Нет ссылок на чёрный список СМИ
- [✓] Нет AI-slop фраз
- [✓] Названия компаний полные при первом упоминании
- [✓] Frontmatter валиден, sources содержит 2 записи
- [⚠] Модальность гарантии Broadcom завышена (п.5)
- [⚠] Статус переговоров Blackstone/Apollo завышен (п.6)

## Список понижений для editor'а (применяет сам, без повторной проверки)

1. Абзац 4: «часть которого **готов гарантировать** сам Broadcom» → «часть которого **может гарантировать** сам Broadcom» (источник: «it's believed that Broadcom may guarantee a portion of the debt»).
2. Абзац 5: «Blackstone и Apollo Global Management **ведут переговоры** с Broadcom как партнёры по сделке июня 2026 года» → «Broadcom рассчитывает привлечь часть средств у Blackstone и Apollo Global Management, партнёров по сделке июня 2026 года, пишет SiliconANGLE» (источник: «are among the investors from which the chipmaker hopes to raise the funds»).

## Уровень доверия к драфту: 84%

---

FACT_CHECK_PATH: .review/fact-check-broadcom-ai-chip-debt-financing.md
VERDICT: approve-with-downgrades
ISSUES_TOTAL: 2
ISSUES_CRITICAL: 0
CONFIDENCE: 84
FETCHES: 3
