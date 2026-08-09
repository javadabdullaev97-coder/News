// Разбор корпуса вышедших материалов: словарь тегов и индекс тем.
//
// Зачем модуль появился. Два потребителя каждый прогон делали одну и ту же
// работу заново и оба делали её плохо:
//
//   1. seo-агент по инструкции собирал «словарь тегов» командой
//      `grep -h '^  - ' content/posts/**/*.mdx | sort -u`. Замер 09.08.2026:
//      353 КБ выдачи, 3480 уникальных строк — и НИ ОДНОГО тега среди них.
//      Теги лежат во frontmatter инлайновым массивом (`tags: ["a", "b"]`),
//      а под `^  - ` попадают строки блочного списка `sources:` — то есть
//      4056 строк вида `  - name: "…"`. Агент читал имена источников,
//      считая их тегами, на каждой статье. Правило «предпочитай
//      существующие теги» при таком входе не могло работать никогда:
//      685 уникальных тегов на 373 статьи — почти по тегу на две статьи.
//
//   2. Оркестратор по правилу №2 спецификации сверял тему с content/posts
//      «за последние три дня» вручную — это ~420 файлов, и делалось это
//      глазами, потому что скрипта не было.
//
// Обе задачи — детерминированный разбор frontmatter. Здесь он один на всех.
//
// ПОЧЕМУ СВОЙ ЧИТАТЕЛЬ FRONTMATTER, А НЕ lib/frontmatter.mjs. Тот работает
// поверх пакета `yaml` из devDependencies, а планёрка живёт в свежем клоне
// без npm install — ровно как preflight.mjs и inbox-select.mjs. Поэтому
// здесь узкий читатель без зависимостей, покрывающий ту форму frontmatter,
// которую пишут наши же агенты, и ничего сверх неё.
//
// Расхождение этого читателя с настоящим YAML — реальный риск, и он закрыт
// не обещанием, а тестом: scripts/selftest-posts-index.mjs прогоняет оба
// парсера по всем живым статьям и падает на первом же несовпадении.
// Тест запускается там, где `yaml` доступен (CI после npm install).

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { ROOT, tashkentDay } from "./inbox-core.mjs";

/** Языковые версии в индекс не идут: тема у них та же, что у русской. */
const LANG_SUFFIX = /\.(uz|en)\.mdx$/;

const FM_MATCH = /^---\n([\s\S]*?)\n---/;

/**
 * Снять кавычки и экранирование с YAML-скаляра.
 *
 * Наши агенты пишут строки в двойных кавычках; одиночные и голые скаляры
 * встречаются в старых материалах. Многострочные скаляры (| и >) во
 * frontmatter статей не используются — если появятся, их поймает селф-тест.
 */
function scalar(raw) {
  const s = String(raw).trim();
  if (!s) return "";
  if (s.startsWith('"') && s.endsWith('"') && s.length > 1) {
    return s.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  if (s.startsWith("'") && s.endsWith("'") && s.length > 1) {
    return s.slice(1, -1).replace(/''/g, "'");
  }
  return s;
}

/**
 * Инлайновый массив: tags: ["a", "b"]. Разбираем посимвольно, а не
 * через split(","), потому что запятая внутри тега — законная
 * («Ташкент, центр» в старых материалах встречается).
 */
function inlineArray(raw) {
  const s = String(raw).trim();
  if (!s.startsWith("[")) return null;
  const out = [];
  let cur = "";
  let quote = null;
  for (let i = 1; i < s.length; i++) {
    const ch = s[i];
    if (quote) {
      if (ch === "\\" && quote === '"') {
        cur += s[++i] ?? "";
      } else if (ch === quote) {
        quote = null;
      } else {
        cur += ch;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === "," || ch === "]") {
      const v = cur.trim();
      if (v) out.push(v);
      cur = "";
      if (ch === "]") break;
      continue;
    }
    cur += ch;
  }
  return out;
}

/**
 * Читает из frontmatter ровно те поля, которыми пользуются словарь тегов
 * и сверка дублей: title, category, tags, publishedAt, queuedAt, slug,
 * awaitingEditor, nightAuto и список url из блочного sources.
 *
 * Всё остальное намеренно игнорируется: чем уже контракт, тем меньше
 * поводов разойтись с настоящим YAML.
 */
export function readPostMeta(text) {
  const m = text.match(FM_MATCH);
  if (!m) return null;
  const meta = { tags: [], links: [] };
  let inSources = false;

  for (const line of m[1].split("\n")) {
    // Вложенные строки блока sources: `  - name:` / `    url:`.
    if (inSources) {
      const url = line.match(/^\s+url:\s*(.+?)\s*$/);
      if (url) {
        const v = scalar(url[1]);
        if (v) meta.links.push(v);
        continue;
      }
      // Любой ключ нулевого уровня закрывает блок.
      if (/^\S/.test(line)) inSources = false;
      else continue;
    }

    const kv = line.match(/^([a-zA-Z][a-zA-Z0-9_]*):\s*(.*)$/);
    if (!kv) continue;
    const [, key, rest] = kv;

    if (key === "sources") {
      inSources = true;
      continue;
    }
    if (key === "tags") {
      meta.tags = inlineArray(rest) ?? [];
      continue;
    }
    if (
      key === "title" ||
      key === "category" ||
      key === "publishedAt" ||
      key === "queuedAt" ||
      key === "slug"
    ) {
      meta[key] = scalar(rest);
      continue;
    }
    if (key === "awaitingEditor" || key === "nightAuto") {
      meta[key] = scalar(rest) === "true";
    }
  }
  return meta;
}

/** Все .mdx в каталоге и его подкаталогах, кроме языковых версий. */
function walkMdx(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    if (statSync(abs).isDirectory()) {
      walkMdx(abs, out);
      continue;
    }
    if (!name.endsWith(".mdx") || LANG_SUFFIX.test(name)) continue;
    out.push(abs);
  }
  return out;
}

function slugOf(file) {
  return file.replace(/^.*\//, "").replace(/\.mdx$/, "");
}

/**
 * Один проход по корпусу. Возвращает записи, из которых строятся оба
 * артефакта: и словарь тегов, и индекс тем.
 */
export function scanPosts(root = ROOT) {
  const records = [];
  const zones = [
    ["posts", join(root, "content/posts")],
    ["queue", join(root, "content/queue")],
    ["pending", join(root, "content/needs-verification")],
    ["rejected", join(root, "content/rejected")],
  ];

  for (const [zone, dir] of zones) {
    for (const abs of walkMdx(dir)) {
      const meta = readPostMeta(readFileSync(abs, "utf8"));
      if (!meta) continue;
      const rel = abs.slice(root.length + 1);
      // День берём из пути (content/posts/YYYY-MM-DD/...), а где его нет —
      // из publishedAt/queuedAt. У очереди и карточек каталога по дню нет.
      const fromPath = rel.match(/(\d{4}-\d{2}-\d{2})/);
      const day =
        fromPath?.[1] ??
        (meta.publishedAt ?? meta.queuedAt ?? "").slice(0, 10) ??
        "";
      records.push({
        zone,
        slug: meta.slug || slugOf(abs),
        path: rel,
        day,
        title: meta.title ?? "",
        category: meta.category ?? "",
        tags: meta.tags,
        links: meta.links,
        awaitingEditor: meta.awaitingEditor === true,
      });
    }
  }
  return records;
}

/**
 * Словарь тегов для seo. Порог по частоте, а не «топ-N»: теги с одним
 * употреблением — это и есть та россыпь, которую правило «предпочитай
 * существующие» должно останавливать, и подсовывать её обратно агенту
 * значит воспроизводить проблему.
 *
 * Замер на корпусе 09.08.2026 (373 статьи, 685 тегов, 1696 употреблений):
 *   >=2 — 256 тегов, покрытие 74,7%
 *   >=3 — 162 тега,  покрытие 63,6%
 * Порог 2 оставляет агенту рабочий словарь на ~6 КБ вместо 353 КБ мусора.
 */
export function buildTagVocabulary(records, { minCount = 2 } = {}) {
  const tags = new Map();
  const categories = new Map();
  let posts = 0;
  let uses = 0;

  for (const r of records) {
    if (r.zone !== "posts") continue;
    posts++;
    if (r.category) categories.set(r.category, (categories.get(r.category) ?? 0) + 1);
    for (const t of r.tags) {
      tags.set(t, (tags.get(t) ?? 0) + 1);
      uses++;
    }
  }

  const all = [...tags].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ru"));
  const kept = all.filter(([, n]) => n >= minCount);
  const covered = kept.reduce((s, [, n]) => s + n, 0);

  return {
    postsScanned: posts,
    tagsTotal: all.length,
    minCount,
    coverage: uses ? Number((covered / uses).toFixed(3)) : 0,
    categories: [...categories]
      .sort((a, b) => b[1] - a[1])
      .map(([name, n]) => ({ name, n })),
    tags: kept.map(([t, n]) => ({ t, n })),
  };
}

/**
 * Нормализация заголовка для сравнения тем. Совпадение темы — тот же
 * субъект и то же событие, а не дословный заголовок (правило №2
 * спецификации), поэтому сравниваем множества значимых слов, а не строки.
 */
const STOP = new Set(
  ("и в во не что он на я с со как а то все она так его но да ты к у же вы за бы " +
   "по только ее мне было вот от меня еще нет о из ему теперь когда даже ну вдруг " +
   "ли если уже или ни быть был него до вас нибудь опять уж вам ведь там потом себя " +
   "ничего ей может они тут где есть надо ней для мы тебя их чем была сам чтоб без " +
   "будто чего раз тоже себе под будет ж тогда кто этот того потому этого какой " +
   "совсем ним здесь этом один почти мой тем чтобы нее сейчас были куда зачем всех " +
   "никогда можно при наконец два об другой хоть после над больше тот через эти нас " +
   "про всего них какая много разве три эту моя впрочем свою этой перед иногда лучше " +
   "чуть том нельзя такой им более всегда конечно всю между").split(" ")
);

/**
 * Обрезка до основы. Русский флективный: «Наманганской», «Намангане» и
 * «Наманган» — одно слово, а как строки они разные, и сравнение целых слов
 * на этом ломается. Боевой пример из селф-теста: два заголовка про один
 * и тот же мост давали 0.27 при пороге 0.45, то есть дубль проходил.
 *
 * Шесть символов — компромисс по замеру на живом корпусе: короче начинают
 * склеиваться несвязанные слова, длиннее не снимает падежи многосложных
 * названий. Полноценный стеммер сюда не тянем: он нужен точным, а нам
 * достаточно грубого — решение всё равно принимает оркестратор, скрипт
 * только показывает совпадения.
 */
const STEM_LEN = 6;

export function titleTokens(title) {
  const words = String(title)
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[«»"'`(),.:;!?—–\-\/\\[\]]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOP.has(w));
  return new Set(words.map((w) => (w.length > STEM_LEN ? w.slice(0, STEM_LEN) : w)));
}

/** Доля общих значимых слов (Жаккар) — 0..1. */
export function titleOverlap(a, b) {
  const A = a instanceof Set ? a : titleTokens(a);
  const B = b instanceof Set ? b : titleTokens(b);
  if (!A.size || !B.size) return 0;
  let common = 0;
  for (const w of A) if (B.has(w)) common++;
  return common / (A.size + B.size - common);
}

/**
 * Индекс тем для сверки дублей. Окно по умолчанию — трое суток, ровно как
 * требует правило №2; очередь, карточки и отклонённые входят целиком,
 * независимо от возраста: они малы и живут ровно до решения.
 */
export function buildPublishedIndex(records, { days = 3, at = Date.now() } = {}) {
  const horizon = tashkentDay(at - days * 24 * 3600 * 1000);
  const inWindow = (r) => r.zone !== "posts" || (r.day && r.day >= horizon);

  return {
    windowDays: days,
    since: horizon,
    postsScanned: records.filter((r) => r.zone === "posts").length,
    topics: records.filter(inWindow).map((r) => ({
      zone: r.zone,
      slug: r.slug,
      path: r.path,
      day: r.day,
      title: r.title,
      category: r.category,
      links: r.links,
      ...(r.awaitingEditor ? { awaitingEditor: true } : {}),
    })),
  };
}
