import type { MetadataRoute } from "next";
import { articles, rubrics } from "@/lib/data";

const SITE = "https://leap.uz";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: SITE, lastModified: now, changeFrequency: "always", priority: 1 },
    ...rubrics.map((r) => ({
      url: `${SITE}/rubric/${r.slug}`,
      lastModified: now,
      changeFrequency: "hourly" as const,
      priority: 0.7,
    })),
    ...articles.map((a) => ({
      url: `${SITE}/article/${a.slug}`,
      lastModified: new Date(a.publishedAt),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
