# Bild notes: nvidia-h200-china

## Стратегия: primary-source

## Источник картинки
- URL: https://www.nvidia.com/content/nvidiaGDC/us/en_US/data-center/h200/_jcr_content/root/responsivegrid/nv_container_295843192/nv_image.coreimg.jpeg/1761641288308/h200nvl-ari.jpeg
  (найдено на официальной странице продукта https://www.nvidia.com/en-us/data-center/h200/)
- Тип: официальное продуктовое изображение Nvidia (рендер серверного модуля H200 NVL с 8×GPU)
- Размер оригинала: 1280×720 (уже 16:9) → cover, масштаб 1.25× (лёгкий апскейл в пределах
  MAX_UPSCALE=2.5, допустимого текущей версией prepare-image.py), обрезка 0% → 1600×900
  (109 360 байт, quality 90)
- Дубликат-чек: `node scripts/photo-dupes.mjs --check` — свободен, за 2 дня не выходил

## Отклонённые варианты
- https://www.nvidia.com/content/dam/en-zz/Solutions/Data-Center/h200/h200-kv-bb580_440-d.jpg
  (главный hero-баннер страницы) — исходник 2560×580, экстремально широкий (~4.4:1);
  prepare-image.py ушёл в contain с большими подложками сверху/снизу (solid тёмно-графитовый фон),
  что playbook `docs/agent-playbooks/bild-charts.md` прямо называет красным флагом
  («подложка — не штатный приём, вернись и найди горизонталь»). Заменил на кадр 1280×720,
  который ложится в 16:9 без подложки.
- Фототека редакции (config/stock-photos.json) — не подходит по теме: покрывает только
  ЦБ/сум/инфляцию/наличные, тема чипов Nvidia туда не попадает.
- Источники в frontmatter.sources (FT, The Decoder, DigiTimes, Engadget, CNBC, TechBuzz.ai) —
  это СМИ-пересказы, не пресс-службы; официальных фото ByteDance/Tencent/события в них нет,
  а логотипы ByteDance/Tencent как главный объект запрещены handoff'ом (image-avoid).

## Alt-текст
"Серверный модуль Nvidia H200 NVL с восемью GPU на тёмном фоне, официальное изображение продукта"

## Уверенность в подборе: 85%
Официальный продуктовый рендер Nvidia H200 NVL — прямое попадание в image-hint
(«процессор/плата Nvidia H200»), без людей, без логотипов ByteDance/Tencent, без намёков
на военное применение. Не фотография конкретной поставки в Китай (её не существует в природе),
но это стандартная практика для новостей о чипах — рендер производителя, а не абстрактный сток.
