import type { Metadata } from "next";
import loadDynamic from "next/dynamic";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Behind the Walls: The Invisible Standard of Excellence",
  description:
    "Why is infrastructure the most important part of a renovation? Binyan Eitan's guide to plumbing, electrical, and waterproofing at the highest standard.",
  alternates: {
    canonical: "https://binyaneitan.com/en/expertise/behind-the-walls",
  },
  openGraph: {
    title: "Behind the Walls: The Invisible Standard of Excellence | Binyan Eitan",
    description:
      "Real luxury starts behind the drywall. Binyan Eitan's guide to infrastructure that lasts — plumbing, electrical, waterproofing, and X-ray documentation.",
    url: "https://binyaneitan.com/en/expertise/behind-the-walls",
    siteName: "Binyan Eitan",
    locale: "en_US",
    type: "article",
    images: [
      {
        url: "/interior-wall-framing-systems.jpg",
        width: 1200,
        height: 800,
        alt: "Construction infrastructure phase — pipes and framing — Binyan Eitan",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};

const ArticleDetailPage = loadDynamic(
  () => import("../../../components/ArticleDetailPage"),
);

export default function EnExpertiseBehindTheWallsPage() {
  return <ArticleDetailPage slug="behind-the-walls" />;
}
