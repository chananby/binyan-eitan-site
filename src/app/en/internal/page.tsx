import type { Metadata } from "next";
import InternalPortalEn from "../../components/InternalPortalEn";

export const metadata: Metadata = {
  title: "Staff Portal | Binyan Eitan",
  robots: { index: false, follow: false },
};

export default function StaffPortalEn() {
  return <InternalPortalEn />;
}
