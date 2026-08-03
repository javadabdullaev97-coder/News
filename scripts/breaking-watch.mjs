#!/usr/bin/env node
// Сторож ЧП: замечает происшествие в потоке и сигналит владельцу немедленно.
//
// ЗАЧЕМ. Список тревожных слов лежал в config/newsroom-policy.json с самого
// начала (urgency.escalate.keywords) и не имел ни одного потребителя: `grep`
// по репозиторию не находил ни строчки кода, которая бы к нему обращалась.
// Конфиг описывал правило, которого не существовало.
//
// Теперь список работает. Фетчер и так обходит все источники каждые 20 минут —
// сторож смотрит на то, что он принёс, и при совпадении шлёт владельцу
// сообщение в Telegram. Ближайшая планёрка придёт максимум через 20 минут,
// но узнать о ЧП владелец должен раньше неё, а не постфактум.
//
// ЧЕГО СТОРОЖ НЕ ДЕЛАЕТ. Он не пишет статью и не публикует: производство —
// работа планёрки. Он только сокращает время до того момента, когда о событии
// вообще известно.
//
// ПОЧЕМУ ОДНОГО СЛОВА МАЛО. «Пожар» в заголовке про пожар в Калифорнии не
// должен поднимать тревогу в Ташкенте среди ночи. Условие двойное: тревожное
// слово И узбекский топоним в тексте.
//
// Первая версия требовала вместо топонима ОФИЦИАЛЬНОГО ИСТОЧНИКА — и провалилась
// в обе стороны сразу, что видно на трёхдневном архиве. По словам совпало 204
// items, официальными оказались шесть — и все шесть от ООН, про лесные пожары
// в Европе. А оба настоящих ЧП Узбекистана правило потеряло: землетрясение
// в Ташкентской области и отключение воды в Мирзо-Улугбекском районе принесли
// местные СМИ, ведомства о них не написали вовсе. То есть фильтр пропускал
// ровно шум и отсекал ровно сигнал.
//
// «Слово + топоним» даёт 5 сигналов за трое суток и ловит оба этих события.
// Источник при этом не игнорируется — сколько их и есть ли среди них
// официальный, идёт в текст сообщения: это то, что помогает владельцу решить,
// верить ли сигналу.
//
// СИГНАЛ НА КЛАСТЕР, А НЕ НА ССЫЛКУ. Об одном землетрясении пишут семь
// источников. Семь одинаковых сообщений ночью — это не оповещение, а спам,
// после которого перестают смотреть на любые.
//
// ENV:
//   TELEGRAM_BOT_TOKEN, TELEGRAM_EDITOR_CHAT_ID — приватный чат владельца
//   DRY_RUN=1 — показать, что отправил бы, и ничего не слать

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  ROOT,
  hashLink,
  loadJournal,
  readInbox,
  dedupeByLink,
  itemAgeHours,
} from "../lib/inbox-core.mjs";

const STATE_PATH = join(ROOT, "content/state/breaking-alerts.json");
const POLICY_PATH = join(ROOT, "config/newsroom-policy.json");
const INDEX_PATH = join(ROOT, "config/generated/source-index.json");

const { TELEGRAM_BOT_TOKEN, TELEGRAM_EDITOR_CHAT_ID, DRY_RUN } = process.env;
const dryRun = DRY_RUN === "1" || DRY_RUN === "true";

if (!dryRun && (!TELEGRAM_BOT_TOKEN || !TELEGRAM_EDITOR_CHAT_ID)) {
  console.error("[breaking] нужны TELEGRAM_BOT_TOKEN и TELEGRAM_EDITOR_CHAT_ID (или DRY_RUN=1)");
  process.exit(1);
}

// Окно ЧП короче общего суточного: происшествие шестичасовой давности —
// уже не «сейчас», и сигналить о нём как о срочном значит приучать
// владельца не смотреть на сигналы.
const MAX_AGE_HOURS = Number(
  (process.argv.find((a) => a.startsWith("--max-age=")) || "").split("=")[1] || 6,
);

const policy = JSON.parse(readFileSync(POLICY_PATH, "utf8"));
const escalate = policy?.urgency?.escalate ?? {};
const keywords = (escalate.keywords ?? []).map((k) => k.toLowerCase());
const places = (escalate.uzbekPlaces ?? []).map((k) => k.toLowerCase());
const boostSourceIds = new Set(escalate.sourceIds ?? []);
const COOLDOWN_H = Number(escalate.alertCooldownHours ?? 12);

if (!places.length) {
  console.error("[breaking] urgency.escalate.uzbekPlaces пуст — без топонимов сторож ловил бы весь мир");
  process.exit(1);
}

if (!existsSync(INDEX_PATH)) {
  console.error(
    "[breaking] нет config/generated/source-index.json — запусти scripts/build-source-index.mjs",
  );
  process.exit(1);
}
const index = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
const officialIds = new Set(
  index.sources.filter((s) => s.type === "source").map((s) => s.id),
);

function loadState() {
  const empty = { alerts: {} };
  if (!existsSync(STATE_PATH)) return empty;
  try {
    const parsed = JSON.parse(readFileSync(STATE_PATH, "utf8"));
    return { alerts: parsed.alerts && typeof parsed.alerts === "object" ? parsed.alerts : {} };
  } catch {
    // Fail-open: лучше повторный сигнал, чем пропущенное ЧП.
    console.error("[breaking] состояние не читается — считаю, что не сигналили");
    return empty;
  }
}

function haystack(item) {
  return `${item.title ?? ""} ${item.snippet ?? ""}`.toLowerCase();
}

const at = Date.now();
const journal = loadJournal(ROOT, at);
const items = dedupeByLink(readInbox(ROOT, { at }).items);
const state = loadState();

// Кластеризуем по паре «тревожное слово + место». Кросс-языковая группировка
// по смыслу здесь не нужна и была бы лишней: местные ЧП описываются одними и
// теми же словами на русском, а пара «землетрясение + ташкент» разделяет
// события достаточно точно, чтобы не склеить пожар в Кашкадарье с потопом
// в Хорезме.
const clusters = new Map();

for (const item of items) {
  const h = hashLink(item.link);
  // Тема уже обработана редакцией — сигналить поздно и незачем.
  if (journal.done.has(h)) continue;

  const age = itemAgeHours(item, at);
  if (age !== null && age > MAX_AGE_HOURS) continue;

  const hay = haystack(item);
  const words = keywords.filter((k) => hay.includes(k));
  if (!words.length) continue;
  const found = places.filter((k) => hay.includes(k));
  if (!found.length) continue;

  const key = `${words[0]}|${found[0]}`;
  if (!clusters.has(key)) {
    clusters.set(key, { key, word: words[0], place: found[0], items: [], sources: new Set() });
  }
  const c = clusters.get(key);
  c.items.push(item);
  if (item.sourceId) c.sources.add(item.sourceId);
}

// Отсекаем кластеры, о которых уже сигналили недавно. Не навсегда: новое ЧП
// в том же городе через сутки — это новое ЧП, а не эхо старого.
const fresh = [];
for (const c of clusters.values()) {
  const last = Date.parse(state.alerts[c.key] ?? "");
  if (Number.isFinite(last) && at - last < COOLDOWN_H * 3600000) continue;
  c.newest = c.items.reduce(
    (min, it) => Math.min(min, itemAgeHours(it, at) ?? 99),
    99,
  );
  c.official = [...c.sources].some((id) => officialIds.has(id));
  c.boosted = [...c.sources].some((id) => boostSourceIds.has(id));
  fresh.push(c);
}

// Самое свежее первым: если сигналов несколько, владелец должен увидеть
// последнее событие вверху.
fresh.sort((a, b) => a.newest - b.newest);

if (!fresh.length) {
  console.error(
    `[breaking] сигналить нечего (просмотрено ${items.length} items, ` +
      `кластеров ${clusters.size}, все уже отправлены или в пределах ${COOLDOWN_H} ч)`,
  );
  process.exit(0);
}

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function send(text) {
  const res = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_EDITOR_CHAT_ID,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: false,
      }),
    },
  );
  const data = await res.json();
  if (!data.ok) throw new Error(`sendMessage: ${data.description}`);
  return data.result;
}

let sent = 0;
for (const c of fresh) {
  // Показываем самую свежую заметку кластера — она ближе всего к событию.
  const lead = c.items.reduce((best, it) =>
    (itemAgeHours(it, at) ?? 99) < (itemAgeHours(best, at) ?? 99) ? it : best,
  );
  const ageMin = Math.max(0, Math.round(c.newest * 60));
  const srcCount = c.sources.size;

  // Сколько источников и есть ли официальный — это и есть мера доверия.
  // Одно сообщение из одной ленты и семь из семи — разные события по
  // достоверности, и владелец должен видеть разницу до того, как решит.
  const confidence = c.official
    ? `${srcCount} источник(ов), среди них официальный`
    : srcCount >= 3
      ? `${srcCount} независимых источника, официального подтверждения пока нет`
      : `${srcCount} источник(ов), официального подтверждения нет — возможно, слух`;

  const text = [
    "<b>ПОХОЖЕ НА ЧП</b>",
    "",
    `<b>${esc(lead.title)}</b>`,
    "",
    esc((lead.snippet ?? "").slice(0, 400)),
    "",
    `Сработало: ${esc(c.word)} · ${esc(c.place)}`,
    `Достоверность: ${esc(confidence)}`,
    `В потоке ${ageMin} мин назад`,
    "",
    esc(lead.link),
    "",
    "<i>Это сигнал, а не публикация. Ближайшая планёрка возьмёт тему в работу " +
      "в пределах 20 минут — отвечать не нужно.</i>",
  ].join("\n");

  if (dryRun) {
    console.log("=".repeat(60));
    console.log(text.replace(/<[^>]+>/g, ""));
  } else {
    await send(text);
  }
  state.alerts[c.key] = new Date(at).toISOString();
  sent++;
}

if (!dryRun) {
  // Чистим записи старше суток — они уже не влияют на cooldown, а файл
  // иначе растёт бесконечно.
  const keep = {};
  for (const [key, iso] of Object.entries(state.alerts)) {
    const ts = Date.parse(iso);
    if (Number.isFinite(ts) && at - ts < 24 * 3600000) keep[key] = iso;
  }
  mkdirSync(dirname(STATE_PATH), { recursive: true });
  writeFileSync(
    STATE_PATH,
    JSON.stringify({ alerts: keep, updatedAt: new Date(at).toISOString() }, null, 2) + "\n",
  );
}

console.error(`[breaking] сигналов отправлено: ${sent}`);
