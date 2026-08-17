#!/usr/bin/env node
// Сверяет реестр отправленного с тем, что реально висит в каналах.
//
// ЗАЧЕМ. 18.08.2026 владелец нашёл в технологическом канале одну статью
// в пяти экземплярах. Разбор занял час, а когда механику починили,
// сплошная сверка подняла ещё двадцать четыре лишних сообщения
// в спортивных каналах — про них никто не знал, потому что смотреть было
// нечем: реестр лежит в git, канал живёт отдельно, и расхождение между
// ними не видит никто, пока подписчик не напишет.
//
// Теперь видит этот скрипт. Он ищет ключи «канал + язык + слаг»,
// у которых больше одного номера сообщения, и проверяет каждое: живо ли
// оно ещё в канале. Живых больше одного — это дубль у подписчика.
//
//   node scripts/audit-telegram-duplicates.mjs             — только окно удаления (48 ч)
//   node scripts/audit-telegram-duplicates.mjs --all       — всё, включая неудаляемое
//   node scripts/audit-telegram-duplicates.mjs --request   — сразу собрать заявку на снятие
//
// Проверка идёт по публичной странице t.me — ни токена, ни секретов
// не нужно, поэтому скрипт работает и в песочнице.
//
// Код возврата 1, если найдены живые дубли: сверку можно повесить
// в расписание и узнавать о расхождении раньше подписчика.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const LOG = join(ROOT, "content/state/telegram-posted.jsonl");
const argv = process.argv.slice(2);
const all = argv.includes("--all");
const makeRequest = argv.includes("--request");

// Публичные имена каналов. Секреты сюда не нужны: страница t.me открыта.
const HANDLE = {
  "main ru": "leap_news",
  "main uz": "leap_news_uz",
  "sport ru": "leap_sports",
  "sport uz": "leap_sports_uz",
  "tech ru": "leap_techno",
  "tech uz": "leap_techno_uz",
};

// Bot API удаляет сообщения 48 часов. Что старше — найти можно, снять нельзя,
// и заявку на такое собирать бессмысленно.
const DELETABLE_HOURS = 47;

if (!existsSync(LOG)) {
  console.error("[audit] реестра нет — нечего сверять");
  process.exit(0);
}

const byKey = new Map();
const deleted = new Set();
for (const line of readFileSync(LOG, "utf8").split("\n")) {
  const s = line.trim();
  if (!s) continue;
  let r;
  try {
    r = JSON.parse(s);
  } catch {
    continue;
  }
  // Снятые по явному номеру: сообщения уже нет, в сверку не берём.
  if (r.deletedAt && r.messageId) {
    deleted.add(`${r.target ?? "main"} ${r.lang ?? ""} ${r.messageId}`);
    continue;
  }
  if (!r.messageId || !r.url) continue;
  const lang = r.url.includes("/uz/") ? "uz" : "ru";
  const key = `${r.target ?? "main"} ${lang} ${r.url.split("/").pop()}`;
  const at = r.postedAt ?? "";
  const prev = byKey.get(key) ?? { ids: new Map(), latest: "" };
  prev.ids.set(r.messageId, at);
  if (at > prev.latest) prev.latest = at;
  byKey.set(key, prev);
}

const now = Date.now();
const suspects = [];
for (const [key, { ids, latest }] of byKey) {
  if (ids.size < 2) continue;
  const [target, lang] = key.split(" ");
  const fresh = latest ? (now - Date.parse(latest)) / 3_600_000 < DELETABLE_HOURS : false;
  if (!all && !fresh) continue;
  const live = [...ids.keys()].filter((id) => !deleted.has(`${target} ${lang} ${id}`));
  if (live.length < 2) continue;
  suspects.push({ key, target, lang, ids: live.sort((a, b) => a - b), fresh });
}

if (!suspects.length) {
  console.error(`[audit] проверять нечего: ключей с несколькими номерами нет${all ? "" : " в окне удаления"}`);
  process.exit(0);
}

console.error(`[audit] ключей под подозрением: ${suspects.length}, проверяю каналы`);

async function isLive(handle, id) {
  try {
    const res = await fetch(`https://t.me/${handle}/${id}?embed=1`, {
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    return html.includes("tgme_widget_message_text");
  } catch {
    return null; // сеть подвела — не выдаём за удаление
  }
}

const found = [];
for (const s of suspects) {
  const handle = HANDLE[`${s.target} ${s.lang}`];
  if (!handle) continue;
  const live = [];
  for (const id of s.ids) {
    const alive = await isLive(handle, id);
    if (alive === null) {
      console.error(`  ? ${handle}/${id}: канал не ответил, пропускаю ключ целиком`);
      live.length = 0;
      break;
    }
    if (alive) live.push(id);
  }
  if (live.length > 1) {
    found.push({ ...s, live });
    const slug = s.key.split(" ").slice(2).join(" ");
    console.error(`  ✗ ${s.target}/${s.lang} ${slug}: живых копий ${live.length} — ${live.join(", ")}`);
  }
}

if (!found.length) {
  console.error("[audit] живых дублей нет — реестр и каналы сходятся");
  process.exit(0);
}

// Оставляем ПОСЛЕДНЮЮ копию: свёртка реестра указывает на неё, и удалять
// надо ту, о которой реестр фактически не знает.
const messages = found.flatMap((f) =>
  f.live.slice(0, -1).map((id) => `${f.target === "main" ? "" : `${f.target}-`}${f.lang}:${id}`),
);

console.error(`\n[audit] живых дублей: ${messages.length}`);
console.error(`[audit] к снятию: ${messages.join(", ")}`);

if (makeRequest) {
  const path = join(ROOT, "content/state/retract-request.json");
  writeFileSync(
    path,
    `${JSON.stringify(
      {
        $comment: [
          "Заявка собрана scripts/audit-telegram-duplicates.mjs --request.",
          "Каждое сообщение проверено на живость; оставлена последняя копия —",
          "та, на которую указывает свёртка реестра.",
        ],
        slugs: [],
        messages,
        reason: "сверка реестра с каналами: живые дубли",
        requestedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
  );
  console.error(`[audit] заявка записана в ${path}`);
}

process.exit(1);
