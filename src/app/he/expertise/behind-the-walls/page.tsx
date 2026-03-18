import type { Metadata } from "next";
import loadDynamic from "next/dynamic";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "מאחורי הקירות: איכות הבנייה הנסתרת",
  description:
    "למה התשתיות בבית הן החלק הכי חשוב בשיפוץ? המדריך של בנין איתן לאינסטלציה, חשמל ואיטום ברמה הגבוהה ביותר.",
  alternates: {
    canonical: "https://binyaneitan.co.il/he/expertise/behind-the-walls",
  },
  openGraph: {
    title: "מאחורי הקירות: איכות הבנייה הנסתרת | בנין איתן",
    description:
      "יוקרה אמיתית מתחילה מאחורי הקיר. המדריך של בנין איתן לתשתית שעומדת בזמן — אינסטלציה, חשמל, איטום ותיעוד רנטגן.",
    url: "https://binyaneitan.co.il/he/expertise/behind-the-walls",
    siteName: "בנין איתן",
    locale: "he_IL",
    type: "article",
    images: [
      {
        url: "/interior-wall-framing-systems.jpg",
        width: 1200,
        height: 800,
        alt: "שלב תשתיות בנייה — צנרת ומסגרת — בנין איתן",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};

const ArticleDetailPage = loadDynamic(
  () => import("../../../components/ArticleDetailPage"),
  { ssr: false }
);

export default function HeExpertiseBehindTheWallsPage() {
  return <ArticleDetailPage slug="behind-the-walls" />;
}
