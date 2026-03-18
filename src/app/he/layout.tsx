import type { Metadata } from "next";
import { Assistant } from "next/font/google";
import { LangProvider } from "../components/LangContext";
import FloatingWhatsApp from "../components/FloatingWhatsApp";

const assistant = Assistant({
  subsets: ["latin", "hebrew"],
  variable: "--font-heading",
  display: "swap",
  weight: ["300", "400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "בנין איתן | קבלן שיפוצים ובנייה בירושלים",
    template: "%s | בנין איתן",
  },
  description:
    "קבלן שיפוצים ובנייה מוביל בירושלים ובנימין — עבודה עברית מקצועית עם ניסיון של 20 שנה. שיפוצי יוקרה, בנייה ושיפוצים, הנדסת קונסטרוקציה וגמר פרימיום. קבלן רשום ג1.",
  keywords: [
    "קבלן שיפוצים בירושלים",
    "בנייה ושיפוצים ירושלים",
    "עבודה עברית ירושלים",
    "קבלן בנייה ירושלים",
    "שיפוץ דירה ירושלים",
    "קבלן שיפוצים בנימין",
    "בנין איתן",
    "קבלן רשום ג1",
    "שיפוץ יוקרה ירושלים",
    "הנדסת קונסטרוקציה ירושלים",
  ],
  openGraph: {
    siteName: "בנין איתן",
    type: "website",
    locale: "he_IL",
    images: [
      {
        url: "/luxury-interior-finish-transformation.jpg",
        width: 1600,
        height: 900,
        alt: "בנין איתן — מצוינות הנדסית וביצוע ללא פשרות",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: {
    canonical: "https://binyaneitan.co.il/he",
    languages: {
      "he-IL": "https://binyaneitan.co.il/he",
      "en-US": "https://binyaneitan.co.il/en",
    },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://binyaneitan.co.il",
  "name": "בנין איתן בע\"מ",
  "alternateName": ["Binyan Eitan Ltd.", "קבלן שיפוצים ובנייה בירושלים"],
  "url": "https://binyaneitan.co.il",
  "logo": "https://binyaneitan.co.il/logo.png",
  "image": "https://binyaneitan.co.il/luxury-interior-finish-transformation.jpg",
  "description": "קבלן שיפוצים ובנייה מוביל בירושלים ובנימין. עבודה עברית מקצועית — שיפוץ דירות ווילות יוקרה, הנדסת קונסטרוקציה וגמר פרימיום. קבלן רשום ג1 מס׳ 41805.",
  "telephone": "02-500-0447",
  "contactPoint": [
    {
      "@type": "ContactPoint",
      "telephone": "+972-58-500-8447",
      "contactType": "sales and management",
      "availableLanguage": ["Hebrew", "English"]
    },
    {
      "@type": "ContactPoint",
      "telephone": "+972-53-321-4208",
      "contactType": "project coordination",
      "availableLanguage": ["Hebrew", "English"]
    }
  ],
  "email": "office@binyaneitan.co.il",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "ירושלים",
    "addressRegion": "ירושלים והסביבה",
    "addressCountry": "IL",
  },
  "areaServed": [
    { "@type": "City", "name": "ירושלים" },
    { "@type": "AdministrativeArea", "name": "בנימין" },
    { "@type": "City", "name": "מבשרת ציון" },
    { "@type": "AdministrativeArea", "name": "גוש עציון" },
    { "@type": "City", "name": "בית שמש" },
    { "@type": "AdministrativeArea", "name": "מרכז הארץ" },
  ],
  "priceRange": "$$$$",
  "hasCredential": {
    "@type": "EducationalOccupationalCredential",
    "credentialCategory": "רישיון קבלן ג1",
    "name": "קבלן רשום ג1 מס׳ 41805",
  },
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "שירותי בנייה ושיפוצים",
    "itemListElement": [
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "קבלן שיפוצים בירושלים",
          "description": "שיפוץ דירות ובתים בירושלים ובנימין — עבודה עברית מקצועית, גמר פרימיום"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "בנייה ושיפוצים",
          "description": "קבלן בנייה מלא: שלד, תשתיות, גמר ופיקוח"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "הנדסת קונסטרוקציה ושלד",
          "description": "ביצוע מבנים מורכבים, חיזוק יסודות ושיקום מבני"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "בניית וילות פרימיום",
          "description": "בניית וילות יוקרה בירושלים ובנימין מהיסוד ועד הגמר"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "שיפוץ יוקרה",
          "description": "שיפוץ מקיף של דירות ובתים פרטיים ברמת גמר פרימיום"
        }
      }
    ]
  },
  "sameAs": [
    "https://share.google/mYYDjEprxPi7JdoSG",
    "https://www.linkedin.com/company/binyan-eitan",
    "https://www.facebook.com/binyaneitan"
  ],
};

export default function HeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={assistant.variable}>
      <LangProvider lang="he" dir="rtl">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
        <FloatingWhatsApp />
      </LangProvider>
    </div>
  );
}
