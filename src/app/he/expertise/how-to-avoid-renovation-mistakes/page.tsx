import type { Metadata } from "next";
import loadDynamic from "next/dynamic";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "איך להימנע מטעויות בשיפוץ",
  description:
    "מדריך פרקטי למניעת טעויות נפוצות בשיפוץ הבית — שמירה על התקציב, ניהול תשתיות נכון ועבודה עברית מקצועית בירושלים ובנימין.",
  keywords: [
    "טעויות בשיפוץ",
    "קבלן שיפוצים בירושלים",
    "בנייה ושיפוצים",
    "עבודה עברית ירושלים",
    "שיפוץ דירה ירושלים",
    "מדריך שיפוץ",
    "בנין איתן",
  ],
  alternates: {
    canonical: "https://binyaneitan.co.il/he/expertise/how-to-avoid-renovation-mistakes",
    languages: { en: "https://binyaneitan.co.il/en/expertise/how-to-avoid-renovation-mistakes" },
  },
  openGraph: {
    title: "איך להימנע מטעויות קריטיות בשיפוץ הבית | בנין איתן",
    description:
      "מדריך פרקטי: תקציב נסתר, בדיקת תשתיות, עבודה עברית ועוד — כל מה שצריך לדעת לפני שמתחילים שיפוץ.",
    url: "https://binyaneitan.co.il/he/expertise/how-to-avoid-renovation-mistakes",
    siteName: "בנין איתן",
    locale: "he_IL",
    type: "article",
    images: [
      {
        url: "/luxury-interior-finish-transformation.jpg",
        width: 1600,
        height: 900,
        alt: "שיפוץ יוקרה בירושלים — בנין איתן קבלן שיפוצים ובנייה",
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

export default function HeAvoidRenovationMistakesPage() {
  return <ArticleDetailPage slug="how-to-avoid-renovation-mistakes" />;
}
