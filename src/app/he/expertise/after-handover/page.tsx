import type { Metadata } from "next";
import loadDynamic from "next/dynamic";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "יום המסירה והאחריות על הבית | בנין איתן",
  description:
    "מה קורה ביום שאחרי השיפוץ? המדריך של בנין איתן למסירה נכונה, תיעוד תשתיות (As-Made) ואחריות אישית לאורך זמן.",
  alternates: {
    canonical: "https://binyaneitan.com/he/expertise/after-handover",
  },
  openGraph: {
    title: "יום המסירה והאחריות על הבית | בנין איתן",
    description:
      "יום המסירה הוא רק ההתחלה. המחויבות של בנין איתן לתיעוד As-Made, הדרכה אישית ותמיכה מקצועית שנמשכת שנים אחרי סיום הפרויקט.",
    url: "https://binyaneitan.com/he/expertise/after-handover",
    siteName: "בנין איתן",
    locale: "he_IL",
    type: "article",
    images: [
      {
        url: "/luxury-apartment-renovation-view.jpg",
        width: 1200,
        height: 800,
        alt: "סלון מושלם ביום מסירת הפרויקט — בנין איתן",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};

const ArticleDetailPage = loadDynamic(
  () => import("../../../components/ArticleDetailPage"),
  { ssr: false }
);

export default function HeExpertiseAfterHandoverPage() {
  return <ArticleDetailPage slug="after-handover" />;
}
