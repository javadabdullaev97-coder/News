# Логотип LEAP News — константы и промпты

Промпты для генерации вариантов знака в Gemini и жёсткие вводные, без
которых варианты разъедутся между собой.

## Прочитать до первой генерации

Генератор изображений ненадёжно рисует буквы — именно поэтому в исходном
варианте сломалась «p». Это не разовая осечка: каждая новая генерация даёт
чуть другие буквы. Сгенерируете десять вариантов — получите не набор
вариаций одного логотипа, а десять похожих логотипов, и увидите это не
сразу, а когда они окажутся рядом на сайте, в аватарке и на карточке.

Отсюда порядок работы:

1. **Генерируем только знак** (промпт 1) — фигуры модели рисуют надёжно.
   Выбираем лучший результат, он становится мастером.
2. **Мастер прикрепляем картинкой ко всем остальным промптам.** Без этого
   шестиугольник поедет: пропорции, скругление, наклон среза у «L».
3. **Текст ставим настоящим шрифтом**, а не генерируем. Тогда «p»
   правильная всегда и одинаковая во всех вариантах.

Кандидаты на шрифт, все бесплатные (Google Fonts, лицензия OFL):
**Orbitron Bold** — ближе всего к исходному по квадратности;
**Chakra Petch Bold** — второй; Exo 2, Saira, Rajdhani, Michroma — дальше.

**Финальный шаг, который снимает вопрос совсем:** выбранный мастер
переводится в вектор (SVG), текст ставится шрифтом, и дальше все варианты
собираются из одного исходника кодом. Тогда расхождение невозможно
физически, а не «по договорённости», и логотип встаёт в карточки соцсетей
и в шапку сайта тем же файлом.

---

## Константы

### Цвета

| Значение | Роль | Где |
|---|---|---|
| `#FF4D2E` | Оранжевый | тот же токен, что на сайте |
| `#FFFFFF` | Белый | «news» и знак внутри шестиугольника |
| `#0B0B0C` | Тёмный фон | основной фон логотипа |
| `#111318` | Тёмный текст | «news» на светлом фоне |
| `#FAFAFA` | Светлый фон | версия для документов |

Оранжевый — тот же токен, что на сайте (`tailwind.config.ts`, `brand`).
Не берите цвет пипеткой с картинки от ChatGPT: там он чуть другой, и
логотип разойдётся с сайтом.

### Геометрия знака

- Шестиугольник остриём вверх и вниз, плоские вертикальные стороны слева и справа.
- Ширина к высоте — `0.87 : 1`.
- Все шесть углов скруглены, радиус — `8%` высоты шестиугольника.
- Заливка сплошная, без градиента, обводки и тени.
- Внутри белая «L»: вертикальная стойка, снизу горизонтальная лапа, правый край лапы срезан под 45° — читается как стрелка вперёд.
- «L» — `52%` высоты шестиугольника, толщина штриха — `16%` высоты.

### Пропорции

`H` — высота шестиугольника. Все остальные размеры считаются от неё,
поэтому логотип масштабируется целиком и не разъезжается.

| Величина | Вертикальный замок | Горизонтальный замок |
|---|---|---|
| Высота прописной «L» в «Leap» | 0.30H | 0.30H |
| Высота строчных в «news» | 0.24H | 0.24H |
| Зазор знак → текст | 0.05H | 0.25H |
| Зазор «Leap» → «news» | 0.03H | 0.03H |
| Высота блока текста целиком | — | 0.72H |
| Охранное поле вокруг логотипа | 0.25H | 0.25H |

### Холсты

| Вариант | Холст | Где применяется |
|---|---|---|
| Знак | 2048×2048 | исходник для всего остального |
| Вертикальный замок | 2048×2560 | посты, презентации |
| Горизонтальный замок | 3072×1024 | шапка сайта, письма, документы |
| Аватар | 2048×2048 | Instagram, Facebook, Telegram |
| Фавикон | 1024×1024 | вкладка браузера, иконка приложения |
| Водяной знак | 1536×512 | угол фотографии, карточки |
| Обложка | 2048×768 | обложка страницы Facebook |

### Минимальные размеры

Знак — 24 px. Горизонтальный замок — 120 px по ширине. Вертикальный — 80 px.
Меньше этого «L» внутри шестиугольника перестаёт читаться, и нужен вариант
из промпта 8.

---

## Правила против расхождения

1. Промпт 1 генерируется первым. Лучший результат — мастер.
2. Мастер прикрепляется картинкой к каждому следующему промпту. Строка про референс уже стоит в промптах 2–10.
3. Цвета — всегда хексом. «Оранжевый» модель поймёт как угодно.
4. Числа из таблицы пропорций — в каждый промпт, даже если кажется очевидным.
5. Блок описания знака копируется дословно. Переформулировали — получили другой знак.
6. Прозрачный фон Gemini отдаёт ненадёжно. Просите сплошной #0B0B0C или #FFFFFF и снимайте фон потом.

---

## Промпты

Промпты на английском: генераторы изображений понимают его точнее.
Копировать целиком, включая блоки STYLE и NEGATIVE. Каждый промпт
самодостаточен — ничего подставлять не нужно.

### 1. Знак без текста — мастер

Холст **2048×2048**. Генерируется первым. Лучший результат становится мастером, и дальше прикрепляется картинкой ко всем остальным промптам.

```
Flat vector logo mark, no text.

MARK: a pointy-top hexagon — points at the top and bottom, flat vertical sides on the left and right. Width-to-height ratio 0.87:1. All six corners rounded with a radius of 8% of the hexagon height. Solid fill #FF4D2E, no gradient, no outline, no shadow. Inside it, a white letter L: a thick vertical stem joined at the bottom to a horizontal foot; the right end of the foot is cut at 45 degrees so the whole shape reads as a forward-pointing arrow. The L is 52% of the hexagon height, stroke thickness 16% of the hexagon height, optically centered inside the hexagon.

LAYOUT: the hexagon is centered on the canvas and occupies 62% of the canvas height. Equal margins on all four sides.

CANVAS: 2048x2048 square. Background: solid #0B0B0C.

STYLE: flat vector logo, sharp clean edges, perfectly symmetrical, no 3D, no bevel, no emboss, no texture, no glow, no reflection, no drop shadow, no gradient. Centered composition on a solid background.

NEGATIVE: no text, no letters other than the L, no tagline, no extra text, no watermark, no border, no frame, no mockup, no photograph, no perspective, no device.
```

### 2. Вертикальный замок — как исходник, с исправленной «p»

Холст **2048×2560**. То же, что сгенерировал ChatGPT, но с нормальной буквой «p» и выверенными пропорциями.

```
Flat vector logo, vertical lockup.

Use the attached image as the exact reference for the mark. Reproduce the mark identically — same hexagon proportions, same corner radius, same L shape, same colour. Do not redraw or reinterpret it.

MARK: a pointy-top hexagon — points at the top and bottom, flat vertical sides on the left and right. Width-to-height ratio 0.87:1. All six corners rounded with a radius of 8% of the hexagon height. Solid fill #FF4D2E, no gradient, no outline, no shadow. Inside it, a white letter L: a thick vertical stem joined at the bottom to a horizontal foot; the right end of the foot is cut at 45 degrees so the whole shape reads as a forward-pointing arrow. The L is 52% of the hexagon height, stroke thickness 16% of the hexagon height, optically centered inside the hexagon.

WORDMARK: two lines. Top line "Leap" in #FF4D2E. Bottom line "news" in #FFFFFF. Squared-off techno sans-serif with rounded stroke ends, open counters, uniform stroke weight and wide letterforms. Capital L, lowercase e, a, p.
CRITICAL — the lowercase p must be a correct, conventional letter p: a straight vertical stem that descends below the baseline, with a fully closed rounded-rectangular bowl attached to the upper right of the stem. The bowl must be completely closed — no gap, no notch, no tail, no speech-bubble pointer, no arrow. Draw it as a normal p from a normal alphabet.
"news" is set in the same typeface, all lowercase, with slightly wider letter-spacing, and its total width matches the width of "Leap".

LAYOUT: the mark on top, the two-line wordmark centered directly below it. Let H be the height of the hexagon. Cap height of "Leap" is 0.30H. Height of the lowercase letters in "news" is 0.24H. Gap between the bottom of the hexagon and the top of "Leap" is 0.05H. Gap between "Leap" and "news" is 0.03H. Everything centered on one vertical axis, with a clear margin of at least 0.25H around the whole logo.

CANVAS: 2048x2560 portrait. Background: solid #0B0B0C.

STYLE: flat vector logo, sharp clean edges, perfectly symmetrical, no 3D, no bevel, no emboss, no texture, no glow, no reflection, no drop shadow, no gradient. Centered composition on a solid background.

NEGATIVE: no tagline, no extra text, no watermark, no border, no frame, no mockup, no photograph, no perspective, no device.
```

### 3. Горизонтальный замок — знак слева, текст справа

Холст **3072×1024**. Основной вариант для шапки сайта, писем и документов. Ключевое требование — знак и текст читаются одной высоты, ни один не доминирует.

```
Flat vector logo, horizontal lockup.

Use the attached image as the exact reference for the mark. Reproduce the mark identically — same hexagon proportions, same corner radius, same L shape, same colour. Do not redraw or reinterpret it.

MARK: a pointy-top hexagon — points at the top and bottom, flat vertical sides on the left and right. Width-to-height ratio 0.87:1. All six corners rounded with a radius of 8% of the hexagon height. Solid fill #FF4D2E, no gradient, no outline, no shadow. Inside it, a white letter L: a thick vertical stem joined at the bottom to a horizontal foot; the right end of the foot is cut at 45 degrees so the whole shape reads as a forward-pointing arrow. The L is 52% of the hexagon height, stroke thickness 16% of the hexagon height, optically centered inside the hexagon.

WORDMARK: two lines. Top line "Leap" in #FF4D2E. Bottom line "news" in #FFFFFF. Squared-off techno sans-serif with rounded stroke ends, open counters, uniform stroke weight and wide letterforms. Capital L, lowercase e, a, p.
CRITICAL — the lowercase p must be a correct, conventional letter p: a straight vertical stem that descends below the baseline, with a fully closed rounded-rectangular bowl attached to the upper right of the stem. The bowl must be completely closed — no gap, no notch, no tail, no speech-bubble pointer, no arrow. Draw it as a normal p from a normal alphabet.
"news" is set in the same typeface, all lowercase, with slightly wider letter-spacing, and its total width matches the width of "Leap".

LAYOUT: the mark on the left, the two-line wordmark to the right of it. Let H be the height of the hexagon. The wordmark block ("Leap" above "news") has a total height of 0.72H and is optically centered against the mark — the mark and the text block must read as the same visual weight and height, neither one dominating the other. The gap between the right edge of the hexagon and the start of the text is 0.25H. Cap height of "Leap" is 0.30H, height of the lowercase letters in "news" is 0.24H, gap between the two lines is 0.03H. Both text lines are left-aligned to the same vertical edge. Clear margin of at least 0.25H around the whole logo.

CANVAS: 3072x1024 landscape. Background: solid #0B0B0C.

STYLE: flat vector logo, sharp clean edges, perfectly symmetrical, no 3D, no bevel, no emboss, no texture, no glow, no reflection, no drop shadow, no gradient. Centered composition on a solid background.

NEGATIVE: no tagline, no extra text, no watermark, no border, no frame, no mockup, no photograph, no perspective, no device.
```

### 4. Монохром белый

Холст **3072×1024**. Для тёмных фонов, фотографий и печати в одну краску.

```
Flat vector logo, horizontal lockup, monochrome white version.

Use the attached image as the exact reference for the mark. Reproduce the mark identically — same hexagon proportions, same corner radius, same L shape, same colour. Do not redraw or reinterpret it.

MARK: same hexagon geometry as the reference — pointy-top hexagon, width-to-height ratio 0.87:1, all six corners rounded at 8% of the height. The hexagon is filled solid #FFFFFF. The letter L is KNOCKED OUT of the hexagon: it is not painted white, it is empty, and the background shows through it. Same L geometry — 52% of the hexagon height, stroke thickness 16% of the hexagon height, the right end of the foot cut at 45 degrees.

WORDMARK: two lines, both in #FFFFFF — "Leap" on top, "news" below. Same typeface as the reference, and the same correct lowercase p: straight stem below the baseline, fully closed rounded-rectangular bowl, no notch and no tail.

LAYOUT: the mark on the left, the two-line wordmark to the right of it. Let H be the height of the hexagon. The wordmark block ("Leap" above "news") has a total height of 0.72H and is optically centered against the mark — the mark and the text block must read as the same visual weight and height, neither one dominating the other. The gap between the right edge of the hexagon and the start of the text is 0.25H. Cap height of "Leap" is 0.30H, height of the lowercase letters in "news" is 0.24H, gap between the two lines is 0.03H. Both text lines are left-aligned to the same vertical edge. Clear margin of at least 0.25H around the whole logo.

CANVAS: 3072x1024 landscape. Background: solid #0B0B0C.

STYLE: flat vector, single colour only — pure white artwork, nothing else. No gradient, no shadow, no 3D, no texture, no glow.

NEGATIVE: no orange, no second colour, no tagline, no border, no frame, no mockup.
```

### 5. Монохром чёрный

Холст **3072×1024**. Для светлой печати, договоров, факсимиле.

```
Flat vector logo, horizontal lockup, monochrome dark version.

Use the attached image as the exact reference for the mark. Reproduce the mark identically — same hexagon proportions, same corner radius, same L shape, same colour. Do not redraw or reinterpret it.

MARK: same hexagon geometry as the reference. The hexagon is filled solid #111318. The letter L is KNOCKED OUT of the hexagon — empty, with the background showing through it. Same L geometry — 52% of the hexagon height, stroke thickness 16% of the hexagon height, the right end of the foot cut at 45 degrees.

WORDMARK: two lines, both in #111318 — "Leap" on top, "news" below. Same typeface as the reference, and the same correct lowercase p: straight stem below the baseline, fully closed rounded-rectangular bowl, no notch and no tail.

LAYOUT: the mark on the left, the two-line wordmark to the right of it. Let H be the height of the hexagon. The wordmark block ("Leap" above "news") has a total height of 0.72H and is optically centered against the mark — the mark and the text block must read as the same visual weight and height, neither one dominating the other. The gap between the right edge of the hexagon and the start of the text is 0.25H. Cap height of "Leap" is 0.30H, height of the lowercase letters in "news" is 0.24H, gap between the two lines is 0.03H. Both text lines are left-aligned to the same vertical edge. Clear margin of at least 0.25H around the whole logo.

CANVAS: 3072x1024 landscape. Background: solid #FFFFFF.

STYLE: flat vector, single colour only. No gradient, no shadow, no 3D, no texture, no glow.

NEGATIVE: no orange, no second colour, no tagline, no border, no frame, no mockup.
```

### 6. Версия для светлого фона

Холст **3072×1024**. Исходный логотип на светлом фоне не работает: «news» белым по белому исчезает. Здесь эта строка становится тёмной, знак и «Leap» не меняются.

```
Flat vector logo, horizontal lockup, light-background version.

Use the attached image as the exact reference for the mark. Reproduce the mark identically — same hexagon proportions, same corner radius, same L shape, same colour. Do not redraw or reinterpret it.

MARK: exactly as in the reference, unchanged — hexagon filled #FF4D2E with the white letter L inside.

WORDMARK: two lines. Top line "Leap" in #FF4D2E. Bottom line "news" in #111318. Same typeface as the reference, and the same correct lowercase p: straight stem below the baseline, fully closed rounded-rectangular bowl, no notch and no tail.

LAYOUT: the mark on the left, the two-line wordmark to the right of it. Let H be the height of the hexagon. The wordmark block ("Leap" above "news") has a total height of 0.72H and is optically centered against the mark — the mark and the text block must read as the same visual weight and height, neither one dominating the other. The gap between the right edge of the hexagon and the start of the text is 0.25H. Cap height of "Leap" is 0.30H, height of the lowercase letters in "news" is 0.24H, gap between the two lines is 0.03H. Both text lines are left-aligned to the same vertical edge. Clear margin of at least 0.25H around the whole logo.

CANVAS: 3072x1024 landscape. Background: solid #FAFAFA.

STYLE: flat vector, sharp clean edges, no gradient, no shadow, no 3D, no texture, no glow.

NEGATIVE: no white text, no tagline, no border, no frame, no mockup.
```

### 7а. Аватар — основной

Холст **2048×2048**. Instagram обрезает аватар в круг и показывает его в ленте размером около 40 px. На таком размере «L» внутри шестиугольника превращается в точку, поэтому здесь шестиугольник уходит и знак занимает всю плашку. Узнаваемость держит основной логотип.

```
Flat vector social media avatar / app icon.

Use the attached image as the exact reference for the mark. Reproduce the mark identically — same hexagon proportions, same corner radius, same L shape, same colour. Do not redraw or reinterpret it.

The entire canvas is filled edge to edge with solid #FF4D2E. No hexagon, no border, no outline, no rounded corners — a full-bleed flat colour field.

Centered on it, a single white letter L: a thick vertical stem joined at the bottom to a horizontal foot; the right end of the foot is cut at 45 degrees so the shape reads as a forward-pointing arrow. Identical in shape to the L in the reference. The L is 42% of the canvas height, stroke thickness 13% of the canvas height.

CRITICAL: the L must fit entirely inside an invisible circle whose diameter is 70% of the canvas width, centered — this image will be cropped into a circle and nothing may be cut off.

CANVAS: 2048x2048 square.

STYLE: flat vector, two colours only, sharp clean edges, perfectly centered, no 3D, no bevel, no texture, no glow, no shadow, no gradient.

NEGATIVE: no text, no letters other than the L, no hexagon, no border, no frame, no mockup, no photograph.
```

### 7б. Аватар — с шестиугольником

Холст **2048×2048**. Если строгое единство с основным логотипом важнее читаемости на 40 px.

```
Flat vector social media avatar.

Use the attached image as the exact reference for the mark. Reproduce the mark identically — same hexagon proportions, same corner radius, same L shape, same colour. Do not redraw or reinterpret it.

MARK: a pointy-top hexagon — points at the top and bottom, flat vertical sides on the left and right. Width-to-height ratio 0.87:1. All six corners rounded with a radius of 8% of the hexagon height. Solid fill #FF4D2E, no gradient, no outline, no shadow. Inside it, a white letter L: a thick vertical stem joined at the bottom to a horizontal foot; the right end of the foot is cut at 45 degrees so the whole shape reads as a forward-pointing arrow. The L is 52% of the hexagon height, stroke thickness 16% of the hexagon height, optically centered inside the hexagon.

LAYOUT: the hexagon is centered on the canvas and its height is 62% of the canvas height. CRITICAL: the entire hexagon must fit inside an invisible circle whose diameter is 78% of the canvas width, centered — this image will be cropped into a circle and nothing may be cut off.

CANVAS: 2048x2048 square. Background: solid #0B0B0C.

STYLE: flat vector logo, sharp clean edges, perfectly symmetrical, no 3D, no bevel, no emboss, no texture, no glow, no reflection, no drop shadow, no gradient. Centered composition on a solid background.

NEGATIVE: no text, no letters other than the L, no tagline, no extra text, no watermark, no border, no frame, no mockup, no photograph, no perspective, no device.
```

### 8. Фавикон

Холст **1024×1024**. Вкладка браузера — 16 px. Всё лишнее мешает, а штрих нужен толще: тонкий на таком размере сливается.

```
Flat vector favicon, designed to stay legible at 16 pixels.

Use the attached image as the exact reference for the mark. Reproduce the mark identically — same hexagon proportions, same corner radius, same L shape, same colour. Do not redraw or reinterpret it.

The entire canvas is filled edge to edge with solid #FF4D2E.

Centered on it, a single white letter L: a thick vertical stem joined at the bottom to a horizontal foot; the right end of the foot is cut at 45 degrees. Same shape as the reference, but heavier: the L is 50% of the canvas height and its stroke thickness is 18% of the canvas height. Simplified — no fine detail, no thin elements.

CANVAS: 1024x1024 square.

STYLE: flat vector, two colours only, maximum contrast, sharp clean edges, perfectly centered, no 3D, no texture, no gradient, no shadow.

NEGATIVE: no text, no hexagon, no border, no frame, no small details.
```

### 9. Водяной знак

Холст **1536×512**. Белый горизонтальный замок для угла фотографии и подвала карточек соцсетей. Накладывается прозрачностью 60–70%.

```
Flat vector logo, horizontal lockup, monochrome white, compact.

Use the attached image as the exact reference for the mark. Reproduce the mark identically — same hexagon proportions, same corner radius, same L shape, same colour. Do not redraw or reinterpret it.

MARK: same hexagon geometry as the reference, filled solid #FFFFFF, with the letter L knocked out — empty, background showing through.

WORDMARK: two lines, both #FFFFFF — "Leap" on top, "news" below. Same typeface as the reference, and the same correct lowercase p: straight stem below the baseline, fully closed rounded-rectangular bowl, no notch and no tail.

LAYOUT: mark on the left, wordmark on the right, wordmark block height 0.72H, optically centered against the mark, gap 0.25H. The logo fills the canvas with a margin of 0.25H on every side — no empty space beyond that.

CANVAS: 1536x512 landscape. Background: solid #000000.

STYLE: flat vector, pure white artwork on pure black, single colour, no gradient, no shadow, no glow, no 3D.

NEGATIVE: no orange, no second colour, no tagline, no border, no frame.
```

### 10. Обложка страницы Facebook

Холст **2048×768**. Facebook обрезает обложку по-разному на телефоне и на компьютере, поэтому логотип держится в центральной трети — иначе на телефоне срежет.

```
Flat vector brand cover banner.

Use the attached image as the exact reference for the mark. Reproduce the mark identically — same hexagon proportions, same corner radius, same L shape, same colour. Do not redraw or reinterpret it.

MARK and WORDMARK: horizontal lockup exactly as in the reference — hexagon #FF4D2E with the white letter L, "Leap" in #FF4D2E, "news" in #FFFFFF, wordmark block height 0.72H, optically centered against the mark, gap 0.25H.

LAYOUT: the logo is centered on the canvas and its total width is 34% of the canvas width. CRITICAL: all artwork must stay inside the central 60% of the canvas width and the central 70% of its height — the outer area will be cropped on mobile. The rest of the canvas is empty flat background.

CANVAS: 2048x768 landscape. Background: solid #0B0B0C.

STYLE: flat vector, sharp clean edges, no gradient, no shadow, no 3D, no texture, no glow, no pattern, no decorative elements.

NEGATIVE: no tagline, no slogan, no extra text, no photograph, no people, no city skyline, no abstract shapes, no border, no frame.
```

---

## Куда это встанет в проекте

| Файл | Что заменит |
|---|---|
| `public/brand/avatar-*.jpg` | аватарки, сейчас нарисованы скриптом из шеврона |
| `components/brand/Logos.tsx` | знак в шапке и подвале сайта |
| `scripts/render-social-card.py` | подпись «leap.uz» в подвале карточки — на белый замок из промпта 9 |
| `public/favicon.ico` | иконка вкладки |

Карточки соцсетей и аватарки сейчас собираются из шевронного знака
(`scripts/render-avatar.py`, `scripts/render-social-card.py`). Когда логотип
утвердится, оба скрипта переводятся на него — и выпуск, сайт, Instagram и
Facebook начинают показывать один знак.
