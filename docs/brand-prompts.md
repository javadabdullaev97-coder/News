# Логотип LEAP News — константы и промпты

Промпты для генерации вариантов знака в Gemini и жёсткие вводные, без
которых варианты разъедутся между собой.

## Как работать

Промпты не генерируют знак с нуля — они правят приложенную картинку.
Модель не придумывает фигуру заново, а берёт готовую и делает с ней
перечисленное: перекрашивает, ставит в нужный кадр, добавляет текст.

Порядок:

1. **Промпт 1** — загружаете свой исходник и приводите его к нашим цветам,
   фону и посадке в кадре. Результат — мастер.
2. **Мастер прикрепляете ко всем остальным промптам.** В каждом стоит блок
   «фигура финальная, не перерисовывай» — без него шестиугольник поедет.
3. Проверяете букву «p» в каждом варианте с текстом. Модели ненадёжно рисуют
   буквы: именно на этом сломался исходный вариант.

Слово «стрелка» из описания убрано, а в негатив каждого промпта добавлено
`no arrow, no arrowhead, no triangle`. Первая редакция описывала срез ноги
как «читается как стрелка вперёд» — Gemini понял метафору буквально и
пририсовал остриё. Метафор в описании фигуры быть не должно, только
геометрия и запреты.

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

1. Промпт 1 идёт первым: он превращает ваш исходник в мастер.
2. Мастер прикрепляется картинкой к каждому следующему промпту. Блок «не перерисовывай» уже стоит в промптах 2–10.
3. Цвета — всегда хексом. «Оранжевый» модель поймёт как угодно.
4. Никаких метафор в описании фигуры: «как стрелка», «как молния», «динамично». Только геометрия и запреты.
5. Блок BASE и KEEP UNCHANGED копируются дословно. Переформулировали — модель решит, что можно перерисовать.
6. Прозрачный фон Gemini отдаёт ненадёжно. Просите сплошной #0B0B0C или #FFFFFF и снимайте фон потом.

---

## Промпты

Промпты на английском: генераторы изображений понимают его точнее.
Копировать целиком, включая блоки STYLE и NEGATIVE. Каждый промпт
самодостаточен — ничего подставлять не нужно.

### 1. Нормализация мастера

Холст **2048×2048**. Первый шаг: привести исходник к нашим цветам, фону и посадке в кадре. Результат становится мастером — его вы и прикрепляете ко всем остальным промптам.

```
Edit the attached image. The mark in it — the hexagon with the white letter L — is FINAL. Preserve it exactly: same hexagon silhouette, same corner rounding, same shape of the letter L including its chamfered foot, same ratio between the letter and the hexagon. Do not redraw it, do not restyle it, do not add or remove any part of it. Apply only the changes listed below.

CHANGES:
1. Recolour the hexagon to flat solid #FF4D2E — one uniform colour, no gradient, no shading, no highlight.
2. Recolour the letter L to pure #FFFFFF.
3. Replace the background with flat solid #0B0B0C, edge to edge.
4. Remove any shadow, gradient, texture, noise, vignette or reflection.
5. Centre the mark. Its height must be 62% of the canvas height, with equal margins on all four sides.

KEEP UNCHANGED: the hexagon silhouette and its corner rounding, the shape of the letter L, the proportion between the letter and the hexagon.

CANVAS: 2048x2048 square.

NEGATIVE: no arrow, no arrowhead, no triangle, no chevron, no pointer, no gradient, no shadow, no bevel, no 3D, no texture, no noise, no glow, no reflection, no border, no frame, no mockup, no photograph, no perspective, no decorative elements, no tagline, no extra text.
```

### 2. Вертикальный замок — знак сверху, текст снизу

Холст **2048×2560**. Тот же состав, что сгенерировал ChatGPT, но с нормальной буквой «p» и выверенными пропорциями.

```
Edit the attached image. The mark in it — the hexagon with the white letter L — is FINAL. Preserve it exactly: same hexagon silhouette, same corner rounding, same shape of the letter L including its chamfered foot, same ratio between the letter and the hexagon. Do not redraw it, do not restyle it, do not add or remove any part of it. Apply only the changes listed below.

CHANGES:
1. Keep the mark unchanged and place it in the upper part of the canvas. Call its height H.
2. Add two lines of text. Top line "Leap" in #FF4D2E, bottom line "news" in #FFFFFF. Typeface: squared-off techno sans-serif with rounded stroke ends, open counters, uniform stroke weight and wide letterforms. Capital L, lowercase e, a, p.
CRITICAL — the lowercase p must be a correct, conventional letter p: a straight vertical stem descending below the baseline, with a fully closed rounded-rectangular bowl attached to the upper right of the stem. The bowl is completely closed — no gap, no notch, no tail, no speech-bubble pointer. Draw it as a normal p from a normal alphabet.
"news" is set in the same typeface, all lowercase, with slightly wider letter-spacing, and its total width matches the width of "Leap".
3. Centre both text lines on the same vertical axis as the mark.
 4. Cap height of "Leap" is 0.30H. Height of the lowercase letters in "news" is 0.24H. The gap between the bottom of the mark and the top of "Leap" is 0.05H. The gap between "Leap" and "news" is 0.03H. Leave a clear margin of at least 0.25H around the whole logo.

KEEP UNCHANGED: the hexagon silhouette and its corner rounding, the shape of the letter L, the proportion between the letter and the hexagon.

CANVAS: 2048x2560 portrait. Background: flat solid #0B0B0C.

NEGATIVE: no arrow, no arrowhead, no triangle, no chevron, no pointer, no gradient, no shadow, no bevel, no 3D, no texture, no noise, no glow, no reflection, no border, no frame, no mockup, no photograph, no perspective, no decorative elements, no tagline, no extra text.
```

### 3. Горизонтальный замок — знак слева, текст справа

Холст **3072×1024**. Основной вариант для шапки сайта, писем и документов. Ключевое требование — знак и текст читаются одной высоты, ни один не доминирует.

```
Edit the attached image. The mark in it — the hexagon with the white letter L — is FINAL. Preserve it exactly: same hexagon silhouette, same corner rounding, same shape of the letter L including its chamfered foot, same ratio between the letter and the hexagon. Do not redraw it, do not restyle it, do not add or remove any part of it. Apply only the changes listed below.

CHANGES:
1. Add two lines of text. Top line "Leap" in #FF4D2E, bottom line "news" in #FFFFFF. Typeface: squared-off techno sans-serif with rounded stroke ends, open counters, uniform stroke weight and wide letterforms. Capital L, lowercase e, a, p.
CRITICAL — the lowercase p must be a correct, conventional letter p: a straight vertical stem descending below the baseline, with a fully closed rounded-rectangular bowl attached to the upper right of the stem. The bowl is completely closed — no gap, no notch, no tail, no speech-bubble pointer. Draw it as a normal p from a normal alphabet.
"news" is set in the same typeface, all lowercase, with slightly wider letter-spacing, and its total width matches the width of "Leap".
2. Place the mark on the left and the two-line wordmark to the right of it. Call the height of the mark H. The wordmark block has a total height of 0.72H and is optically centred against the mark — the mark and the text must read as the same visual height, neither one dominating. The gap between the right edge of the mark and the start of the text is 0.25H. Cap height of "Leap" is 0.30H, height of the lowercase letters in "news" is 0.24H, gap between the two lines is 0.03H. Both lines are left-aligned to the same vertical edge.
3. Leave a clear margin of at least 0.25H around the whole logo.

KEEP UNCHANGED: the hexagon silhouette and its corner rounding, the shape of the letter L, the proportion between the letter and the hexagon.

CANVAS: 3072x1024 landscape. Background: flat solid #0B0B0C.

NEGATIVE: no arrow, no arrowhead, no triangle, no chevron, no pointer, no gradient, no shadow, no bevel, no 3D, no texture, no noise, no glow, no reflection, no border, no frame, no mockup, no photograph, no perspective, no decorative elements, no tagline, no extra text.
```

### 4. Монохром белый

Холст **3072×1024**. Для тёмных фонов, фотографий и печати в одну краску.

```
Edit the attached image. The mark in it — the hexagon with the white letter L — is FINAL. Preserve it exactly: same hexagon silhouette, same corner rounding, same shape of the letter L including its chamfered foot, same ratio between the letter and the hexagon. Do not redraw it, do not restyle it, do not add or remove any part of it. Apply only the changes listed below.

CHANGES:
1. Recolour the hexagon to flat solid #FFFFFF.
2. Make the letter L empty: it is no longer painted, it is a hole cut through the hexagon, and the background colour shows through it. The outline of the hole is the same letter L as in the attached image.
3. Add two lines of text. Top line "Leap" in #FFFFFF, bottom line "news" in #FFFFFF. Typeface: squared-off techno sans-serif with rounded stroke ends, open counters, uniform stroke weight and wide letterforms. Capital L, lowercase e, a, p.
CRITICAL — the lowercase p must be a correct, conventional letter p: a straight vertical stem descending below the baseline, with a fully closed rounded-rectangular bowl attached to the upper right of the stem. The bowl is completely closed — no gap, no notch, no tail, no speech-bubble pointer. Draw it as a normal p from a normal alphabet.
"news" is set in the same typeface, all lowercase, with slightly wider letter-spacing, and its total width matches the width of "Leap".
4. Place the mark on the left and the two-line wordmark to the right of it. Call the height of the mark H. The wordmark block has a total height of 0.72H and is optically centred against the mark — the mark and the text must read as the same visual height, neither one dominating. The gap between the right edge of the mark and the start of the text is 0.25H. Cap height of "Leap" is 0.30H, height of the lowercase letters in "news" is 0.24H, gap between the two lines is 0.03H. Both lines are left-aligned to the same vertical edge.

KEEP UNCHANGED: the hexagon silhouette and its corner rounding, the shape of the letter L, the proportion between the letter and the hexagon.

CANVAS: 3072x1024 landscape. Background: flat solid #0B0B0C.

The whole artwork is a single colour — pure white — and nothing else.

NEGATIVE: no arrow, no arrowhead, no triangle, no chevron, no pointer, no gradient, no shadow, no bevel, no 3D, no texture, no noise, no glow, no reflection, no border, no frame, no mockup, no photograph, no perspective, no decorative elements, no tagline, no extra text. No orange, no second colour.
```

### 5. Монохром чёрный

Холст **3072×1024**. Для светлой печати, договоров, факсимиле.

```
Edit the attached image. The mark in it — the hexagon with the white letter L — is FINAL. Preserve it exactly: same hexagon silhouette, same corner rounding, same shape of the letter L including its chamfered foot, same ratio between the letter and the hexagon. Do not redraw it, do not restyle it, do not add or remove any part of it. Apply only the changes listed below.

CHANGES:
1. Recolour the hexagon to flat solid #111318.
2. Make the letter L empty: it is no longer painted, it is a hole cut through the hexagon, and the background colour shows through it. The outline of the hole is the same letter L as in the attached image.
3. Add two lines of text. Top line "Leap" in #111318, bottom line "news" in #111318. Typeface: squared-off techno sans-serif with rounded stroke ends, open counters, uniform stroke weight and wide letterforms. Capital L, lowercase e, a, p.
CRITICAL — the lowercase p must be a correct, conventional letter p: a straight vertical stem descending below the baseline, with a fully closed rounded-rectangular bowl attached to the upper right of the stem. The bowl is completely closed — no gap, no notch, no tail, no speech-bubble pointer. Draw it as a normal p from a normal alphabet.
"news" is set in the same typeface, all lowercase, with slightly wider letter-spacing, and its total width matches the width of "Leap".
4. Place the mark on the left and the two-line wordmark to the right of it. Call the height of the mark H. The wordmark block has a total height of 0.72H and is optically centred against the mark — the mark and the text must read as the same visual height, neither one dominating. The gap between the right edge of the mark and the start of the text is 0.25H. Cap height of "Leap" is 0.30H, height of the lowercase letters in "news" is 0.24H, gap between the two lines is 0.03H. Both lines are left-aligned to the same vertical edge.

KEEP UNCHANGED: the hexagon silhouette and its corner rounding, the shape of the letter L, the proportion between the letter and the hexagon.

CANVAS: 3072x1024 landscape. Background: flat solid #FFFFFF.

The whole artwork is a single colour — #111318 — and nothing else.

NEGATIVE: no arrow, no arrowhead, no triangle, no chevron, no pointer, no gradient, no shadow, no bevel, no 3D, no texture, no noise, no glow, no reflection, no border, no frame, no mockup, no photograph, no perspective, no decorative elements, no tagline, no extra text. No orange, no second colour.
```

### 6. Версия для светлого фона

Холст **3072×1024**. Исходный логотип на светлом фоне не работает: «news» белым по белому исчезает. Здесь эта строка становится тёмной, знак и «Leap» не меняются.

```
Edit the attached image. The mark in it — the hexagon with the white letter L — is FINAL. Preserve it exactly: same hexagon silhouette, same corner rounding, same shape of the letter L including its chamfered foot, same ratio between the letter and the hexagon. Do not redraw it, do not restyle it, do not add or remove any part of it. Apply only the changes listed below.

CHANGES:
1. Keep the mark exactly as it is — hexagon #FF4D2E with the white letter L. Do not recolour it.
2. Add two lines of text. Top line "Leap" in #FF4D2E, bottom line "news" in #111318. Typeface: squared-off techno sans-serif with rounded stroke ends, open counters, uniform stroke weight and wide letterforms. Capital L, lowercase e, a, p.
CRITICAL — the lowercase p must be a correct, conventional letter p: a straight vertical stem descending below the baseline, with a fully closed rounded-rectangular bowl attached to the upper right of the stem. The bowl is completely closed — no gap, no notch, no tail, no speech-bubble pointer. Draw it as a normal p from a normal alphabet.
"news" is set in the same typeface, all lowercase, with slightly wider letter-spacing, and its total width matches the width of "Leap".
3. Place the mark on the left and the two-line wordmark to the right of it. Call the height of the mark H. The wordmark block has a total height of 0.72H and is optically centred against the mark — the mark and the text must read as the same visual height, neither one dominating. The gap between the right edge of the mark and the start of the text is 0.25H. Cap height of "Leap" is 0.30H, height of the lowercase letters in "news" is 0.24H, gap between the two lines is 0.03H. Both lines are left-aligned to the same vertical edge.
4. Replace the background with flat solid #FAFAFA.

KEEP UNCHANGED: the hexagon silhouette and its corner rounding, the shape of the letter L, the proportion between the letter and the hexagon.

CANVAS: 3072x1024 landscape.

NEGATIVE: no arrow, no arrowhead, no triangle, no chevron, no pointer, no gradient, no shadow, no bevel, no 3D, no texture, no noise, no glow, no reflection, no border, no frame, no mockup, no photograph, no perspective, no decorative elements, no tagline, no extra text. No white text.
```

### 7а. Аватар — основной

Холст **2048×2048**. Instagram обрезает аватар в круг и показывает его в ленте размером около 40 px. На таком размере «L» внутри шестиугольника превращается в точку, поэтому здесь шестиугольник уходит и буква занимает всю плашку. Узнаваемость держит основной логотип.

```
Edit the attached image.

CHANGES:
1. Take ONLY the white letter L from the attached image, preserving its shape exactly — including the chamfered bottom-right corner of its foot. Do not redraw it.
2. Discard the hexagon entirely.
3. Fill the whole canvas edge to edge with flat solid #FF4D2E — no hexagon, no border, no outline, no rounded corners.
4. Place the white letter L in the exact centre. Its height is 42% of the canvas height.
5. CRITICAL: the letter must fit entirely inside an invisible circle whose diameter is 70% of the canvas width, centred — this image will be cropped into a circle and nothing may be cut off.

KEEP UNCHANGED: the shape and proportions of the letter L.

CANVAS: 2048x2048 square.

NEGATIVE: no arrow, no arrowhead, no triangle, no chevron, no pointer, no gradient, no shadow, no bevel, no 3D, no texture, no noise, no glow, no reflection, no border, no frame, no mockup, no photograph, no perspective, no decorative elements, no tagline, no extra text. No hexagon.
```

### 7б. Аватар — с шестиугольником

Холст **2048×2048**. Если строгое единство с основным логотипом важнее читаемости на 40 px.

```
Edit the attached image. The mark in it — the hexagon with the white letter L — is FINAL. Preserve it exactly: same hexagon silhouette, same corner rounding, same shape of the letter L including its chamfered foot, same ratio between the letter and the hexagon. Do not redraw it, do not restyle it, do not add or remove any part of it. Apply only the changes listed below.

CHANGES:
1. Centre the mark on the canvas at 62% of the canvas height.
2. Replace the background with flat solid #0B0B0C.
3. CRITICAL: the entire hexagon must fit inside an invisible circle whose diameter is 78% of the canvas width, centred — this image will be cropped into a circle and nothing may be cut off.

KEEP UNCHANGED: the hexagon silhouette and its corner rounding, the shape of the letter L, the proportion between the letter and the hexagon.

CANVAS: 2048x2048 square.

NEGATIVE: no arrow, no arrowhead, no triangle, no chevron, no pointer, no gradient, no shadow, no bevel, no 3D, no texture, no noise, no glow, no reflection, no border, no frame, no mockup, no photograph, no perspective, no decorative elements, no tagline, no extra text.
```

### 8. Фавикон

Холст **1024×1024**. Вкладка браузера — 16 px. Всё лишнее мешает, а буква должна занимать почти весь кадр: мелкая на таком размере сливается.

```
Edit the attached image.

CHANGES:
1. Take ONLY the white letter L from the attached image, preserving its shape exactly. Do not redraw it and do not change its proportions.
2. Discard the hexagon entirely.
3. Fill the whole canvas edge to edge with flat solid #FF4D2E.
4. Place the white letter L in the exact centre, scaled up so that its height is 50% of the canvas height.

KEEP UNCHANGED: the shape and proportions of the letter L.

CANVAS: 1024x1024 square. This will be displayed at 16 pixels, so the result must be maximally simple and high-contrast.

NEGATIVE: no arrow, no arrowhead, no triangle, no chevron, no pointer, no gradient, no shadow, no bevel, no 3D, no texture, no noise, no glow, no reflection, no border, no frame, no mockup, no photograph, no perspective, no decorative elements, no tagline, no extra text. No hexagon, no small details, no thin elements.
```

### 9. Водяной знак

Холст **1536×512**. Белый горизонтальный замок для угла фотографии и подвала карточек соцсетей. Накладывается прозрачностью 60–70%.

```
Edit the attached image. The mark in it — the hexagon with the white letter L — is FINAL. Preserve it exactly: same hexagon silhouette, same corner rounding, same shape of the letter L including its chamfered foot, same ratio between the letter and the hexagon. Do not redraw it, do not restyle it, do not add or remove any part of it. Apply only the changes listed below.

CHANGES:
1. Recolour the hexagon to flat solid #FFFFFF.
2. Make the letter L empty: it is no longer painted, it is a hole cut through the hexagon, and the background colour shows through it. The outline of the hole is the same letter L as in the attached image.
3. Add two lines of text. Top line "Leap" in #FFFFFF, bottom line "news" in #FFFFFF. Typeface: squared-off techno sans-serif with rounded stroke ends, open counters, uniform stroke weight and wide letterforms. Capital L, lowercase e, a, p.
CRITICAL — the lowercase p must be a correct, conventional letter p: a straight vertical stem descending below the baseline, with a fully closed rounded-rectangular bowl attached to the upper right of the stem. The bowl is completely closed — no gap, no notch, no tail, no speech-bubble pointer. Draw it as a normal p from a normal alphabet.
"news" is set in the same typeface, all lowercase, with slightly wider letter-spacing, and its total width matches the width of "Leap".
4. Place the mark on the left and the two-line wordmark to the right of it. Call the height of the mark H. The wordmark block has a total height of 0.72H and is optically centred against the mark — the mark and the text must read as the same visual height, neither one dominating. The gap between the right edge of the mark and the start of the text is 0.25H. Cap height of "Leap" is 0.30H, height of the lowercase letters in "news" is 0.24H, gap between the two lines is 0.03H. Both lines are left-aligned to the same vertical edge.
5. Scale the logo so it fills the canvas with a margin of 0.25H on every side — no empty space beyond that.

KEEP UNCHANGED: the hexagon silhouette and its corner rounding, the shape of the letter L, the proportion between the letter and the hexagon.

CANVAS: 1536x512 landscape. Background: flat solid #000000.

The whole artwork is pure white on pure black — two values only.

NEGATIVE: no arrow, no arrowhead, no triangle, no chevron, no pointer, no gradient, no shadow, no bevel, no 3D, no texture, no noise, no glow, no reflection, no border, no frame, no mockup, no photograph, no perspective, no decorative elements, no tagline, no extra text. No orange, no second colour, no grey.
```

### 10. Обложка страницы Facebook

Холст **2048×768**. Facebook обрезает обложку по-разному на телефоне и на компьютере, поэтому логотип держится в центральной трети — иначе на телефоне срежет.

```
Edit the attached image. The mark in it — the hexagon with the white letter L — is FINAL. Preserve it exactly: same hexagon silhouette, same corner rounding, same shape of the letter L including its chamfered foot, same ratio between the letter and the hexagon. Do not redraw it, do not restyle it, do not add or remove any part of it. Apply only the changes listed below.

CHANGES:
1. Add two lines of text. Top line "Leap" in #FF4D2E, bottom line "news" in #FFFFFF. Typeface: squared-off techno sans-serif with rounded stroke ends, open counters, uniform stroke weight and wide letterforms. Capital L, lowercase e, a, p.
CRITICAL — the lowercase p must be a correct, conventional letter p: a straight vertical stem descending below the baseline, with a fully closed rounded-rectangular bowl attached to the upper right of the stem. The bowl is completely closed — no gap, no notch, no tail, no speech-bubble pointer. Draw it as a normal p from a normal alphabet.
"news" is set in the same typeface, all lowercase, with slightly wider letter-spacing, and its total width matches the width of "Leap".
2. Place the mark on the left and the two-line wordmark to the right of it. Call the height of the mark H. The wordmark block has a total height of 0.72H and is optically centred against the mark — the mark and the text must read as the same visual height, neither one dominating. The gap between the right edge of the mark and the start of the text is 0.25H. Cap height of "Leap" is 0.30H, height of the lowercase letters in "news" is 0.24H, gap between the two lines is 0.03H. Both lines are left-aligned to the same vertical edge.
3. Centre the finished logo on the canvas and scale it so its total width is 34% of the canvas width.
4. CRITICAL: all artwork must stay inside the central 60% of the canvas width and the central 70% of its height — the outer area gets cropped on mobile.
5. The rest of the canvas is empty flat background.

KEEP UNCHANGED: the hexagon silhouette and its corner rounding, the shape of the letter L, the proportion between the letter and the hexagon.

CANVAS: 2048x768 landscape. Background: flat solid #0B0B0C.

NEGATIVE: no arrow, no arrowhead, no triangle, no chevron, no pointer, no gradient, no shadow, no bevel, no 3D, no texture, no noise, no glow, no reflection, no border, no frame, no mockup, no photograph, no perspective, no decorative elements, no tagline, no extra text. No slogan, no people, no city skyline, no abstract shapes, no pattern.
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
