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

const {
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_EDITOR_CHAT_ID,
  TELEGRAM_EDITOR_USER_IDS,
  DRY_RUN,
} = process.env;
const dryRun = DRY_RUN === "1" || DRY_RUN === "true";

// Whitelist отправителей. Без него бот принимает реплаи от кого угодно
// в чате-очереди, включая присланное фото — и оно уходит в public/images/
// и через минуту в прод. Whitelist задаётся comma-separated ID из
// GitHub Secret TELEGRAM_EDITOR_USER_IDS (пусто = принимать всех, для
// обратной совместимости, но с явным warning в логе).
const EDITOR_USER_IDS = (TELEGRAM_EDITOR_USER_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .map(Number);

function isAllowedSender(userId) {
  if (!EDITOR_USER_IDS.length) return true; // пусто → всех пускаем
  return EDITOR_USER_IDS.includes(userId);
}

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
  "low-confidence":
    "fact-checker дал confidence ниже порога 70% — материал не публикуется напрямую в main без вашего решения",
  "rework-ready":
    "материал переделан по вашему комментарию — проверьте, стало ли лучше",
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
  // Ищем в трёх местах:
  // 1. content/posts/<day>/<slug>.mdx — опубликованные (могут быть awaitingEditor)
  // 2. content/needs-verification/<slug>.mdx — материалы с confidence<70,
  //    ждущие ответа владельца
  // 3. content/rework/<slug>.mdx — на переделке после комментария
  const posts = join(ROOT, "content/posts");
  if (existsSync(posts)) {
    for (const day of readdirSync(posts)) {
      const f = join(posts, day, `${slug}.mdx`);
      if (existsSync(f)) return f;
    }
  }
  for (const dir of ["content/needs-verification", "content/rework"]) {
    const f = join(ROOT, dir, `${slug}.mdx`);
    if (existsSync(f)) return f;
  }
  return null;
}

// Переместить статью в content/posts/<день>/ — используется когда владелец
// ответил «ок» на материал из needs-verification или rework: он получает
// нормальный путь и попадает на сайт.
function promoteToPosts(file, slug) {
  if (file.includes("/content/posts/")) return file; // уже там
  const day = new Date(Date.now() + 5 * 3600 * 1000).toISOString().slice(0, 10);
  const destDir = join(ROOT, "content/posts", day);
  mkdirSync(destDir, { recursive: true });
  const dest = join(destDir, `${slug}.mdx`);
  const text = readFileSync(file, "utf8");
  writeFileSync(dest, text);
  unlinkSync(file);
  console.error(`[queue] ${slug}: перемещён в ${dest.replace(ROOT + "/", "")}`);
  return dest;
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
    // Фото применено — материал разблокирован, промотим на сайт если он в needs-verification/rework
    const promoted = promoteToPosts(file, item.slug);
    console.error(`[queue] ${item.slug}: фото применено → ${url}, материал разблокирован (${promoted.replace(ROOT + "/", "")})`);
    return "image-applied";
  }

  if (answer.kind === "approve") {
    text = dropFrontmatterField(text, "awaitingEditor");
    writeFileSync(file, text);
    const promoted = promoteToPosts(file, item.slug);
    console.error(`[queue] ${item.slug}: одобрен, публикуется как есть (${promoted.replace(ROOT + "/", "")})`);
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

  // Комментарий: материал уходит в content/rework/ с editorComment во frontmatter.
  // Планёрка на следующем прогоне подхватит rework/ ПЕРЕД тем как брать новые темы,
  // reporter переделает драфт с учётом замечания, снова придёт к владельцу.
  if (answer.kind === "comment") {
    mkdirSync(join(ROOT, "content/rework"), { recursive: true });
    const dest = join(ROOT, "content/rework", `${item.slug}.mdx`);
    // Читаем текущий счётчик итераций (если это уже rework файла из rework/)
    const currentIter = Number(
      (text.match(/^reworkIteration:\s*(\d+)/m) || [])[1] || 0,
    );
    const nextIter = currentIter + 1;
    // Экранируем YAML: заменяем " и \n
    const commentSafe = answer.text
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n");
    // Вставляем/обновляем editorComment и reworkIteration во frontmatter
    text = text.replace(/^editorComment:.*(\r?\n(  .*\r?\n)*)?/m, "");
    text = text.replace(/^reworkIteration:.*(\r?\n)/m, "");
    text = text.replace(
      /^---\n/,
      `---\neditorComment: "${commentSafe}"\nreworkIteration: ${nextIter}\n`,
    );
    // awaitingEditor остаётся true — материал ждёт переделки, потом снова к владельцу
    if (!/^awaitingEditor:/m.test(text)) {
      text = text.replace(/^---\n/, `---\nawaitingEditor: true\n`);
    }
    writeFileSync(dest, text);
    // Если исходник был в другом месте — удаляем
    if (file !== dest) unlinkSync(file);
    console.error(
      `[queue] ${item.slug}: комментарий сохранён → content/rework/${item.slug}.mdx (итерация ${nextIter})`,
    );
    return `rework-iteration-${nextIter}`;
  }

  console.error(`[queue] ${item.slug}: неизвестный тип ответа`);
  return "unknown-answer";
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
  let rejected = 0;

  // ВАЖНО: offset двигаем только после УСПЕШНОГО applyAnswer.
  // Прошлая версия двигала его в начале цикла — на исключении из applyAnswer
  // (git-конфликт, пропавший файл статьи, python упал) offset уже сохранён,
  // и следующий getUpdates этот реплай не увидит. Реплай редактора терялся молча.
  //
  // Теперь: для каждого update пытаемся применить; на успехе — двигаем
  // offset конкретно этого update. На ошибке — offset этого update НЕ двигаем,
  // и следующий cron попробует снова. Правда: если один битый update висит
  // всегда, getUpdates будет каждый раз возвращать и его, и всё что за ним.
  // Это лучше тихой потери — увидим повторяющуюся ошибку в логах и починим руками.

  if (!EDITOR_USER_IDS.length) {
    console.error(
      "[queue] WARN: TELEGRAM_EDITOR_USER_IDS не задан, принимаем реплаи от кого угодно",
    );
  }

  for (const u of updates) {
    const msg = u.message;
    const replyTo = msg?.reply_to_message?.message_id;
    if (!replyTo) {
      // не reply-сообщение — просто пропускаем и подтверждаем прочтение
      if (u.update_id >= (q.updateOffset || 0)) q.updateOffset = u.update_id + 1;
      continue;
    }

    const senderId = msg.from?.id;
    if (!isAllowedSender(senderId)) {
      console.error(
        `[queue] REJECT: реплай от userId=${senderId} не в whitelist (TELEGRAM_EDITOR_USER_IDS)`,
      );
      rejected++;
      // Тоже двигаем offset — иначе битый реплай будет вечно висеть.
      if (u.update_id >= (q.updateOffset || 0)) q.updateOffset = u.update_id + 1;
      continue;
    }

    const idx = q.pending.findIndex((x) => x.messageId === replyTo);
    if (idx === -1) {
      // reply на неизвестное сообщение — тоже двигаем offset, чтобы не крутилось
      if (u.update_id >= (q.updateOffset || 0)) q.updateOffset = u.update_id + 1;
      continue;
    }
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
      // ни фото, ни текст (например, стикер) — не наш случай, двигаем offset
      if (u.update_id >= (q.updateOffset || 0)) q.updateOffset = u.update_id + 1;
      continue;
    }

    // Ответ получен — доводим материал до публикуемого состояния.
    // На исключении не двигаем offset: следующий cron попробует снова.
    try {
      answer.applied = await applyAnswer(item, answer);
    } catch (err) {
      console.error(
        `[queue] ${item.slug}: applyAnswer упал — offset НЕ двигаем, попробуем ещё раз: ${err.message}`,
      );
      // Персистим все успешные ранее апдейты, но НЕ трогаем offset этого.
      saveQueue(q);
      throw err;
    }

    q.resolved.push({ ...item, answer });
    // Комментарий переводит материал в rework/ — из pending его тоже убираем,
    // на следующей планёрке он вернётся через новый push после переделки.
    q.pending.splice(idx, 1);
    if (u.update_id >= (q.updateOffset || 0)) q.updateOffset = u.update_id + 1;
    applied++;
  }

  saveQueue(q);
  if (rejected) {
    console.error(`[queue] отклонено по whitelist: ${rejected}`);
  }
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
