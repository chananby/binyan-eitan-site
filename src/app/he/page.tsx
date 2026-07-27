import type { Metadata } from "next";
import { getServerRating } from "../../lib/server-translations";


export const metadata: Metadata = {
  title: { absolute: "בניין איתן | הנדסה וביצוע פרויקטים מורכבים בירושלים" },
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
    canonical: "https://binyaneitan.com/he",
    languages: { en: "https://binyaneitan.com/en" },
  },
  openGraph: {
    title: "בניין איתן | הנדסה וביצוע פרויקטים מורכבים בירושלים",
    description:
      "קבלן שיפוצים ובנייה בירושלים ובנימין — עבודה עברית מקצועית, שיפוץ יוקרה, גמר פרימיום. קבלן רשום ג1.",
    url: "https://binyaneitan.com/he",
    siteName: "בניין איתן",
    type: "website",
    locale: "he_IL",
    images: [
      {
        url: "https://binyaneitan.com/amshinov-1.jpg",
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
    images: ["https://binyaneitan.com/amshinov-1.jpg"],
  },
};

const heLocalBusiness = {
  "@context": "https://schema.org",
  "@type": ["LocalBusiness", "ConstructionBusiness"],
  "name": "בניין איתן",
  "alternateName": "Binyan Eitan",
  "founder": { "@type": "Person", "name": "מוטי איתן", "jobTitle": "קבלן רשום ג1 ומייסד" },
  "description": "קבלן רשום ג1 מס׳ 41805. ביצוע פרויקטים מורכבים בירושלים — הנדסה אזרחית, שיפוץ דירות ווילות, בנייה ושיפוצים וגמר פרימיום.",
  "url": "https://binyaneitan.com",
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
  // Aggregate rating mirrors the visible Google chip in Hero. ratingValue /
  // reviewCount below are DEFAULTS — at render they're overridden from the
  // editable hero.googleRatingValue / hero.googleRatingCount keys (see the
  // component), so updating the rating in the content editor updates both the
  // chip and this schema together.
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "5.0",
    "reviewCount": "19",
    "bestRating": "5",
    "worstRating": "1",
  },
  "sameAs": ["https://share.google/mYYDjEprxPi7JdoSG", "https://www.facebook.com/binyaneitan"],
};

import HeHomeClient from "../components/ClientLayouts/HeHomeClient";

export default async function MaintenanceHebrew() {
  const { ratingValue, reviewCount } = await getServerRating("he");
  const jsonLd = {
    ...heLocalBusiness,
    aggregateRating: { ...heLocalBusiness.aggregateRating, ratingValue, reviewCount },
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <HeHomeClient />
    </>
  );
}
