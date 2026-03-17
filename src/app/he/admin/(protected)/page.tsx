import type { Metadata } from "next";
import { createServerClient } from "../../../../lib/supabase";
import AdminDashboard from "../../../components/AdminDashboard";

export const metadata: Metadata = {
  title: "ניהול | בנין איתן",
  robots: { index: false, follow: false },
};

// Fetch initial data server-side for fast first render.
// The client component can re-fetch independently for live updates.
async function getInitialData() {
  try {
    const supabase = createServerClient();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [staffRes, attendanceRes] = await Promise.allSettled([
      supabase
        .from("staff")
        .select("id, name, phone, role, active")
        .order("active", { ascending: false })
        .order("name", { ascending: true }),
      supabase
        .from("attendance")
        .select("id, action, timestamp_label, recorded_at, staff:staff_id(id, name, phone)")
        .gte("recorded_at", todayStart.toISOString())
        .order("recorded_at", { ascending: false }),
    ]);

    // Supabase returns FK joins as arrays; cast to the shape AdminDashboard expects
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toAny = (v: unknown) => (v ?? []) as any[];
    return {
      initialStaff: toAny(staffRes.status === "fulfilled" ? staffRes.value.data : null),
      initialAttendance: toAny(attendanceRes.status === "fulfilled" ? attendanceRes.value.data : null),
    };
  } catch {
    return { initialStaff: [], initialAttendance: [] };
  }
}

export default async function AdminPage() {
  const { initialStaff, initialAttendance } = await getInitialData();
  return <AdminDashboard initialStaff={initialStaff} initialAttendance={initialAttendance} />;
}
