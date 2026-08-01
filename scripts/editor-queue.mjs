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
  createWriteStream,
} from "node:fs";
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
if (!["push", "collect"].includes(mode)) {
  console.error("Использование: editor-queue.mjs push|collect [опции]");
  console.error("  push --slug=<slug> --reason=<код> --question=<текст> [--image=<путь>]");
  console.error("  collect");
  process.exit(1);
}

function arg(name, fallback = null) {
  const p = process.argv.find((a) => a.startsWith(`--${name}=`));
  return p ? p.slice(name.length + 3) : fallback;
}

function loadQueue() {
  if (!existsSync(QUEUE_PATH)) return { pending: [], resolved: [] };
  return JSON.parse(readFileSync(QUEUE_PATH, "utf8"));
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

    q.resolved.push({ ...item, answer });
    q.pending.splice(idx, 1);
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

await (mode === "push" ? push() : collect());
