import type { Metadata } from "next";
import ProjectsGallery from "../../components/ProjectsGallery";

export const metadata: Metadata = {
  title: "תיק עבודות | פרויקטים נבחרים בבנייה ושיפוץ",
  description:
    "ממתחמים ציבוריים ועד שיפוצי יוקרה — כל פרויקט בנוי לרמת דיוק הנדסי. שקיפות מבנית, חומרים פרימיום, דיוק שאפשר לעבור דרכו.",
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
    languages: {
      he: "https://binyaneitan.com/he/projects",
      en: "https://binyaneitan.com/en/projects",
      "x-default": "https://binyaneitan.com/en/projects",
    },
  },
  robots: { index: true, follow: true },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "@id": "https://binyaneitan.com/he/projects",
  name: "תיק עבודות | בניין איתן",
  description: "פרויקטים נבחרים של בניין איתן — קבלן ג1 ירושלים בנייה ושיפוץ.",
  url: "https://binyaneitan.com/he/projects",
  inLanguage: "he",
  publisher: {
    "@type": "LocalBusiness",
    name: "בניין איתן בע\"מ",
    url: "https://binyaneitan.com",
  },
};

export default function ProjectsPageHE() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProjectsGallery lang="he" />
    </>
  );
}
