import { articles, getAuthor, getRubric } from "@/lib/data";

export const dynamic = "force-static";

const SITE = "https://leap.uz";

function escape(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function GET() {
  const items = articles
    .slice()
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    )
    .map((a) => {
      const author = getAuthor(a.authorSlug);
      const rubric = getRubric(a.rubric);
      return `<item>
  <title>${escape(a.title)}</title>
  <link>${SITE}/article/${a.slug}</link>
  <guid isPermaLink="true">${SITE}/article/${a.slug}</guid>
  <pubDate>${new Date(a.publishedAt).toUTCString()}</pubDate>
  <description>${escape(a.lead)}</description>
  <author>noreply@leap.uz (${escape(author.name)})</author>
  ${rubric ? `<category>${escape(rubric.title)}</category>` : ""}
  <enclosure url="${escape(a.cover)}" type="image/jpeg" />
</item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>LEAP — Новости</title>
    <link>${SITE}</link>
    <description>Новости, которые опережают.</description>
    <language>ru</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
    },
  });
}
