#!/usr/bin/env node
// Сравнение тематического состава: что публикуют они и что мы.
//
// Прямо сравнить рубрики нельзя. У конкурентов таксономия географическая
// («O‘zbekiston», «Jahon»), у нас тематическая (society, economy, politics), а
// у Repost и Qalampir тематики нет вовсе. Поэтому к обоим корпусам
// применяется один и тот же классификатор по ключевым словам заголовка — так
// сравниваются одинаково размеченные тексты, а не чужие ярлыки.
//
// Классификатор грубый и это осознанно: он должен одинаково ошибаться на
// обеих сторонах. Точность отдельной метки тут не важна, важна сопоставимость.
//
// CLI: node research/analyze-topic-mix.mjs
// Выход: research/data/topic-mix.json

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = join(HERE, "raw");
const DATA_DIR = join(HERE, "data");
const ROOT = dirname(HERE);

// Порядок важен: первое совпадение выигрывает, поэтому узкие темы идут выше
// широких. «Курс доллара» должен попасть в деньги, а не в общество.
const TOPICS = [
  ["спорт", /футбол|futbol|чемпион|chempion|матч|match|олимп|olimp|сборн|terma jamoa|турнир|turnir|гол\b|goal|тренер|murabbiy|клуб|klub|медал|medal|бокс|boks|дзюдо|judo|кураш|kurash|теннис|tennis/i],
  ["деньги и тарифы", /тариф|tarif|курс валют|valyuta kursi|инфляц|inflyatsiya|ставка|stavka|налог|soliq|пошлин|bojxona|цена|narx|подорожа|qimmat|субсиди|subsidiya|пенси|pensiya|зарплат|maosh|кредит|kredit|ипотек|ipoteka/i],
  ["ЖКХ и инфраструктура", /электричеств|elektr|газ\b|gaz\b|водоснабж|suv ta|отключ|o[‘']?chir|отоплен|isitish|дорог|yo[‘']?l|мост|ko[‘']?prik|метро|metro|автобус|avtobus|ремонт|ta[’']?mir|стро[ий]|quril/i],
  ["происшествия", /погиб|halok|ДТП|YTH|пожар|yong[‘']?in|взрыв|portlash|задержан|qo[‘']?lga olin|уголовн|jinoyat|суд\b|sud\b|приговор|hukm|мошенн|firibgar|коррупц|korrupsiya|взятк|pora|авари|avariya|утонул|cho[‘']?kib/i],
  ["власть и законы", /президент|prezident|министр|vazir|хоким|hokim|постановлен|qaror|указ|farmon|закон|qonun|парламент|parlament|сенат|senat|назначен|tayinlan|отставк|iste[’']?fo|реформ|islohot/i],
  ["международное", /сша|aqsh|росси|rossiya|китай|xitoy|украин|ukraina|европ|yevropa|турци|turkiya|казахстан|qozog|иран|eron|израил|isroil|афган|afg[‘']?on|ООН|BMT|санкц|sanksiya|саммит|sammit|визит|tashrif/i],
  ["технологии и IT", /интернет|internet|цифров|raqamli|IT-|стартап|startap|искусственн|sun[’']?iy intellekt|ИИ\b|AI\b|приложен|ilova|сайт|платформ|platforma|телеком|telekom|мобильн|mobil/i],
  ["образование и наука", /школ|maktab|университет|universitet|студент|talaba|учител|o[‘']?qituvchi|экзамен|imtihon|поступл|qabul|наук|fan\b|исследован|tadqiqot/i],
  ["здоровье", /больниц|shifoxona|врач|shifokor|болезн|kasallik|вакцин|emlash|лекарств|dori|здоров|salomatlik|эпидеми|epidemiya|covid|минздрав/i],
  ["погода и экология", /погод|ob-havo|дожд|yomg[‘']?ir|жар[аы]|issiq|мороз|sovuq|снег|qor\b|ветер|shamol|эколог|ekolog|загрязн|ifloslanish|засух|qurg[‘']?oq|земletrяс|zilzila/i],
  ["культура и шоу", /фильм|film|кино|kino|концерт|konsert|певец|xonanda|актёр|aktyor|фестивал|festival|выставк|ko[‘']?rgazma|книг|kitob|театр|teatr|блогер|bloger/i],
  ["бизнес и компании", /компани|kompaniya|завод|zavod|инвестиц|investitsiya|экспорт|eksport|импорт|import|банк|bank|бирж|birja|предприятие|korxona|производств|ishlab chiqarish/i],
  ["миграция и труд", /мигрант|migrant|трудов|mehnat|рабоч[ие]|ishchi|занятост|bandlik|безработ|ishsiz|виз[аы]|viza|патент|гражданств|fuqarolik/i],
];

const classify = (title) => {
  const t = title ?? "";
  for (const [name, re] of TOPICS) if (re.test(t)) return name;
  return "прочее";
};

const readJsonl = (p) =>
  existsSync(p)
    ? readFileSync(p, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l))
    : [];

// ── их корпус ──────────────────────────────────────────────────────────────

const SAMPLE_DAYS = new Set();
for (const monday of ["2026-05-11", "2026-06-15", "2026-07-13"]) {
  const d = new Date(`${monday}T00:00:00Z`);
  for (let i = 0; i < 7; i += 1) {
    SAMPLE_DAYS.add(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
}

const theirs = new Map();
for (const outlet of ["kun", "gazeta", "spot", "repost", "daryo", "uznews"]) {
  const rows = readJsonl(join(RAW_DIR, `articles-${outlet}.jsonl`)).filter((r) => {
    const day = (r.publishedAt ?? r.date ?? "").slice(0, 10);
    // Общее для всех окно — три первые выборочные недели: только они собраны
    // у всех шести изданий, и сравнивать надо на одинаковом периоде.
    return day && SAMPLE_DAYS.has(day) && r.title;
  });
  if (!rows.length) continue;
  const counts = new Map();
  for (const r of rows) {
    const topic = classify(r.title);
    counts.set(topic, (counts.get(topic) ?? 0) + 1);
  }
  theirs.set(outlet, { total: rows.length, counts });
}

// ── наш корпус ─────────────────────────────────────────────────────────────

// Каталог наших материалов задаётся флагом: рабочая ветка исследования
// отстаёт от main на всё время работы, и считать по ней — значит занижать
// собственный выпуск. На отставшей ветке выходило 24 материала в день против
// фактических 70.
const POSTS_DIR = process.argv.find((a) => a.startsWith("--posts="))?.slice(8);

function ourArticles() {
  const dir = POSTS_DIR ?? join(ROOT, "content/posts");
  const out = [];
  for (const day of readdirSync(dir)) {
    const dayPath = join(dir, day);
    if (!statSync(dayPath).isDirectory()) continue;
    for (const file of readdirSync(dayPath)) {
      // Переводы не считаем: это тот же материал, а не второй.
      if (!file.endsWith(".mdx") || /\.(uz|en)\.mdx$/.test(file)) continue;
      const body = readFileSync(join(dayPath, file), "utf8");
      const title = body.match(/^title:\s*["']?(.+?)["']?\s*$/m)?.[1] ?? null;
      const category = body.match(/^category:\s*["']?(\w+)["']?\s*$/m)?.[1] ?? null;
      // Дни запуска конвейера (1-2 августа, 18 и 9 материалов) в среднее не
      // берём: это разгон, а не режим работы.
      if (title && day >= "2026-08-03") out.push({ title, category, day });
    }
  }
  return out;
}

const ours = ourArticles();
const ourCounts = new Map();
for (const a of ours) {
  const topic = classify(a.title);
  ourCounts.set(topic, (ourCounts.get(topic) ?? 0) + 1);
}
const ourDays = new Set(ours.map((a) => a.day)).size;

// ── вывод ──────────────────────────────────────────────────────────────────

const topics = TOPICS.map(([n]) => n).concat("прочее");
const share = (counts, total) => (t) => ((counts.get(t) ?? 0) / total) * 100;

console.log("ТЕМАТИЧЕСКИЙ СОСТАВ ЛЕНТЫ, % материалов\n");
const outlets = [...theirs.keys()];
console.log("тема".padEnd(24) + outlets.map((o) => o.slice(0, 7).padStart(8)).join("") + "     их медиана" + "        LEAP" + "   расхождение");

const rows = [];
for (const topic of topics) {
  const shares = outlets.map((o) => share(theirs.get(o).counts, theirs.get(o).total)(topic));
  const sorted = [...shares].sort((a, b) => a - b);
  const theirMedian = sorted[Math.floor(sorted.length / 2)];
  const ourShare = share(ourCounts, ours.length)(topic);
  const diff = ourShare - theirMedian;
  rows.push({ topic, shares, theirMedian, ourShare, diff });
  console.log(
    topic.padEnd(24) +
      shares.map((s) => `${s.toFixed(1)}`.padStart(8)).join("") +
      `${theirMedian.toFixed(1)}`.padStart(15) +
      `${ourShare.toFixed(1)}`.padStart(12) +
      `${diff > 0 ? "+" : ""}${diff.toFixed(1)}`.padStart(15),
  );
}

console.log("\n\nЧЕГО У НАС МЕНЬШЕ ВСЕГО ОТНОСИТЕЛЬНО НИХ\n");
for (const r of [...rows].sort((a, b) => a.diff - b.diff).slice(0, 6)) {
  const factor = r.ourShare > 0 ? (r.theirMedian / r.ourShare).toFixed(1) : "∞";
  console.log(
    `  ${r.topic.padEnd(24)} у них ${r.theirMedian.toFixed(1)}%, у нас ${r.ourShare.toFixed(1)}% — меньше в ${factor} раза`,
  );
}

console.log("\nЧЕГО У НАС БОЛЬШЕ\n");
for (const r of [...rows].sort((a, b) => b.diff - a.diff).slice(0, 4)) {
  console.log(`  ${r.topic.padEnd(24)} у них ${r.theirMedian.toFixed(1)}%, у нас ${r.ourShare.toFixed(1)}%`);
}

console.log("\n\nОБЪЁМ\n");
console.log(`  наш поток: ${ours.length} материалов за ${ourDays} дней = ${(ours.length / ourDays).toFixed(1)}/день`);
for (const [o, d] of theirs) {
  console.log(`  ${o.padEnd(10)} ${d.total} за 21 день = ${(d.total / 21).toFixed(1)}/день`);
}

mkdirSync(DATA_DIR, { recursive: true });
writeFileSync(
  join(DATA_DIR, "topic-mix.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), outlets, rows, ourTotal: ours.length, ourDays }, null, 2),
);
console.log(`\n→ ${join(DATA_DIR, "topic-mix.json")}`);
