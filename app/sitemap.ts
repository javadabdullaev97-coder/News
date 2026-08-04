import type { MetadataRoute } from "next";
import { articleHref, articles, rubrics } from "@/lib/data";

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
    ...articles.map((a) => ({
      url: `${SITE}${articleHref(a)}`,
      lastModified: new Date(a.publishedAt),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
