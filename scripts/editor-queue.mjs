#!/usr/bin/env node
// Очередь на подтверждение редактором-человеком.
//
// Зачем. Часть решений конвейер принимать не должен, потому что делает это
// плохо. Самый наглядный случай — кроп фотографии. Умный кроп в
// scripts/prepare-image.py выбирает окно по центру масс детализации и это
// заметно лучше центрального кропа, но гарантии не даёт: на тестовом кадре
// с животным он подвинул окно с 350 к 235 при оптимуме 106–137, то есть всё
// равно срезал часть головы. Без настоящего распознавания объекта эвристика
// упирается в потолок. Живой пример из выпуска — фотография коровы, где
// обрезка отрезала морду.
//
// Поэтому: там, где конвейер не уверен, он не публикует наугад, а спрашивает.
//
// Два режима:
//   push    — положить материал в очередь и отправить владельцу в Telegram
//   collect — забрать ответы владельца и применить их к материалам
//
// Владелец отвечает **реплаем** на сообщение бота:
//   фото            → станет главной картинкой материала
//   текст «ок»      → публиковать как есть
//   текст «стоп»    → снять материал
//   любой другой текст → комментарий, уйдёт в .review/editor-input-<slug>.md
//
// ENV:
//   TELEGRAM_BOT_TOKEN       — тот же бот, что постит в канал
//   TELEGRAM_EDITOR_CHAT_ID  — приватный чат владельца с ботом
//   DRY_RUN=1                — ничего не отправлять, только показать

import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  unlinkSync,
  createWriteStream,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const QUEUE_PATH = join(ROOT, "content/state/editor-queue.json");
const REVIEW_DIR = join(ROOT, ".review");

const { TELEGRAM_BOT_TOKEN, TELEGRAM_EDITOR_CHAT_ID, DRY_RUN } = process.env;
const dryRun = DRY_RUN === "1" || DRY_RUN === "true";

const mode = process.argv[2];
if (!["push", "collect", "remind"].includes(mode)) {
  console.error("Использование: editor-queue.mjs push|collect [опции]");
  console.error("  push --slug=<slug> --reason=<код> --question=<текст> [--image=<путь>]");
  console.error("  collect");
  console.error("  remind   — напомнить о зависших без ответа");
  process.exit(1);
}

function arg(name, fallback = null) {
  const p = process.argv.find((a) => a.startsWith(`--${name}=`));
  return p ? p.slice(name.length + 3) : fallback;
}

function loadQueue() {
  const empty = { pending: [], resolved: [], updateOffset: 0 };
  if (!existsSync(QUEUE_PATH)) return empty;
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(QUEUE_PATH, "utf8"));
  } catch {
    console.error("[queue] файл очереди не читается как JSON — начинаю с пустой");
    return empty;
  }
  // Нормализуем: файл мог быть создан руками или обрезан, и тогда
  // отсутствующий pending роняет весь прогон.
  return {
    pending: Array.isArray(parsed.pending) ? parsed.pending : [],
    resolved: Array.isArray(parsed.resolved) ? parsed.resolved : [],
    updateOffset: Number(parsed.updateOffset) || 0,
  };
}

function saveQueue(q) {
  mkdirSync(dirname(QUEUE_PATH), { recursive: true });
  writeFileSync(QUEUE_PATH, JSON.stringify(q, null, 2) + "\n");
}

async function tg(method, body) {
  const res = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  const data = await res.json();
  if (!data.ok) throw new Error(`${method}: ${data.description}`);
  return data.result;
}

// Причины, по которым материал попадает на подтверждение. Текст показывается
// владельцу — он должен за секунду понять, что от него хотят.
const REASONS = {
  "no-image": "картинки нет вообще — ни в первоисточнике, ни в стоке",
  "crop-risky":
    "картинка есть, но при подгонке под кадр обрезается заметная часть — возможно, срежет главное",
  "stock-render":
    "нашлась только рисованная 3D-заготовка из стока, а не живая фотография",
  "source-doubt": "есть сомнение в источнике или в трактовке факта",
  "policy-edge": "тема на границе редполитики, нужен человек",
};

async function push() {
  const slug = arg("slug");
  const reason = arg("reason", "source-doubt");
  const question = arg("question", "");
  const imagePath = arg("image");
  const title = arg("title", slug);
  if (!slug) throw new Error("--slug обязателен");

  const q = loadQueue();
  if (q.pending.some((x) => x.slug === slug)) {
    console.error(`[queue] ${slug} уже в очереди — пропускаю`);
    return;
  }

  const reasonText = REASONS[reason] || reason;
  const lines = [
    "<b>НУЖНО ВАШЕ РЕШЕНИЕ</b>",
    "",
    `<b>${title}</b>`,
    "",
    `Почему спрашиваю: ${reasonText}.`,
  ];
  if (question) lines.push("", question);
  lines.push(
    "",
    "<i>Ответьте реплаем на это сообщение:</i>",
    "• пришлите фото — оно станет главной картинкой",
    "• «ок» — публиковать как есть",
    "• «стоп» — снять материал",
    "• любой другой текст — уйдёт в правку как комментарий",
  );
  const text = lines.join("\n");

  if (dryRun) {
    console.log("=".repeat(60));
    console.log("SLUG:", slug, "| REASON:", reason);
    console.log(text.replace(/<[^>]+>/g, ""));
    return;
  }

  let messageId;
  if (imagePath && existsSync(join(ROOT, imagePath))) {
    // Показываем текущий вариант картинки — владельцу проще решать, видя её.
    const form = new FormData();
    form.append("chat_id", TELEGRAM_EDITOR_CHAT_ID);
    form.append("photo", new Blob([readFileSync(join(ROOT, imagePath))]), "current.jpg");
    form.append("caption", text.slice(0, 1024));
    form.append("parse_mode", "HTML");
    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`,
      { method: "POST", body: form },
    );
    const data = await res.json();
    if (!data.ok) throw new Error(`sendPhoto: ${data.description}`);
    messageId = data.result.message_id;
  } else {
    const msg = await tg("sendMessage", {
      chat_id: TELEGRAM_EDITOR_CHAT_ID,
      text,
      parse_mode: "HTML",
    });
    messageId = msg.message_id;
  }

  q.pending.push({
    slug,
    title,
    reason,
    question,
    messageId,
    askedAt: new Date().toISOString(),
  });
  saveQueue(q);
  console.error(`[queue] ${slug} отправлен на подтверждение (message ${messageId})`);
}

async function downloadTelegramFile(fileId, destAbs) {
  const f = await tg("getFile", { file_id: fileId });
  const url = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${f.file_path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`скачивание файла: HTTP ${res.status}`);
  mkdirSync(dirname(destAbs), { recursive: true });
  await pipeline(Readable.fromWeb(res.body), createWriteStream(destAbs));
  return destAbs;
}


// ─── Применение ответа к материалу ───

function findArticle(slug) {
  const base = join(ROOT, "content/posts");
  if (!existsSync(base)) return null;
  for (const day of readdirSync(base)) {
    const f = join(base, day, `${slug}.mdx`);
    if (existsSync(f)) return f;
  }
  return null;
}

function setFrontmatterField(text, key, value) {
  const re = new RegExp(`^${key}:.*$`, "m");
  if (re.test(text)) return text.replace(re, `${key}: ${value}`);
  return text.replace(/^---\n/, `---\n${key}: ${value}\n`);
}

function dropFrontmatterField(text, key) {
  return text.replace(new RegExp(`^${key}:.*\\n`, "m"), "");
}

async function applyAnswer(item, answer) {
  const file = findArticle(item.slug);
  if (!file) {
    console.error(`[queue] ${item.slug}: файл статьи не найден — применять нечего`);
    return "article-not-found";
  }
  let text = readFileSync(file, "utf8");

  if (answer.kind === "photo") {
    // Прогоняем присланное фото через тот же конвейер, что и любой исходник:
    // кадр 1600×900, без апскейла, с умным кропом.
    const month = (file.match(/(\d{4})-(\d{2})-\d{2}/) || [])
      .slice(1, 3)
      .join("-");
    const res = spawnSync(
      "python3",
      [
        join(ROOT, "scripts/prepare-image.py"),
        join(ROOT, answer.file),
        item.slug,
        `--month=${month}`,
      ],
      { cwd: ROOT, encoding: "utf8" },
    );
    if (res.status !== 0) {
      console.error(`[queue] ${item.slug}: prepare-image отверг фото — ${res.stdout}`);
      return "image-rejected";
    }
    const report = JSON.parse(res.stdout);
    const url = report.output.url;
    text = text.replace(
      /^image:\n(?:  .*\n)*/m,
      `image:\n  url: "${url}"\n  alt: "${(answer.note || "Фотография к материалу").replace(/"/g, "'")}"\n  credit: "LEAP News"\n`,
    );
    text = dropFrontmatterField(text, "awaitingEditor");
    writeFileSync(file, text);
    console.error(`[queue] ${item.slug}: фото применено → ${url}, материал разблокирован`);
    return "image-applied";
  }

  if (answer.kind === "approve") {
    text = dropFrontmatterField(text, "awaitingEditor");
    writeFileSync(file, text);
    console.error(`[queue] ${item.slug}: разблокирован, публикуется как есть`);
    return "unblocked";
  }

  if (answer.kind === "reject") {
    mkdirSync(join(ROOT, "content/rejected"), { recursive: true });
    const dest = join(ROOT, "content/rejected", `${item.slug}.md`);
    writeFileSync(dest, text);
    unlinkSync(file);
    console.error(`[queue] ${item.slug}: снят по решению владельца → content/rejected/`);
    return "rejected";
  }

  // Комментарий не снимает блокировку: владелец что-то попросил поправить,
  // значит материал ещё не готов. Остаётся в очереди до «ок» или фото.
  console.error(`[queue] ${item.slug}: комментарий сохранён, материал остаётся в очереди`);
  return "comment-saved";
}

async function collect() {
  const q = loadQueue();
  if (!q.pending.length) {
    console.error("[queue] очередь пуста");
    return;
  }

  const offset = q.updateOffset || 0;
  const updates = await tg("getUpdates", { offset, timeout: 0, limit: 100 });
  let applied = 0;

  for (const u of updates) {
    if (u.update_id >= (q.updateOffset || 0)) q.updateOffset = u.update_id + 1;
    const msg = u.message;
    const replyTo = msg?.reply_to_message?.message_id;
    if (!replyTo) continue;

    const idx = q.pending.findIndex((x) => x.messageId === replyTo);
    if (idx === -1) continue;
    const item = q.pending[idx];

    const answer = { at: new Date().toISOString() };

    if (msg.photo?.length) {
      // Берём самый крупный вариант — Telegram отдаёт лесенку размеров.
      const best = msg.photo[msg.photo.length - 1];
      const dest = join(ROOT, `.review/editor-photo-${item.slug}.jpg`);
      await downloadTelegramFile(best.file_id, dest);
      answer.kind = "photo";
      answer.file = `.review/editor-photo-${item.slug}.jpg`;
      answer.note = msg.caption || null;
      console.error(`[queue] ${item.slug}: получено фото → ${answer.file}`);
    } else if (msg.text) {
      const t = msg.text.trim().toLowerCase();
      if (["ок", "ok", "да", "+", "публикуй"].includes(t)) {
        answer.kind = "approve";
      } else if (["стоп", "stop", "нет", "-", "снять"].includes(t)) {
        answer.kind = "reject";
      } else {
        answer.kind = "comment";
        answer.text = msg.text;
        mkdirSync(REVIEW_DIR, { recursive: true });
        writeFileSync(
          join(REVIEW_DIR, `editor-input-${item.slug}.md`),
          `# Комментарий редактора: ${item.slug}\n\n` +
            `Получен ${answer.at} реплаем в Telegram.\n\n> ${msg.text}\n`,
        );
      }
      console.error(`[queue] ${item.slug}: ответ «${answer.kind}»`);
    } else {
      continue;
    }

    // Ответ получен — доводим материал до публикуемого состояния.
    // Без этого шага статья так и осталась бы с awaitingEditor и никогда
    // не вышла бы: очередь копила бы ответы, а материал стоял.
    answer.applied = await applyAnswer(item, answer);

    q.resolved.push({ ...item, answer });
    if (answer.kind !== "comment") q.pending.splice(idx, 1);
    applied++;
  }

  saveQueue(q);
  console.error(
    `[queue] обработано ответов: ${applied}, осталось в ожидании: ${q.pending.length}`,
  );
}

if (!dryRun && (!TELEGRAM_BOT_TOKEN || !TELEGRAM_EDITOR_CHAT_ID)) {
  console.error(
    "Нужны TELEGRAM_BOT_TOKEN и TELEGRAM_EDITOR_CHAT_ID. Для проверки: DRY_RUN=1",
  );
  process.exit(1);
}

async function remind() {
  // Материал, поставленный в очередь, физически не может выйти на сайт.
  // Значит молчание владельца — это не «опубликуем как есть», а «материал
  // стоит». Чтобы он не стоял незамеченным, напоминаем.
  const q = loadQueue();
  const now = Date.now();
  const REMIND_AFTER_H = 2;
  const STALE_AFTER_H = 24;
  let sent = 0;

  for (const item of q.pending) {
    const ageH = (now - new Date(item.askedAt).getTime()) / 3600000;
    const lastPing = item.remindedAt ? new Date(item.remindedAt).getTime() : 0;
    const sinceLastH = (now - lastPing) / 3600000;
    if (ageH < REMIND_AFTER_H || sinceLastH < REMIND_AFTER_H) continue;

    const stale = ageH >= STALE_AFTER_H;
    const text = stale
      ? `<b>Материал стоит больше суток</b>\n\n<b>${item.title}</b>\n\n` +
        `Ждёт вашего ответа с ${item.askedAt.slice(0, 16).replace("T", " ")} UTC. ` +
        `Пока ответа нет, он не выйдет ни на сайт, ни в канал. ` +
        `Если тема уже неактуальна — ответьте «стоп», и я сниму её.`
      : `<b>Напоминание</b>\n\n<b>${item.title}</b>\n\n` +
        `Ждёт вашего решения ${Math.round(ageH)} ч. Материал не публикуется, пока не ответите.`;

    if (dryRun) {
      console.log("-".repeat(50));
      console.log(text.replace(/<[^>]+>/g, ""));
    } else {
      await tg("sendMessage", {
        chat_id: TELEGRAM_EDITOR_CHAT_ID,
        text,
        parse_mode: "HTML",
        reply_to_message_id: item.messageId,
      });
      item.remindedAt = new Date().toISOString();
    }
    sent++;
  }
  if (!dryRun) saveQueue(q);
  console.error(`[queue] напоминаний отправлено: ${sent}, в очереди: ${q.pending.length}`);
}

await (mode === "push" ? push() : mode === "collect" ? collect() : remind());
