import type { Metadata } from "next";
import AdminPortal from "../components/AdminPortal";

export const metadata: Metadata = {
  title: "ניהול | בניין איתן",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminPortal />;
}
