import type { Metadata } from "next";
import FaqPage from "../../components/FaqPage";

export const metadata: Metadata = {
  title: "שאלות נפוצות",
  description:
    "תשובות לשאלות הנפוצות ביותר בנושאי פרויקטי בנייה, רישיון ג1, ניהול פרויקטים מרחוק ועוד.",
  alternates: {
    canonical: "https://binyaneitan.co.il/he/faq",
    languages: {
      he: "https://binyaneitan.co.il/he/faq",
      en: "https://binyaneitan.co.il/en/faq",
    },
  },
};

export default function HeFaqPage() {
  return <FaqPage />;
}
