import { NextResponse } from "next/server";

export const runtime = "nodejs";

// POST /api/worker/manual-entry — REMOVED (returns 410 Gone).
//
// Worker-side manual entry was deprecated: forgotten clocks now go
// through the foreman, who submits a pending row via
// /api/admin/attendance/manual. The endpoint stays reachable so any
// legacy client still pointing here gets an actionable error rather
// than a confusing 404, and so the URL can't be silently repurposed.
//
// Client handling: AttendanceForm no longer calls this route. If the
// frontend is ever changed to hit it again, it should treat 410 as a
// terminal state and display T[lang].manualEntryDisabled — same rule
// as any other "flow removed" endpoint.
export async function POST(): Promise<NextResponse> {
  return NextResponse.json(
    {
      success: false,
      error: "manual_entry_disabled",
      message: "הזנה ידנית עצמאית של עובד הוסרה. פנה למנהל העבודה.",
    },
    { status: 410 },
  );
}
