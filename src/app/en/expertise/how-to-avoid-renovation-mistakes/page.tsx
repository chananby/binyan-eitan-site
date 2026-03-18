import type { Metadata } from "next";
import loadDynamic from "next/dynamic";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "How to Avoid Renovation Mistakes",
  description:
    "A practical guide to preventing common home renovation errors, managing your budget, and ensuring sound infrastructure.",
  alternates: {
    canonical: "https://binyaneitan.co.il/en/expertise/how-to-avoid-renovation-mistakes",
    languages: { he: "https://binyaneitan.co.il/he/expertise/how-to-avoid-renovation-mistakes" },
  },
  openGraph: {
    title: "How to Avoid Renovation Mistakes | Binyan Eitan",
    description:
      "A practical guide to preventing common home renovation errors, managing your budget, and ensuring sound infrastructure.",
    url: "https://binyaneitan.co.il/en/expertise/how-to-avoid-renovation-mistakes",
    siteName: "Binyan Eitan",
    locale: "en_US",
    type: "article",
    images: [
      {
        url: "/luxury-interior-finish-transformation.jpg",
        width: 1600,
        height: 900,
        alt: "Luxury renovation in Jerusalem — Binyan Eitan contractor",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

const ArticleDetailPage = loadDynamic(
  () => import("../../../components/ArticleDetailPage"),
  { ssr: false }
);

export default function EnAvoidRenovationMistakesPage() {
  return <ArticleDetailPage slug="how-to-avoid-renovation-mistakes" />;
}
