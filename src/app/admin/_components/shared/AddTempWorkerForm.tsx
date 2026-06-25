"use client";

/**
 * AddTempWorkerForm — collapsible form to add a temporary day-laborer
 * (פועל יומי) to the weekly schedule.
 *
 * The temp doesn't exist in the staff table or in any registry — they
 * exist by having at least one row in schedule_assignments. So the
 * form REQUIRES name + day + site: submitting commits one row to DB,
 * the temp appears as a table row on the next reload, and the row
 * survives refresh by virtue of being in DB.
 *
 * Mirrors the workers-add accordion shape (closed by default, ChevronUp/
 * Down, no localStorage) and the BoardManualEntry pattern from the
 * live board (free-text name + project picker).
 */

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, UserPlus } from "lucide-react";

interface ProjectRef       { id: string; name: string }
interface ManualProjectRef { id: string; name: string }

interface Props {
  days: string[];
  dayLabels: string[];                // matched to `days` by index, e.g. ["ראשון 12.7", ...]
  projects: ProjectRef[];
  manualProjects: ManualProjectRef[];
  /** Called when the admin submits. Parent fires POST + reload. */
  onAdd: (input: {
    name: string;
    date: string;
    project_id?: string;
    project_name?: string;
  }) => Promise<{ ok: true } | { ok: false; error?: string }>;
}

export default function AddTempWorkerForm({
  days, dayLabels, projects, manualProjects, onAdd,
}: Props) {
  const [open,    setOpen]    = useState(false);
  const [name,    setName]    = useState("");
  const [date,    setDate]    = useState(days[0] ?? "");
  // Target uses the same encoded id pattern as the live board's
  // BoardManualEntry — "project:<uuid>" for a real project, "manual:<name>"
  // for a persistent manual site. Parent decodes before POSTing.
  const [target,  setTarget]  = useState("");
  const [busy,    setBusy]    = useState(false);
  const [msg,     setMsg]     = useState<string | null>(null);

  // Keep `date` valid when the week changes from outside.
  useEffect(() => {
    if (!days.includes(date)) setDate(days[0] ?? "");
  }, [days, date]);

  // Auto-close on success — mirrors the workers-add accordion pattern.
  useEffect(() => { if (msg?.startsWith("✓")) setOpen(false); }, [msg]);

  const ready = name.trim().length > 0 && date && target;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setMsg(null);
    let payload: Parameters<typeof onAdd>[0];
    if (target.startsWith("project:")) {
      payload = { name: name.trim(), date, project_id:   target.slice("project:".length) };
    } else if (target.startsWith("manual:")) {
      payload = { name: name.trim(), date, project_name: target.slice("manual:".length) };
    } else {
      setMsg("יעד לא תקין");
      setBusy(false);
      return;
    }
    const res = await onAdd(payload);
    setBusy(false);
    if (res.ok) {
      setMsg("✓ " + name.trim() + " נוסף");
      setName("");
      setTarget("");
    } else {
      setMsg("שגיאה: " + (res.error ?? "כשל"));
    }
  }

  return (
    <div className="bg-white border border-warm-gray-light rounded-md">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 hover:opacity-80 transition-opacity"
        aria-expanded={open}
      >
        <UserPlus size={16} strokeWidth={1.5} className="text-amber-600 shrink-0" />
        <h3 className="font-heading text-sm font-bold text-charcoal flex-1 text-start">
          הוסף פועל יומי
        </h3>
        {open
          ? <ChevronUp   size={16} strokeWidth={1.5} className="text-charcoal/70" />
          : <ChevronDown size={16} strokeWidth={1.5} className="text-charcoal/70" />}
      </button>

      {open && (
        <form onSubmit={submit} className="border-t border-warm-gray-light px-3 py-3 space-y-2">
          <p className="text-[0.7rem] text-charcoal/65 leading-snug">
            שם + יום + אתר נשלחים יחד — הפועל מופיע בטבלה אחרי הוספה.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[0.65rem] text-charcoal/70 mb-1">שם</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
                placeholder="למשל: פועל יומי, אבי הזמני"
                className="w-full border border-charcoal/15 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-[0.65rem] text-charcoal/70 mb-1">יום</label>
              <select
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-charcoal/15 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-accent"
              >
                {days.map((d, i) => (
                  <option key={d} value={d}>{dayLabels[i] ?? d}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[0.65rem] text-charcoal/70 mb-1">אתר</label>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full border border-charcoal/15 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-accent"
            >
              <option value="">— בחר אתר —</option>
              {projects.map((p) => (
                <option key={"r-" + p.id} value={"project:" + p.id}>{p.name}</option>
              ))}
              {manualProjects.map((mp) => (
                <option key={"m-" + mp.id} value={"manual:" + mp.name}>
                  {mp.name} (ידני)
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={busy || !ready}
            className="w-full bg-amber-500 text-white py-2 rounded text-sm font-semibold hover:bg-amber-600 disabled:opacity-40 transition-colors"
          >
            {busy ? "מוסיף..." : "הוסף פועל יומי"}
          </button>

          {msg && (
            <p className={`text-xs ${msg.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>{msg}</p>
          )}
        </form>
      )}
    </div>
  );
}
