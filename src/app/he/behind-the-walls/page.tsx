import type { Metadata } from "next";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: "מאחורי הקירות | בניין איתן",
  description: "לקוחות הפרויקט מקבלים הצצה לסטנדרטים שלנו בתכנון התשתיות ובדיוק ההנדסי.",
  robots: "noindex, nofollow",
};

const HeBehindTheWallsClient = dynamic(() => import("../../components/ClientLayouts/HeBehindTheWallsClient"), { ssr: false });

export default function BehindTheWallsHE() {
  return <HeBehindTheWallsClient />;
}
