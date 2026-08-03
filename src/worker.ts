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
// СЕКРЕТЫ (задаются в Cloudflare, в репозиторий не попадают):
//   GH_DISPATCH_TOKEN — fine-grained PAT с единственным правом
//                       Actions: Read and write на этом репозитории
//   TG_WEBHOOK_SECRET — общая подпись с Telegram. Без неё эндпоинт открыт
//                       всему интернету: кто угодно шлёт выдуманный «стоп»
//                       и снимает материал с сайта.

export interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  GH_DISPATCH_TOKEN?: string;
  TG_WEBHOOK_SECRET?: string;
}

const REPO = "javadabdullaev97-coder/News";
const HOOK_PATH = "/api/tg-hook";

async function dispatchToGitHub(env: Env, update: unknown): Promise<Response> {
  return fetch(`https://api.github.com/repos/${REPO}/dispatches`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.GH_DISPATCH_TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      // GitHub отклоняет запросы без User-Agent.
      "User-Agent": "leap-uz-telegram-bridge",
    },
    body: JSON.stringify({
      event_type: "telegram-update",
      // client_payload ограничен 64 КБ. Обычное сообщение занимает единицы
      // килобайт даже с фото — там передаётся file_id, а не сам файл.
      client_payload: { update },
    }),
  });
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

    return env.ASSETS.fetch(request);
  },
};
