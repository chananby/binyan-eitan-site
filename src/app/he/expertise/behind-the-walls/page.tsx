import type { Metadata } from "next";
import loadDynamic from "next/dynamic";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "מאחורי הקירות: איכות הבנייה הנסתרת",
  description:
    "רוב הליקויים שצצים שנים אחרי שיפוץ נולדים מתשתית פגומה שמחבאים מאחורי הקירות. סקירה הנדסית של התשתיות הסמויות שקובעות את עתיד הבית.",
  alternates: {
    canonical: "https://binyaneitan.com/he/expertise/behind-the-walls",
    languages: {
      "en": "https://binyaneitan.com/en/expertise/behind-the-walls",
      "he": "https://binyaneitan.com/he/expertise/behind-the-walls",
      "x-default": "https://binyaneitan.com/en/expertise/behind-the-walls",
    },
  },
  openGraph: {
    title: "מאחורי הקירות: איכות הבנייה הנסתרת | בניין איתן",
    description:
      "יוקרה אמיתית מתחילה מאחורי הקיר. המדריך של בניין איתן לתשתית שעומדת בזמן — אינסטלציה, חשמל, איטום ותיעוד רנטגן.",
    url: "https://binyaneitan.com/he/expertise/behind-the-walls",
    siteName: "בניין איתן",
    locale: "he_IL",
    type: "article",
    images: [
      {
        url: "/interior-wall-framing-systems.jpg",
        width: 1200,
        height: 800,
        alt: "שלב תשתיות בנייה — צנרת ומסגרת — בניין איתן",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};

const ArticleDetailPage = loadDynamic(
  () => import("../../../components/ArticleDetailPage"),
);

export default function HeExpertiseBehindTheWallsPage() {
  return <ArticleDetailPage slug="behind-the-walls" />;
}
