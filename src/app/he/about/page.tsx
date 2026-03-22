import AboutPage from "../../components/AboutPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "מי אנחנו | הניסיון ההנדסי של מוטי איתן",
  description: 'מזה שני עשורים שחברת "בניין איתן" מובילה פרויקטים מורכבים ויוקרתיים בישראל. מוטי איתן, מייסד ובעלים — קבלן רשום C1 עם מעל 20 שנה של הנדסת קונסטרוקציה, פיקוח וניהול פרויקטים.',
  keywords: [
    "קבלן שיפוצים בירושלים",
    "בנייה ושיפוצים ירושלים",
    "עבודה עברית ירושלים",
    "קבלן רשום ג1",
    "בנייה פרטית וציבורית",
    "הנדסת קונסטרוקציה ירושלים",
    "מוטי איתן קבלן",
    "בניין איתן",
    "קבלן שיפוצים בנימין",
    "Construction Engineering Jerusalem",
    "G1 Registered Contractor Israel",
  ],
  openGraph: {
    title: "מי אנחנו | הניסיון ההנדסי של מוטי איתן",
    description: "שני עשורים של בנייה מורכבת ויוקרתית בישראל. קבלן רשום ג1 בניהולו של מוטי איתן.",
    url: "https://binyaneitan.com/he/about",
    siteName: "בניין איתן",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "בניין איתן — המשרד" }],
    locale: "he_IL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "המשרד | בניין איתן",
    description: "שני עשורים של בנייה מורכבת ויוקרתית בישראל. קבלן רשום ג1.",
    images: ["/og-image.jpg"],
  },
  alternates: {
    canonical: "https://binyaneitan.com/he/about",
    languages: { en: "https://binyaneitan.com/en/about" },
  },
};

export default function HeAboutPage() {
  return <AboutPage />;
}
