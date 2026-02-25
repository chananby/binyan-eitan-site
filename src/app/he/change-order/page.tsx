import ChangeOrderForm from "../../components/ChangeOrderForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "טופס אישור שינויים | בניין איתן",
  description: "טופס אישור שינויים פנימי — חברת בניין איתן בע\"מ",
  robots: { index: false, follow: false },
};

export default function HeChangeOrderPage() {
  return <ChangeOrderForm />;
}
