import type { Metadata } from "next";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: "מצוינות הנדסית ובנייה יוקרתית",
  description:
    "דיוק שאפשר למדוד, שקיפות שאפשר לסמוך עליה. בניין איתן — קבלן רשום ג1. בנייה יוקרתית, הנדסת קונסטרוקציה, גמר פרימיום בחומר שחור. ירושלים וכל הארץ.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "בניין איתן | מצוינות הנדסית ובנייה יוקרתית",
    description:
      "כל חיבור מחושב. כל גמר מכוון. ראו את הדיוק שמאחורי הקירות.",
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
