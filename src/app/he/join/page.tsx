import type { Metadata } from "next";
import JoinRequestForm from "./JoinRequestForm";

export const metadata: Metadata = {
  title: "בקשת הצטרפות",
  description: "בקשת הצטרפות לצוות בניין איתן — שלח את פרטיך וניצור איתך קשר.",
  robots: { index: false, follow: false },
};

export default function HeJoinPage() {
  return <JoinRequestForm />;
}
