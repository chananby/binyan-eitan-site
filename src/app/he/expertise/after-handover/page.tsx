import type { Metadata } from "next";
import loadDynamic from "next/dynamic";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "יום המסירה והאחריות על הבית",
  description:
    "מה קורה ביום שאחרי השיפוץ? המדריך של בניין איתן למסירה נכונה, תיעוד תשתיות (As-Made) ואחריות אישית לאורך זמן.",
  alternates: {
    canonical: "https://binyaneitan.com/he/expertise/after-handover",
    languages: {
      "en": "https://binyaneitan.com/en/expertise/after-handover",
      "he": "https://binyaneitan.com/he/expertise/after-handover",
      "x-default": "https://binyaneitan.com/en/expertise/after-handover",
    },
  },
  openGraph: {
    title: "יום המסירה והאחריות על הבית | בניין איתן",
    description:
      "יום המסירה הוא רק ההתחלה. המחויבות של בניין איתן לתיעוד As-Made, הדרכה אישית ותמיכה מקצועית שנמשכת שנים אחרי סיום הפרויקט.",
    url: "https://binyaneitan.com/he/expertise/after-handover",
    siteName: "בניין איתן",
    locale: "he_IL",
    type: "article",
    images: [
      {
        url: "/luxury-apartment-renovation-view.jpg",
        width: 1200,
        height: 800,
        alt: "סלון מושלם ביום מסירת הפרויקט — בניין איתן",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};

const ArticleDetailPage = loadDynamic(
  () => import("../../../components/ArticleDetailPage"),
);

export default function HeExpertiseAfterHandoverPage() {
  return <ArticleDetailPage slug="after-handover" />;
}
