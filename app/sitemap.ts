import type { MetadataRoute } from "next";
import { allArticles, articleHref, rubrics } from "@/lib/data";

export const dynamic = "force-static";

const SITE = "https://leap.uz";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: SITE, lastModified: now, changeFrequency: "always", priority: 1 },
    { url: `${SITE}/all`, lastModified: now, changeFrequency: "always", priority: 0.9 },
    ...rubrics.map((r) => ({
      url: `${SITE}/rubric/${r.slug}`,
      lastModified: now,
      changeFrequency: "hourly" as const,
      priority: 0.7,
    })),
    // Каждая языковая версия — отдельный адрес с перечнем альтернатив:
    // без alternates поисковик считает переводы дублями и выбирает один сам.
    ...allArticles.map((a) => ({
      url: `${SITE}${articleHref(a)}`,
      lastModified: new Date(a.publishedAt),
      changeFrequency: "weekly" as const,
      priority: a.lang === "ru" ? 0.8 : 0.7,
      alternates: {
        languages: Object.fromEntries(
          a.langs.map((l) => [l, `${SITE}${articleHref(a, l)}`]),
        ),
      },
    })),
  ];
}
