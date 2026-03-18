import type { Metadata } from "next";
import AttendanceForm from "../../../components/AttendanceForm";

export const metadata: Metadata = {
  title: "Attendance Clock",
  robots: { index: false, follow: false },
};

export default function AttendancePage() {
  return <AttendanceForm lang="en" />;
}
