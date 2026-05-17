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
    images: [{ url: "/luxury-interior-finish-transformation.jpg", width: 1600, height: 900, alt: "בניין איתן — המשרד" }],
    locale: "he_IL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "המשרד | בניין איתן",
    description: "שני עשורים של בנייה מורכבת ויוקרתית בישראל. קבלן רשום ג1.",
    images: ["/luxury-interior-finish-transformation.jpg"],
  },
  alternates: {
    canonical: "https://binyaneitan.com/he/about",
    languages: {
      "en-US":     "https://binyaneitan.com/en/about",
      "he-IL":     "https://binyaneitan.com/he/about",
      "x-default": "https://binyaneitan.com/en/about",
    },
  },
};

const aboutSchema = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: "מי אנחנו | בניין איתן",
  description: "שני עשורים של בנייה מורכבת ויוקרתית בישראל. קבלן רשום ג1 בניהולו של מוטי איתן.",
  url: "https://binyaneitan.com/he/about",
  inLanguage: "he-IL",
  about: {
    "@type": "Organization",
    name: "בניין איתן",
    alternateName: "Binyan Eitan",
    url: "https://binyaneitan.com",
    logo: "https://binyaneitan.com/logo.png",
    description: "חברת בנייה ושיפוצים ירושלמית בניהולו של מוטי איתן — קבלן רשום ג1 עם מעל 20 שנות ניסיון בבנייה פרטית ויוקרתית.",
    foundingDate: "2004",
    founder: {
      "@type": "Person",
      name: "מוטי איתן",
      jobTitle: "מייסד ובעלים",
    },
    areaServed: { "@type": "Country", name: "Israel" },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+972-58-500-8447",
      contactType: "customer service",
      availableLanguage: ["Hebrew", "English", "Russian"],
    },
    sameAs: ["https://binyaneitan.com"],
  },
};

export default function HeAboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutSchema) }}
      />
      <AboutPage />
    </>
  );
}
