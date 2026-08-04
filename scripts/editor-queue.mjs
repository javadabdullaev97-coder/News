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
import { loadPosted } from "../lib/telegram-posted.mjs";
import {
  loadQueue as loadQueueLog,
  saveQueue as saveQueueLog,
  snapshot as snapshotQueue,
} from "../lib/editor-queue-log.mjs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
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
if (!["push", "collect", "remind", "scan-pending", "apply-update", "spool-update"].includes(mode)) {
  console.error("Использование: editor-queue.mjs push|collect|remind|scan-pending|apply-update|spool-update");
  console.error("  push --slug=<slug> --reason=<код> --question=<текст> [--image=<путь>]");
  console.error("  collect        — забрать ответы владельца");
  console.error("  remind         — напомнить о зависших без ответа");
  console.error("  spool-update   — положить обновление из вебхука (TELEGRAM_UPDATE_JSON)");
  console.error("                   в content/state/tg-spool/, НЕ применяя. Коммитится отдельно,");
  console.error("                   чтобы пережить отмену или падение джоба.");
  console.error("  apply-update   — разобрать накопившийся спул и применить ответы");
  console.error("  scan-pending   — найти материалы в content/needs-verification/ с");
  console.error("                   pendingEditorQuestion во frontmatter и запушить их");
  console.error("                   в TG. Нужен для Planyorka: она не имеет доступа");
  console.error("                   к секретам TG и не может пушить напрямую.");
  process.exit(1);
}

function arg(name, fallback = null) {
  const p = process.argv.find((a) => a.startsWith(`--${name}=`));
  return p ? p.slice(name.length + 3) : fallback;
}

// Снимок состояния на момент чтения. saveQueue сравнивает с ним текущую
// очередь и дописывает в журнал только разницу — так вызывающий код не
// меняется, а на диск больше не уезжает файл целиком (см. lib/editor-queue-log.mjs).
let queueSnapshot = { pending: [], resolved: [], updateOffset: 0 };

function loadQueue() {
  const q = loadQueueLog(ROOT);
  queueSnapshot = snapshotQueue(q);
  return q;
}

function saveQueue(q) {
  const written = saveQueueLog(ROOT, queueSnapshot, q);
  if (written) queueSnapshot = snapshotQueue(q);
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
/**
 * Готов ли файл к публикации на сайте.
 *
 * В очереди к владельцу оказываются два разных типа файлов, и внешне они
 * похожи: готовая статья и исследовательская карточка. У карточки вместо
 * publishedAt стоит draftAt, живёт status: needs-verification, а текст
 * материала спрятан внутри раздела «Готовый текст материала (для решения
 * редактора)» — рядом со служебными пометками «Статус: черновик готов»
 * и «Заведено: …».
 *
 * Без этой проверки ответ «ок» перекладывал карточку в content/posts/ как
 * есть. Так 3 августа на сайт уехала карточка про изъятие гашиша: сборка
 * её приняла, publishedAt оказался пустым, поэтому в списках она встала
 * в самый конец и владельцу выглядела как «ничего не опубликовалось»,
 * а читателю на странице показались бы внутренние заметки редакции.
 *
 * Поэтому «ок» больше не превращает карточку в публикацию. Решение
 * владельца при этом не теряется — оно возвращается в работу вместе
 * с объяснением, чего не хватает.
 */
function articleReadiness(text) {
  const missing = [];
  if (!/^publishedAt:\s*\S/m.test(text)) missing.push("нет publishedAt");
  // ОСТАТОЧНЫЙ status САМ ПО СЕБЕ КАРТОЧКОЙ НЕ ДЕЛАЕТ.
  //
  // Поле `status: needs-verification` остаётся во frontmatter от папки,
  // в которой материал лежал, и переживает превращение карточки в статью.
  // Считать по нему — судить по прописке, а не по содержимому.
  //
  // 3 августа на этом встал материал про ЮНЕСКО: полноценная статья
  // с заголовком, лидом, датой и тремя источниками (включая сам UNESCO),
  // владелец ответил «ок» — и получил отказ «это карточка». Ответ при этом
  // съедался, файл оставался заблокированным, сканер слал вопрос заново,
  // и так по кругу, пока владелец не пожаловался.
  //
  // Признак статьи — наличие того, что нужно читателю: заголовок, дата
  // выпуска, источники. Остаточное поле при публикации просто снимается.
  const hasTitle = /^title:\s*\S/m.test(text);
  const hasSources = /^sources:/m.test(text);
  if (/^status:\s*["']?needs-verification/m.test(text) && !(hasTitle && hasSources)) {
    missing.push("status: needs-verification и нет заголовка или источников — это карточка, а не статья");
  }
  if (/^draftAt:\s*\S/m.test(text) && !/^publishedAt:\s*\S/m.test(text)) {
    missing.push("draftAt вместо publishedAt");
  }
  return missing;
}

function promoteToPosts(file, slug) {
  if (file.includes("/content/posts/")) return file; // уже там
  const day = new Date(Date.now() + 5 * 3600 * 1000).toISOString().slice(0, 10);
  const destDir = join(ROOT, "content/posts", day);
  mkdirSync(destDir, { recursive: true });
  const dest = join(destDir, `${slug}.mdx`);
  // Снимаем служебные поля папки-источника: в опубликованной статье
  // им места нет, а `status: needs-verification` вдобавок заставляет
  // проверку считать материал карточкой при следующем касании.
  const text = readFileSync(file, "utf8")
    .replace(/^status:\s*["']?needs-verification["']?\s*\n/m, "")
    .replace(/^recheckAt:.*\n/m, "");
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

// Отзыв уже вышедшего материала.
//
// Это опора всего ночного автомата. Ночью цена молчания выше цены ошибки:
// про отключение воды с утра лучше выпустить сухую заметку по сообщению
// ведомства, чем разбудить владельца и ждать. Но такое право конвейеру можно
// давать только вместе с возможностью отменить — иначе это не «публикуем
// быстро», а «публикуем без тормозов».
//
// Поэтому уведомление о ночной публикации приходит владельцу не как вопрос
// «можно?», а как факт «вышло» — с возможностью ответить «стоп». Ответ
// снимает материал с сайта И удаляет пост из канала.
//
// Ограничение, о котором надо знать: Telegram разрешает боту удалять свои
// сообщения только 48 часов. Позже пост из канала уже не убрать — останется
// снятие с сайта, а в канале при необходимости придётся давать уточнение
// отдельным сообщением. Об этом сказано в тексте уведомления, чтобы
// ограничение не выяснялось в момент, когда оно мешает.
// Публичный адрес статьи. Обязан совпадать с articleHref() из lib/data.ts
// и с articleUrl() из post-to-telegram.mjs: /<язык>/ГГГГ/ММ/ДД/<slug>.
//
// Совпадение здесь не косметика. По этому адресу ищется запись в реестре
// отправленных постов, когда владелец отвечает «стоп» на уже вышедший
// материал: не сойдётся строка — отзыв не найдёт сообщение в канале и
// молча удалит статью только с сайта, оставив пост подписчикам.
//
// День берётся из каталога, в котором лежит файл. Если материал не в дневной
// папке, остаётся старый адрес — он рабочий через страницу-перенаправление.
const SITE_LANG = "ru";

function publicArticleUrl(slug, filePath) {
  const day = String(filePath ?? "").match(/content\/posts\/(\d{4}-\d{2}-\d{2})\//)?.[1];
  if (!day) return `https://leap.uz/article/${slug}`;
  return `https://leap.uz/${SITE_LANG}/${day.replace(/-/g, "/")}/${slug}`;
}

async function revokeFromChannel(slug, articleUrl) {
  const entry = loadPosted(ROOT).get(articleUrl);
  if (!entry?.messageId) return "в канал не отправлялся";

  const channel = process.env.TELEGRAM_CHANNEL;
  if (!channel) return "TELEGRAM_CHANNEL не задан — из канала не удалить";

  try {
    await tg("deleteMessage", { chat_id: channel, message_id: entry.messageId });
  } catch (err) {
    // Чаще всего это «message can't be deleted» — прошло больше 48 часов.
    // Не бросаем: снятие с сайта важнее и должно произойти в любом случае.
    return `из канала удалить не удалось (${err.message})`;
  }
  posted[articleUrl] = { ...entry, revokedAt: new Date().toISOString() };
  writeFileSync(
    statePath,
    JSON.stringify({ ...state, posted, updatedAt: new Date().toISOString() }, null, 2) + "\n",
  );
  return "удалён из канала";
}

async function applyAnswer(item, answer) {
  const file = findArticle(item.slug);
  if (!file) {
    console.error(`[queue] ${item.slug}: файл статьи не найден — применять нечего`);
    return "article-not-found";
  }
  let text = readFileSync(file, "utf8");

  // Материал уже опубликован, а владелец говорит «стоп» — это отзыв, а не
  // отклонение черновика. Разница принципиальная: черновик просто не выходит,
  // а вышедший надо ещё и убрать оттуда, куда он успел попасть.
  if (item.kind === "revocable" && answer.kind === "reject") {
    const slugName = item.slug;
    const url = publicArticleUrl(slugName, file);
    const channelResult = await revokeFromChannel(slugName, url);

    mkdirSync(join(ROOT, "content/rejected"), { recursive: true });
    writeFileSync(join(ROOT, "content/rejected", `${slugName}.md`), text);
    unlinkSync(file);
    console.error(
      `[queue] ${slugName}: ОТОЗВАН владельцем — снят с сайта, ${channelResult}`,
    );
    return `revoked (${channelResult})`;
  }

  // «Ок» и любой другой ответ на уже вышедший материал ничего не меняют:
  // он и так на сайте. Молча закрываем — переспрашивать не о чем.
  if (item.kind === "revocable" && answer.kind === "approve") {
    console.error(`[queue] ${item.slug}: подтверждён владельцем, остаётся как есть`);
    return "confirmed";
  }

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
      // ВАЖНО: это НЕ обычный возврат. Раньше здесь стоял `return
      // "image-rejected"`, и collect() воспринимал его как успех: материал
      // уезжал в resolved, вычёркивался из pending, offset двигался — а сам
      // он оставался с awaitingEditor:true и пустой картинкой, и владельцу
      // об этом никто не говорил. Он присылал фото и считал вопрос закрытым.
      //
      // Так 3 августа встали два материала: Pillow не был установлен в
      // workflow, prepare-image.py отдавал {"error": "Pillow не установлен"}
      // и выходил с 1. Оба ответа фотографией были приняты и потеряны.
      //
      // Теперь бросаем: collect() поймает, НЕ сдвинет offset для этого
      // update и оставит материал в pending — следующий тик попробует снова.
      const detail = (res.stdout || res.stderr || "").trim().slice(0, 300);
      throw new Error(
        `prepare-image отверг фото (exit ${res.status}): ${detail || "вывода нет"}`,
      );
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
    // Проверяем ДО снятия блокировки: «ок» по недоделанному материалу не
    // должен превращаться в публикацию полуфабриката.
    const missing = articleReadiness(text);
    if (missing.length) {
      console.error(
        `[queue] ${item.slug}: «ок» принят, но материал не готов к публикации — ` +
          missing.join("; ") + ". Оставляю на месте и сообщаю владельцу.",
      );
      if (!dryRun) {
        await tg("sendMessage", {
          chat_id: TELEGRAM_EDITOR_CHAT_ID,
          text:
            "<b>Ваше «ок» принято, но материал ещё не статья</b>\n\n" +
            `<b>${item.title}</b>\n\n` +
            `Чего не хватает: ${missing.join("; ")}.\n\n` +
            "Это исследовательская карточка: текст в ней есть, но он не собран " +
            "в материал — нет даты выпуска, а рядом с текстом лежат служебные " +
            "заметки редакции. Опубликуй я её как есть, читатель увидел бы их.\n\n" +
            "Планёрка соберёт из неё статью на ближайшем прогоне и вернёт вам " +
            "на подтверждение. Отвечать сейчас не нужно.",
          parse_mode: "HTML",
          reply_to_message_id: item.messageId,
        }).catch((e) => console.error(`[queue] не смог сообщить владельцу: ${e.message}`));
      }
      return "not-an-article";
    }
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

// injectedUpdates — обновления, пришедшие вебхуком через repository_dispatch.
// Когда они переданы, Telegram не опрашиваем: при установленном вебхуке
// getUpdates отвечает 409 Conflict, это несовместимые режимы.
//
// update_id у вебхучных обновлений настоящий, поэтому offset двигается так же,
// как при опросе, — и остаётся верным, если вебхук когда-нибудь снимут.
async function collect(injectedUpdates = null) {
  const q = loadQueue();
  if (!q.pending.length) {
    console.error("[queue] очередь пуста");
    return;
  }

  let updates;
  if (injectedUpdates) {
    updates = injectedUpdates;
  } else {
    const offset = q.updateOffset || 0;
    try {
      updates = await tg("getUpdates", { offset, timeout: 0, limit: 100 });
    } catch (err) {
      if (/conflict|webhook/i.test(err.message)) {
        // Штатная ситуация после включения вебхука: ответы приходят
        // мгновенно через него, а этот вызов остаётся только страховкой
        // и здесь ему делать нечего. Не ошибка.
        console.error("[queue] вебхук активен — опрос пропущен, ответы идут через него");
        return;
      }
      throw err;
    }
  }
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

// Секреты нужны не всем режимам, и требовать их у всех — дорого.
//
// Так был потерян первый же ответ владельца после включения вебхука.
// Режим spool-update только кладёт полученное обновление в файл и ни разу
// не обращается к Telegram, поэтому секретов ему в workflow не передавали —
// по принципу наименьших прав. Но проверка стояла на верхнем уровне модуля,
// до разбора режима, и роняла процесс с кодом 1 ещё до записи в спул.
//
// Внешне это выглядело как «бот молчит»: сообщение владельца доходило
// до GitHub, запуск стартовал и падал на первом шаге, а сам ответ пропадал
// безвозвратно — Telegram уже получил от воркера подтверждение доставки
// и повторять не станет. Шесть ответов подряд ушли в никуда.
const MODES_NEEDING_TELEGRAM = new Set([
  "push",
  "collect",
  "remind",
  "scan-pending",
  "apply-update",
]);

if (!dryRun && MODES_NEEDING_TELEGRAM.has(mode) && (!TELEGRAM_BOT_TOKEN || !TELEGRAM_EDITOR_CHAT_ID)) {
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

// scan-pending — вызывается из workflow до collect. Находит материалы,
// которые планёрка положила в content/needs-verification/ или content/rework/
// с awaitingEditor:true и pendingEditorQuestion в frontmatter, и пушит их
// в TG. Планёрка сама этого сделать не может — у неё нет секретов TG.
//
// pendingEditorQuestion во frontmatter — это структура, которую пишет
// планёрка:
//   pendingEditorQuestion:
//     reason: "low-confidence" | "no-image" | "crop-risky" | ...
//     question: "текст вопроса владельцу"
//     image: "public/images/posts/2026-08/<slug>-01.jpg"   # опционально
//
// После успешного пуша поле pendingEditorQuestion очищается — материал
// теперь в queue.pending, следующий scan его не тронет.

import { parseFrontmatter } from "../lib/frontmatter.mjs";

// Собрать все .mdx-файлы из директории (рекурсивно). Нужен потому что
// content/posts/ имеет вложенные папки по дням: content/posts/2026-08-03/*.mdx.
function collectMdxFiles(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, name.name);
    if (name.isDirectory()) {
      out.push(...collectMdxFiles(full));
    } else if (name.isFile() && name.name.endsWith(".mdx")) {
      out.push(full);
    }
  }
  return out;
}

async function scanPending() {
  const q = loadQueue();
  // Три места ищем:
  // - content/needs-verification/ — где планёрка кладёт материалы <70% confidence
  // - content/rework/ — материалы на переделке по комментарию
  // - content/posts/<день>/ — safety net. Bild-агент по прошлой спецификации
  //   ставил awaitingEditor:true прямо здесь и звал editor-queue.mjs push, но
  //   push из песочницы не работает (нет TG-секретов). Без этого сканирования
  //   такие материалы застревали навсегда — обнаружено в планёрке 03.08 02:35,
  //   4 материала (вода в Ташкенте, школьная безопасность, Иран-Оман, Хамас)
  //   висели без вопроса владельцу. Теперь ловим и здесь тоже.
  const dirs = [
    join(ROOT, "content/needs-verification"),
    join(ROOT, "content/rework"),
    join(ROOT, "content/posts"),
  ];
  const alreadyInQueue = new Set(q.pending.map((x) => x.slug));
  // Материалы, о которых владельца уже спрашивали и он уже ответил.
  // Их нельзя переспрашивать типовым вопросом — см. ветку ниже.
  const askedBefore = new Set((q.resolved ?? []).map((x) => x.slug));

  let pushed = 0;
  let skipped = 0;

  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    // recursive scan для content/posts/, обычный readdir для двух других
    const files =
      dir.endsWith("/posts") || dir.endsWith("\\posts")
        ? collectMdxFiles(dir)
        : readdirSync(dir)
            .filter((n) => n.endsWith(".mdx"))
            .map((n) => join(dir, n));

    for (const file of files) {
      const name = file.split(/[/\\]/).pop();
      const slug = name.replace(/\.mdx$/, "");
      if (alreadyInQueue.has(slug)) continue;
      const raw = readFileSync(file, "utf8");
      const fm = parseFrontmatter(raw);

      // Уведомление о материале, который УЖЕ вышел без подтверждения
      // (ночная полоса ЧП). Это не вопрос, а факт с правом отзыва, поэтому
      // проверяется раньше awaitingEditor: такой материал по определению
      // не заблокирован, иначе он бы не вышел.
      const notice = fm.publishedNotice;
      if (notice && typeof notice === "object") {
        const title = fm.title || slug;
        const lines = [
          "<b>ВЫШЛО БЕЗ ПОДТВЕРЖДЕНИЯ</b>",
          "",
          `<b>${title}</b>`,
          "",
          notice.why ? String(notice.why) : "Материал прошёл полосу срочных публикаций.",
          "",
          `Источник: ${notice.source ?? "—"}`,
          `На сайте: ${publicArticleUrl(slug, file)}`,
          "",
          "<i>Отвечать не нужно, материал уже опубликован. Если он не должен был "
            + "выйти — ответьте «стоп» реплаем: сниму с сайта и удалю пост из канала. "
            + "Удаление из канала работает 48 часов, дальше только снятие с сайта.</i>",
        ];
        if (dryRun) {
          console.log("=".repeat(60));
          console.log(lines.join("\n").replace(/<[^>]+>/g, ""));
          continue;
        }
        try {
          const msg = await tg("sendMessage", {
            chat_id: TELEGRAM_EDITOR_CHAT_ID,
            text: lines.join("\n"),
            parse_mode: "HTML",
            disable_web_page_preview: true,
          });
          q.pending.push({
            slug,
            title,
            kind: "revocable",
            reason: notice.reason ?? "night-auto",
            messageId: msg.message_id,
            askedAt: new Date().toISOString(),
          });
          saveQueue(q);
          alreadyInQueue.add(slug);
          // Снимаем метку — уведомление отправлено, повторять не нужно.
          writeFileSync(file, raw.replace(/^publishedNotice:\n(?:  .*\n)+/m, ""));
          pushed++;
        } catch (err) {
          console.error(`[queue:scan] ${slug}: уведомление не ушло — ${err.message}`);
        }
        continue;
      }

      // Не наш случай: не ждёт редактора
      if (!(fm.awaitingEditor === true || fm.awaitingEditor === "true")) {
        continue;
      }
      const q0 = fm.pendingEditorQuestion;

      // Материал в content/rework/ показываем владельцу ТОЛЬКО когда
      // планёрка явно поставила pendingEditorQuestion — то есть переделала
      // его и снова спрашивает.
      //
      // Разграничитель именно этот, и это важно. Сначала здесь стояло
      // «пропускать всё, у чего есть editorComment» — чтобы не спрашивать
      // владельца о том, что он уже поручил. Утром 3 августа ему ушли два
      // вопроса «ок или стоп» по материалам, где его же поручения не были
      // выполнены: по одному он просил сходить за апдейтом в канал
      // хокимията, по другому — подобрать фото. Ответ «ок» опубликовал бы
      // ровно то, что он просил доделать.
      //
      // Но editorComment остаётся во frontmatter и ПОСЛЕ переделки — он
      // и есть техзадание, по которому её делали. Значит готовый материал
      // попадал под то же правило и не доходил до владельца никогда:
      // планёрке пришлось перекладывать файлы руками. Лечение оказалось
      // хуже болезни — вместо лишнего вопроса получился тупик.
      //
      // pendingEditorQuestion от editorComment отличается тем, что его
      // ставит планёрка в момент «сделано, показываю». Пока его нет —
      // материал ждёт редакцию, а не человека.
      if (file.includes("/content/rework/") && !(q0 && typeof q0 === "object")) {
        console.error(
          `[queue:scan] ${slug}: на переделке, планёрка ещё не вернула его владельцу. Пропускаю.`,
        );
        skipped++;
        continue;
      }

      const q_ = q0;

      let reason, question, title, imagePath;
      title = fm.title || slug;
      imagePath = fm.image?.url?.replace(/^\/+/, "") || null;

      if (q_ && typeof q_ === "object") {
        // Нормальный случай — планёрка положила pendingEditorQuestion
        reason = q_.reason || "source-doubt";
        question = q_.question || "";
        imagePath = q_.image || imagePath;
      } else if (askedBefore.has(slug)) {
        // ПРО ЭТОТ МАТЕРИАЛ УЖЕ СПРАШИВАЛИ, И ОТВЕТ ПОЛУЧЕН.
        //
        // Повторный generic-вопрос здесь — не забота, а спам, и владелец
        // от него бессилен: он отвечает «ок», ответ применяется, а материал
        // всё равно остаётся заблокированным по другой причине — и вопрос
        // приходит снова. 3 августа так закольцевался материал про ЮНЕСКО:
        // владелец пробовал и «ок», и «стоп», сообщение возвращалось.
        //
        // Если материал завис после ответа — это работа для редакции
        // (планёрка доведёт его до состояния статьи), а не повод дёргать
        // человека по кругу тем же вопросом. Новый вопрос допустим только
        // явный: планёрка ставит pendingEditorQuestion, когда ей правда
        // есть что спросить.
        console.error(
          `[queue:scan] ${slug}: вопрос уже задавался и ответ получен — не переспрашиваю. ` +
            `Материал ждёт редакцию, а не владельца.`,
        );
        skipped++;
        continue;
      } else {
        // Legacy: awaitingEditor:true без pendingEditorQuestion. Такое
        // случается со статьями, положенными в очередь до внедрения
        // scan-pending (примерно до 03.08.2026). Шлём generic-вопрос,
        // чтобы разгрести — иначе они бы висели бесконечно.
        reason = "source-doubt";
        question =
          "Этот материал застрял в очереди до внедрения бота-очереди. " +
          "Что с ним делать: «ок» → опубликовать, «стоп» → снять, " +
          "любой другой текст → переделать по комментарию.";
        console.error(
          `[queue:scan] ${slug}: legacy stuck (нет pendingEditorQuestion) — шлю generic вопрос`,
        );
      }
      // Приводим к формату push()
      const args = [
        `--slug=${slug}`,
        `--title=${title}`,
        `--reason=${reason}`,
        `--question=${question}`,
      ];
      if (imagePath) args.push(`--image=${imagePath}`);

      // Вместо форка процесса выполняем push() inline через process.argv:
      // сохраняем оригинал, подменяем на нужные аргументы, вызываем push()
      const origArgv = process.argv;
      process.argv = ["node", "editor-queue.mjs", "push", ...args];
      try {
        await push();
        pushed++;
        // В DRY_RUN не трогаем файлы — иначе dry-run молча уничтожает
        // pendingEditorQuestion из проверяемых материалов (обнаружено
        // на живом прогоне 03.08: dry-run стёр поле у 4 материалов).
        if (!dryRun) {
          // Убираем pendingEditorQuestion из frontmatter, иначе следующий scan
          // отправит вопрос повторно (queue.pending уже содержит запись, поэтому
          // alreadyInQueue его отфильтрует, но это дублирующая защита — если
          // queue.json будет удалён/сломан, поле в файле не даст ошибке размножиться).
          const cleaned = raw.replace(
            /^pendingEditorQuestion:\n(?:  .*\n)+/m,
            "",
          );
          writeFileSync(file, cleaned);
        }
      } catch (err) {
        console.error(`[queue:scan] ${slug}: push упал — ${err.message}`);
      } finally {
        process.argv = origArgv;
      }
    }
  }

  console.error(
    `[queue:scan] pushed=${pushed}, skipped=${skipped}, already in queue=${alreadyInQueue.size}`,
  );
}

// apply-update — вход для вебхука. Вызывается workflow'ом по
// repository_dispatch, обновление приходит в TELEGRAM_UPDATE_JSON.
//
// ПОЧЕМУ ЧЕРЕЗ ФАЙЛОВЫЙ СПУЛ, А НЕ НАПРЯМУЮ. Воркер отвечает Telegram «ок»
// в момент, когда GitHub принял dispatch, — то есть задолго до того, как
// ответ владельца реально применён. Если после этого workflow упадёт
// (не установился Pillow, конфликт при пуше, что угодно), Telegram повторять
// уже не будет: для него всё доставлено. Ответ пропал бы молча — ровно тот
// класс отказов, из-за которого 3 августа потерялись два присланных фото.
//
// Поэтому обновление СНАЧАЛА ложится файлом в content/state/tg-spool/ и
// коммитится, и только потом применяется. Применилось — файл удаляется.
// Не применилось — остаётся, и следующий запуск (хоть по вебхуку, хоть
// по крону) возьмёт его снова.
const SPOOL_DIR = join(ROOT, "content/state/tg-spool");

// spool-update — ТОЛЬКО положить обновление в спул, ничего не применяя.
//
// Вынесено в отдельный шаг, чтобы между «получили» и «применили» встал
// коммит. Раньше и запись, и применение шли одним шагом, а коммит был
// в конце джоба: если джоб падал или его отменяли на любом этапе, файл
// спула исчезал вместе с рабочим каталогом — ровно та потеря, от которой
// спул и заводился.
//
// Имя файла — update_id, оно уникально. Два параллельных запуска пишут
// разные файлы и при rebase не конфликтуют никогда.
function spoolUpdate() {
  const raw = process.env.TELEGRAM_UPDATE_JSON;
  if (!raw) {
    console.error("[queue] TELEGRAM_UPDATE_JSON пуст — класть в спул нечего");
    return;
  }
  mkdirSync(SPOOL_DIR, { recursive: true });
  try {
    const parsed = JSON.parse(raw);
    const update = parsed.update ?? parsed;
    const id = update?.update_id ?? `noid-${Date.now()}`;
    writeFileSync(join(SPOOL_DIR, `${id}.json`), JSON.stringify(update, null, 2) + "\n");
    console.error(`[queue] обновление ${id} положено в спул`);
  } catch (err) {
    console.error(`[queue] TELEGRAM_UPDATE_JSON не разбирается: ${err.message}`);
  }
}

async function applyUpdate() {
  mkdirSync(SPOOL_DIR, { recursive: true });

  const files = existsSync(SPOOL_DIR)
    ? readdirSync(SPOOL_DIR).filter((n) => n.endsWith(".json")).sort()
    : [];
  if (!files.length) {
    console.error("[queue] спул пуст");
    return;
  }

  let done = 0;
  let stuck = 0;
  for (const name of files) {
    const path = join(SPOOL_DIR, name);
    let update;
    try {
      update = JSON.parse(readFileSync(path, "utf8"));
    } catch {
      console.error(`[queue] ${name}: не читается как JSON — удаляю, чинить нечего`);
      unlinkSync(path);
      continue;
    }
    try {
      await collect([update]);
      unlinkSync(path);
      done++;
    } catch (err) {
      // Оставляем в спуле: следующий запуск попробует снова.
      console.error(`[queue] ${name}: применить не удалось, остаётся в спуле — ${err.message}`);
      stuck++;
    }
  }
  console.error(`[queue] спул: применено ${done}, осталось ${stuck}`);
}

await (mode === "push"
  ? push()
  : mode === "collect"
    ? collect()
    : mode === "scan-pending"
      ? scanPending()
      : mode === "apply-update"
        ? applyUpdate()
        : mode === "spool-update"
          ? spoolUpdate()
          : remind());
