import ExpertiseArticle from "../../components/ExpertiseArticle";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "בנין איתן | ידע מקצועי | בחירת קבלן לפרויקטים מורכבים",
  description:
    "איך בוחרים קבלן לפרויקט הנדסי מורכב? קראו את המדריך המקצועי של בנין איתן על סיווג ג1, קונסטרוקציות פלדה וניהול פרויקטים בסטנדרט פרימיום.",
  alternates: {
    canonical: "https://binyaneitan.com/he/expertise",
    languages: { en: "https://binyaneitan.com/en/expertise" },
  },
  openGraph: {
    title: "בנין איתן | ידע מקצועי | אתגרים הנדסיים בבנייה מודרנית",
    description:
      "איך בוחרים קבלן לפרויקט הנדסי מורכב? קראו את המדריך המקצועי של בנין איתן על סיווג ג1, קונסטרוקציות פלדה וניהול פרויקטים בסטנדרט פרימיום.",
    url: "https://binyaneitan.com/he/expertise",
    siteName: "בניין איתן",
    locale: "he_IL",
    type: "article",
  },
};

export default function HeExpertisePage() {
  return <ExpertiseArticle />;
}
