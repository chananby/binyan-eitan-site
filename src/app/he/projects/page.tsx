import type { Metadata } from "next";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: "תיק עבודות | פרויקטים נבחרים בבנייה ושיפוץ",
  description:
    "ממתחמים ציבוריים ועד וילות פרטיות יוקרתיות — כל פרויקט בנוי לרמת דיוק הנדסי. שקיפות מבנית, חומר שחור פרימיום, דיוק שאפשר לעבור דרכו.",
  keywords: [
    "פרויקטים בנייה ישראל",
    "אדריכלות יוקרתית",
    "הנדסת קונסטרוקציה",
    "פרויקט אמשינוב",
    "וילות יוקרה",
    "בנייה פרטית וציבורית",
  ],
  openGraph: {
    title: "תיק עבודות | פרויקטים נבחרים בבנייה ושיפוץ",
    description: "מתחמים מוסדיים, וילות פרטיות, שיפוצים מבניים. ראו איך נראה דיוק אמיתי.",
    url: "https://binyaneitan.com/he/projects",
    siteName: "בניין איתן",
    images: [{ url: "https://binyaneitan.com/amshinov-1.jpg", width: 1200, height: 800, alt: "בניין איתן — תיקיית פרויקטים הנדסיים" }],
    locale: "he_IL",
    type: "website",
  },
  alternates: {
    canonical: "https://binyaneitan.com/he/projects",
    languages: { en: "https://binyaneitan.com/en/projects" },
  },
  robots: { index: true, follow: true },
};

const HeProjectsClient = dynamic(() => import("../../components/ClientLayouts/HeProjectsClient"), { ssr: false });

export default function ProjectsPageHE() {
  return <HeProjectsClient />;
}
