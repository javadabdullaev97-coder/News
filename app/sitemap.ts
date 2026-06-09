import type { MetadataRoute } from "next";
import { articles, rubrics } from "@/lib/data";

export const dynamic = "force-static";

const SITE = "https://leap.uz";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: SITE, lastModified: now, changeFrequency: "always", priority: 1 },
    { url: `${SITE}/all`, lastModified: now, changeFrequency: "always", priority: 0.9 },
    { url: `${SITE}/wc2026`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE}/wc2026/groups`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE}/wc2026/bracket`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE}/wc2026/schedule`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE}/wc2026/squad`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE}/wc2026/news`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE}/wc2026/rules`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
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
