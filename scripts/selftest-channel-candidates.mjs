#!/usr/bin/env node
// Регрессия на сборщик кандидатов в источники. Цена ошибки двусторонняя:
// пропущенный канал — конкуренты цитируют источник, которого у нас нет;
// шумный сборщик — журнал зарастает ботами и чатами, разбор дорожает.

import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  extractHandles,
  collectChannelCandidates,
  foldCandidates,
  markCandidate,
  knownHandles,
  CANDIDATES_LOG,
} from "../lib/channel-candidates.mjs";

let failed = 0;
const ok = (cond, msg) => {
  console.log((cond ? "  ok  " : "  FAIL ") + msg);
  if (!cond) failed++;
};

const fresh = () => {
  const r = mkdtempSync(join(tmpdir(), "cc-"));
  mkdirSync(join(r, "content/state"), { recursive: true });
  mkdirSync(join(r, "config"), { recursive: true });
  writeFileSync(
    join(r, "config/telegram-channels.json"),
    JSON.stringify({
      channels: [{ handle: "@huquqiyaxborot" }, { handle: "@centralbankuzbekistan" }],
      excluded: [{ handle: "@ozodlikradiosi" }],
    }),
  );
  return r;
};

// ── извлечение ────────────────────────────────────────────────────────
{
  const hs = extractHandles(
    "Об этом сообщил официальный канал хокимията https://t.me/toshkent_hokimiyati/123, " +
      "подробнее на t.me/s/yangi_kanal. Пишите на press@gov.uz или в @some_chat_bot.",
  );
  const names = hs.map((h) => h.handle);
  ok(names.includes("toshkent_hokimiyati"), "ссылка t.me/<handle>/<id> извлекается");
  ok(names.includes("yangi_kanal"), "ссылка t.me/s/<handle> извлекается без префикса s");
  ok(!names.includes("gov"), "почта не превращается в handle");
  ok(!names.some((n) => n.endsWith("bot")), "боты отфильтрованы");

  const ctx = hs.find((h) => h.handle === "toshkent_hokimiyati").context;
  ok(ctx.includes("официальный канал"), "контекст вокруг упоминания сохранён — по нему судим об атрибуции");

  const at = extractHandles("Канал @kun_uz_news пишет, что @huquqiyaxborot опубликовал документ");
  ok(at.some((h) => h.handle === "kun_uz_news"), "@handle в тексте извлекается");

  ok(extractHandles("см. t.me/joinchat/AbCdEf и t.me/+invite").length === 0, "служебные пути t.me не считаются каналами");
}

// ── известные не копятся ──────────────────────────────────────────────
{
  const root = fresh();
  const known = knownHandles(root);
  ok(known.has("huquqiyaxborot") && known.has("ozodlikradiosi"), "known: рабочий список и excluded");

  const res = collectChannelCandidates(root, [
    { title: "ЦБ поднял ставку", snippet: "сообщает @centralbankuzbekistan", link: "https://a/1", sourceId: "kun-uz" },
    { title: "Новый канал", snippet: "официальный канал минводхоза @suv_xojaligi", link: "https://a/2", sourceId: "kun-uz" },
  ]);
  ok(res.appended === 1 && res.handles[0] === "suv_xojaligi", "известный канал пропущен, новый записан");
}

// ── дедуп по (handle, link) и свёртка ─────────────────────────────────
{
  const root = fresh();
  const item = { title: "t", snippet: "канал, близкий к мэрии: @yangi_kanal", link: "https://a/1", sourceId: "kun-uz" };
  collectChannelCandidates(root, [item]);
  const again = collectChannelCandidates(root, [item]);
  ok(again.appended === 0, "повторный фетч той же статьи ничего не плодит");

  collectChannelCandidates(root, [
    { ...item, link: "https://b/2", sourceId: "daryo-uz" },
  ]);
  const c = foldCandidates(root).get("yangi_kanal");
  ok(c.sightings === 2 && c.sources.length === 2, "свёртка: наблюдения и разные источники считаются");
  ok(c.contexts.some((x) => x.includes("близкий к")), "контексты атрибуции доступны при разборе");
  ok(c.status === "open", "нерешённый кандидат открыт");
}

// ── resolve/dismiss закрывают кандидата навсегда ──────────────────────
{
  const root = fresh();
  const item = { title: "t", snippet: "смотрите @yangi_kanal", link: "https://a/1", sourceId: "kun-uz" };
  collectChannelCandidates(root, [item]);
  markCandidate(root, "@yangi_kanal", "resolve", { addedAs: "source" });
  ok(foldCandidates(root).get("yangi_kanal").status === "resolved:source", "resolve фиксируется в статусе");

  const res = collectChannelCandidates(root, [{ ...item, link: "https://c/3" }]);
  ok(res.appended === 0, "решённый кандидат больше не копится");

  // Журнал только дописывается — merge=union применим.
  const lines = readFileSync(join(root, CANDIDATES_LOG), "utf8").trim().split("\n");
  ok(lines.length === 2 && lines.every((l) => JSON.parse(l)), "журнал append-only, строка = событие");
}

// ── шум: обрывки, самоподписи, реклама ───────────────────────────────
{
  const root = fresh();
  // Длинный текст, обрубленный ровно на handle: это огрызок, а не канал.
  const long = "а".repeat(470) + " подробнее @tashkent_lan";
  const r1 = collectChannelCandidates(root, [
    { title: "t", snippet: long, link: "https://a/1", sourceId: "kun-uz" },
  ]);
  ok(r1.appended === 0, "handle на обрыве длинного сниппета не копится — это обрубок");

  // Короткий пост, кончающийся подписью канала: handle целый.
  const r2 = collectChannelCandidates(root, [
    { title: "t", snippet: "Официальный канал минводхоза @suv_xojaligi", link: "https://a/2", sourceId: "kun-uz" },
  ]);
  ok(r2.appended === 1, "короткий текст с handle в конце — нормальная находка");

  // Канал подписывает собственный пост.
  const r3 = collectChannelCandidates(root, [
    { title: "t", snippet: "Проверки продолжатся. @Tashkent_Land", link: "https://a/3", sourceId: "tashkent_land" },
  ]);
  ok(r3.appended === 0, "самоподпись канала — не находка");

  // Рекламный блок.
  const r4 = collectChannelCandidates(root, [
    { title: "t", snippet: "Скидки в @some_shop_uz. Телефон 1360 (на правах рекламы)", link: "https://a/4", sourceId: "kun-uz" },
  ]);
  ok(r4.appended === 0, "рекламный контекст не копится");
}

console.log(failed ? `\nпровалено ${failed}` : "\nвсе проверки пройдены");
process.exit(failed ? 1 : 0);
