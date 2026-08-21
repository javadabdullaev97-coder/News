# Таблица цитат: microsoft-entra-id-critical-flaw-patched

| # | Утверждение в тексте | Источник | Дословная цитата из источника |
|---|----------------------|----------|-------------------------------|
| 1 | Уязвимости присвоен номер CVE-2026-69836 | https://thehackernews.com/2026/08/microsoft-entra-id-flaw-cvss-100.html | «CVE Identifier: CVE-2026-69836» (структурированный вывод WebFetch по странице; собственный перевод: «Идентификатор CVE: CVE-2026-69836») |
| 2 | Оценка риска — 10 из 10 по шкале CVSS (максимальная) | https://thehackernews.com/2026/08/microsoft-entra-id-flaw-cvss-100.html | «CVSS Score: 10.0 (Maximum Severity)» |
| 3 | Причина — ошибка обработки (десериализации) непроверенных данных | https://thehackernews.com/2026/08/microsoft-entra-id-flaw-cvss-100.html | «deserialization of untrusted data in Microsoft Entra ID allows an unauthorized attacker to execute code over a network»; перевод в тексте статьи собственный, пересказ механизма |
| 4 | Атака возможна без пароля и без участия пользователя | https://thehackernews.com/2026/08/microsoft-entra-id-flaw-cvss-100.html | вытекает из «allows an unauthorized attacker to execute code over a network» — дословной фразы «без пароля/без участия пользователя» в источнике нет, это интерпретация формулировки «unauthorized» |
| 5 | Уязвимость затронула Entra ID (бывший Azure Active Directory) | https://thehackernews.com/2026/08/microsoft-entra-id-flaw-cvss-100.html | «Affected Component: Microsoft Entra ID (formerly Azure Active Directory)» |
| 6 | Уязвимость уже эксплуатировали в реальных атаках | https://thehackernews.com/2026/08/microsoft-entra-id-flaw-cvss-100.html | «Active exploitation: Confirmed — "has been exploited in the wild"» |
| 7 | Бюллетень MSRC вышел 21 августа 2026 (четверг) | https://thehackernews.com/2026/08/microsoft-entra-id-flaw-cvss-100.html | «Microsoft Security Response Center (MSRC) vulnerability alert released Thursday, August 21, 2026» |
| 8 | Патч установлен автоматически, действий от пользователей не требуется | https://thehackernews.com/2026/08/microsoft-entra-id-flaw-cvss-100.html | «No customer action required. Microsoft stated: "This vulnerability has already been fully mitigated by Microsoft" and "There is no action for users of this service to take."» |
| 9 | Microsoft не раскрыла масштаб атак и их источник | — | негативный факт: ни в извлечении по thehackernews.com, ни в результатах поиска не встретилось упоминания числа пострадавших организаций или атрибуции атакующих; вывод сделан по отсутствию данных, а не по прямой цитате |
| 10 | Первоисточник — бюллетень MSRC по CVE-2026-69836 | https://msrc.microsoft.com/update-guide/vulnerability/CVE-2026-69836 | — источник назван, но не открылся напрямую (SPA/JS-рендер, 2 попытки WebFetch — пустой заголовок и 404 на угаданном API-эндпоинте); все цитаты в этой таблице проверены через пересказ thehackernews.com, см. оговорку ниже |
| 11 | «Microsoft 365» — название облачного продукта Microsoft, а не числовая величина | https://thehackernews.com/2026/08/microsoft-entra-id-flaw-cvss-100.html | «Entra ID... authenticates users across Microsoft 365, Azure, and countless third-party applications» — «365» здесь часть имени собственного продукта, не статистика для проверки |

## Важная оговорка для fact-checker'а

Страница самого MSRC (`https://msrc.microsoft.com/update-guide/vulnerability/CVE-2026-69836`)
у reporter'а **не отрендерилась**: WebFetch дважды вернул либо голый заголовок
SPA-страницы («Security Update Guide - Microsoft Security Response Center»
без данных), либо 404 на угаданном API-эндпоинте. Все цитаты в таблице —
из структурированного пересказа страницы thehackernews.com, сделанного
инструментом WebFetch (его модель могла перефразировать, а не процитировать
дословно оригинальный HTML). Прежде чем принимать цитаты 1–8 как окончательные,
стоит попробовать открыть MSRC другим методом (например, headless-рендер)
или свериться с оригинальным текстом thehackernews.com напрямую.
