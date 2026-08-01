// @ts-nocheck
// Cloudflare Worker для leap.uz — только статические ассеты.
//
// Раньше здесь был endpoint /api/wc-live с проксированием football-data.org
// для ЧМ-2026. После окончания турнира ЧМ-инфраструктура удалена из репо,
// воркер стал чистым static-прокси.

export interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return env.ASSETS.fetch(request);
  },
};
