import type { Metadata } from "next";
import loadDynamic from "next/dynamic";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ניהול פרויקט בנייה בישראל מרחוק",
  description:
    "המדריך המלא לבנייה ושיפוץ בישראל עבור תושבי חוץ. שקיפות מלאה, דיווחים שוטפים וניהול מקצועי בשלט רחוק — עם מוטי איתן.",
  alternates: {
    canonical: "https://binyaneitan.com/he/expertise/building-from-abroad",
  },
  openGraph: {
    title: "לבנות בישראל בראש שקט – המדריך לניהול פרויקט מרחוק | בניין איתן",
    description:
      "המדריך המלא לבנייה ושיפוץ בישראל עבור תושבי חוץ. שקיפות מלאה, דיווחים שוטפים וניהול מקצועי בשלט רחוק.",
    url: "https://binyaneitan.com/he/expertise/building-from-abroad",
    siteName: "בניין איתן",
    locale: "he_IL",
    type: "article",
    images: [
      {
        url: "/luxury-interior.jpg",
        width: 1200,
        height: 800,
        alt: "ניהול פרויקט בנייה בישראל מרחוק — בניין איתן",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};

const ArticleDetailPage = loadDynamic(
  () => import("../../../components/ArticleDetailPage"),
  { ssr: false }
);

export default function HeExpertiseBuildingFromAbroadPage() {
  return <ArticleDetailPage slug="building-from-abroad" />;
}
