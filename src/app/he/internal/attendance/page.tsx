import type { Metadata } from "next";
import AttendanceForm from "../../../components/AttendanceForm";

export const metadata: Metadata = {
  title: "שעון נוכחות",
  robots: { index: false, follow: false },
};

export default function AttendancePage() {
  return <AttendanceForm siteLang="he" />;
}
