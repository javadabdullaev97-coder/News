# Fact-check: adobe-firefly-gemini-omni-flash

## Общий вердикт: APPROVE-WITH-DOWNGRADES

Оба центральных факта (открытие доступа к трём аудио-инструментам Firefly и добавление Gemini Omni Flash) подтверждены дословными цитатами, которые фактчекер получил напрямую с blog.adobe.com и deepmind.google — таблица цитат репортёра оказалась заниженной по confidence из-за проблем WebFetch, а не из-за реальных дыр в фактуре. Есть одно место, где формулировка драфта чуть сильнее, чем позволяет источник (дата релиза модели), — требует понижения по лестнице, не переделки.

## Проверенные утверждения

| # | Утверждение | Источник | Вердикт | Комментарий |
|---|---|---|---|---|
| 1 | Adobe 20 августа сделала общедоступными Generate Music/Speech/Sound Effects | blog.adobe.com | ✅ CONFIRMED | Дословно: «Today, Firefly's popular audio tools — Generate Music, Generate Speech, and Generate Sound Effects — are now broadly available» |
| 2 | До обновления Firefly уже поддерживал генерацию изображений и видео | blog.adobe.com | ⚠️ PARTIAL | Прямой цитаты «уже поддерживал до обновления» нет; ближайшая — «Firefly gives you the best Adobe tools across image, video, audio, and design» плюс заголовок «expands its creative AI studio». Некритичный фоновый факт (общеизвестная функциональность продукта), риск низкий — понижения не требую, но отмечаю как не строго доказанный |
| 3 | Generate Music → Firefly Music Model, инструментальные треки под длину/настроение | blog.adobe.com | ✅ CONFIRMED | «Generate Music, powered by the Firefly Music Model»; «tracks tuned to your video's length and mood» |
| 4 | Generate Sound Effects → Firefly Audio Model | blog.adobe.com | ✅ CONFIRMED | «Generate Sound Effects, powered by the Firefly Audio Model» |
| 5 | Generate Speech → Firefly Speech Model + опция ElevenLabs | blog.adobe.com | ✅ CONFIRMED | «Generate Speech, powered by the Firefly Speech Model with the option to use ElevenLabs» |
| 6 | Материалы лицензированы для коммерческого использования | blog.adobe.com | ✅ CONFIRMED | «commercially safe AI audio»; «universally licensed original tracks ... without worrying about takedowns» |
| 7 | Gemini Omni Flash — мультимодальная модель DeepMind, вход: текст/изображения/видео/аудио | deepmind.google | ✅ CONFIRMED | «Text strings ..., images, audio, and video files» |
| 8 | Промпт можно дополнять видео/аудио/изображением, правка за несколько шагов | blog.adobe.com | ✅ CONFIRMED | «lets you prompt with video, audio and image inputs alongside text ... reshape it through back-and-forth edits» |
| 9 | SynthID-метка для проверки происхождения контента | deepmind.google | ✅ CONFIRMED | «we ... used SynthID, our digital watermarking tool to clearly verify AI-generated content» |
| 10 | Замена голоса реальных людей пока ограничена | deepmind.google | ✅ CONFIRMED | «For now, we are restricting this capability and working to better understand how to safely and responsibly bring it to our users» |
| 11 | Gemini Omni Flash «вышла» 19 мая 2026 | deepmind.google | ⚠️ PARTIAL | В карточке буквально «Published 19 May 2026» — это дата публикации карточки модели, не прямое заявление «модель выпущена в этот день». Понижение см. ниже |

## Проверка vendorSpeaksAboutItself / aiSlopBan / benchmarkClaims

- **vendorSpeaksAboutItself**: Adobe и Google DeepMind как первоисточники о себе использованы корректно. В исходнике Adobe встречаются оценочные обороты («game changer», «the magic of Firefly AI Assistant») — ни один не перенесён в драфт ни как факт, ни как неатрибутированная цитата. Соответствие подтверждаю.
- **aiSlopBan**: превосходных степеней в тексте нет.
- **benchmarkClaims**: в источнике DeepMind сравнительных цифр нет, в драфте бенчмарки не упоминаются — правило неприменимо.

## Чек-лист редполитики

- [✓] Заголовок ~77 символов, без CAPS и «!»
- [✓] Субъект и глагол в первых 60 знаках заголовка
- [✓] Лид ~26 слов, есть дата
- [✓] Все предложения ≤25 слов
- [✓] Глаголы атрибуции нейтральны
- [✓] Архитектура: одно событие, без искусственного дробления
- [✓] Числа сверены с источниками
- [✓] Нет ссылок на СМИ из чёрного списка
- [✓] AI-slop фраз не найдено
- [✓] Google DeepMind — полное название при первом упоминании
- [✓] Frontmatter валиден, `sources` — 2 записи

## Список понижений для editor'а

1. Абзац про Gemini Omni Flash: «Gemini Omni Flash вышла 19 мая 2026 года — в Firefly её добавили спустя три месяца» → «По карточке модели Google DeepMind, опубликованной 19 мая 2026 года, — в Firefly её добавили спустя три месяца» (источник дословно говорит «Published 19 May 2026» — дата публикации документа, не прямое заявление о релизе модели пользователям).

Необязательная заметка: пункт 2 таблицы («Firefly уже поддерживал генерацию изображений и видео до обновления») — общеизвестный фоновый факт без прямой цитаты, риск минимален, editor может смягчить формулировку на своё усмотрение, но это не обязательное понижение.

## Уровень доверия к драфту: 90%

FACT_CHECK_PATH: .review/fact-check-adobe-firefly-gemini-omni-flash.md
VERDICT: approve-with-downgrades
ISSUES_TOTAL: 2
ISSUES_CRITICAL: 0
CONFIDENCE: 90
FETCHES: 2
SUMMARY: Оба ключевых факта (аудио-инструменты Firefly и интеграция Gemini Omni Flash) подтверждены дословными цитатами с blog.adobe.com и deepmind.google, вендорский маркетинговый язык в текст не просочился; единственная правка — понизить утверждение о дате релиза Gemini Omni Flash до атрибутированной формулировки.
