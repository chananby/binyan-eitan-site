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
    default: "בנין איתן | מצוינות הנדסית וביצוע ללא פשרות",
    template: "%s | בנין איתן",
  },
  description:
    "שני עשורים של ניסיון הנדסי בבנייה, שיפוצים וניהול פרויקטים מורכבים בירושלים. אנחנו הופכים תוכניות הנדסיות למציאות מדויקת בשטח, עם ליווי אישי ושקיפות מלאה לכל אורך הדרך.",
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
    canonical: "https://binyaneitan.com/he",
    languages: {
      "he-IL": "https://binyaneitan.com/he",
      "en-US": "https://binyaneitan.com/en",
    },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://binyaneitan.com",
  "name": "בנין איתן בע\"מ",
  "alternateName": "Binyan Eitan Ltd.",
  "url": "https://binyaneitan.com",
  "logo": "https://binyaneitan.com/logo.png",
  "image": "https://binyaneitan.com/luxury-interior-finish-transformation.jpg",
  "description": "קבלן בנייה מוסמך ג1, מתמחה בשיפוץ יוקרה, הנדסה קונסטרוקטיבית וגמר פרמיום בירושלים ובמרכז הארץ.",
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
  "email": "office@binyaneitan.com",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "ירושלים",
    "addressCountry": "IL",
  },
  "areaServed": ["ירושלים", "תל אביב", "מרכז הארץ"],
  "priceRange": "$$$$",
  "hasCredential": {
    "@type": "EducationalOccupationalCredential",
    "credentialCategory": "רישיון קבלן ג1",
    "name": "קבלן רשום ג1 מס׳ 41805",
  },
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
