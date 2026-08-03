#!/usr/bin/env node
// Регрессия на кэш виденных ссылок. Каждый пункт закрывает конкретный риск
// перехода seen.json → seen.jsonl (см. шапку loadSeenLinks в lib/inbox-core.mjs):
// потеря кэша при выкате, поломка от склейки merge=union, битый файл.
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadSeenLinks, saveSeenLinks, SEEN_LINKS_LIMIT } from "../lib/inbox-core.mjs";

const root = mkdtempSync(join(tmpdir(), "seen-"));
mkdirSync(join(root, "content/inbox"), { recursive: true });
const ok = (c, m) => console.log((c ? "  ok  " : "  FAIL ") + m);

// 1. пусто
ok(loadSeenLinks(root).size === 0, "нет файлов — пустое множество, а не падение");

// 2. читается легаси seen.json
writeFileSync(join(root, "content/inbox/seen.json"), JSON.stringify(["a", "b"]));
ok(loadSeenLinks(root).size === 2, "легаси seen.json читается");

// 3. запись создаёт jsonl, и он побеждает легаси
saveSeenLinks(new Set(["a", "b", "c"]), root);
ok(existsSync(join(root, "content/inbox/seen.jsonl")), "запись создаёт seen.jsonl");
ok(loadSeenLinks(root).size === 3, "после миграции читается jsonl, а не легаси");

// 4. формат — по ссылке на строку, без запятых и скобок
const raw = readFileSync(join(root, "content/inbox/seen.jsonl"), "utf8");
ok(raw === "a\nb\nc\n", "формат: одна ссылка на строку");

// 5. склейка union-мержа не ломает чтение: дубли и лишние строки переживаются
writeFileSync(join(root, "content/inbox/seen.jsonl"), "a\nb\nc\nb\nd\n\n");
const merged = loadSeenLinks(root);
ok(merged.size === 4 && merged.has("d"), "дубли после merge=union схлопываются");

// 6. подрезка по лимиту, свежие ссылки остаются
const many = new Set(Array.from({ length: SEEN_LINKS_LIMIT + 500 }, (_, i) => "u" + i));
const n = saveSeenLinks(many, root);
const after = loadSeenLinks(root);
ok(n === SEEN_LINKS_LIMIT, `подрезка до лимита (${n})`);
ok(after.has("u" + (SEEN_LINKS_LIMIT + 499)) && !after.has("u0"), "подрезка выбрасывает старые, не новые");

// 7. битый легаси не роняет сбор
const r2 = mkdtempSync(join(tmpdir(), "seen-"));
mkdirSync(join(r2, "content/inbox"), { recursive: true });
writeFileSync(join(r2, "content/inbox/seen.json"), "{не json");
ok(loadSeenLinks(r2).size === 0, "битый легаси-кэш — пустое множество, не исключение");
