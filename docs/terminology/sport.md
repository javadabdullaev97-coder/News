<!-- Часть глоссария LEAP News. Открывается, когда тема спортивная.
     Общая часть — docs/terminology-glossary.md. -->

## Спорт на узбекском: чем управляют глаголы победы и поражения

Правило владельца 18.08.2026 по разбору двух заголовков. Ошибка в обоих
одна и та же — неверный падеж при глаголе исхода. Формы ниже сверены
с тем, как пишет `championat.asia`, крупнейшее узбекское спортивное
издание; примеры оттуда приведены дословно.

| Смысл | Как правильно | Пример из живой практики |
|---|---|---|
| X победил Y | `X Yni mag'lub etdi` (винительный `-ni`) | «"Arsenal" "Manchester Siti"ni yirik hisobda mag'lub etdi» |
| X оказался сильнее Y | `X Ydan ustun keldi` (исходный `-dan`) | «"Navbahor" "Bunyodkor"dan ustun keldi» |
| X одержал победу над Y | `X Y ustidan g'alaba qozondi` либо `X Yga qarshi g'alaba qozondi` | — |
| X проиграл Y | `X Yga yutqazdi` / `X Yga mag'lub bo'ldi` (дательный `-ga`) | «Barcha o'yinlarda mag'lub bo'lishimiz» |
| со счётом | `0:3 hisobida` либо `3:0 hisobi bilan` | «yirik hisobda mag'lub etdi» |

**Чего писать нельзя:**

- ❌ `Bennning Garsiyadan g'alaba qozonishi` — «g'alaba qozonmoq» не управляет
  исходным падежом. Правильно: `Garsiya ustidan g'alaba qozonishi` или
  `Garsiyaga qarshi g'alaba qozonishi`.
- ❌ `«Siti» «Arsenal»dan 0:3 yutqazdi` — «yutqazmoq» требует дательного.
  Правильно: `«Arsenal»ga 0:3 yutqazdi`. Или переверните фразу:
  `«Arsenal» «Siti»ni 3:0 mag'lub etdi`.

Короткая проверка: **`-dan` живёт только при `ustun keldi`**. При `g'alaba
qozondi` — `ustidan` или `-ga qarshi`; при `yutqazdi` и `mag'lub bo'ldi` —
`-ga`. Ошибка ловится машинно: `node scripts/i18n-lint.mjs`.

**Заголовок о поражении своей команды не превращаем в победу чужой без
нужды.** Если в материале главный герой — узбекистанец, подлежащим остаётся
его команда: «Xusanov ... 90 daqiqa o'ynadi — «Siti» «Arsenal»ga 0:3
yutqazdi», а не «Arsenal» разгромил всех. Это вопрос фокуса, а не грамматики.
