import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/api/contact",   // contact form endpoint — allow so crawlers see it exists
        ],
        disallow: [
          "/admin",
          "/admin-tools/",
          "/internal/",
          "/he/internal",
          "/en/internal",
          "/he/change-order",
          "/en/change-order",
          "/api/admin/",
          "/api/",
        ],
      },
    ],
    sitemap: "https://binyaneitan.com/sitemap.xml",
  };
}
