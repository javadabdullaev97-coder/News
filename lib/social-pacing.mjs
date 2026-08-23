// Темп публикации в соцсети: сколько можно за сутки и когда можно повторно.
//
// ЗАЧЕМ ЭТО ОТДЕЛЬНЫМ ФАЙЛОМ. Потолок прогона (maxPerRun) жил в постере
// и ограничивал ОДНУ отправку. Этого недостаточно по устройству: постер
// запускается после каждого деплоя, и за сутки таких запусков десятки.
//
// 17.08.2026, в первый день жизни аккаунта, набежало 35 публикаций за шесть
// часов, а вечером — ещё 5 удалений и 6 повторных публикаций, из них пять
// пересозданы через три минуты после удаления. Meta увидела аномальную
// активность и закрыла аккаунту разработчика доступ к Graph API целиком:
// перестали отвечать даже `me` и `debug_token`. Постинг встал на неделю,
// и починить это из репозитория нельзя — только через проверку аккаунта.
//
// Здесь три правила, каждое закрывает свой кусок того инцидента:
//   1. скользящий суточный потолок — против объёма;
//   2. разгон молодого аккаунта — против объёма ОТНОСИТЕЛЬНО его возраста;
//   3. пауза перед переотправкой — против почерка «удалил и тут же вернул».

import { publishEventsSince, revokedAtOf } from "./social-posted.mjs";

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

/**
 * Сколько ещё можно опубликовать в эту сеть на этом языке.
 *
 * Окно скользящее, а не календарное: тридцать постов в 23:50 и тридцать
 * в 00:10 для площадки выглядят одинаково, в какие бы сутки они ни попали.
 *
 * Считаются СОБЫТИЯ журнала, а не итоговое состояние: материал,
 * опубликованный и снятый, для ленты не существует, но для площадки это
 * был вызов API — а она считает вызовы.
 */
export function allowanceFor(root, config, { lang, network, now = Date.now() }) {
  const pacing = config.pacing ?? {};
  const full = Number(pacing.maxPerDay) || 0;
  if (!full) return { unlimited: true, left: Infinity, cap: Infinity, used: 0, why: "суточный потолок выключен" };

  let cap = full;
  let why = `суточный потолок ${full}`;

  // Возраст аккаунта считается от startAt языка — то есть от даты, с которой
  // аккаунт ведётся. Перезапускаем аккаунт после разблокировки — двигаем
  // startAt на дату перезапуска, и разгон начинается заново сам, без
  // отдельного тумблера, который забудут переключить.
  const startAt = Date.parse(config.startAt?.[lang] ?? "");
  if (Number.isFinite(startAt)) {
    const day = Math.floor((now - startAt) / DAY_MS);
    const steps = [...(pacing.warmup ?? [])].sort((a, b) => a.throughDay - b.throughDay);
    for (const step of steps) {
      if (day <= step.throughDay) {
        if (step.maxPerDay < cap) {
          cap = step.maxPerDay;
          why = `аккаунту ${day} дн., разгон: ${cap} в сутки вместо ${full}`;
        }
        break;
      }
    }
  }

  const used = publishEventsSince(root, now - DAY_MS, { network, lang }).length;
  return { unlimited: false, left: Math.max(0, cap - used), cap, used, why };
}

/**
 * Не рано ли переотправлять снятый пост.
 *
 * Отзыв возвращает материал в неопубликованные — это правильно, иначе
 * исправленный текст не выйдет никогда. Но удаление и немедленная
 * перепубликация того же самого — это почерк, по которому и ловят
 * автоматизацию. Пауза стоит нам полсуток задержки, а стоила бы аккаунта.
 */
export function repostBlockedFor(root, config, { network, lang, slug, now = Date.now() }) {
  const cooldown = (Number(config.pacing?.repostCooldownHours) || 0) * HOUR_MS;
  if (!cooldown) return 0;
  const revoked = Date.parse(revokedAtOf(root, network, lang, slug) ?? "");
  if (!Number.isFinite(revoked)) return 0;
  const left = cooldown - (now - revoked);
  return left > 0 ? Math.ceil(left / HOUR_MS) : 0;
}

/**
 * Прореживает список заданий по обоим правилам.
 *
 * Норма считается по каждой паре «сеть + язык» отдельно: у русского
 * и узбекского аккаунтов свои лимиты и свой возраст.
 *
 * Возвращает { kept, dropped } — отброшенное не теряется молча, у каждой
 * строки есть причина, и постер её печатает. Остаток заберёт следующий
 * прогон: список собирается обходом content/posts заново.
 */
export function applyPacing(root, config, jobs, { now = Date.now() } = {}) {
  const budgets = new Map();
  const kept = [];
  const dropped = [];

  for (const job of jobs) {
    const { network } = job;
    const { lang, slug, rel } = job.item;
    const key = `${network} ${lang}`;

    if (!budgets.has(key)) budgets.set(key, allowanceFor(root, config, { lang, network, now }));
    const budget = budgets.get(key);

    if (!budget.unlimited && budget.left <= 0) {
      dropped.push({ rel, network, why: `за сутки уже ${budget.used} публикаций — ${budget.why}` });
      continue;
    }

    const hours = repostBlockedFor(root, config, { network, lang, slug, now });
    if (hours) {
      dropped.push({ rel, network, why: `пост снят недавно, переотправка через ${hours} ч` });
      continue;
    }

    if (!budget.unlimited) budget.left -= 1;
    kept.push(job);
  }

  return { kept, dropped };
}
