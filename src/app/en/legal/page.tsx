import LegalPage from "../../components/LegalPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Legal Information | Binyan Eitan",
  description:
    "Terms of Use, Privacy Policy, and Accessibility Statement for Binyan Eitan Construction Ltd.",
};

export default function EnLegalPage() {
  return <LegalPage />;
}
