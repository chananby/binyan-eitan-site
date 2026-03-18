import type { Metadata } from "next";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: { absolute: "בנין איתן | הנדסה וביצוע פרויקטים מורכבים בירושלים" },
  description:
    "קבלן רשום ג1 מס׳ 41805 — ביצוע פרויקטים מורכבים בירושלים ובנימין. הנדסה אזרחית, שיפוץ דירות ווילות, בנייה ושיפוצים וגמר פרימיום. עבודה עברית מקצועית — דיוק שאפשר למדוד.",
  keywords: [
    "קבלן שיפוצים בירושלים",
    "בנייה ושיפוצים",
    "עבודה עברית ירושלים",
    "קבלן בנייה ירושלים",
    "שיפוץ דירה ירושלים",
    "קבלן שיפוצים בנימין",
    "שיפוץ יוקרה",
    "קבלן רשום ג1",
    "הנדסה אזרחית ירושלים",
    "ביצוע פרויקטים מורכבים",
  ],
  robots: { index: true, follow: true },
  alternates: {
    canonical: "https://binyaneitan.co.il/he",
    languages: { en: "https://binyaneitan.co.il/en" },
  },
  openGraph: {
    title: "בנין איתן | הנדסה וביצוע פרויקטים מורכבים בירושלים",
    description:
      "קבלן שיפוצים ובנייה בירושלים ובנימין — עבודה עברית מקצועית, שיפוץ יוקרה, גמר פרימיום. קבלן רשום ג1.",
    url: "https://binyaneitan.co.il/he",
    siteName: "בניין איתן",
    type: "website",
    locale: "he_IL",
    images: [
      {
        url: "https://binyaneitan.co.il/amshinov-1.jpg",
        width: 1200,
        height: 800,
        alt: "בניין איתן — הנדסה ובנייה יוקרתית",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "בניין איתן | מצוינות הנדסית",
    description: "דיוק שאפשר למדוד, שקיפות שאפשר לסמוך עליה.",
    images: ["https://binyaneitan.co.il/amshinov-1.jpg"],
  },
};

const heLocalBusiness = {
  "@context": "https://schema.org",
  "@type": ["LocalBusiness", "ConstructionBusiness"],
  "name": "בנין איתן",
  "alternateName": "Binyan Eitan",
  "founder": { "@type": "Person", "name": "מוטי איתן", "jobTitle": "קבלן רשום ג1 ומייסד" },
  "description": "קבלן רשום ג1 מס׳ 41805. ביצוע פרויקטים מורכבים בירושלים — הנדסה אזרחית, שיפוץ דירות ווילות, בנייה ושיפוצים וגמר פרימיום.",
  "url": "https://binyaneitan.co.il",
  "telephone": "02-500-0447",
  "address": { "@type": "PostalAddress", "addressLocality": "ירושלים", "addressCountry": "IL" },
  "geo": { "@type": "GeoCoordinates", "latitude": "31.7683", "longitude": "35.2137" },
  "areaServed": ["ירושלים", "בנימין", "מבשרת ציון", "גוש עציון", "בית שמש", "מרכז הארץ"],
  "hasCredential": {
    "@type": "EducationalOccupationalCredential",
    "credentialCategory": "רישיון קבלן ג1 מס׳ 41805",
    "recognizedBy": { "@type": "Organization", "name": "רשם הקבלנים — משרד הבינוי והשיכון" },
  },
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "שירותי בנייה ושיפוצים",
    "itemListElement": [
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "קבלן שיפוצים בירושלים" } },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "ביצוע פרויקטים מורכבים" } },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "הנדסה אזרחית וקונסטרוקציה" } },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "בניית וילות יוקרה" } },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "גמר פרימיום — ריצוף, איטום, צבע" } },
    ],
  },
  "sameAs": ["https://share.google/mYYDjEprxPi7JdoSG", "https://www.facebook.com/binyaneitan"],
};

const HeHomeClient = dynamic(() => import("../components/ClientLayouts/HeHomeClient"), { ssr: false });

export default function MaintenanceHebrew() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(heLocalBusiness) }} />
      <HeHomeClient />
    </>
  );
}
