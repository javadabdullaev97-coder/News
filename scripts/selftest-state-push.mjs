#!/usr/bin/env node
// Регрессия на догоняющий пуш реестра.
//
// ЗАЧЕМ ИМЕННО ЭТА ПРОВЕРКА. 17.08.2026 материал про OpenRouter ушёл
// в @leap_techno пять раз. Механика была такая: постер коммитит запись
// о посте сам после каждого сообщения, пуш не проходил из-за гонки
// с планёркой, а шаг воркфлоу проверял `git status` — и видел ЧИСТОЕ
// дерево, потому что коммит уже сделан. «No state changes to commit»,
// прогон зелёный, записи умирают вместе с раннером, следующий прогон
// отправляет статью заново.
//
// Здесь проверяется ровно эта пара состояний: чистое дерево при живом
// долге перед main. Тест поднимает настоящий репозиторий с bare-remote —
// на моках эта ошибка не воспроизводится, она вся про git.

import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

let failed = 0;
const ok = (cond, msg) => {
  console.log((cond ? "  ok   " : "  FAIL ") + msg);
  if (!cond) failed++;
};

const root = mkdtempSync(join(tmpdir(), "statepush-"));
const remote = join(root, "remote.git");
const work = join(root, "work");
const git = (cwd, ...args) =>
  execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

execFileSync("git", ["init", "--bare", "-b", "main", remote], { stdio: "ignore" });
execFileSync("git", ["clone", remote, work], { stdio: "ignore" });
git(work, "config", "user.email", "t@t");
git(work, "config", "user.name", "t");

const LOG = "telegram-posted.jsonl";
writeFileSync(join(work, LOG), '{"url":"a","messageId":1}\n');
git(work, "add", LOG);
git(work, "commit", "-m", "первая запись");
git(work, "push", "origin", "main");

// ── состояние «всё уехало» ────────────────────────────────────────────
{
  git(work, "fetch", "origin", "main");
  ok(git(work, "status", "--porcelain", "--", LOG) === "", "дерево чистое");
  ok(git(work, "log", "--oneline", "origin/main..HEAD") === "", "долга перед main нет");
}

// ── состояние, которое стоило пяти постов ─────────────────────────────
{
  appendFileSync(join(work, LOG), '{"url":"b","messageId":2}\n');
  git(work, "add", LOG);
  git(work, "commit", "-m", "state: telegram-posted +b");
  // Пуш «не прошёл» — просто не делаем его.

  const dirty = git(work, "status", "--porcelain", "--", LOG);
  const ahead = git(work, "log", "--oneline", "origin/main..HEAD");

  ok(dirty === "", "СТАРАЯ проверка видит чистое дерево — и молчит");
  ok(ahead !== "", "НОВАЯ проверка видит неотправленный коммит — это и есть долг");
  ok(
    ahead.includes("telegram-posted"),
    "в долге видно, какая именно запись не уехала",
  );
}

// ── догоняющий пуш закрывает долг ─────────────────────────────────────
{
  git(work, "push", "origin", "main");
  git(work, "fetch", "origin", "main");
  ok(git(work, "log", "--oneline", "origin/main..HEAD") === "", "после пуша долга нет");
  const remoteLog = execFileSync("git", ["show", "main:telegram-posted.jsonl"], {
    cwd: remote,
    encoding: "utf8",
  });
  ok(remoteLog.includes('"url":"b"'), "запись доехала до main");
}

console.log(failed ? `\n${failed} проверок упало` : "\nвсе проверки прошли");
process.exit(failed ? 1 : 0);
