import type { Metadata } from "next";
import loadDynamic from "next/dynamic";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "After Handover: A Roadmap to Peace of Mind",
  description:
    "What happens the day after your renovation? Binyan Eitan's guide to a proper handover, As-Made infrastructure documentation, and lasting personal accountability.",
  alternates: {
    canonical: "https://binyaneitan.com/en/expertise/after-handover",
    languages: {
      "en": "https://binyaneitan.com/en/expertise/after-handover",
      "he": "https://binyaneitan.com/he/expertise/after-handover",
      "x-default": "https://binyaneitan.com/en/expertise/after-handover",
    },
  },
  openGraph: {
    title: "The Handover: Your Roadmap to Long-Term Peace of Mind | Binyan Eitan",
    description:
      "Handover day is just the beginning. Binyan Eitan's commitment to As-Made documentation, personal walkthroughs, and post-project support that lasts for years.",
    url: "https://binyaneitan.com/en/expertise/after-handover",
    siteName: "Binyan Eitan",
    locale: "en_US",
    type: "article",
    images: [
      {
        url: "/jerusalem-luxury-living-room.jpg",
        width: 1200,
        height: 800,
        alt: "Pristine finished living room at project handover — Binyan Eitan",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};

const ArticleDetailPage = loadDynamic(
  () => import("../../../components/ArticleDetailPage"),
);

export default function EnExpertiseAfterHandoverPage() {
  return <ArticleDetailPage slug="after-handover" />;
}
