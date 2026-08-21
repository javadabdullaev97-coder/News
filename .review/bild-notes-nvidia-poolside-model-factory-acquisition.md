# Bild notes: nvidia-poolside-model-factory-acquisition

## Стратегия: primary-source

## Источник картинки
- URL: https://nvidianews.nvidia.com/multimedia/santa-clara-headquarters
  (полноразмерный файл: https://iprsoftwaremedia.com/219/files/20224/voyager-exterior-sign-2.jpg)
- Тип: официальное пресс-фото Nvidia — вывеска с логотипом у здания Voyager,
  штаб-квартира в Санта-Кларе (галерея "NVIDIA Headquarters" на официальном
  newsroom-сайте Nvidia, раздел Media Assets)
- Размер оригинала: 3240×2160 → cover, масштаб 0,4938, обрезано 15,6% по высоте
  (в пределах лимита ≤22%) → 1600×900 (324 КБ, q90)

```json
{
  "source": {"width": 3240, "height": 2160},
  "fit": {"mode": "cover", "scale": 0.4938, "cropLoss": 0.1562, "offset": [0, 52], "upscaled": false,
          "note": "обрезано 16% по высоте; окно кропа выбрано по содержимому"},
  "output": {"path": "public/images/posts/2026-08/nvidia-poolside-model-factory-acquisition-01.jpg",
             "url": "/images/posts/2026-08/nvidia-poolside-model-factory-acquisition-01.jpg",
             "width": 1600, "height": 900, "bytes": 324251, "quality": 90},
  "status": "ok",
  "upscaled": false
}
```

## Промпт (если AI-генерация)
Не применимо — использован официальный кадр первоисточника, до Higgsfield не дошло.

## Отклонённые варианты
- В новостном архиве Nvidia (nvidianews.nvidia.com/news) отдельного пресс-релиза
  и медиа по сделке с Poolside нет — сделка вообще официально не анонсирована
  ни Nvidia, ни Poolside (это отмечено и в тексте статьи).
- Логотип/сайт Poolside как главный объект не рассматривался — прямое указание
  editor'а в image-avoid (сделка не про поглощение Poolside целиком).
- Стоковые "айтишники за ноутбуком" не рассматривались — прямое указание в image-avoid.
- Проверка на повтор (scripts/photo-dupes.mjs) — кадр свободен, за 2 дня не выходил.

## Alt-текст
"Вывеска с логотипом Nvidia у здания Voyager — штаб-квартиры компании в Санта-Кларе, Калифорния"

## Уверенность в подборе: 90%
Официальный пресс-кадр Nvidia (не архивный сток), полностью соответствует
image-hint из handoff: логотип/вывеска Nvidia у штаб-квартиры, без людей,
без брендинга Poolside.
