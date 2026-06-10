"use client";

/**
 * CorrectionRequestsPanel — admin view of worker-submitted correction
 * requests. Sister card to PendingApprovals (which handles manual-entry
 * requests). Sits in AttendanceTab → live sub-tab → near the top so the
 * admin can clear correction backlog before doing anything else.
 *
 * Each request carries:
 *   - worker name, original attendance row (date + time + action),
 *     proposed time (optional), worker's reason.
 * Two actions:
 *   - ✓ אשר   — calls PATCH /api/admin/attendance/corrections/[id]
 *                with status='approved'; the route also updates the
 *                underlying attendance row when proposed_time is set,
 *                with full audit (edited_by, edit_note "תיקון לפי בקשת
 *                עובד: <reason>", original_clock_at on first edit).
 *   - ✗ דחה   — same endpoint, status='rejected'. No DB change to
 *                the attendance row.
 */

import React, { useState } from "react";
import { AlertCircle, AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { Card } from "./Card";

export interface CorrectionRequest {
  id: string;
  attendance_id: string;
  staff_id: string;
  proposed_time: string | null;
  reason: string;
  status: string;
  created_at: string;
  attendance: {
    id: string;
    action: string;
    clock_at: string | null;
    timestamp_label: string | null;
    project_id: string | null;
  } | null;
  staff: { id: string; name: string; phone: string } | null;
}

function actionLabel(action: string): string {
  return action === "in" || action === "כניסה" ? "כניסה"
       : action === "out" || action === "יציאה" ? "יציאה"
       : action;
}

function formatClock(att: CorrectionRequest["attendance"]): string {
  if (!att) return "—";
  if (att.clock_at) {
    return new Date(att.clock_at).toLocaleString("he-IL", {
      timeZone: "Asia/Jerusalem",
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }
  return att.timestamp_label ?? "—";
}

export default function CorrectionRequestsPanel(p: {
  requests: CorrectionRequest[];
  loading: boolean;
  error: string | null;
  onReload: () => void | Promise<void>;
  onResolve: (id: string, status: "approved" | "rejected") => Promise<boolean>;
}) {
  // Tracks which row's button is mid-flight so we can show a spinner
  // without blocking the others.
  const [pending, setPending] = useState<string | null>(null);

  async function resolve(id: string, status: "approved" | "rejected") {
    if (pending) return;
    setPending(id);
    try {
      await p.onResolve(id, status);
    } finally {
      setPending(null);
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle size={15} strokeWidth={1.5} className="text-amber-500" />
          <h2 className="font-heading text-base font-bold">בקשות תיקון מעובדים</h2>
          {p.requests.length > 0 && (
            <span className="bg-amber-100 text-amber-700 text-[0.75rem] font-bold px-2 py-0.5">
              {p.requests.length}
            </span>
          )}
        </div>
        <button onClick={p.onReload}
          className="flex items-center gap-1 text-xs text-charcoal/55 hover:text-accent transition-colors">
          <RefreshCw size={12} strokeWidth={1.5} /> רענן
        </button>
      </div>

      {p.loading && <p className="text-sm text-charcoal/55 text-center py-4">טוען...</p>}
      {p.error && (
        <p className="text-xs text-red-500 flex items-center gap-1.5">
          <AlertCircle size={12} /> {p.error}
        </p>
      )}
      {!p.loading && !p.error && p.requests.length === 0 && (
        <p className="text-sm text-charcoal/55 text-center py-4">אין בקשות תיקון פתוחות</p>
      )}

      {!p.loading && p.requests.length > 0 && (
        <div className="divide-y divide-charcoal/5">
          {p.requests.map((r) => (
            <div key={r.id} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold">{r.staff?.name ?? "—"}</p>
                    <span className={`text-[0.75rem] font-semibold px-1.5 py-0.5
                      ${actionLabel(r.attendance?.action ?? "") === "כניסה"
                        ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                      {actionLabel(r.attendance?.action ?? "")}
                    </span>
                  </div>
                  <p className="text-[0.75rem] text-charcoal/55" dir="ltr">
                    רשומה מקורית: <span className="tabular-nums">{formatClock(r.attendance)}</span>
                  </p>
                  {r.proposed_time && (
                    <p className="text-[0.75rem] text-amber-700">
                      שעה מוצעת: <span className="tabular-nums font-semibold" dir="ltr">{r.proposed_time}</span>
                    </p>
                  )}
                  <p className="text-[0.75rem] text-charcoal/70 leading-snug pt-0.5">
                    <span className="text-charcoal/55">סיבה: </span>{r.reason}
                  </p>
                  <p className="text-[0.65rem] text-charcoal/55">
                    הוגש: {new Date(r.created_at).toLocaleString("he-IL", {
                      timeZone: "Asia/Jerusalem",
                      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => resolve(r.id, "approved")} disabled={pending !== null}
                    className="text-[0.75rem] font-semibold border border-green-200 text-green-700 hover:bg-green-600 hover:text-white px-2.5 py-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    {pending === r.id ? <Loader2 size={11} className="animate-spin" /> : "אשר"}
                  </button>
                  <button onClick={() => resolve(r.id, "rejected")} disabled={pending !== null}
                    className="text-[0.75rem] font-semibold border border-red-200 text-red-500 hover:bg-red-500 hover:text-white px-2.5 py-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    {pending === r.id ? <Loader2 size={11} className="animate-spin" /> : "דחה"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
