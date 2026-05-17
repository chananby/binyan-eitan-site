import type { Metadata } from "next";
import dynamic from "next/dynamic";

const AdminPortal = dynamic(() => import("../components/AdminPortal"), { ssr: false });

export const metadata: Metadata = {
  title: "ניהול | בניין איתן",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminPortal />;
}
