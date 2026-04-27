import type { MetadataRoute } from "next";

const BASE_URL = "https://binyaneitan.com";

// Only slugs that have actual pages under /en/expertise/ and /he/expertise/
const ARTICLE_SLUGS = [
  "building-from-abroad",
  "behind-the-walls",
  "reading-a-professional-quote",
  "after-handover",
  "how-to-avoid-renovation-mistakes",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const articleEntries: MetadataRoute.Sitemap = ARTICLE_SLUGS.flatMap((slug) => [
    {
      url: `${BASE_URL}/en/expertise/${slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
      alternates: {
        languages: {
          "en-US":     `${BASE_URL}/en/expertise/${slug}`,
          "he-IL":     `${BASE_URL}/he/expertise/${slug}`,
          "x-default": `${BASE_URL}/en/expertise/${slug}`,
        },
      },
    },
    {
      url: `${BASE_URL}/he/expertise/${slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
      alternates: {
        languages: {
          "en-US":     `${BASE_URL}/en/expertise/${slug}`,
          "he-IL":     `${BASE_URL}/he/expertise/${slug}`,
          "x-default": `${BASE_URL}/en/expertise/${slug}`,
        },
      },
    },
  ]);

  return [
    // ── Home pages ────────────────────────────────────────────
    {
      url: `${BASE_URL}/en`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
      alternates: {
        languages: {
          "en-US":     `${BASE_URL}/en`,
          "he-IL":     `${BASE_URL}/he`,
          "x-default": `${BASE_URL}/en`,
        },
      },
    },
    {
      url: `${BASE_URL}/he`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
      alternates: {
        languages: {
          "en-US":     `${BASE_URL}/en`,
          "he-IL":     `${BASE_URL}/he`,
          "x-default": `${BASE_URL}/en`,
        },
      },
    },

    // ── About pages ───────────────────────────────────────────
    {
      url: `${BASE_URL}/en/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
      alternates: {
        languages: {
          "en-US":     `${BASE_URL}/en/about`,
          "he-IL":     `${BASE_URL}/he/about`,
          "x-default": `${BASE_URL}/en/about`,
        },
      },
    },
    {
      url: `${BASE_URL}/he/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
      alternates: {
        languages: {
          "en-US":     `${BASE_URL}/en/about`,
          "he-IL":     `${BASE_URL}/he/about`,
          "x-default": `${BASE_URL}/en/about`,
        },
      },
    },

    // ── Expertise index ───────────────────────────────────────
    {
      url: `${BASE_URL}/en/expertise`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
      alternates: {
        languages: {
          "en-US":     `${BASE_URL}/en/expertise`,
          "he-IL":     `${BASE_URL}/he/expertise`,
          "x-default": `${BASE_URL}/en/expertise`,
        },
      },
    },
    {
      url: `${BASE_URL}/he/expertise`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
      alternates: {
        languages: {
          "en-US":     `${BASE_URL}/en/expertise`,
          "he-IL":     `${BASE_URL}/he/expertise`,
          "x-default": `${BASE_URL}/en/expertise`,
        },
      },
    },

    // ── FAQ pages ─────────────────────────────────────────────
    {
      url: `${BASE_URL}/en/faq`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
      alternates: {
        languages: {
          "en-US":     `${BASE_URL}/en/faq`,
          "he-IL":     `${BASE_URL}/he/faq`,
          "x-default": `${BASE_URL}/en/faq`,
        },
      },
    },
    {
      url: `${BASE_URL}/he/faq`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
      alternates: {
        languages: {
          "en-US":     `${BASE_URL}/en/faq`,
          "he-IL":     `${BASE_URL}/he/faq`,
          "x-default": `${BASE_URL}/en/faq`,
        },
      },
    },

    // ── International landing page (overseas / diaspora) ──────
    {
      url: `${BASE_URL}/lp/overseas`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },

    // ── Individual articles ───────────────────────────────────
    ...articleEntries,
  ];
}
