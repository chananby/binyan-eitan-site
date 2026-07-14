"use client";

/**
 * AttendanceReportMistake — inline form for the worker portal's history
 * view. The worker first picks WHAT happened (structured request_type):
 *   • missing_exit  — forgot to clock out  → admin ADDS an exit
 *   • missing_entry — forgot to clock in   → admin ADDS an entry
 *   • fix_time      — a recorded time is wrong → admin rewrites that row
 * then supplies the time and (optionally) a reason. The structured type is
 * what fixes the old trap: a "forgot exit" no longer masquerades as a
 * clock-in time change, and the admin sees a translated label instead of
 * free text in the worker's language.
 *
 * Strings live in the central T dictionary under the `corr*` prefix so every
 * supported language gets coverage in lockstep with the rest of the flow.
 */

import { useEffect, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { T, type Lang } from "./i18n";

type ReqType = "missing_exit" | "missing_entry" | "fix_time";

export default function AttendanceReportMistake(p: {
  attendanceId: string;
  lang: Lang;
  onCancel: () => void;
  onSent:   () => void; // parent reloads history, swaps button for chip
}) {
  const t = T[p.lang];
  const [reqType,  setReqType]  = useState<ReqType | null>(null);
  const [proposed, setProposed] = useState("");
  const [reason,   setReason]   = useState("");
  const [busy,     setBusy]     = useState(false);
  const [err,      setErr]      = useState<string | null>(null);
  // Existing correction count this month (all statuses). Awareness only —
  // never blocks. The upcoming request would be monthCount + 1.
  const [monthCount, setMonthCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/worker/corrections", { method: "GET" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d && typeof d.month_count === "number") setMonthCount(d.month_count); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Time is REQUIRED for the "missing" types (we need it to create the row);
  // optional for a plain time fix.
  const timeRequired = reqType === "missing_exit" || reqType === "missing_entry";
  const timeLabel =
    reqType === "missing_exit"  ? t.corrTimeExitLabel  :
    reqType === "missing_entry" ? t.corrTimeEntryLabel :
                                  t.corrProposedLabel;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!reqType) return; // submit is disabled until a type is chosen
    if (timeRequired && !proposed.trim()) { setErr(t.corrTimeRequired); return; }
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/worker/corrections", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendance_id: p.attendanceId,
          request_type:  reqType,
          ...(proposed.trim() ? { proposed_time: proposed.trim() } : {}),
          ...(reason.trim()   ? { reason: reason.trim() }          : {}),
        }),
      });
      if (res.ok) { p.onSent(); return; }
      const b = await res.json().catch(() => ({}));
      // Map machine `code` → localized string. We deliberately never surface
      // b.error, which the endpoint returns in Hebrew (would leak to a
      // Russian/Sinhala/Chinese/Hindi worker and defeat the i18n layer).
      if (res.status === 429) setErr(t.corrTooMany);
      else if (res.status === 409 && b.code === "day_has_exit")  setErr(t.corrDayHasExit);
      else if (res.status === 409 && b.code === "day_has_entry") setErr(t.corrDayHasEntry);
      else if (res.status === 409) setErr(t.corrAlreadyOpen);
      else if (res.status === 400 && b.code === "time_required") setErr(t.corrTimeRequired);
      else if (res.status === 403) setErr(t.corrOutOfWindow);
      else if (res.status === 404) setErr(t.corrRecordNotFound);
      else if (res.status === 410) setErr(t.corrRecordDeleted);
      else setErr(t.corrGeneric);
    } catch {
      setErr(t.corrGeneric);
    } finally {
      setBusy(false);
    }
  }

  const TYPE_OPTIONS: { value: ReqType; label: string }[] = [
    { value: "missing_exit",  label: t.corrTypeMissingExit },
    { value: "missing_entry", label: t.corrTypeMissingEntry },
    { value: "fix_time",      label: t.corrTypeFixTime },
  ];

  return (
    <form onSubmit={submit} className="bg-amber-50/60 border border-amber-200 p-3 space-y-2.5">
      <p className="font-body text-xs font-semibold text-amber-800">{t.corrTitle}</p>

      {/* Monthly awareness — never blocks. Stronger (but still encouraging)
          copy from the 3rd request on. */}
      {monthCount != null && (() => {
        const num = monthCount + 1;
        const msg = (num >= 3 ? t.corrCountHigh : t.corrCountNormal).replace("{n}", String(num));
        return (
          <p className={`text-caption leading-snug ${num >= 3 ? "text-amber-800 font-semibold" : "text-charcoal/60"}`}>
            {msg}
          </p>
        );
      })()}

      {/* Step 1 — what happened (structured type). */}
      <div className="space-y-1.5">
        <span className="text-caption uppercase tracking-wider text-charcoal/70">{t.corrTypeTitle}</span>
        <div className="grid gap-1.5">
          {TYPE_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => { setReqType(o.value); setErr(null); }}
              aria-pressed={reqType === o.value}
              className={`text-start text-sm px-3 py-2 border transition-colors ${
                reqType === o.value
                  ? "border-amber-500 bg-amber-100 text-amber-900 font-semibold"
                  : "border-charcoal/20 bg-white text-charcoal/80 hover:border-amber-400"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Step 2 — time (required for the "missing" types) + optional reason.
          Hidden until a type is picked so the flow reads top-to-bottom. */}
      {reqType && (
        <>
          <label className="flex flex-col gap-1">
            <span className="text-caption uppercase tracking-wider text-charcoal/70">{timeLabel}</span>
            <input
              type="time"
              value={proposed}
              onChange={(e) => setProposed(e.target.value)}
              className="border border-charcoal/20 bg-white px-2 py-1.5 text-sm focus:outline-none focus:border-accent"
              dir="ltr"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-caption uppercase tracking-wider text-charcoal/70">{t.corrReasonLabel}</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t.corrReasonPlaceholder}
              rows={2}
              className="border border-charcoal/20 bg-white px-2 py-1.5 text-sm focus:outline-none focus:border-accent resize-none"
            />
          </label>
        </>
      )}

      {err && (
        <p className="flex items-center gap-1.5 text-xs text-red-600">
          <AlertCircle size={12} /> {err}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy || !reqType}
          className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white py-2 text-xs font-semibold tracking-wider uppercase transition-colors flex items-center justify-center gap-1.5"
        >
          {busy ? <><Loader2 size={12} className="animate-spin" /> {t.corrSending}</> : t.corrSubmit}
        </button>
        <button
          type="button"
          onClick={p.onCancel}
          disabled={busy}
          className="flex-1 border border-charcoal/15 text-charcoal/70 py-2 text-xs font-semibold tracking-wider uppercase hover:border-accent hover:text-accent disabled:opacity-40 transition-colors"
        >
          {t.corrCancel}
        </button>
      </div>
    </form>
  );
}
