# Bild notes: nvidia-wall-street-500bn-ai-infrastructure

## Стратегия: primary-source

## Источник картинки
- URL: https://iprsoftwaremedia.com/219/files/20224/DH1L4415-HDR-20220527-r5.jpg
  (полноразмерная версия og:image пресс-релиза Nvidia)
- Найдено как `og:image` в HTML пресс-релиза nvidianews.nvidia.com (первый
  источник в `frontmatter.sources`). `og:image:alt` в исходном HTML:
  "NVIDIA Voyager" — это фото штаб-квартиры Nvidia (здание Voyager,
  Санта-Клара) с фирменной вывеской NVIDIA на фоне треугольного навеса
  с солнечными панелями. Subject-first: явный визуальный якорь Nvidia,
  без сторонних логотипов (Apollo/BlackRock/Blackstone и т.д.), как и
  просил editor в image-avoid.
- Тип: официальное фото пресс-службы Nvidia (не сток, не рисованная
  заготовка) — здание, вывеска, реальная съёмка кампуса.
- Размер оригинала: 3240×2160 (соотношение 1.5, горизонтальный кадр —
  подложка не понадобилась).

## Обработка (scripts/prepare-image.py)
```json
{
  "source": {"width": 3240, "height": 2160},
  "fit": {
    "mode": "cover",
    "scale": 0.4938,
    "cropLoss": 0.1562,
    "offset": [0, 0],
    "upscaled": false,
    "note": "обрезано 16% по высоте; окно кропа выбрано по содержимому"
  },
  "output": {
    "path": "public/images/posts/2026-08/nvidia-wall-street-500bn-ai-infrastructure-01.jpg",
    "url": "/images/posts/2026-08/nvidia-wall-street-500bn-ai-infrastructure-01.jpg",
    "width": 1600, "height": 900, "bytes": 377495, "quality": 86
  },
  "status": "ok",
  "upscaled": false
}
```
cropLoss 0.156 — заметно ниже порога, на который завязан переход в fallback;
вывеска NVIDIA и характерный навес Voyager полностью читаются в кадре 16:9.

## Отклонённые варианты
- Тумбнейлы "Recent News" на той же странице (nvidia-logo, ssi-nvidia,
  sk-nvidia-logos, naver-nvidia-brookfield-logos) — навигационные превью
  других новостей, не относятся к этому релизу.
- Логотипы партнёров (Apollo/BlackRock/Blackstone/Brookfield/Goldman Sachs/
  KKR) как основной объект не рассматривались — прямое указание
  image-avoid в handoff: тема про Nvidia, не про конкретный фонд.
- Фото Дженсена Хуанга и AI-генерация не понадобились — официальное фото
  здания/вывески Nvidia оказалось доступным, горизонтальным и хорошего
  разрешения с первой попытки.

## Alt-текст
"Штаб-квартира Nvidia Voyager в Санта-Кларе: фирменная вывеска NVIDIA на
фоне треугольного солнечного навеса здания"

## Уверенность в подборе: 90%
Официальный og:image самого пресс-релиза Nvidia, который является первым
источником статьи — субъект (Nvidia) показан напрямую вывеской и зданием,
горизонтальная ориентация, без апскейла, обрезка в пределах нормы.
