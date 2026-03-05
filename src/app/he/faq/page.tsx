import type { Metadata } from "next";
import FaqPage from "../../components/FaqPage";

export const metadata: Metadata = {
  title: "שאלות נפוצות | בנין איתן",
  description:
    "תשובות לשאלות הנפוצות ביותר בנושאי פרויקטי בנייה, רישיון ג1, ניהול פרויקטים מרחוק ועוד.",
  alternates: {
    canonical: "https://binyaneitan.com/he/faq",
    languages: {
      he: "https://binyaneitan.com/he/faq",
      en: "https://binyaneitan.com/en/faq",
    },
  },
};

export default function HeFaqPage() {
  return <FaqPage />;
}
