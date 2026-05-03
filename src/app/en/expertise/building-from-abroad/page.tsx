import type { Metadata } from "next";
import loadDynamic from "next/dynamic";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Building Your Israeli Property From Abroad",
  description:
    "The complete guide to building and renovating in Israel for overseas residents. Full transparency, regular updates, and expert remote project management by Binyan Eitan.",
  alternates: {
    canonical: "https://binyaneitan.com/en/expertise/building-from-abroad",
    languages: {
      "en": "https://binyaneitan.com/en/expertise/building-from-abroad",
      "he": "https://binyaneitan.com/he/expertise/building-from-abroad",
      "x-default": "https://binyaneitan.com/en/expertise/building-from-abroad",
    },
  },
  openGraph: {
    title: "Seamless Sovereignty: Building in Israel from Abroad | Binyan Eitan",
    description:
      "The complete guide to building and renovating in Israel for overseas residents. Full transparency, regular updates, and expert remote project management.",
    url: "https://binyaneitan.com/en/expertise/building-from-abroad",
    siteName: "Binyan Eitan",
    locale: "en_US",
    type: "article",
    images: [
      {
        url: "/luxury-interior.jpg",
        width: 1200,
        height: 800,
        alt: "Remote property management in Israel — Binyan Eitan",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};

const ArticleDetailPage = loadDynamic(
  () => import("../../../components/ArticleDetailPage"),
);

export default function EnExpertiseBuildingFromAbroadPage() {
  return <ArticleDetailPage slug="building-from-abroad" />;
}
