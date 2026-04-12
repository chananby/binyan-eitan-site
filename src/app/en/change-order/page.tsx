import ChangeOrderForm from "../../components/ChangeOrderForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Change Order Approval",
  description: "Internal change order approval form — Binyan Eitan Construction Ltd.",
  robots: { index: false, follow: false },
  alternates: {
    canonical: "https://binyaneitan.com/en/change-order",
    languages: { he: "https://binyaneitan.com/he/change-order" },
  },
};

export default function EnChangeOrderPage() {
  return <ChangeOrderForm />;
}
