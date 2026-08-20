# Таблица цитат: google-android-unverified-apps-install

Сохранено оркестратором: у reporter-агента Write отклонил запись файла.
Таблица — дословно из финального ответа агента.

| # | Утверждение в тексте | Источник | Дословная цитата из источника |
|---|---|---|---|
| 1 | Процесс предполагает суточное ожидание перед подтверждением установки | https://android-developers.googleblog.com/2026/03/android-developer-verification.html | «There is a one-time, one-day wait and then you can confirm» |
| 2 | Один из шагов — перезагрузка устройства, отключающая удалённый доступ | https://android-developers.googleblog.com/2026/03/android-developer-verification.html | «This cuts off any remote access» |
| 3 | После прохождения процедуры разрешение действует 7 дней или бессрочно, повторно проходить процедуру не нужно | https://android-developers.googleblog.com/2026/03/android-developer-verification.html | — прямой цитаты нет, изложено по общему содержанию поста (описание 5-шагового флоу для power users) |
| 4 | Расширенный процесс включает проверку на принуждение (coercion) со стороны мошенников | https://android-developers.googleblog.com/2026/06/android-developer-verification.html | «an advanced flow for installing apps from unverified developers, which includes security checkpoints to resist coercion scams» |
| 5 | С 30 сентября 2026 года регистрация разработчика обязательна для магазинов в Бразилии, Индонезии, Сингапуре и Таиланде | https://android-developers.googleblog.com/2026/06/android-developer-verification.html | «September 30, 2026: App registration becomes required for participating stores in Brazil, Indonesia, Singapore, and Thailand.» |
| 6 | Требование распространяется на «сертифицированные Android-устройства» | https://android-developers.googleblog.com/2026/06/android-developer-verification.html | «certified Android devices» |
| 7 | С 2027 года Google планирует расширить требование верификации разработчиков по всему миру | https://android-developers.googleblog.com/2026/06/android-developer-verification.html | «we'll expand the Android verification requirement globally» |
| 8 | Верифицированным Google считает разработчика, прошедшего регистрацию в Play Console или Android Developer Console | https://android-developers.googleblog.com/2026/06/android-developer-verification.html | — прямой формулировки-определения нет; вывод из контекста поста о регистрации разработчиков |
| 9 | Узбекистан и другие страны СНГ не входят в первую волну enforcement | https://android-developers.googleblog.com/2026/06/android-developer-verification.html | — прямой цитаты нет; вывод из отсутствия упоминания страны в перечне (Бразилия, Индонезия, Сингапур, Таиланд) |
| 10 | Что будет с уже установленными неверифицированными приложениями после 30 сентября — не уточняется | оба поста выше | — прямой цитаты нет, это констатация отсутствия информации в обоих источниках |
| 11 | Google запускает «расширенный процесс» (power user advanced flow) в августе 2026 года | https://developer.android.com/developer-verification | «August 2026 — Developer APIs, limited distribution accounts, and power user advanced flow launch.» |

## Правка после итерации с репортёром (20.08.2026)

Строка 11 добавлена: она и есть новостной повод материала — официальная таблица
сроков Google подтверждает, что механизм с ожиданием запускается именно в августе
2026 года. До правки датировка «с августа» держалась ни на чём (оба исходных
поста — мартовский и июньский — даты не называли), и claims-lint это поймал.

Строка 1 остаётся в силе: за факт «в чём состоит ожидание» по-прежнему отвечает
мартовский пост, за факт «когда запускается» — строка 11.

Число «24» из тела статьи убрано: формулировка приведена к дословной цитате
источника («однократное ожидание в одни сутки»), поэтому претензия claims-lint
«число-без-цитаты: 24» снята.
