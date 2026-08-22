#!/usr/bin/env node
// Разбор доступа к Instagram Graph API: что именно закрыто и на каком уровне.
//
// ЗАЧЕМ. 22.08.2026 постер получил на каждый вызов «API access blocked.
// (code 200)». Такой ответ ничего не говорит о причине: он одинаков и когда
// приложение в режиме разработки, и когда у токена нет разрешения, и когда
// у приложения отобран расширенный доступ, и когда аккаунт под ограничением.
// Гадать по вкладкам Business Manager — долго и мимо: страница «Пользователи»
// показывает доступ ЛЮДЕЙ к бизнес-портфолио, а постер ходит от системного
// пользователя через приложение, и людей там нет вовсе.
//
// Скрипт спрашивает у самого Graph API то, что тот знает про наш токен:
// какому приложению он принадлежит, живой ли, какие у него разрешения,
// видит ли он аккаунты Instagram. Дальше причина видна по строкам, а не
// по догадкам.
//
// БЕЗОПАСНОСТЬ. Токен в вывод не попадает: печатаются только идентификаторы,
// названия и флаги. Ни одна строка ответа не выводится целиком.
//
//   META_ACCESS_TOKEN=… node scripts/social-doctor.mjs
//
// В CI запускается воркфлоу social-doctor.yml — секреты есть только там.

const {
  META_ACCESS_TOKEN,
  IG_USER_ID_RU,
  IG_USER_ID_UZ,
  FB_PAGE_ID_RU,
  FB_PAGE_ID_UZ,
  GRAPH_VERSION = "v25.0",
} = process.env;

if (!META_ACCESS_TOKEN) {
  console.error("Нет META_ACCESS_TOKEN — запускать только в воркфлоу с секретами.");
  process.exit(2);
}

const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;
const TIMEOUT_MS = 30_000;

/** Вызов Graph. Возвращает {ok, data} — исключений не бросает: нам нужны все ответы, включая отказы. */
async function graph(path, params = {}) {
  const url = new URL(`${GRAPH}/${path}`);
  for (const [k, v] of Object.entries({ ...params, access_token: META_ACCESS_TOKEN })) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok && !data.error, data };
  } catch (err) {
    return { ok: false, data: { error: { message: err.message, code: "network" } } };
  }
}

function fail(label, data) {
  const e = data.error ?? {};
  console.log(
    `  ✗ ${label}: ${e.message ?? "неизвестно"} ` +
      `(code ${e.code ?? "?"}${e.error_subcode ? `/${e.error_subcode}` : ""})`,
  );
  return e;
}

const codes = new Set();

console.log(`Graph API ${GRAPH_VERSION}\n`);

// ─── 1. Живой ли токен и чей он ───
//
// debug_token — единственный способ узнать про токен всё сразу: приложение,
// тип, срок, разрешения. Проверять это первым обязательно: если токен мёртв,
// все остальные отказы — его следствие, а не отдельные беды.
console.log("1. ТОКЕН");
{
  const r = await graph("debug_token", { input_token: META_ACCESS_TOKEN });
  if (!r.ok) {
    codes.add(fail("debug_token", r.data).code);
  } else {
    const d = r.data.data ?? {};
    console.log(`  приложение: ${d.application ?? "?"} (id ${d.app_id ?? "?"})`);
    console.log(`  тип: ${d.type ?? "?"}`);
    console.log(`  живой: ${d.is_valid ? "да" : "НЕТ"}`);
    console.log(
      `  срок: ${d.expires_at ? new Date(d.expires_at * 1000).toISOString() : "бессрочный"}`,
    );
    if (d.data_access_expires_at) {
      const at = new Date(d.data_access_expires_at * 1000);
      const past = at < new Date();
      console.log(`  доступ к данным до: ${at.toISOString()}${past ? "  ← ИСТЁК" : ""}`);
    }
    console.log(`  разрешения: ${(d.scopes ?? []).join(", ") || "— пусто"}`);
    if (d.granular_scopes?.length) {
      for (const g of d.granular_scopes) {
        console.log(`    ${g.scope}: ${(g.target_ids ?? []).length} объект(ов)`);
      }
    }
    if (!d.is_valid) codes.add(190);
  }
}

// ─── 2. Что видит токен ───
//
// Разрешение, выданное в токене, и разрешение, которым приложению РАЗРЕШЕНО
// пользоваться, — разные вещи. Второе отбирается при потере расширенного
// доступа, и в scopes это никак не видно: строка остаётся, вызов отказывает.
console.log("\n2. ЧТО ОТДАЁТ API");
for (const [label, path, params] of [
  ["me", "me", { fields: "id,name" }],
  ["страницы", "me/accounts", { fields: "id,name,instagram_business_account", limit: 10 }],
]) {
  const r = await graph(path, params);
  if (!r.ok) {
    codes.add(fail(label, r.data).code);
    continue;
  }
  if (path === "me") {
    console.log(`  ✓ me: ${r.data.name ?? "—"} (id ${r.data.id})`);
  } else {
    const list = r.data.data ?? [];
    console.log(`  ✓ страниц видно: ${list.length}`);
    for (const p of list) {
      console.log(
        `    ${p.name} (id ${p.id})` +
          (p.instagram_business_account ? ` → IG ${p.instagram_business_account.id}` : " → IG не привязан"),
      );
    }
  }
}

// ─── 3. Наши конкретные аккаунты ───
//
// Идентификаторы лежат в секретах. Если сам объект по ним не читается,
// причина не в публикации, а в правах на этот объект: системного
// пользователя могли отвязать от актива.
console.log("\n3. АККАУНТЫ ИЗ СЕКРЕТОВ");
for (const [label, id, fields] of [
  ["IG ru", IG_USER_ID_RU, "id,username,name"],
  ["IG uz", IG_USER_ID_UZ, "id,username,name"],
  ["FB ru", FB_PAGE_ID_RU, "id,name"],
  ["FB uz", FB_PAGE_ID_UZ, "id,name"],
]) {
  if (!id) {
    console.log(`  – ${label}: секрет не задан`);
    continue;
  }
  const r = await graph(id, { fields });
  if (!r.ok) {
    codes.add(fail(label, r.data).code);
    continue;
  }
  console.log(`  ✓ ${label}: ${r.data.username ? `@${r.data.username}` : (r.data.name ?? "—")} (id ${r.data.id})`);
}

// ─── 4. Та самая операция, что падает ───
//
// Читать объект и публиковать в него — разные права. Проверяем именно
// публикацию, но безобидной её частью: список уже опубликованного лежит
// на том же ребре /media, что и создание контейнера, и требует того же
// разрешения instagram_content_publish. Ничего не создаём.
console.log("\n4. РЕБРО ПУБЛИКАЦИИ (/media, чтение — ничего не создаём)");
for (const [label, id] of [
  ["IG ru", IG_USER_ID_RU],
  ["IG uz", IG_USER_ID_UZ],
]) {
  if (!id) continue;
  const r = await graph(`${id}/media`, { fields: "id", limit: 1 });
  if (!r.ok) {
    codes.add(fail(`${label} /media`, r.data).code);
    continue;
  }
  console.log(`  ✓ ${label}: ребро отвечает, записей видно ${(r.data.data ?? []).length}`);
}

// ─── Вывод ───
//
// Ровно то, что чинить, и где. Без этого список отказов выше читается
// как «что-то сломалось» — а сломаться могли четыре разные вещи.
console.log("\nВЫВОД");
const HINTS = {
  190: "Токен недействителен или отозван. Настройки → Пользователи → Системные пользователи → нужный пользователь → «Создать токен», выбрать приложение и разрешения, положить новый в секрет META_ACCESS_TOKEN.",
  200: "Разрешение у токена есть, но приложению пользоваться им не дают. Так выглядит потеря расширенного доступа (Advanced Access) к instagram_content_publish или перевод приложения в режим разработки. Смотреть developers.facebook.com → приложение → App Review → Permissions and Features, и статус приложения (Live / In development).",
  10: "У токена нет нужного разрешения. Пересоздать токен системного пользователя, отметив instagram_basic, instagram_content_publish, pages_show_list, pages_read_engagement, business_management.",
  803: "Объект по идентификатору не найден этим токеном. Обычно системного пользователя отвязали от актива: Настройки → Аккаунты → Аккаунты Instagram → нужный аккаунт → «Добавить людей» → системный пользователь, полный доступ.",
  100: "Неверный параметр или поле недоступно этому токену — чаще всего следствие тех же отобранных разрешений.",
  4: "Упёрлись в лимит частоты. Это временно, доступ цел.",
};
if (!codes.size) {
  console.log("  Отказов нет: доступ на месте. Если постер всё равно падает — дело не в правах.");
} else {
  for (const c of [...codes].filter(Boolean)) {
    console.log(`  code ${c}: ${HINTS[c] ?? "разбирать по сообщению выше"}`);
  }
}
console.log(
  "\nЗамечание про вкладку «Пользователи → Люди»: там доступ ЛЮДЕЙ к бизнес-портфолио.\n" +
    "Постер ходит не от человека, а от системного пользователя через приложение,\n" +
    "поэтому «Активный» на той странице к этим отказам отношения не имеет.",
);
