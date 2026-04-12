import type { Metadata } from "next";
import dynamic from "next/dynamic";

const AttendanceForm = dynamic(() => import("../../../components/AttendanceForm"), { ssr: false });

export const metadata: Metadata = {
  title: "Attendance Clock",
  robots: { index: false, follow: false },
};

export default function AttendancePage() {
  return <AttendanceForm siteLang="en" />;
}
