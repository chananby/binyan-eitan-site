import ChangeOrderForm from "../../components/ChangeOrderForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "טופס אישור שינויים",
  description: "טופס אישור שינויים פנימי — חברת בניין איתן בע\"מ",
  robots: { index: false, follow: false },
  alternates: {
    canonical: "https://binyaneitan.com/he/change-order",
    languages: { en: "https://binyaneitan.com/en/change-order" },
  },
};

export default function HeChangeOrderPage() {
  return <ChangeOrderForm />;
}
