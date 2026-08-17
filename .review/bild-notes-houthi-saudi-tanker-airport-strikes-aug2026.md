# Bild notes: houthi-saudi-tanker-airport-strikes-aug2026

## Стратегия: primary-source

## Источник картинки
- URL: https://www.aljazeera.com/wp-content/uploads/2026/07/ap_6a613e7ed9b96-1784757886.jpg
- Статья-источник: Al Jazeera, "Yemen's Houthis claim attack on two Saudi oil tankers" (22 июля 2026),
  найдена через DuckDuckGo (aljazeera.com не в frontmatter.sources — эта статья не цитируется в тексте,
  использована только как хостинг живой фотографии Сариа для иллюстрации)
- Тип: живая фотография агентства AP (фотограф Osamah Abdulrahman), опубликована Al Jazeera
- Подпись в источнике: «FILE - Houthi military spokesman Yahya Saree speaks at a rally against
  the U.S. and Israel in Sanaa, Yemen, April 18, 2025» (архивное фото, не с места событий 4–5 августа)
- Содержание: военный представитель хуситов Яхья Сариа — фигурант, чьи заявления составляют весь
  текст статьи — выступает перед десятками микрофонов на митинге в Сане, поднятый кулак,
  на фоне баннер с мечетью аль-Акса
- Размер оригинала: 3011×2007 (соотношение 1,50 — горизонталь, подложка не потребовалась)

### JSON prepare-image.py
```json
{
  "source": {"width": 3011, "height": 2007},
  "fit": {"mode": "cover", "scale": 0.5314, "cropLoss": 0.1561, "offset": [0, 166],
    "upscaled": false, "note": "обрезано 16% по высоте; окно кропа выбрано по содержимому"},
  "output": {"path": "public/images/posts/2026-08/houthi-saudi-tanker-airport-strikes-aug2026-01.jpg",
    "url": "/images/posts/2026-08/houthi-saudi-tanker-airport-strikes-aug2026-01.jpg",
    "width": 1600, "height": 900, "bytes": 204671, "quality": 90},
  "status": "ok",
  "upscaled": false
}
```
cropLoss 0,1561 — ниже порога crop-risky (0,25), при визуальной проверке результата лицо
и поднятая рука Сариа полностью в кадре, ничего значимого не срезано.

## Почему это фото, а не другие варианты
Reporter указал mainVisualSubject тремя вариантами: танкер в Красном море / судоходство,
Яхья Сариа (архивное фото с заявлениями), либо аэропорт Наджран. Прямых официальных фото
удара по танкеру Wafa или по аэропорту Наджран в проверенных источниках (Bloomberg, Interfax x2,
Kommersant) нет — все три источника текстовые, без og:image (проверено WebFetch). Bloomberg
отдаёт 403 напрямую. Выбрал второй вариант подсказки reporter'а — фото самого Сариа: он не
безликий субъект, а лицо, чьи прямые цитаты формируют весь материал (и про танкер, и про
аэропорт), поэтому это столь же сильное subject-first решение, как фото танкера или здания
аэропорта, и оно нашлось как живая, атрибутируемая AP-фотография.

## Отклонённые варианты
- Interfax (1107567, атака на танкер) — WebFetch: нет og:image, только логотип и превью
  несвязанных материалов.
- Interfax (1107383, атака на аэропорт) — WebFetch: нет og:image.
- Kommersant (8862853) — WebFetch: единственное изображение — рекламный gif, не редакционное.
- Bloomberg (первоисточник) — 403 напрямую; republish на insurancejournal.com — фото
  «Yemeni protester carries mock missile», credit Mohammed Hamoud/Getty — отклонил: Getty
  в чёрном списке платных агентств (риск copyright-иска), плюс не точный subject (протестующий
  с макетом ракеты, а не Сариа/танкер/аэропорт).
- Al Jazeera, «Yemen's Houthis claim missile attack on Saudi Arabia oil tanker» (28 июля) —
  фото хуситского боевика у горящих обломков сбитого саудовского дрона, credit AFP /
  Ansarullah Media Center. Отклонил: 1) другой эпизод (сбитый дрон, не танкер Wafa и не
  Наджран), 2) Ansarullah Media Center — пропагандистский канал самих хуситов, атрибуция
  через него рискованна для нейтральности источника.
- Al Jazeera, «Yemen's Houthis deny plan to charge ships transiting Red Sea» (1 августа) —
  фото «Boats float near the coast of Bab al-Mandeb, Yemen», credit Reuters (File Photo).
  Технически подходящий общий вид Красного моря/судоходства (fallback-вариант из
  mainVisualSubject), но CDN-хост `aje.news` отдавал 403 на все запросы скачивания (проверено
  curl с разными User-Agent/Referer) — недоступен физически, не только по редполитике.
- AI-генерацию не потребовалась: нашлось живое, атрибутируемое фото прямого фигуранта текста.

## Alt-текст
"Военный представитель хуситов Яхья Сариа выступает перед микрофонами на митинге в Сане,
Йемен, архивное фото"

## Уверенность в подборе: 70%
Фото не с места событий 4–5 августа (архивный снимок апреля 2025 года, помечено в
источнике как «FILE»), но это прямой портрет фигуранта, чьи слова составляют весь материал —
сильнее subject-first совпадение, чем абстрактная карта или нейтральный пейзаж. cropLoss
(0,1561) далеко ниже порога crop-risky, горизонтальная ориентация не потребовала подложки.
