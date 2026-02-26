import type { Metadata } from "next";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: "שאלות נפוצות | בניין איתן",
  description: "שאלות נפוצות לגבי שירותי הבנייה שלנו.",
  robots: "noindex, nofollow",
};

const HeFAQClient = dynamic(() => import("../../components/ClientLayouts/HeFAQClient"), { ssr: false });

export default function FAQHebrew() {
  return <HeFAQClient />;
}
