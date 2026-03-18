import type { Metadata } from "next";
import LPTemplate, { type LPData } from "../LPTemplate";

export const metadata: Metadata = {
  title: "שיפוצי יוקרה והרחבות בירושלים | בנין איתן",
  description:
    "מומחים בשיפוצי פרימיום בירושלים עם אפס תלונות מלקוחות עבר, ניהול אתר מופתי ואחריות אישית של מוטי איתן.",
  alternates: {
    canonical: "https://binyaneitan.co.il/lp/jerusalem",
  },
  openGraph: {
    title: "שיפוצי יוקרה בירושלים | בנין איתן",
    description:
      "מומחים בשיפוצי פרימיום בירושלים עם אפס תלונות מלקוחות עבר, ניהול אתר מופתי ואחריות אישית של מוטי איתן.",
    url: "https://binyaneitan.co.il/lp/jerusalem",
    siteName: "בנין איתן",
    locale: "he_IL",
    type: "website",
    images: [{ url: "/bayit-vegan.jpg", width: 1200, height: 800, alt: "שיפוץ יוקרה בירושלים" }],
  },
  twitter: { card: "summary_large_image" },
};

const WHATSAPP =
  "https://wa.me/972585008447?text=%D7%94%D7%99%D7%99%20%D7%9E%D7%95%D7%98%D7%99%2C%20%D7%A4%D7%A0%D7%99%D7%AA%D7%99%20%D7%93%D7%A8%D7%9A%20%D7%94%D7%93%D7%A3%20%D7%A9%D7%99%D7%A4%D7%95%D7%A6%D7%99%20%D7%99%D7%A8%D7%95%D7%A9%D7%9C%D7%99%D7%9D%20%D7%95%D7%90%D7%A9%D7%9E%D7%97%20%D7%9C%D7%A9%D7%9E%D7%95%D7%A2%20%D7%A2%D7%95%D7%93...";

const data: LPData = {
  dir: "rtl",
  heroImage: "/bayit-vegan.jpg",
  heroImageAlt: "שיפוץ יוקרה בירושלים — בנין איתן",
  breakImage: "/amshinov-3.jpg",
  badge: "בנין איתן — קבלן רשום ג1",
  headingLine1: "לשפץ בסטנדרט גבוה,",
  headingAccent: "ולישון בשקט בלילה.",
  heroSub:
    "שיפוץ נכס יוקרה דורש הרבה יותר מעיצוב — הוא דורש דיוק, ניהול מופתי ואחריות אישית שמגיעה עם שם.",
  heroCta: "דברו איתנו עכשיו",
  trustBar: [
    { value: "20+", label: "שנות ניסיון" },
    { value: "150+", label: "פרויקטים שהושלמו" },
    { value: "ג1", label: "קבלן רשום" },
    { value: "5.0★", label: "דירוג גוגל" },
  ],
  introLabel: "הגישה שלנו",
  introText:
    "שיפוץ נכס יוקרה דורש הרבה יותר מעיצוב – הוא דורש דיוק בפרטים הקטנים וניהול אתר מופתי. אנחנו מביאים איתנו ניסיון רב בשיפוצים מורכבים בירושלים, תוך שמירה על סדר מופתי ועמידה קשיחה בלוחות זמנים. והכי חשוב? בדקו אותנו. אנחנו מתגאים בביקורות מעולות ואפס תלונות מלקוחות עבר. אנחנו פה כדי שתוכלו לשפץ בראש שקט באמת.",
  pillarsTitle: "למה בנין איתן?",
  pillars: [
    {
      num: "01",
      title: "רמת גמר ללא פשרות",
      desc: "תשומת לב קפדנית לכל פינה, לכל חיבור ולכל אריח. אנחנו לא עוצרים עד שזה מושלם.",
    },
    {
      num: "02",
      title: "ניהול אתר תרבותי",
      desc: "אתר בנייה נקי ומאורגן. אנחנו דואגים לשקט שלכם ולשקט של השכנים שלכם לאורך כל הדרך.",
    },
    {
      num: "03",
      title: "אחריות אישית של מוטי",
      desc: "מוטי איתן מלווה אתכם באופן אישי – מהשבירה הראשונה ועד למסירת המפתח.",
    },
  ],
  breakQuote: "הנדסה מעבר לפני השטח. ביצוע ללא פשרות.",
  ctaLabel: "בואו נתחיל",
  ctaTitle: "דברו איתנו על השיפוץ הבא שלכם.",
  ctaDesc: "מוטי איתן זמין לייעוץ אישי ללא עלות. אנחנו עונים תוך שעות.",
  ctaBtn: "אתכם ובשבילכם",
  ctaNote: "או התקשרו:",
  phoneTel: "+97225000447",
  footerLegal: `© ${new Date().getFullYear()} בניין איתן בע"מ. קבלן רשום ג1 — רישיון מס' 41805 | ירושלים`,
  mainSiteHref: "/he",
  mainSiteLabel: "← לאתר הראשי",
  whatsappUrl: WHATSAPP,
};

export default function JerusalemPage() {
  return <LPTemplate d={data} />;
}
