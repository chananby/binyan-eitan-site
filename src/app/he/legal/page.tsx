import LegalPage from "../../components/LegalPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "מסמכים משפטיים",
  description:
    "תנאי שימוש, מדיניות פרטיות והצהרת נגישות של חברת בניין איתן בע\"מ.",
  robots: { index: false, follow: false },
  alternates: {
    canonical: "https://binyaneitan.com/he/legal",
    languages: { en: "https://binyaneitan.com/en/legal" },
  },
};

export default function HeLegalPage() {
  return <LegalPage />;
}
