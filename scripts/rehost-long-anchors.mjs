#!/usr/bin/env node
// Переносит ссылку с длинной подписи на её смысловое ядро — в переводах.
//
// Русские версии правились вручную: там подпись длиной 70–150 знаков затягивала
// в ссылку целое придаточное или перечень цифр. Переводы должны повторять ту же
// разметку, иначе версии расходятся, но подобрать в них ядро автоматом нельзя —
// у английского и узбекского другой порядок слов.
//
// Поэтому здесь таблица: файл, URL и способ выбрать ядро подписи.
//
//   first:N   — оставить первые N слов подписи
//   last:N    — оставить последние N слов
//   /regex/   — оставить кусок, совпавший с выражением
//
// Слова остаются на месте и в том же порядке, меняются только границы ссылки:
//   было  [registered by the Ministry of Justice on August 1, 2026, under number 3914](url)
//   стало registered by the Ministry of Justice on August 1, 2026, [under number 3914](url)
//
// Скрипт одноразовый по смыслу, но оставлен в репозитории: если правку понадобится
// повторить или проверить, таблица объясняет каждое решение точнее, чем diff.
//
// CLI:
//   node scripts/rehost-long-anchors.mjs           — показать
//   node scripts/rehost-long-anchors.mjs --apply   — записать

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const apply = process.argv.includes("--apply");

const TABLE = [
  ["2026-08-06/mygov-tinting-permit-online.en.mdx", "my.gov.uz/uz/service/1058", "first:5"],
  ["2026-08-06/mygov-tinting-permit-online.uz.mdx", "my.gov.uz/uz/service/1058", "last:5"],
  ["2026-08-06/us-china-polysilicon-tariffs-xi-visit.en.mdx", "china-imposes-export", "/sanctions/"],
  ["2026-08-06/us-china-polysilicon-tariffs-xi-visit.uz.mdx", "china-imposes-export", "/sanksiyalar/"],
  ["2026-08-05/cb-biometric-data-storage-payment-operators.en.mdx", "centralbankuzbekistan/13400", "last:3"],
  ["2026-08-05/cb-biometric-data-storage-payment-operators.uz.mdx", "centralbankuzbekistan/13400", "/3914-raqam/"],
  ["2026-08-02/uzhydromet-wind-dust-storm-warning.en.mdx", "uzgydromet/21848", "/84 µg\\/m³/"],
  ["2026-08-02/uzhydromet-wind-dust-storm-warning.uz.mdx", "uzgydromet/21848", "/84 mkg\\/m³/"],
  ["2026-08-05/pension-settlement-colony-inmates-simplified.en.mdx", "lex.uz/docs/112312", "first:2"],
  ["2026-08-05/pension-settlement-colony-inmates-simplified.en.mdx", "lex.uz/ru/docs/6236070", "/No\\. 592/"],
  ["2026-08-05/pension-settlement-colony-inmates-simplified.en.mdx", "minecofinuz/16170", "last:5"],
  ["2026-08-05/pension-settlement-colony-inmates-simplified.en.mdx", "minecofinuz/16178", "/up to 6 years of childcare leave/"],
  ["2026-08-05/pension-settlement-colony-inmates-simplified.uz.mdx", "lex.uz/docs/112312", "last:1"],
  ["2026-08-05/pension-settlement-colony-inmates-simplified.uz.mdx", "lex.uz/ru/docs/6236070", "/592-son/"],
  ["2026-08-05/pension-settlement-colony-inmates-simplified.uz.mdx", "minecofinuz/16170", "/12 oydan 24 oygacha/"],
  ["2026-08-05/pension-settlement-colony-inmates-simplified.uz.mdx", "minecofinuz/16178", "last:4"],
  ["2026-08-04/tashkent-bashkortostan-235m-projects.en.mdx", "toshvilpressa/64031", "last:2"],
  ["2026-08-04/tashkent-bashkortostan-235m-projects.uz.mdx", "toshvilpressa/64031", "first:3"],
  ["2026-08-04/cbu-bank-consumer-protection-rules.uz.mdx", "3030_12.pdf", "/19\\/16-son/"],
  ["2026-08-05/pension-childcare-leave-work-record.en.mdx", "minecofinuz/16178", "first:2"],
  ["2026-08-05/pension-childcare-leave-work-record.en.mdx", "lex.uz/ru/docs/6236070", "/No\\. 592/"],
  ["2026-08-05/pension-childcare-leave-work-record.en.mdx", "gov.uz/ru/advice", "/unified portal/"],
  ["2026-08-05/pension-childcare-leave-work-record.uz.mdx", "minecofinuz/16178", "last:1"],
  ["2026-08-05/pension-childcare-leave-work-record.uz.mdx", "lex.uz/ru/docs/6236070", "/592-son/"],
  ["2026-08-05/uzbekistan-infrastructure-h1-2026.en.mdx", "minecofinuz/16185", "first:5"],
  ["2026-08-05/uzbekistan-infrastructure-h1-2026.uz.mdx", "minecofinuz/16185", "first:4"],
  ["2026-08-03/hajj-queue-online-registration-mygov.uz.mdx", "my.gov.uz/ru/service/1272", "last:2"],
  ["2026-08-03/hajj-queue-online-registration-mygov.uz.mdx", "fergana.agency", "first:2"],
  ["2026-08-04/mortgage-bonds-third-exchange-deal.en.mdx", "uzse.uz/boards/4300", "/closed subscription/"],
  ["2026-08-04/mortgage-bonds-third-exchange-deal.uz.mdx", "uzse.uz/boards/4300", "/yopiq obuna/"],

  // Ссылки, которые в русской версии были короткими, а в переводе разрослись:
  // узбекский и английский разворачивают название акта целиком, и подпись
  // выходит длиннее оригинала. Ядро здесь — номер акта.
  ["2026-08-01/student-dorm-applications-mygovuz.uz.mdx", "lex.uz/ru/docs/-6568679", "/376-son/"],
  ["2026-08-02/soliq-june-cashback-suspicious-buyers.uz.mdx", "lex.uz/docs/-6008267", "/255-son/"],
  ["2026-08-05/vtoraya-spetsialnost-priem-2026.en.mdx", "lex.uz/ru/docs/-5657199", "/No\\. 606/"],
  ["2026-08-05/vtoraya-spetsialnost-priem-2026.uz.mdx", "lex.uz/ru/docs/-5657199", "/606-son/"],
  ["2026-08-06/mygov-mortgaged-housing-registration-aug2026.en.mdx", "lex.uz/docs/8177297", "/No\\. 224/"],
  ["2026-08-06/mygov-mortgaged-housing-registration-aug2026.uz.mdx", "lex.uz/docs/8177297", "/224-son/"],
  ["2026-08-06/mygov-mortgaged-housing-registration-aug2026.uz.mdx", "my.gov.uz/ru/service/363", "/O.RQ-1074-son/"],
  ["2026-08-04/agriculture-accounting-national-standard.en.mdx", "imv/news/view/201504", "first:2"],
  ["2026-08-04/agriculture-accounting-national-standard.uz.mdx", "imv/news/view/201504", "first:2"],
  ["2026-08-04/toshtech-100pct-grant-last-chance.en.mdx", "uzbmb/news/view/72477", "/Agency for Assessment of Knowledge and Qualifications \\(UzBMB\\)/"],
  ["2026-08-04/toshtech-100pct-grant-last-chance.uz.mdx", "uzbmb/news/view/72477", "/Bilim va malakalarni baholash agentligi \\(UzBMB\\)/"],
  ["2026-08-02/opec-plus-september-quota-188k-bpd.uz.mdx", "interfax.ru/business/1107022", "/qazib chiqarishni oshira olmayapti/"],
];

// Границы ядра внутри подписи. Возвращает [start, end) или null, если способ
// не сработал — тогда запись таблицы устарела и об этом надо сказать вслух.
function core(text, how) {
  if (how.startsWith("/")) {
    const m = text.match(new RegExp(how.slice(1, -1)));
    return m ? [m.index, m.index + m[0].length] : null;
  }
  const [side, nRaw] = how.split(":");
  const n = Number(nRaw);
  const words = [...text.matchAll(/\S+/g)];
  if (words.length <= n) return null; // сокращать нечего
  if (side === "first") return [0, words[n - 1].index + words[n - 1][0].length];
  const w = words[words.length - n];
  return [w.index, text.length];
}

let ok = 0;
let already = 0;
const failed = [];

for (const [rel, urlPart, how] of TABLE) {
  const file = join(ROOT, "content/posts", rel);
  const raw = readFileSync(file, "utf8");
  let hit = false;
  let short = false;

  const next = raw.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (whole, text, url) => {
    if (hit || short || !url.includes(urlPart)) return whole;
    // Повторный запуск после применения: подпись уже сокращена, ядро искать
    // не в чем. Это не поломка таблицы, а её результат.
    if (text.length <= 40) {
      short = true;
      return whole;
    }
    const range = core(text, how);
    if (!range) return whole;
    hit = true;
    const [s, e] = range;
    return `${text.slice(0, s)}[${text.slice(s, e)}](${url})${text.slice(e)}`;
  });

  if (short) {
    already += 1;
    continue;
  }
  if (!hit) {
    failed.push(`${rel} ← ${urlPart} (${how})`);
    continue;
  }
  ok += 1;
  if (apply) writeFileSync(file, next);
}

console.log(
  `${apply ? "Перенесено" : "Будет перенесено"}: ${ok} из ${TABLE.length}` +
    (already ? `, уже сокращено ранее: ${already}` : ""),
);
if (failed.length) {
  console.log("\nне сработало (запись таблицы устарела):");
  for (const f of failed) console.log(`  ${f}`);
}
