import type { Metadata } from "next";
import { Assistant, Heebo } from "next/font/google";
import "./globals.css";
import AccessibilityMenu from "./components/AccessibilityMenu";
import { TranslationsProvider } from "./components/TranslationsProvider";

const assistant = Assistant({
  subsets: ["latin", "hebrew"],
  variable: "--font-heading",
  display: "swap",
  weight: ["300", "400", "600", "700", "800"],
});

const heebo = Heebo({
  subsets: ["latin", "hebrew"],
  variable: "--font-heebo",
  display: "swap",
  weight: ["300", "400", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://binyaneitan.com"),
  title: "Binyan Eitan | Luxury Construction & Engineering",
  description: "Engineering beyond the surface. Binyan Eitan specializes in premium structural engineering and luxury construction.",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ConstructionBusiness",
  "name": "בנין איתן - הנדסה ובנייה",
  "description": "חברת בנייה והנדסה המתמחה בפרויקטים מורכבים, שלד, גמר וניהול פרויקטים ברמת פרימיום. קבלן רשום ג1.",
  "url": "https://www.binyaneitan.com",
  "telephone": "+972-52-XXXXXXX",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Jerusalem",
    "addressCountry": "IL"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "31.7683",
    "longitude": "35.2137"
  },
  "areaServed": "Israel",
  "sameAs": [
    "https://www.linkedin.com/company/binyan-eitan",
    "https://www.facebook.com/binyaneitan",
    "https://www.gov.il/he/departments/general/registered-contractors"
  ],
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "שירותי בנייה",
    "itemListElement": [
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "הנדסת קונסטרוקציה ושלד"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "בניית וילות פרימיום"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "השבחה ושיפוץ פרימיום"
        }
      }
    ]
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning className={`${assistant.variable} ${heebo.variable}`}>
      <head>
        <meta name="robots" content="noindex, nofollow" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="bg-bone text-charcoal antialiased overflow-x-hidden selection:bg-accent selection:text-bone">
        <TranslationsProvider>
          {children}
          <AccessibilityMenu />
        </TranslationsProvider>
      </body>
    </html>
  );
}
