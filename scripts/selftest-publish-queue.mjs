#!/usr/bin/env node
// Регрессия на расписание выпуска. Каждый пункт закрывает конкретный способ
// испортить ленту: залп вместо ритма, задержанное ЧП, зависший материал,
// сломанный порядок.

import { planReleases, dueNow, isImmediate } from "../lib/publish-queue.mjs";

let failed = 0;
const ok = (cond, msg) => {
  console.log((cond ? "  ok  " : "  FAIL ") + msg);
  if (!cond) failed++;
};

const T0 = Date.parse("2026-08-04T10:00:00Z");
const min = (n) => n * 60_000;
const item = (slug, agoMin = 0, extra = {}) => ({
  slug,
  queuedAt: new Date(T0 - min(agoMin)).toISOString(),
  tgScore: 30,
  urgency: "standard",
  ...extra,
});
// Детерминированный «случай»: без него тест ловил бы разные планы.
const noJitter = { random: () => 0.5 };

// ── вне очереди ───────────────────────────────────────────────────────
{
  ok(isImmediate({ urgency: "breaking", tgScore: 10 }) === "breaking",
     "breaking опознаётся как внеочередной");
  ok(isImmediate({ urgency: "standard", tgScore: 80 }) === "сильный материал",
     "высокий tgScore опознаётся как внеочередной");
  ok(isImmediate({ urgency: "standard", tgScore: 74 }) === null,
     "порог не срабатывает на значении ниже него");

  const plan = planReleases(
    [item("a"), item("chp", 0, { urgency: "breaking" }), item("b")],
    { now: T0, nextBatchAt: T0 + min(30), ...noJitter },
  );
  ok(plan[0].slug === "chp" && plan[0].dueAt === T0,
     "ЧП выходит первым и немедленно, не дожидаясь очереди");
}

// ── равномерность ─────────────────────────────────────────────────────
{
  const plan = planReleases(
    [item("a", 3), item("b", 2), item("c", 1)],
    { now: T0, nextBatchAt: T0 + min(30), ...noJitter },
  );
  ok(plan.length === 3, "в плане все три материала");
  const gaps = plan.slice(1).map((p, i) => (p.dueAt - plan[i].dueAt) / 60_000);
  ok(gaps.every((g) => Math.abs(g - 10) < 0.01),
     `три материала на 30 минут — шаг 10 минут (получилось ${gaps.map((g) => g.toFixed(1)).join(", ")})`);
  ok(plan[plan.length - 1].dueAt < T0 + min(30),
     "последний выходит до прихода следующей пачки, а не после");
}

// ── порядок по готовности ─────────────────────────────────────────────
{
  const plan = planReleases(
    [item("позже", 1), item("раньше", 20), item("средний", 10)],
    { now: T0, nextBatchAt: T0 + min(30), ...noJitter },
  );
  ok(plan.map((p) => p.slug).join(",") === "раньше,средний,позже",
     "порядок — по времени готовности, свежесть вперёд не лезет");
}

// ── предельный срок ───────────────────────────────────────────────────
{
  // Два материала ждут по 44 минуты при пределе 45 — обоим жить минуту.
  // Первый и так выходит сразу (он старший в очереди), а вот второму
  // расписание назначило бы слот через десять минут — вот там предел и
  // обязан вмешаться.
  const plan = planReleases(
    [item("старый1", 44), item("старый2", 44), ...Array.from({ length: 8 }, (_, i) => item("новый" + i, 1))],
    { now: T0, nextBatchAt: T0 + min(30), maxWaitMinutes: 45, ...noJitter },
  );
  const second = plan.find((p) => p.slug === "старый2");
  ok(second.dueAt <= T0 + min(1) + 1,
     "материал у предела выходит немедленно, даже если расписание велит ждать");
  ok(second.reason.includes("предел"), "причина названа: предел, а не расписание");
  ok(plan.find((p) => p.slug === "новый0").dueAt > T0 + min(1),
     "предел не сдвигает вперёд остальных — вмешательство точечное");

  const overdue = planReleases([item("просрочен", 60)], { now: T0, maxWaitMinutes: 45 });
  ok(overdue[0].dueAt === T0 && overdue[0].reason.includes("просрочен"),
     "уже просроченный выходит сразу");
}

// ── опоздавшая планёрка ───────────────────────────────────────────────
{
  // Следующая пачка должна была прийти пять минут назад. Держать материалы
  // в ожидании события, которое не наступило, нельзя.
  const plan = planReleases([item("a"), item("b"), item("c")], {
    now: T0,
    nextBatchAt: T0 - min(5),
    ...noJitter,
  });
  ok(plan.every((p) => p.dueAt === T0),
     "если следующая пачка уже просрочена — всё выходит сразу, а не ждёт");
}

// ── разброс ───────────────────────────────────────────────────────────
{
  const mk = (rnd) =>
    planReleases([item("a", 3), item("b", 2), item("c", 1)], {
      now: T0, nextBatchAt: T0 + min(30), random: rnd,
    }).map((p) => p.dueAt);

  const flat = mk(() => 0.5);
  const noisy = mk(() => 0.9);
  ok(JSON.stringify(flat) !== JSON.stringify(noisy),
     "разброс реально сдвигает слоты — лента не идёт метрономом");

  // Двести прогонов со случайным разбросом: порядок обязан держаться всегда.
  let broken = 0;
  for (let n = 0; n < 200; n++) {
    const due = mk(Math.random);
    for (let i = 1; i < due.length; i++) if (due[i] < due[i - 1]) broken++;
  }
  ok(broken === 0, "при любом разбросе порядок выпуска не ломается (200 прогонов)");
}

// ── что пора выпускать ────────────────────────────────────────────────
{
  const plan = planReleases([item("a", 3), item("b", 2), item("c", 1)], {
    now: T0, nextBatchAt: T0 + min(30), ...noJitter,
  });
  ok(dueNow(plan, T0).length === 1, "в момент планирования созрел только первый");
  ok(dueNow(plan, T0 + min(11)).length === 2, "через 11 минут созрели двое");
  ok(dueNow(plan, T0 + min(30)).length === 3, "к приходу следующей пачки вышли все");
}

// ── пустая очередь ────────────────────────────────────────────────────
{
  ok(planReleases([], { now: T0 }).length === 0, "пустая очередь — пустой план, не падение");
  ok(dueNow([], T0).length === 0, "пустой план — нечего выпускать");
}

console.log(failed ? `\nпровалено ${failed}` : "\nвсе проверки пройдены");
process.exit(failed ? 1 : 0);
