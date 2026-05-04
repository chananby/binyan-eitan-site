import ExpertiseArticle from "../../components/ExpertiseArticle";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ידע מקצועי | בחירת קבלן לפרויקטים מורכבים",
  description:
    "איך בוחרים קבלן לפרויקט הנדסי מורכב? קראו את המדריך המקצועי של בניין איתן על סיווג ג1, קונסטרוקציות פלדה וניהול פרויקטים בסטנדרט פרימיום.",
  alternates: {
    canonical: "https://binyaneitan.com/he/expertise",
    languages: { en: "https://binyaneitan.com/en/expertise" },
  },
  openGraph: {
    title: "בניין איתן | ידע מקצועי | אתגרים הנדסיים בבנייה מודרנית",
    description:
      "איך בוחרים קבלן לפרויקט הנדסי מורכב? קראו את המדריך המקצועי של בניין איתן על סיווג ג1, קונסטרוקציות פלדה וניהול פרויקטים בסטנדרט פרימיום.",
    url: "https://binyaneitan.com/he/expertise",
    siteName: "בניין איתן",
    locale: "he_IL",
    type: "article",
  },
};

const expertiseListSchema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "ידע מקצועי | בניין איתן",
  description: "מאמרים מקצועיים של בניין איתן בנושאי בנייה, שיפוצים וניהול פרויקטים",
  url: "https://binyaneitan.com/he/expertise",
  inLanguage: "he-IL",
  itemListElement: [
    { "@type": "ListItem", position: 1,  url: "https://binyaneitan.com/he/expertise/g1-contractor-certification",     name: "קבלן רשום: מה המשמעות האמיתית של הרישום" },
    { "@type": "ListItem", position: 2,  url: "https://binyaneitan.com/he/expertise/building-from-abroad",            name: "לבנות בישראל בראש שקט – המדריך לניהול פרויקט מרחוק" },
    { "@type": "ListItem", position: 3,  url: "https://binyaneitan.com/he/expertise/behind-the-walls",               name: "מאחורי הקירות – הלב הפועם של הבית שלכם" },
    { "@type": "ListItem", position: 4,  url: "https://binyaneitan.com/he/expertise/reading-a-professional-quote",   name: "מעבר למחיר – המדריך לקריאת הצעת מחיר שתחסוך לכם אלפים" },
    { "@type": "ListItem", position: 5,  url: "https://binyaneitan.com/he/expertise/after-handover",                 name: "היום שאחרי המסירה – למה אתם צריכים 'מפת דרכים' לבית שלכם?" },
    { "@type": "ListItem", position: 6,  url: "https://binyaneitan.com/he/expertise/floor-infrastructure",           name: "מה מסתתר מתחת לריצוף – התשתית שהכי חשוב להבין" },
    { "@type": "ListItem", position: 7,  url: "https://binyaneitan.com/he/expertise/how-to-avoid-renovation-mistakes", name: "איך להימנע מטעויות קריטיות בשיפוץ הבית" },
    { "@type": "ListItem", position: 8,  url: "https://binyaneitan.com/he/expertise/building-private-home",          name: "בניית בית פרטי מהיסוד — כל מה שצריך לדעת לפני שמתחילים" },
    { "@type": "ListItem", position: 9,  url: "https://binyaneitan.com/he/expertise/foundation-reinforcement",       name: "חיזוק יסודות ומבנה — מתי זה הכרחי ואיך עושים את זה נכון" },
    { "@type": "ListItem", position: 10, url: "https://binyaneitan.com/he/expertise/choosing-a-contractor",          name: "איך בוחרים קבלן? — המדריך שיחסוך לכם טעויות יקרות" },
    { "@type": "ListItem", position: 11, url: "https://binyaneitan.com/he/expertise/renovating-while-living",        name: "שיפוץ בזמן שגרים בבית — מה שצריך לדעת לפני שמתחילים" },
  ],
};

export default function HeExpertisePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(expertiseListSchema) }}
      />
      <ExpertiseArticle />
    </>
  );
}
