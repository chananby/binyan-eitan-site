import ChangeOrderForm from "../../components/ChangeOrderForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Change Order Approval | Binyan Eitan",
  description: "Internal change order approval form — Binyan Eitan Construction Ltd.",
  robots: { index: false, follow: false },
};

export default function EnChangeOrderPage() {
  return <ChangeOrderForm />;
}
