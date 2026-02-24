import LegalPage from "../../components/LegalPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "מסמכים משפטיים | בניין איתן",
  description:
    "תנאי שימוש, מדיניות פרטיות והצהרת נגישות של חברת בנין איתן בע\"מ.",
};

export default function HeLegalPage() {
  return <LegalPage />;
}
