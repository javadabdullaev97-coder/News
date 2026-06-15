// @ts-nocheck
// Гибридный воркер: статика + /api/wc-live.
//
// /api/wc-live отдаёт «нормализованный» снимок счетов ЧМ-2026 от
// football-data.org. Edge-кеш Cloudflare держит ответ 7 секунд, поэтому
// сколько бы клиентов ни поллило, реальных вызовов к API будет максимум
// ~8.5 в минуту — укладываемся в бесплатный тариф 10 req/min.
//
// Токен живёт как Worker Secret FOOTBALL_DATA_TOKEN — браузеру не виден.

export interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  FOOTBALL_DATA_TOKEN?: string;
}

interface ExecutionCtx {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const FD_TO_OURS: Record<string, string> = {
  SAU: "KSA",
  RSA: "ZAF",
  DZA: "ALG",
  CHE: "SUI",
  HRV: "CRO",
  DEU: "GER",
};

type LiveEntry = {
  home?: number;
  away?: number;
  status?: "live" | "finished";
  utcDate?: string;
};

const CACHE_SECONDS = 7;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionCtx): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/wc-live" || url.pathname === "/api/wc-live/") {
      return handleLive(request, env, ctx);
    }

    // Всё остальное — статические ассеты.
    return env.ASSETS.fetch(request);
  },
};

async function handleLive(
  request: Request,
  env: Env,
  ctx: ExecutionCtx,
): Promise<Response> {
  if (!env.FOOTBALL_DATA_TOKEN) {
    return json({ error: "FOOTBALL_DATA_TOKEN not configured" }, 500);
  }

  // Кешируем по нашему синтетическому URL, не по входящему запросу:
  // Cookies и query-string не должны влиять на кеш.
  const cacheUrl = new URL("https://leap.uz/__wc-live-cache");
  const cacheKey = new Request(cacheUrl.toString(), {
    headers: { "x-cache-key": "wc-live" },
  });
  const cache = caches.default;

  const cached = await cache.match(cacheKey);
  if (cached) {
    const headers = new Headers(cached.headers);
    headers.set("x-cache", "HIT");
    return new Response(cached.body, { status: cached.status, headers });
  }

  // Кеш пуст / истёк — идём в football-data.org.
  const apiRes = await fetch(
    "https://api.football-data.org/v4/competitions/WC/matches",
    {
      headers: { "X-Auth-Token": env.FOOTBALL_DATA_TOKEN },
    },
  );

  if (!apiRes.ok) {
    const body = await apiRes.text();
    return json(
      { error: "upstream", status: apiRes.status, body: body.slice(0, 500) },
      502,
    );
  }

  const apiData = (await apiRes.json()) as { matches?: any[] };
  const matches: Record<string, LiveEntry> = {};

  for (const fd of apiData.matches ?? []) {
    const homeTla = fd?.homeTeam?.tla;
    const awayTla = fd?.awayTeam?.tla;
    if (!homeTla || !awayTla) continue;
    const homeRef = FD_TO_OURS[homeTla] ?? homeTla;
    const awayRef = FD_TO_OURS[awayTla] ?? awayTla;
    const key = `${homeRef}|${awayRef}|${fd.utcDate}`;

    const entry: LiveEntry = { utcDate: fd.utcDate };
    if (fd.status === "IN_PLAY" || fd.status === "PAUSED") {
      entry.status = "live";
      entry.home = fd.score?.fullTime?.home ?? fd.score?.halfTime?.home ?? 0;
      entry.away = fd.score?.fullTime?.away ?? fd.score?.halfTime?.away ?? 0;
    } else if (fd.status === "FINISHED") {
      entry.status = "finished";
      entry.home = fd.score?.fullTime?.home ?? 0;
      entry.away = fd.score?.fullTime?.away ?? 0;
    }

    matches[key] = entry;
  }

  const responseBody = JSON.stringify({
    fetchedAt: new Date().toISOString(),
    matches,
  });

  const response = new Response(responseBody, {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": `public, max-age=${CACHE_SECONDS}`,
      "x-cache": "MISS",
      "access-control-allow-origin": "*",
    },
  });

  // Кешируем копию ответа.
  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
    },
  });
}
