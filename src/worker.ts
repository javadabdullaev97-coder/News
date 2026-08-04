// @ts-nocheck
// Cloudflare Worker для leap.uz.
//
// Две задачи:
//   1. Отдавать статические ассеты сайта (основное).
//   2. Принимать вебхук Telegram и немедленно будить GitHub Actions.
//
// Зачем второе. Ответ владельца в очереди редактора («ок», «стоп», фото,
// комментарий) раньше забирался опросом: workflow просыпался по расписанию
// раз в 10 минут и спрашивал Telegram, не появилось ли чего. К этому
// добавлялось обычное опоздание планировщика GitHub — на практике ответ
// применялся через 10–25 минут после того, как владелец его отправил.
//
// Вебхук переворачивает направление: Telegram сам стучится сюда в момент
// ответа, воркер тут же дёргает repository_dispatch, и workflow стартует
// через секунды.
//
// ПОЧЕМУ ПОСРЕДНИК ВООБЩЕ НУЖЕН. Telegram умеет только POST на заданный URL
// и не умеет слать заголовок Authorization, а GitHub без него dispatch не
// примет. Воркер — самое дешёвое место для этой склейки: он и так
// обслуживает leap.uz, отдельной инфраструктуры не появляется.
//
//   3. Быть внешними часами редакции и сторожем над GitHub Actions.
//
// Зачем третье. Планировщик GitHub ненадёжен, и это измерено, а не
// предположено: фетчер новостей выдал 8 запусков за 10 часов вместо 60,
// сторож heartbeat — 13 за 28 часов вместо 28, с провалами до четырёх часов
// подряд при полностью зелёном статусе GitHub. При этом запуск ПО СОБЫТИЮ
// у того же GitHub отрабатывает за секунды — ломается именно `schedule`.
//
// Отдельная беда: сторож жил внутри той же системы, которую сторожил. Когда
// heartbeat не запускался, тишина в боте выглядела ровно как «всё в порядке».
// Поэтому проверка «а жива ли вообще редакция» переехала сюда, наружу.
//
// СЕКРЕТЫ (задаются в Cloudflare, в репозиторий не попадают):
//   GH_DISPATCH_TOKEN — fine-grained PAT с правом Actions: Read and write
//                       на этом репозитории. Для сторожа нужно ещё
//                       Contents: Read — он смотрит свежесть коммитов.
//   TG_WEBHOOK_SECRET — общая подпись с Telegram. Без неё эндпоинт открыт
//                       всему интернету: кто угодно шлёт выдуманный «стоп»
//                       и снимает материал с сайта.
//   TG_BOT_TOKEN      — токен бота, чтобы сторож мог написать владельцу
//                       напрямую, минуя GitHub. Без него сторож молчит.
//   TG_ALERT_CHAT_ID  — куда писать тревогу (личный чат владельца).

export interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  GH_DISPATCH_TOKEN?: string;
  TG_WEBHOOK_SECRET?: string;
  TG_BOT_TOKEN?: string;
  TG_ALERT_CHAT_ID?: string;
}

const REPO = "javadabdullaev97-coder/News";
const HOOK_PATH = "/api/tg-hook";
const WATCHDOG_TEST_PATH = "/api/watchdog-test";

// Сколько репозиторий может молчать, прежде чем это тревога. Редакция коммитит
// постоянно — инбокс раз в десять минут, — поэтому тишина дольше часа означает,
// что встало всё разом: и фетчер, и планёрки.
const REPO_SILENCE_ALERT_MINUTES = 60;

async function githubApi(env: Env, path: string, init: RequestInit = {}) {
  return fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.GH_DISPATCH_TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      // GitHub отклоняет запросы без User-Agent.
      "User-Agent": "leap-uz-telegram-bridge",
      ...(init.headers as Record<string, string> | undefined),
    },
  });
}

async function dispatch(env: Env, eventType: string, payload: unknown = {}) {
  return githubApi(env, `/repos/${REPO}/dispatches`, {
    method: "POST",
    body: JSON.stringify({
      event_type: eventType,
      // client_payload ограничен 64 КБ. Обычное сообщение занимает единицы
      // килобайт даже с фото — там передаётся file_id, а не сам файл.
      client_payload: payload,
    }),
  });
}

async function dispatchToGitHub(env: Env, update: unknown): Promise<Response> {
  return dispatch(env, "telegram-update", { update });
}

/**
 * Отправляет тревогу владельцу и ВОЗВРАЩАЕТ РЕЗУЛЬТАТ. Ответ Telegram
 * проверяется обязательно: сторож, который считает отправленным то, что
 * не ушло, — это тот же мёртвый сторож, только с другой стороны. Первая
 * версия этой функции ответ игнорировала, и ручная проверка бодро писала
 * «сообщение отправлено» независимо от того, дошло оно или нет.
 */
async function alertOwner(env: Env, text: string): Promise<string> {
  if (!env.TG_BOT_TOKEN || !env.TG_ALERT_CHAT_ID) {
    const why = "TG_BOT_TOKEN/TG_ALERT_CHAT_ID не заданы";
    console.error(`[watchdog] ${why} — тревога не отправлена`);
    return why;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: env.TG_ALERT_CHAT_ID,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    const data = (await res.json()) as { ok?: boolean; description?: string };
    if (data?.ok) return "отправлено";
    const why = `Telegram отказал: ${data?.description ?? res.status}`;
    console.error(`[watchdog] ${why}`);
    return why;
  } catch (err) {
    const why = `сеть недоступна: ${(err as Error).message}`;
    console.error(`[watchdog] ${why}`);
    return why;
  }
}

/**
 * Сторож снаружи наблюдаемой системы. Проверяет ровно то, чего внутренний
 * heartbeat проверить не может по построению: жив ли вообще GitHub Actions.
 * Признак — свежесть последнего коммита в main.
 */
async function watchdog(env: Env, now: number, force = false): Promise<string> {
  const res = await githubApi(env, `/repos/${REPO}/commits?per_page=1`);
  if (!res.ok) {
    const msg =
      `❌ <b>Сторож не смог опросить GitHub</b>: ${res.status}. ` +
      `Либо GitHub недоступен, либо у токена отозвано право Contents: Read.`;
    const sent = await alertOwner(env, msg);
    return `github ${res.status}; тревога: ${sent}`;
  }
  const commits = (await res.json()) as Array<{ commit: { committer: { date: string } } }>;
  const last = Date.parse(commits?.[0]?.commit?.committer?.date ?? "");
  if (!Number.isFinite(last)) return "нет даты последнего коммита";

  const quietMin = Math.round((now - last) / 60000);
  const alarm = quietMin > REPO_SILENCE_ALERT_MINUTES;

  let sent = "не требовалось";
  if (alarm) {
    sent = await alertOwner(
      env,
      `⚠️ <b>Редакция молчит ${quietMin} мин</b>\n\n` +
        `В main нет ни одного коммита с ${new Date(last).toISOString().slice(0, 16).replace("T", " ")} UTC. ` +
        `Обычно инбокс обновляется раз в десять минут, поэтому такая тишина означает, ` +
        `что встали и фетчер, и планёрки.\n\n` +
        `Это сообщение пришло не от GitHub Actions, а от воркера leap.uz — ` +
        `он живёт снаружи и продолжает работать, даже когда встало всё остальное.`,
    );
  } else if (force) {
    // Ручная проверка: результат отправки попадает в ответ эндпоинта,
    // чтобы «сообщение отправлено» нельзя было напечатать вслепую.
    // Только для ручной проверки. Сторож молчит по построению, поэтому
    // «работает» и «сломан» снаружи неотличимы — ровно та ловушка, из-за
    // которой прежний heartbeat молчал месяцами незамеченным.
    sent = await alertOwner(
      env,
      `✅ <b>Сторож на связи</b>\n\n` +
        `Последний коммит в main — ${quietMin} мин назад, порог тревоги ${REPO_SILENCE_ALERT_MINUTES} мин. ` +
        `Редакция жива.\n\n` +
        `Это ответ на ручную проверку. Сам по себе сторож пишет только когда что-то встало.`,
    );
  }
  const verdict = alarm ? `тревога: тишина ${quietMin} мин` : `норма: тишина ${quietMin} мин`;
  return `${verdict}; сообщение в Telegram: ${sent}`;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === HOOK_PATH) {
      if (request.method !== "POST") {
        return new Response("method not allowed", { status: 405 });
      }
      if (!env.TG_WEBHOOK_SECRET || !env.GH_DISPATCH_TOKEN) {
        // Молча принимать при несконфигурированных секретах нельзя: Telegram
        // счёл бы обновление доставленным и больше его не прислал.
        console.error("[tg-hook] секреты не заданы");
        return new Response("not configured", { status: 500 });
      }
      // Подпись, которую Telegram присылает в каждом запросе. Задаётся
      // при setWebhook и сравнивается здесь.
      const got = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
      if (got !== env.TG_WEBHOOK_SECRET) {
        // 401, а не 502: чужому запросу повторять нечего.
        return new Response("unauthorized", { status: 401 });
      }

      let update: unknown;
      try {
        update = await request.json();
      } catch {
        return new Response("bad json", { status: 400 });
      }

      try {
        const res = await dispatchToGitHub(env, update);
        if (res.status === 204) return new Response("ok", { status: 200 });
        const body = await res.text();
        console.error(`[tg-hook] dispatch вернул ${res.status}: ${body.slice(0, 300)}`);
        // ВАЖНО: отдаём ошибку, а не 200. Telegram считает обновление
        // доставленным только при успешном ответе — на ошибке он повторит
        // попытку сам, с нарастающей паузой. Это и есть буфер: отдельное
        // хранилище для неприменённых ответов не нужно, очередь держит
        // Telegram. Ответ владельца не теряется, даже когда GitHub недоступен.
        return new Response("dispatch failed", { status: 502 });
      } catch (err) {
        console.error(`[tg-hook] dispatch упал: ${(err as Error).message}`);
        return new Response("dispatch error", { status: 502 });
      }
    }

    // Ручная проверка сторожа. Нужна потому, что сторож молчит по построению:
    // снаружи «работает» и «сломан» неотличимы, и прежний heartbeat именно так
    // молчал месяцами. Здесь проверка прогоняется принудительно и присылает
    // результат в любом случае — и когда всё хорошо, и когда тревога.
    //
    // Ключ обязателен: эндпоинт отправляет сообщение владельцу, без защиты
    // его можно было бы использовать для спама в личный чат.
    if (url.pathname === WATCHDOG_TEST_PATH) {
      if (!env.TG_WEBHOOK_SECRET || !env.GH_DISPATCH_TOKEN) {
        return new Response("not configured", { status: 500 });
      }
      const key = url.searchParams.get("key");
      if (key !== env.TG_WEBHOOK_SECRET) {
        return new Response("unauthorized", { status: 401 });
      }
      try {
        const verdict = await watchdog(env, Date.now(), true);
        return new Response(`сторож отработал — ${verdict}\n`, {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      } catch (err) {
        return new Response(`сторож упал: ${(err as Error).message}\n`, { status: 500 });
      }
    }

    return env.ASSETS.fetch(request);
  },

  // ─── Внешние часы ───
  //
  // Тик приходит раз в минуту, а что делать — решает минута часа. Хранилища
  // состояния нет намеренно: расписание целиком выводится из времени, поэтому
  // воркер невозможно «рассинхронизировать» и нечему протухнуть.
  //
  // Раскладка привязана к планёркам: они идут в :00 и :30, поэтому сбор
  // источников стоит в :25 и :55 — за пять минут до каждой.
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const now = event.scheduledTime;
    const at = new Date(now);
    const m = at.getUTCMinutes();
    const h = at.getUTCHours();
    const jobs: Promise<unknown>[] = [];

    // Ответы владельца приходят вебхуком за секунды; этот тик — страховка на
    // случай пропущенной доставки и единственный вход для напоминаний.
    if (m === 8) jobs.push(dispatch(env, "editor-collect"));

    // Сбор источников — за пять минут до каждой планёрке (:00 и :30).
    //
    // Раньше слот был один: полный обход стоил 10,7 минуты, и второй прогон
    // в час выглядел непозволительным. После правки pull-news-inbox.mjs
    // (процесс не завершался после работы) обход занимает 11 секунд, весь
    // шаг воркфлоу — меньше минуты. Поэтому слотов два, и оба поставлены
    // вплотную к планёркам: инбокс приезжает к ним четырёхминутной свежести,
    // а не пятнадцатиминутной.
    if (m === 25 || m === 55) jobs.push(dispatch(env, "fetch-news"));

    // Внутренний сторож: проверяет состояние репозитория изнутри.
    if (m === 17) jobs.push(dispatch(env, "heartbeat"));

    // Просмотры постов в канале.
    if (m === 42) jobs.push(dispatch(env, "metrics"));

    // Внешний сторож. Стоит после всех задач часа: если хоть одна из них
    // отработала, коммит в main появился, и тревоги не будет.
    if (m === 52) jobs.push(watchdog(env, now));

    // Ежедневные. Часы в UTC, Ташкент — UTC+5.
    //   03:20 UTC = 08:20 Ташкента — проверка живости источников
    //   04:00 UTC = 09:00 Ташкента — сверка с редполитикой
    //   14:00 UTC = 19:00 Ташкента — пересборка курсов ЦБ на завтра
    if (h === 3 && m === 20) jobs.push(dispatch(env, "source-health"));
    if (h === 4 && m === 0) jobs.push(dispatch(env, "policy-drift"));
    if (h === 14 && m === 0) jobs.push(dispatch(env, "daily-rebuild"));

    if (!jobs.length) return;
    ctx.waitUntil(
      Promise.allSettled(jobs).then((rs) => {
        for (const r of rs) {
          if (r.status === "rejected") console.error(`[cron] задача упала: ${r.reason}`);
        }
      }),
    );
  },
};
