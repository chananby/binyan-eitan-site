import type { Metadata } from "next";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: { absolute: "בנין איתן | הנדסה וביצוע פרויקטים מורכבים בירושלים" },
  description:
    "קבלן שיפוצים ובנייה בירושלים ובנימין. עבודה עברית מקצועית, שיפוץ דירות ווילות, הנדסת קונסטרוקציה וגמר פרימיום. קבלן רשום ג1 מס׳ 41805 — דיוק שאפשר למדוד.",
  keywords: [
    "קבלן שיפוצים בירושלים",
    "בנייה ושיפוצים",
    "עבודה עברית ירושלים",
    "קבלן בנייה ירושלים",
    "שיפוץ דירה ירושלים",
    "קבלן שיפוצים בנימין",
    "שיפוץ יוקרה",
    "קבלן רשום ג1",
  ],
  robots: { index: true, follow: true },
  openGraph: {
    title: "בנין איתן | הנדסה וביצוע פרויקטים מורכבים בירושלים",
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

const HeHomeClient = dynamic(() => import("../components/ClientLayouts/HeHomeClient"), { ssr: false });

export default function MaintenanceHebrew() {
  return <HeHomeClient />;
}
