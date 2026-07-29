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
import {
  WORKER_LANG_FLAGS,
  WORKER_LANG_LABEL_HE,
  isWorkerLangCode,
} from "../../../../lib/worker-language";
import { isSuspiciousTimeMove } from "../../../../lib/correction-danger";

// Hebrew label per structured request type — so the admin reads intent at a
// glance instead of free text in the worker's language.
const REQ_TYPE_LABEL: Record<string, string> = {
  missing_exit:  "שכח להחתים יציאה",
  missing_entry: "שכח להחתים כניסה",
  fix_time:      "שעה שגויה",
};

// For the ADD types, the action badge names what will be ADDED — so it agrees
// with the type tag above instead of showing the linked record's opposite
// action (which read as a contradiction: "forgot exit" + a green "כניסה" chip).
const ADD_BADGE_LABEL: Record<string, string> = {
  missing_exit:  "הוספת יציאה",
  missing_entry: "הוספת כניסה",
};
// The word for the row being ADDED, per type.
const ADD_WORD: Record<string, string> = {
  missing_exit:  "יציאה",
  missing_entry: "כניסה",
};

export interface CorrectionRequest {
  id: string;
  attendance_id: string;
  staff_id: string;
  proposed_time: string | null;
  reason: string;
  status: string;
  request_type?: string | null;
  month_count?: number | null;
  created_at: string;
  attendance: {
    id: string;
    action: string;
    clock_at: string | null;
    timestamp_label: string | null;
    project_id: string | null;
  } | null;
  staff: { id: string; name: string; phone: string; language?: string | null } | null;
}

function actionLabel(action: string): string {
  return action === "in" || action === "כניסה" ? "כניסה"
       : action === "out" || action === "יציאה" ? "יציאה"
       : action;
}

// Split the original record into a short date ("5.5.26") and a HH:MM time, so
// the card can render a compact "action date:  old → requested" line. Falls
// back to timestamp_label when clock_at is missing (older rows).
function clockParts(att: CorrectionRequest["attendance"]): { date: string; time: string } {
  if (att?.clock_at) {
    const d = new Date(att.clock_at);
    return {
      date: d.toLocaleDateString("he-IL", { timeZone: "Asia/Jerusalem", day: "numeric", month: "numeric", year: "2-digit" }),
      time: d.toLocaleTimeString("he-IL", { timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit", hour12: false }),
    };
  }
  return { date: "", time: att?.timestamp_label ?? "—" };
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

  // On-demand Hebrew translation of the (often foreign-language) reason, keyed
  // by request id. Shown ALONGSIDE the original, never replacing it.
  const [tx, setTx] = useState<Record<string, { loading: boolean; text?: string; error?: string }>>({});

  async function translate(r: CorrectionRequest) {
    if (!r.reason || tx[r.id]?.loading || tx[r.id]?.text) return;
    const langLabel = isWorkerLangCode(r.staff?.language) && r.staff!.language !== "he"
      ? WORKER_LANG_LABEL_HE[r.staff!.language as "en" | "ru" | "si" | "zh" | "hi"]
      : undefined;
    setTx((s) => ({ ...s, [r.id]: { loading: true } }));
    try {
      const res = await fetch("/api/admin/attendance/corrections/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: r.reason, sourceLangLabel: langLabel }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "התרגום נכשל");
      setTx((s) => ({ ...s, [r.id]: { loading: false, text: data.translation } }));
    } catch (e) {
      setTx((s) => ({ ...s, [r.id]: { loading: false, error: e instanceof Error ? e.message : "התרגום נכשל" } }));
    }
  }

  async function resolve(id: string, status: "approved" | "rejected", confirmMsg?: string) {
    if (pending) return;
    // Money-critical: a suspicious entry-move demands an explicit confirm so a
    // mis-filed "forgot exit" can't silently destroy a shift on approval.
    if (status === "approved" && confirmMsg && !window.confirm(confirmMsg)) return;
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
          className="flex items-center gap-1 text-xs text-charcoal/70 hover:text-accent transition-colors">
          <RefreshCw size={12} strokeWidth={1.5} /> רענן
        </button>
      </div>

      {p.loading && <p className="text-sm text-charcoal/70 text-center py-4">טוען...</p>}
      {p.error && (
        <p className="text-xs text-red-500 flex items-center gap-1.5">
          <AlertCircle size={12} /> {p.error}
        </p>
      )}
      {!p.loading && !p.error && p.requests.length === 0 && (
        <p className="text-sm text-charcoal/70 text-center py-4">אין בקשות תיקון פתוחות</p>
      )}

      {!p.loading && p.requests.length > 0 && (
        <div className="divide-y divide-charcoal/15">
          {p.requests.map((r) => {
            const { date, time } = clockParts(r.attendance);
            const act = actionLabel(r.attendance?.action ?? "");
            const reqType = r.request_type || "fix_time";
            const typeLabel = REQ_TYPE_LABEL[reqType] ?? "";
            // missing_* are ADDITIONS (a new row), not edits — so no strikethrough
            // and the linked record is shown as CONTEXT, not a value that changes.
            const isAdd = reqType === "missing_exit" || reqType === "missing_entry";
            const addWord = ADD_WORD[reqType]; // "יציאה" / "כניסה" being added
            // Danger = a fix_time (or legacy null) that would move an ENTRY to
            // a suspicious time. missing_* types ADD rows, never destructive.
            const danger =
              (reqType === "fix_time") &&
              isSuspiciousTimeMove(r.attendance?.action ?? "", r.attendance?.clock_at ?? null, r.proposed_time);
            const confirmMsg = danger
              ? `⚠ פעולה זו תזיז כניסה מ-${time} ל-${r.proposed_time}. ייתכן שהעובד התכוון ל"יציאה חסרה". להמשיך?`
              : undefined;
            return (
            <div key={r.id} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-1.5">
                  {/* מי + סוג הבקשה (תווית עברית) + פעולה + תאריך */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold">{r.staff?.name ?? "—"}</p>
                    {isWorkerLangCode(r.staff?.language) && r.staff!.language !== "he" && (
                      <span
                        className="text-caption text-charcoal/70 px-1 py-0.5 rounded bg-charcoal/[0.06] tabular-nums"
                        title={`שפת פורטל: ${WORKER_LANG_LABEL_HE[r.staff!.language as "en" | "ru" | "si" | "zh" | "hi"]}`}
                      >
                        {WORKER_LANG_FLAGS[r.staff!.language as "en" | "ru" | "si" | "zh" | "hi"]} {r.staff!.language!.toUpperCase()}
                      </span>
                    )}
                    {typeLabel && (
                      <span className="text-caption font-semibold px-1.5 py-0.5 bg-charcoal/[0.07] text-charcoal/80 rounded">
                        {typeLabel}
                      </span>
                    )}
                    {/* Badge: for ADD types it names what's being added (agrees
                        with the type tag); for fix_time it's the record's action
                        being changed. */}
                    {isAdd ? (
                      <span className={`text-caption font-semibold px-1.5 py-0.5 rounded
                        ${addWord === "כניסה" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                        {ADD_BADGE_LABEL[reqType]}
                      </span>
                    ) : (
                      <span className={`text-caption font-semibold px-1.5 py-0.5
                        ${act === "כניסה" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                        {act}
                      </span>
                    )}
                    {date && <span className="text-caption text-charcoal/70 tabular-nums">{date}</span>}
                    {/* Monthly correction count for this worker (all statuses).
                        Awareness only — never blocks. Amber at 3+ so chnn spots
                        a worker who leans on corrections too often. */}
                    {(() => {
                      const n = r.month_count ?? 1;
                      return (
                        <span
                          className={`text-caption font-semibold px-1.5 py-0.5 rounded ${
                            n >= 3 ? "bg-amber-100 text-amber-800" : "bg-charcoal/[0.06] text-charcoal/60"
                          }`}
                          title="מספר בקשות התיקון של העובד בחודש זה (כל הסטטוסים)"
                        >
                          בקשה {n} החודש
                        </span>
                      );
                    })()}
                  </div>

                  {/* מה מבוקש — תצוגה נפרדת לכל סוג */}
                  {isAdd ? (
                    /* ADD: the existing record is CONTEXT (no strikethrough); the
                       proposed time is the NEW row being added. */
                    <div className="flex items-center gap-2 flex-wrap text-sm">
                      <span className="text-charcoal/60">
                        {act} קיימת <span className="tabular-nums" dir="ltr">{time}</span>
                      </span>
                      <span className="text-charcoal/30">·</span>
                      <span className="font-bold text-amber-700">
                        הוסף {addWord}{r.proposed_time && <> <span className="tabular-nums" dir="ltr">{r.proposed_time}</span></>}
                      </span>
                    </div>
                  ) : r.proposed_time ? (
                    /* fix_time: a real change. RTL container → old (strikethrough)
                       is read first on the right, the ← points to the requested
                       new value on the left. Each time is dir="ltr" so digits
                       render correctly. */
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-charcoal/60 tabular-nums line-through" dir="ltr">{time}</span>
                      <span className="text-charcoal/40 text-base leading-none">←</span>
                      <span className="text-base font-bold text-amber-700 tabular-nums" dir="ltr">{r.proposed_time}</span>
                    </div>
                  ) : (
                    <p className="text-caption text-charcoal/70" dir="ltr">
                      רשומה: <span className="tabular-nums">{time}</span>
                    </p>
                  )}

                  {/* דגל סכנה — הזזת כניסה חשודה */}
                  {danger && (
                    <div className="flex items-start gap-1.5 bg-red-50 border border-red-300 text-red-700 px-2 py-1.5 text-caption leading-snug font-semibold">
                      <AlertTriangle size={13} strokeWidth={2} className="shrink-0 mt-0.5" />
                      <span>⚠ זה יזיז כניסה מ-{time} ל-{r.proposed_time} — ייתכן שהעובד התכוון ל&quot;יציאה חסרה&quot;. בדוק לפני אישור.</span>
                    </div>
                  )}

                  {/* למה (אם נכתב) + כפתור תרגום on-demand */}
                  {r.reason && (
                    <div className="text-caption text-charcoal/70 leading-snug">
                      <span className="text-charcoal/70">סיבה: </span>{r.reason}
                      {/* Offer translate when the worker's portal language isn't
                          Hebrew (or is unknown) — the reason is likely foreign. */}
                      {r.staff?.language !== "he" && !tx[r.id]?.text && (
                        <button
                          type="button"
                          onClick={() => translate(r)}
                          disabled={tx[r.id]?.loading}
                          className="ms-2 text-accent underline underline-offset-2 hover:text-accent-dark disabled:opacity-50"
                        >
                          {tx[r.id]?.loading ? "מתרגם…" : "תרגם"}
                        </button>
                      )}
                      {tx[r.id]?.error && (
                        <span className="ms-2 text-red-500">{tx[r.id]!.error}</span>
                      )}
                      {tx[r.id]?.text && (
                        <p className="mt-1 bg-charcoal/[0.04] px-2 py-1 rounded text-charcoal/80">
                          <span className="text-charcoal/50">תרגום: </span>{tx[r.id]!.text}
                        </p>
                      )}
                    </div>
                  )}

                  {/* מתי הוגש */}
                  <p className="text-caption text-charcoal/70">
                    הוגש: {new Date(r.created_at).toLocaleString("he-IL", {
                      timeZone: "Asia/Jerusalem",
                      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => resolve(r.id, "approved", confirmMsg)} disabled={pending !== null}
                    className={`text-[0.75rem] font-semibold border px-2.5 py-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      danger
                        ? "border-red-300 text-red-700 hover:bg-red-600 hover:text-white"
                        : "border-green-200 text-green-700 hover:bg-green-600 hover:text-white"
                    }`}>
                    {pending === r.id ? <Loader2 size={11} className="animate-spin" /> : (danger ? "אשר בכל זאת" : "אשר")}
                  </button>
                  <button onClick={() => resolve(r.id, "rejected")} disabled={pending !== null}
                    className="text-[0.75rem] font-semibold border border-red-200 text-red-500 hover:bg-red-500 hover:text-white px-2.5 py-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    {pending === r.id ? <Loader2 size={11} className="animate-spin" /> : "דחה"}
                  </button>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
