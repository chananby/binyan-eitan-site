import type { MetadataRoute } from "next";

const BASE_URL = "https://binyaneitan.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    // ── Home pages ────────────────────────────────────────────
    {
      url: `${BASE_URL}/he`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
      alternates: {
        languages: {
          he: `${BASE_URL}/he`,
          en: `${BASE_URL}/en`,
        },
      },
    },
    {
      url: `${BASE_URL}/en`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
      alternates: {
        languages: {
          he: `${BASE_URL}/he`,
          en: `${BASE_URL}/en`,
        },
      },
    },

    // ── About pages ───────────────────────────────────────────
    {
      url: `${BASE_URL}/he/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
      alternates: {
        languages: {
          he: `${BASE_URL}/he/about`,
          en: `${BASE_URL}/en/about`,
        },
      },
    },
    {
      url: `${BASE_URL}/en/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
      alternates: {
        languages: {
          he: `${BASE_URL}/he/about`,
          en: `${BASE_URL}/en/about`,
        },
      },
    },

    // ── Projects pages ────────────────────────────────────────
    {
      url: `${BASE_URL}/he/projects`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
      alternates: {
        languages: {
          he: `${BASE_URL}/he/projects`,
          en: `${BASE_URL}/en/projects`,
        },
      },
    },
    {
      url: `${BASE_URL}/en/projects`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
      alternates: {
        languages: {
          he: `${BASE_URL}/he/projects`,
          en: `${BASE_URL}/en/projects`,
        },
      },
    },

    // ── Expertise / Knowledge articles ────────────────────────
    {
      url: `${BASE_URL}/he/expertise`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
      alternates: {
        languages: {
          he: `${BASE_URL}/he/expertise`,
          en: `${BASE_URL}/en/expertise`,
        },
      },
    },
    {
      url: `${BASE_URL}/en/expertise`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
      alternates: {
        languages: {
          he: `${BASE_URL}/he/expertise`,
          en: `${BASE_URL}/en/expertise`,
        },
      },
    },
  ];
}
