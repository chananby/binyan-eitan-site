import type { MetadataRoute } from "next";

const BASE_URL = "https://binyaneitan.com";
const ARTICLE_SLUGS = [
  "g1-contractor-certification",
  "building-from-abroad",
  "behind-the-walls",
  "reading-a-professional-quote",
  "after-handover",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const articleEntries: MetadataRoute.Sitemap = ARTICLE_SLUGS.flatMap((slug) => [
    {
      url: `${BASE_URL}/he/expertise/${slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
      alternates: {
        languages: {
          he: `${BASE_URL}/he/expertise/${slug}`,
          en: `${BASE_URL}/en/expertise/${slug}`,
        },
      },
    },
    {
      url: `${BASE_URL}/en/expertise/${slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
      alternates: {
        languages: {
          he: `${BASE_URL}/he/expertise/${slug}`,
          en: `${BASE_URL}/en/expertise/${slug}`,
        },
      },
    },
  ]);

  return [
    // ── Home pages ────────────────────────────────────────────
    {
      url: `${BASE_URL}/he`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
      alternates: { languages: { he: `${BASE_URL}/he`, en: `${BASE_URL}/en` } },
    },
    {
      url: `${BASE_URL}/en`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
      alternates: { languages: { he: `${BASE_URL}/he`, en: `${BASE_URL}/en` } },
    },

    // ── About pages ───────────────────────────────────────────
    {
      url: `${BASE_URL}/he/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
      alternates: { languages: { he: `${BASE_URL}/he/about`, en: `${BASE_URL}/en/about` } },
    },
    {
      url: `${BASE_URL}/en/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
      alternates: { languages: { he: `${BASE_URL}/he/about`, en: `${BASE_URL}/en/about` } },
    },

    // ── Expertise index ───────────────────────────────────────
    {
      url: `${BASE_URL}/he/expertise`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
      alternates: { languages: { he: `${BASE_URL}/he/expertise`, en: `${BASE_URL}/en/expertise` } },
    },
    {
      url: `${BASE_URL}/en/expertise`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
      alternates: { languages: { he: `${BASE_URL}/he/expertise`, en: `${BASE_URL}/en/expertise` } },
    },

    // ── FAQ pages ─────────────────────────────────────────────
    {
      url: `${BASE_URL}/he/faq`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
      alternates: { languages: { he: `${BASE_URL}/he/faq`, en: `${BASE_URL}/en/faq` } },
    },
    {
      url: `${BASE_URL}/en/faq`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
      alternates: { languages: { he: `${BASE_URL}/he/faq`, en: `${BASE_URL}/en/faq` } },
    },

    // ── Individual articles ───────────────────────────────────
    ...articleEntries,
  ];
}
