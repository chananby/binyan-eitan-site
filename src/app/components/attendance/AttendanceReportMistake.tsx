"use client";

/**
 * AttendanceReportMistake — inline form for the worker portal's history
 * view. Lets the worker flag an existing attendance row as incorrect
 * (optionally proposing a corrected HH:MM time) and ship a reason to the
 * admin for review via /api/worker/corrections.
 *
 * Strings now live in the central T dictionary under the `corr*` prefix
 * so every supported language gets coverage in lockstep with the rest of
 * the attendance flow.
 */

import { useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { T, type Lang } from "./i18n";

export default function AttendanceReportMistake(p: {
  attendanceId: string;
  lang: Lang;
  onCancel: () => void;
  onSent:   () => void; // parent reloads history, swaps button for chip
}) {
  const t = T[p.lang];
  const [proposed, setProposed] = useState("");
  const [reason,   setReason]   = useState("");
  const [busy,     setBusy]     = useState(false);
  const [err,      setErr]      = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) { setErr(t.corrReasonRequired); return; }
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/worker/corrections", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendance_id: p.attendanceId,
          reason:        reason.trim(),
          ...(proposed.trim() ? { proposed_time: proposed.trim() } : {}),
        }),
      });
      if (res.ok) { p.onSent(); return; }
      if (res.status === 429) { setErr(t.corrTooMany); }
      else if (res.status === 409) { setErr(t.corrAlreadyOpen); }
      else if (res.status === 403) { setErr(t.corrOutOfWindow); }
      else if (res.status === 404) { setErr(t.corrRecordNotFound); }
      else if (res.status === 410) { setErr(t.corrRecordDeleted); }
      // Any other status falls through to the localized generic error —
      // deliberately NOT surfacing b.error, which the corrections
      // endpoint currently returns in Hebrew (see worker/corrections/
      // route.ts). Leaking that Hebrew to a Russian/Sinhala/Chinese/
      // Hindi worker would defeat the whole i18n layer.
      else { setErr(t.corrGeneric); }
    } catch {
      setErr(t.corrGeneric);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="bg-amber-50/60 border border-amber-200 p-3 space-y-2.5">
      <p className="font-body text-xs font-semibold text-amber-800">{t.corrTitle}</p>
      <label className="flex flex-col gap-1">
        <span className="text-caption uppercase tracking-wider text-charcoal/70">{t.corrProposedLabel}</span>
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
          required
          className="border border-charcoal/20 bg-white px-2 py-1.5 text-sm focus:outline-none focus:border-accent resize-none"
        />
      </label>
      {err && (
        <p className="flex items-center gap-1.5 text-xs text-red-600">
          <AlertCircle size={12} /> {err}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white py-2 text-xs font-semibold tracking-wider uppercase transition-colors flex items-center justify-center gap-1.5"
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
