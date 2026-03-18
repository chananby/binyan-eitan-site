import type { Metadata } from "next";
import LPTemplate, { type LPData } from "../LPTemplate";

export const metadata: Metadata = {
  title: "קבלן שיפוצים ובנייה בגבעת זאב | בנין איתן - מוטי איתן",
  description:
    "בונים את גבעת זאב עם קבלן מקומי. זמינות של שכן, אחריות אישית ומחויבות לקהילה. מוטי איתן והצוות כאן בשבילכם.",
  alternates: {
    canonical: "https://binyaneitan.co.il/lp/givat-zeev",
  },
  openGraph: {
    title: "קבלן בנייה מקומי בגבעת זאב | בנין איתן",
    description:
      "בונים את גבעת זאב עם קבלן מקומי. זמינות של שכן, אחריות אישית ומחויבות לקהילה. מוטי איתן והצוות כאן בשבילכם.",
    url: "https://binyaneitan.co.il/lp/givat-zeev",
    siteName: "בנין איתן",
    locale: "he_IL",
    type: "website",
    images: [{ url: "/ramat-eshkol.jpg", width: 1200, height: 800, alt: "בנייה בגבעת זאב — בנין איתן" }],
  },
  twitter: { card: "summary_large_image" },
};

const WHATSAPP =
  "https://wa.me/972585008447?text=%D7%94%D7%99%D7%99%20%D7%9E%D7%95%D7%98%D7%99%2C%20%D7%A4%D7%A0%D7%99%D7%AA%D7%99%20%D7%93%D7%A8%D7%9A%20%D7%94%D7%93%D7%A3%20%D7%92%D7%91%D7%A2%D7%AA%20%D7%96%D7%90%D7%91%20%D7%95%D7%90%D7%A9%D7%9E%D7%97%20%D7%9C%D7%A9%D7%9E%D7%95%D7%A2%20%D7%A2%D7%95%D7%93...";

const data: LPData = {
  dir: "rtl",
  heroImage: "/ramat-eshkol.jpg",
  heroImageAlt: "בנייה ושיפוץ בגבעת זאב — בנין איתן",
  breakImage: "/ohel-avshalom.jpg",
  badge: "בנין איתן — קבלן מקומי בגבעת זאב",
  headingLine1: "בונים את גבעת זאב,",
  headingAccent: "עם קבלן שגר ממש לידכם.",
  heroSub:
    "כשבונים בתוך הקהילה, האחריות היא אישית. מוטי איתן והצוות — תושבי גבעת זאב — כאן בשבילכם.",
  heroCta: "מוטי בדרך אליכם",
  trustBar: [
    { value: "20+", label: "שנות ניסיון" },
    { value: "150+", label: "פרויקטים שהושלמו" },
    { value: "ג1", label: "קבלן רשום" },
    { value: "5.0★", label: "דירוג גוגל" },
  ],
  introLabel: "הקהילה שלנו, הבית שלנו",
  introText:
    "כשבונים בתוך הקהילה, האחריות היא אישית. מוטי איתן והצוות שלנו הם תושבי גבעת זאב, מה שמאפשר לנו להעניק לכם שירות מהיר, זמין ומחויב בסטנדרט הגבוה ביותר. אנחנו לא רק בונים בתים, אנחנו בונים את השכונה שבה אנחנו חיים.",
  pillarsTitle: "היתרון של קבלן מקומי",
  pillars: [
    {
      num: "01",
      title: "זמינות של שכן",
      desc: "אנחנו פה, בשטח, כל יום. הפיקוח הוא צמוד, המענה הוא מיידי, ואנחנו תמיד במרחק דקה מהנכס שלכם.",
    },
    {
      num: "02",
      title: "יתרון הצוות המקומי",
      desc: "העובדים והציוד שלנו נמצאים באזור, מה שחוסך לכם זמן יקר ומזרז את קצב העבודה משמעותית.",
    },
    {
      num: "03",
      title: "השם שלנו הוא הביטחון שלכם",
      desc: "המחויבות שלנו היא לקהילה. אנחנו בונים היום את מה שנשמח לפגוש מחר ברחוב או במכולת.",
    },
  ],
  breakQuote: "בונים איתן. בונים לדורות.",
  ctaLabel: "דברו איתנו",
  ctaTitle: "מוטי בדרך אליכם — צרו קשר לייעוץ מקצועי בנכס.",
  ctaDesc: "ייעוץ ראשוני ללא עלות. מגיעים אליכם, סופרים בשבילכם, ונותנים הצעה כנה.",
  ctaBtn: "שלחו הודעה",
  ctaNote: "או התקשרו:",
  phoneTel: "+97225000447",
  footerLegal: `© ${new Date().getFullYear()} בניין איתן בע"מ. קבלן רשום ג1 — רישיון מס' 41805 | גבעת זאב`,
  mainSiteHref: "/he",
  mainSiteLabel: "← לאתר הראשי",
  whatsappUrl: WHATSAPP,
};

export default function GivatZeevPage() {
  return <LPTemplate d={data} />;
}
