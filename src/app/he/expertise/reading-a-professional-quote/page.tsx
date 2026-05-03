import type { Metadata } from "next";
import loadDynamic from "next/dynamic";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "איך לקרוא הצעת מחיר לבנייה ושיפוץ",
  description:
    "הצעת מחיר זולה לרוב יוצאת היקרה ביותר. מדריך מעשי לפענוח הצעות שיפוץ — סעיפי עלות, חומרים, לוחות תשלום, ו-9 דגלים אדומים שצריך לזהות לפני שחותמים.",
  alternates: {
    canonical: "https://binyaneitan.com/he/expertise/reading-a-professional-quote",
    languages: {
      "en": "https://binyaneitan.com/en/expertise/reading-a-professional-quote",
      "he": "https://binyaneitan.com/he/expertise/reading-a-professional-quote",
      "x-default": "https://binyaneitan.com/en/expertise/reading-a-professional-quote",
    },
  },
  openGraph: {
    title: "איך לקרוא הצעת מחיר לבנייה ושיפוץ | בניין איתן",
    description:
      "הצעת מחיר מקצועית היא מפת דרכים הנדסית ומשפטית. המדריך של בניין איתן לזיהוי נורות אזהרה, הבנת כתב כמויות והגנה על ההשקעה שלכם.",
    url: "https://binyaneitan.com/he/expertise/reading-a-professional-quote",
    siteName: "בניין איתן",
    locale: "he_IL",
    type: "article",
    images: [
      {
        url: "/jerusalem-site-inspection.jpg",
        width: 1200,
        height: 800,
        alt: "תוכניות אדריכליות וסקירת הצעת מחיר מקצועית — בניין איתן",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};

const ArticleDetailPage = loadDynamic(
  () => import("../../../components/ArticleDetailPage"),
);

export default function HeExpertiseReadingAQuotePage() {
  return <ArticleDetailPage slug="reading-a-professional-quote" />;
}
