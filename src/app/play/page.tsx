import type { Metadata } from "next";
import PrecisionStack from "./PrecisionStack";

export const metadata: Metadata = {
  title: "Precision Stack — בנין איתן",
  description: "דיוק הוא היסוד שלנו",
  robots: { index: false },
};

export default function PlayPage() {
  return <PrecisionStack />;
}
