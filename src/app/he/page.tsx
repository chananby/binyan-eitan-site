import type { Metadata } from "next";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: "בנין איתן - הנדסה ובנייה | בהובלת מוטי איתן",
  description:
    "אנו בונים עבורכם אתר חדש שיציג את הפרויקטים המורכבים והיוקרתיים שלנו. בינתיים, אנחנו כאן לכל שאלה הנדסית או תכנונית.",
  robots: "noindex, nofollow",
};

const HeHomeClient = dynamic(() => import("../components/ClientLayouts/HeHomeClient"), { ssr: false });

export default function MaintenanceHebrew() {
  return <HeHomeClient />;
}
