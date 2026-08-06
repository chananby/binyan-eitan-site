"use client";

/**
 * IncompletePanel — "מרכז החוסרים", the dedicated screen for the attendance
 * incompleteness engine. Shows EVERY incomplete day (default 3 months, not
 * tied to a payroll month), grouped by issue type, each row with a one-click
 * fix. The parent owns the fetch (from /api/admin/attendance/incomplete) and
 * the assign-project handler; this view is presentation only.
 *
 * Fix routing per issue:
 *   • no_project             → inline project picker → PATCH the entry
 *   • pending_correction/_manual → approval queue (live sub-tab)
 *   • no_exit/no_entry/stuck → the worker's history for that day (where
 *                              "השלם יציאה"/"השלם כניסה"/"הוסף יום" live)
 */

import React, { useState } from "react";
import { AlertTriangle, RefreshCw, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card } from "./Card";
import DistanceFlag from "./DistanceFlag";
import type {
  IncompleteItem,
  IncompleteIssue,
  IncompleteSummary,
} from "../../../../lib/attendance-incompleteness";

// Location of the existing clock-in on an incomplete day. Only meaningful for
// no_exit / no_entry (there IS one clock-in — the entry that wasn't closed, or
// the orphan exit — and its GPS says whether the worker was on site). Reuses
// DistanceFlag; phone/manual clock-ins (no GPS) get a neutral tag, not "missing".
function IncompleteLocation({ it, threshold }: { it: IncompleteItem; threshold: number }) {
  if (it.issue !== "no_exit" && it.issue !== "no_entry") return null;
  if (it.lat && it.lng) return <DistanceFlag r={it} threshold={threshold} />;
  // A row with a known no-GPS source is expected (phone/manual), not broken.
  if (it.source) {
    return (
      <span className="text-[0.75rem] font-semibold px-1.5 py-0.5 shrink-0 bg-charcoal/[0.04] text-charcoal/50"
        title="החתמה ללא נתוני מיקום (טלפון/ידני)">ללא GPS</span>
    );
  }
  return null;
}

const ISSUE_LABEL: Record<IncompleteIssue, string> = {
  stuck_failure:      "כשל החתמה",
  no_project:         "ללא פרויקט",
  no_exit:            "ללא יציאה",
  no_entry:           "ללא כניסה",
  pending_correction: "בקשת תיקון ממתינה",
  pending_manual:     "ממתין אישור",
};

// Render order — most-urgent / most-common first.
const ISSUE_ORDER: IncompleteIssue[] = [
  "stuck_failure", "no_project", "no_exit", "no_entry", "pending_correction", "pending_manual",
];

// Short Hebrew label per attendance_failures.error_code, so a "כשל החתמה" row
// says WHAT failed instead of leaving the admin to guess.
const FAILURE_CODE_LABEL: Record<string, string> = {
  gps_out_of_range:                "מחוץ לרדיוס",
  location_required:               "אין מיקום",
  no_open_entry_to_close:          "יציאה בלי כניסה פתוחה",
  account_inactive:                "חשבון מושבת",
  monthly_remote_exit_cap_reached: "חריגת מכסת יציאה מרחוק",
  server_error:                    "תקלת שרת",
};

// The suggested-fix wording for the row's action button, chosen so it never
// pushes "add a day" for a failure where that would double-count. All of these
// still open the worker's history for that day — a safe review screen — so the
// admin decides there; only the guidance changes.
const FAILURE_ACTION_LABEL: Record<string, string> = {
  gps_out_of_range:                "הוסף יום ←",
  location_required:               "הוסף יום ←",
  no_open_entry_to_close:          "בדוק/השלם כניסה ←",
  monthly_remote_exit_cap_reached: "השלם יציאה ←",
  account_inactive:                "בדוק חשבון ←",
  server_error:                    "בדוק (ייתכן שנרשם) ←",
};

const APPROVAL_ISSUES = new Set<IncompleteIssue>(["pending_correction", "pending_manual"]);

function fmtDate(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  return `${d}.${m}.${y.slice(2)}`;
}

export default function IncompletePanel(p: {
  items: IncompleteItem[];
  summary: IncompleteSummary | null;
  loading: boolean;
  error: string | null;
  onReload: () => void;
  activeProjects: { id: string; name: string }[];
  onViewWorkerHistoryForDay: (staffId: string, ymd: string) => void;
  onGoToApprovals: () => void;
  onAssignProject: (attendanceId: string, projectId: string) => Promise<boolean>;
  /** Visual "far" threshold (m) for the location flag; matches the live board. */
  farThresholdM?: number;
}) {
  const farThresholdM = p.farThresholdM ?? 500;
  // ref_id currently being assigned a project (spinner + disable).
  const [assigning, setAssigning] = useState<string | null>(null);

  async function assign(refId: string, projectId: string) {
    if (!projectId || assigning) return;
    setAssigning(refId);
    try { await p.onAssignProject(refId, projectId); }
    finally { setAssigning(null); }
  }

  const byIssue = new Map<IncompleteIssue, IncompleteItem[]>();
  for (const it of p.items) {
    if (!byIssue.has(it.issue)) byIssue.set(it.issue, []);
    byIssue.get(it.issue)!.push(it);
  }
  const groups = ISSUE_ORDER.filter((iss) => (byIssue.get(iss)?.length ?? 0) > 0);

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={15} strokeWidth={1.5} className="text-amber-500" />
          <h2 className="font-heading text-base font-bold">מרכז החוסרים</h2>
        </div>
        <button onClick={p.onReload}
          className="flex items-center gap-1 text-micro text-charcoal/70 hover:text-accent transition-colors">
          <RefreshCw size={12} strokeWidth={1.5} className={p.loading ? "animate-spin" : ""} /> רענן
        </button>
      </div>

      <p className="text-caption text-muted mb-3">
        כל הימים הלא-שלמים ב-3 החודשים האחרונים — רשומות פגומות שעלולות להשפיע על השכר. כל שורה מובילה לתיקון.
      </p>

      {/* Summary line */}
      {p.summary && p.summary.day_count > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption mb-3 pb-3 border-b border-charcoal/10">
          <span className="font-bold text-charcoal">{p.summary.day_count} ימים לא שלמים</span>
          {ISSUE_ORDER.filter((iss) => (p.summary!.by_issue[iss] ?? 0) > 0).map((iss) => (
            <span key={iss} className="text-charcoal/70">
              {p.summary!.by_issue[iss]} {ISSUE_LABEL[iss]}
            </span>
          ))}
        </div>
      )}

      {p.loading && p.items.length === 0 && (
        <p className="text-caption text-charcoal/70 text-center py-4 flex items-center justify-center gap-1.5">
          <Loader2 size={13} className="animate-spin" /> טוען…
        </p>
      )}
      {p.error && (
        <p className="text-caption text-red-500 flex items-center gap-1.5"><AlertCircle size={12} /> {p.error}</p>
      )}
      {!p.loading && !p.error && p.items.length === 0 && (
        <p className="text-caption text-green-700 text-center py-6 flex items-center justify-center gap-1.5">
          <CheckCircle2 size={15} /> אין ימים לא שלמים — הכל תקין 🎉
        </p>
      )}

      <div className="space-y-4">
        {groups.map((iss) => (
          <div key={iss}>
            <h3 className="text-caption font-bold text-charcoal/80 mb-1.5 flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded">{ISSUE_LABEL[iss]}</span>
              <span className="text-charcoal/60">{byIssue.get(iss)!.length}</span>
            </h3>
            <ul className="divide-y divide-charcoal/10 border border-charcoal/10 rounded-md overflow-hidden">
              {byIssue.get(iss)!.map((it) => (
                <li key={`${it.issue}-${it.ref_id}-${it.staff_id}-${it.date}`}
                  className="flex items-center gap-2 px-2.5 py-1.5 text-content hover:bg-bone/40">
                  <span className="font-semibold min-w-[7rem] truncate">{it.staff_name ?? "—"}</span>
                  <span className="tabular-nums text-charcoal/70" dir="ltr">{fmtDate(it.date)}</span>
                  {it.project_name
                    ? <span className="text-charcoal/60 truncate max-w-[9rem]">{it.project_name}</span>
                    : <span className="text-charcoal/30">—</span>}

                  {/* What exactly failed — only stuck_failure carries an error_code. */}
                  {it.issue === "stuck_failure" && it.error_code && (
                    <span className="px-1.5 py-0.5 rounded bg-charcoal/[0.06] text-charcoal/70 whitespace-nowrap">
                      {FAILURE_CODE_LABEL[it.error_code] ?? it.error_code}
                    </span>
                  )}

                  {/* Location of the existing clock-in (no_exit / no_entry) — is
                      the worker actually on site? */}
                  <IncompleteLocation it={it} threshold={farThresholdM} />

                  <span className="ms-auto">
                    {it.issue === "no_project" ? (
                      <span className="inline-flex items-center gap-1">
                        {assigning === it.ref_id ? (
                          <Loader2 size={12} className="animate-spin text-accent" />
                        ) : (
                          <select
                            defaultValue=""
                            disabled={assigning !== null || !it.ref_id}
                            onChange={(e) => it.ref_id && assign(it.ref_id, e.target.value)}
                            className="border border-charcoal/20 bg-white px-1.5 py-0.5 text-content focus:outline-none focus:border-accent rounded"
                            title="שייך פרויקט לרשומת הכניסה"
                          >
                            <option value="" disabled>שייך פרויקט…</option>
                            {p.activeProjects.map((pr) => (
                              <option key={pr.id} value={pr.id}>{pr.name}</option>
                            ))}
                          </select>
                        )}
                      </span>
                    ) : APPROVAL_ISSUES.has(it.issue) ? (
                      <button type="button" onClick={p.onGoToApprovals}
                        className="font-semibold text-amber-900 underline underline-offset-2 hover:text-accent">
                        לאישור ←
                      </button>
                    ) : (
                      <button type="button" onClick={() => p.onViewWorkerHistoryForDay(it.staff_id, it.date)}
                        className="font-semibold text-amber-900 underline underline-offset-2 hover:text-accent">
                        {it.issue === "stuck_failure"
                          ? (it.error_code === "no_open_entry_to_close"
                              // no_open_entry_to_close's label follows the engine-derived
                              // action: an empty day (blocked OUT, no row) → "add a day";
                              // a lone exit → complete the missing entry.
                              ? (it.action === "add_day" ? "הוסף יום ←" : "בדוק/השלם כניסה ←")
                              : ((it.error_code && FAILURE_ACTION_LABEL[it.error_code]) ?? "בדיקה ←"))
                          : "לתיקון ←"}
                      </button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}
