// Очередь публикации: когда выпускать то, что уже готово.
//
// ЗАЧЕМ ОНА ВООБЩЕ. Планёрка отрабатывает пачкой: приходит раз в полчаса и
// выдаёт сразу несколько готовых материалов. Без очереди они падали на сайт
// и в канал залпом, а следующие полчаса не выходило ничего. Читатель видит
// то пусто, то густо, а лента выглядит брошенной ровно между планёрками.
//
// Очередь разносит пачку по времени так, чтобы материалов хватило до
// следующей планёрки, — и при этом не задерживает то, что задерживать нельзя.
//
// ЧТО ЗДЕСЬ ЕСТЬ. Только расчёт: на входе список готовых материалов и время,
// на выходе — кому когда выходить. Ни файлов, ни сети, ни гита, поэтому
// поведение проверяется тестами целиком.
//
// ТРИ ПРАВИЛА, В ПОРЯДКЕ СТАРШИНСТВА
//
//   1. Срочное не ждёт. urgency: breaking — событие идёт сейчас и меняет
//      поведение читателя сегодня. Очередь для такого материала — вред.
//
//   2. Сильное не ждёт. tgScore выше порога — материал, ради которого
//      подписывались на канал. Придержать его на двадцать минут ради
//      равномерности значит обменять главное на второстепенное.
//
//   3. Ничего не висит дольше предельного срока. Даже если материалов
//      много и расписание требует растянуть их сильнее — предел важнее
//      равномерности. Новость, пролежавшая час, уже не новость.
//
// Остальное разносится ровно по окну до следующей планёрки, со случайным
// разбросом: без него выпуск идёт метрономом, ровно через N минут, и лента
// выглядит машинной.

/** Материал вышел бы прямо сейчас, минуя очередь. */
export function isImmediate(item, { immediateTgScore = 75 } = {}) {
  if (item.urgency === "breaking") return "breaking";
  if (Number(item.tgScore) >= immediateTgScore) return "сильный материал";
  return null;
}

/**
 * Расписание выпуска.
 *
 * @param items   [{ slug, queuedAt, urgency, tgScore }] — готовые материалы
 * @param opts.now                 отсчёт, мс
 * @param opts.nextBatchAt         когда придёт следующая пачка, мс
 * @param opts.maxWaitMinutes      предельное время в очереди
 * @param opts.immediateTgScore    порог выхода вне очереди
 * @param opts.jitter              доля интервала на случайный разброс
 * @param opts.random              источник случайности (для тестов)
 * @returns [{ slug, dueAt, reason }] в порядке выпуска
 */
/**
 * Устойчивый «шум» в диапазоне [0, 1) из слага материала.
 *
 * Тот же слаг — то же число при любом числе пересчётов. Если слага нет
 * (такого быть не должно, но падать из-за этого незачем), берём переданный
 * источник случайности: поведение остаётся прежним.
 */
function slugNoise(slug, random) {
  if (!slug) return random();
  let h = 2166136261;
  for (let i = 0; i < slug.length; i++) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

export function planReleases(items, opts = {}) {
  const {
    now = Date.now(),
    nextBatchAt = now + 30 * 60_000,
    maxWaitMinutes = 45,
    immediateTgScore = 75,
    jitter = 0.3,
    random = Math.random,
  } = opts;

  const maxWaitMs = maxWaitMinutes * 60_000;
  // Порядок выпуска — по готовности: что раньше доделали, то раньше выходит.
  // Свежесть для новостной ленты важнее «интересное вперёд», а интересное
  // и так уходит мимо очереди по правилам 1 и 2.
  const queue = [...items].sort((a, b) =>
    String(a.queuedAt ?? "").localeCompare(String(b.queuedAt ?? "")),
  );

  const plan = [];
  const spread = [];

  for (const item of queue) {
    const why = isImmediate(item, { immediateTgScore });
    if (why) {
      plan.push({ slug: item.slug, dueAt: now, reason: why });
      continue;
    }
    const queuedMs = Date.parse(item.queuedAt ?? "");
    const deadline = Number.isFinite(queuedMs) ? queuedMs + maxWaitMs : now + maxWaitMs;
    if (deadline <= now) {
      plan.push({ slug: item.slug, dueAt: now, reason: `просрочен (>${maxWaitMinutes} мин)` });
      continue;
    }
    spread.push({ item, deadline });
  }

  // Окно до следующей пачки. Если она уже должна была прийти (планёрка
  // опаздывает), окна нет — выпускаем всё, что накопилось, а не держим
  // материалы в ожидании события, которое не наступило.
  const window = Math.max(0, nextBatchAt - now);
  const step = spread.length ? window / spread.length : 0;

  let previous = now;
  spread.forEach(({ item, deadline }, i) => {
    // i-й материал целится в свой слот; первый выходит сразу — держать его,
    // когда предыдущая пачка уже разошлась, незачем.
    const target = now + step * i;
    // Разброс детерминированный — от слага, а не от Math.random.
    //
    // Публикатор пересчитывает план на каждом тике (раз в три минуты).
    // Со случайным разбросом срок выхода одного и того же материала прыгал
    // при каждом пересчёте, и подсказка часам менялась постоянно: 48 пустых
    // коммитов в сутки на одну строку со временем, каждый со своим пушем
    // и пересборкой сайта (замер 06.08.2026). Разброс нужен, чтобы лента
    // не выглядела машинной, но он обязан быть свойством материала,
    // а не броском монеты в момент опроса.
    const shift = step * jitter * (slugNoise(item.slug, random) * 2 - 1);
    // Разброс не должен ломать порядок: слот не уезжает раньше предыдущего.
    const jittered = Math.max(previous, target + shift);
    const dueAt = Math.min(jittered, deadline);
    plan.push({
      slug: item.slug,
      dueAt,
      reason: dueAt === deadline ? `предел ${maxWaitMinutes} мин` : "по расписанию",
    });
    previous = dueAt;
  });

  return plan.sort((a, b) => a.dueAt - b.dueAt);
}

/** Что из плана пора выпускать прямо сейчас. */
export function dueNow(plan, now = Date.now()) {
  return plan.filter((p) => p.dueAt <= now);
}
