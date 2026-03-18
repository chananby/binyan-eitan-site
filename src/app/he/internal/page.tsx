import type { Metadata } from "next";
import InternalPortalHe from "../../components/InternalPortalHe";

export const metadata: Metadata = {
  title: "אזור צוות",
  robots: { index: false, follow: false },
};

export default function StaffPortalHe() {
  return <InternalPortalHe />;
}
