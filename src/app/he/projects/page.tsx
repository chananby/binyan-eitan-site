import type { Metadata } from "next";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: "פרויקטים | בניין איתן — קבלן רשום ג1 | הנדסה ובנייה יוקרתית בישראל",
  description:
    "הצגה של פרויקטים מיוחדים כולל אדריכלות מסחרית, וילות יוקרתיות ופתרונות הנדסיים מורכבים.",
  keywords: [
    "פרויקטים בנייה ישראל",
    "אדריכלות יוקרתית",
    "הנדסת קונסטרוקציה",
    "פרויקט אמשינוב",
    "וילות יוקרה",
    "בנייה פרטית וציבורית",
  ],
  openGraph: {
    title: "פרויקטים | בניין איתן",
    description: "תיקיית פרויקטים בנייה יוקרתית והנדסה בישראל.",
    url: "https://binyaneitan.com/he/projects",
    siteName: "בניין איתן",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "בניין איתן — פרויקטים" }],
    locale: "he_IL",
    type: "website",
  },
  alternates: {
    canonical: "https://binyaneitan.com/he/projects",
    languages: { en: "https://binyaneitan.com/en/projects" },
  },
  robots: "noindex, nofollow",
};

const HeProjectsClient = dynamic(() => import("../../components/ClientLayouts/HeProjectsClient"), { ssr: false });

export default function ProjectsPageHE() {
  return <HeProjectsClient />;
}
