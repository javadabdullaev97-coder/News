// Как выглядит пост LEAP News в Telegram. Один формат на всех потребителей.
//
// ЗАЧЕМ ОТДЕЛЬНЫМ МОДУЛЕМ. До 18.08.2026 сборка текста жила внутри
// scripts/post-to-telegram.mjs, и это было нормально ровно до тех пор, пока
// текст только отправляли. Как только появилась правка уже отправленного
// сообщения (scripts/edit-posts.mjs), у формата стало два потребителя —
// и копия формата в каждом означала бы, что правка тихо разойдётся
// с оригиналом: где-то останется старый разделитель, где-то другой лимит лида.
//
// Правило простое: текст поста собирается здесь и больше нигде.

import { decodeEntities, escapeHTML } from "./frontmatter.mjs";

export const READ_MORE = {
  ru: "Читать полностью leap.uz →",
  uz: "Batafsil leap.uz →",
  en: "Read in full leap.uz →",
};

/** Заголовок, лид, ссылка. HTML parse_mode. */
export function buildMessage(fm, lede, url, { ledeLimit = 600, lang = "ru" } = {}) {
  const title = escapeHTML(decodeEntities(fm.title || ""));

  const parts = [];

  // Заголовок первой строкой. Никаких плашек перед ним.
  parts.push(`<b>${title}</b>`);

  // Лид
  const plainLede = decodeEntities(lede);
  const shortLede =
    plainLede.length > ledeLimit
      ? plainLede.slice(0, ledeLimit - 1).replace(/\s+\S*$/, "") + "…"
      : plainLede;
  parts.push(escapeHTML(shortLede));

  // Футер
  parts.push(`<a href="${url}">${READ_MORE[lang] ?? READ_MORE.ru}</a>`);

  return parts.join("\n\n");
}

// Telegram режет caption на 1024 символах. Раньше при переполнении код молча
// откатывался на sendMessage — картинка терялась целиком. Вместо этого
// подрезаем лид, пока подпись не влезет: заголовок и первоисточник важнее
// последних двух предложений лида.
export const CAPTION_LIMIT = 1024;

export function buildCaption(fm, lede, url, lang = "ru") {
  for (const limit of [600, 450, 320, 220, 140]) {
    const text = buildMessage(fm, lede, url, { ledeLimit: limit, lang });
    if (text.length <= CAPTION_LIMIT) return text;
  }
  return null; // даже без лида не влезло — уходим на sendMessage
}
