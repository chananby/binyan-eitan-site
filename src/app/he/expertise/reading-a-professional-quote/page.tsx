import type { Metadata } from "next";
import loadDynamic from "next/dynamic";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "איך לקרוא הצעת מחיר לבנייה ושיפוץ",
  description:
    "המדריך המלא לקריאת הצעת מחיר מקצועית. איך מזהים \"חורים\" בהצעות זולות, למה פירוט הוא ההגנה הכי טובה שלכם ומה חובה להופיע בחוזה.",
  alternates: {
    canonical: "https://binyaneitan.co.il/he/expertise/reading-a-professional-quote",
  },
  openGraph: {
    title: "איך לקרוא הצעת מחיר לבנייה ושיפוץ | בנין איתן",
    description:
      "הצעת מחיר מקצועית היא מפת דרכים הנדסית ומשפטית. המדריך של בנין איתן לזיהוי נורות אזהרה, הבנת כתב כמויות והגנה על ההשקעה שלכם.",
    url: "https://binyaneitan.co.il/he/expertise/reading-a-professional-quote",
    siteName: "בנין איתן",
    locale: "he_IL",
    type: "article",
    images: [
      {
        url: "/luxury-interior-finish-transformation.jpg",
        width: 1200,
        height: 800,
        alt: "תוכניות אדריכליות וסקירת הצעת מחיר מקצועית — בנין איתן",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};

const ArticleDetailPage = loadDynamic(
  () => import("../../../components/ArticleDetailPage"),
  { ssr: false }
);

export default function HeExpertiseReadingAQuotePage() {
  return <ArticleDetailPage slug="reading-a-professional-quote" />;
}
