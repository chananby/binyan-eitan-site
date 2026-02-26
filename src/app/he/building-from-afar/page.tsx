import type { Metadata } from "next";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: "בנייה בישראל מרחוק | בניין איתן",
  description: "ניהול פרויקטים על פני הפרש זמן של 7 שעות, דוחות יומיים ושילוב חומרים בינלאומיים.",
  robots: "noindex, nofollow",
};

const HeBuildingFromAfarClient = dynamic(() => import("../../components/ClientLayouts/HeBuildingFromAfarClient"), { ssr: false });

export default function BuildingFromAfarHE() {
  return <HeBuildingFromAfarClient />;
}
