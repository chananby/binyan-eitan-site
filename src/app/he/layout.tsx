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
  title: "בנין איתן - פתרונות הנדסיים",
  description: "מומחים בבנייה ותשתיות",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://binyaneitan.com",
  "name": "בנין איתן בע\"מ",
  "alternateName": "Binyan Eitan Ltd.",
  "url": "https://binyaneitan.com",
  "logo": "https://binyaneitan.com/logo.png",
  "image": "https://binyaneitan.com/jerusalem-crane-delivery.jpg",
  "description": "קבלן בנייה מוסמך ג1, מתמחה בשיפוץ יוקרה, הנדסה קונסטרוקטיבית וגמר פרמיום בירושלים ובמרכז הארץ.",
  "telephone": ["+97225000447", "+972585008447"],
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
