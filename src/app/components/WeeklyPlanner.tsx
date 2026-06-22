"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp, Loader2, AlertCircle, Check } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
// Days in a displayed week. Israeli construction work week is Sun–Thu (5 days);
// Fri/Sat are skipped from the matrix display.
const WEEK_DAYS = 5;

interface WeeklyPlanRow {
  id: string;
  project_id: string;
  week_start: string; // YYYY-MM-DD (Sunday — Israeli week start)
  task_name: string;
  subcontractor: string | null;
  workers_needed: number;
  materials: string | null;
  supplier: string | null;
  order_status: "none" | "ordered" | "in_transit" | "delivered";
  planned_cost: number;
  created_at: string;
}

interface Project { id: string; name: string; status?: string; }

const ORDER_LABELS: Record<string, { label: string; color: string }> = {
  none:        { label: "—",          color: "text-charcoal/30" },
  ordered:     { label: "הוזמן",      color: "text-amber-600" },
  in_transit:  { label: "בדרך",       color: "text-blue-600" },
  delivered:   { label: "סופק ✓",     color: "text-green-600" },
};

const ORDER_OPTIONS = ["none", "ordered", "in_transit", "delivered"] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** YYYY-MM-DD in local timezone. Avoids the TZ shift bug that `toISOString()`
 *  introduces when local time is on one side of midnight and UTC on the other
 *  (e.g. midnight Sun in IL = 22:00 Sat UTC → toISOString would say Saturday). */
function localISODate(d: Date): string {
  return d.toLocaleDateString("sv-SE"); // "sv-SE" gives YYYY-MM-DD format
}

/** Sunday of the week containing `date` (Israeli week start, day 0).
 *  Returns a YYYY-MM-DD string in local time. */
function getSundayLocal(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay()); // back to nearest Sunday (incl. today)
  return localISODate(d);
}

function addWeeks(sundayISO: string, n: number): string {
  const d = new Date(sundayISO + "T12:00:00"); // noon avoids DST edge cases
  d.setDate(d.getDate() + n * 7);
  return localISODate(d);
}

/** "DD.M – DD.M" range for the displayed work week (Sun + WEEK_DAYS-1 = Thu). */
function weekLabel(sundayISO: string): string {
  const d = new Date(sundayISO + "T12:00:00");
  const end = new Date(sundayISO + "T12:00:00");
  end.setDate(end.getDate() + (WEEK_DAYS - 1));
  const fmt = (x: Date) => x.toLocaleDateString("he-IL", { day: "numeric", month: "numeric" });
  return `${fmt(d)} – ${fmt(end)}`;
}

/** Approximate week number for visual anchoring. Not ISO-compliant — the user
 *  has flagged the number itself as unimportant; it's kept so adjacent rows
 *  read as "next/previous week" at a glance. */
function weekNumber(sundayISO: string): number {
  const d = new Date(sundayISO + "T12:00:00");
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const days = Math.floor((d.getTime() - startOfYear.getTime()) / 86400000);
  return Math.ceil((days + startOfYear.getDay() + 1) / 7);
}

function fmt(n: number): string {
  return n.toLocaleString("he-IL", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ── EditableCell ─────────────────────────────────────────────────────────────
// Inline-click-to-edit cell used throughout the matrix. Lives at module scope
// (NOT inside WeeklyPlanner) — defining it inline would give React a new
// component type on every parent render, unmounting+remounting the <input>
// mid-typing and losing focus.

interface EditCtx {
  editId: string | null;
  editField: string | null;
  editVal: string;
  setEditVal: (v: string) => void;
  editRef: React.RefObject<HTMLInputElement | null>;
  startEdit: (rowId: string, field: string, current: string | number) => void;
  commitEdit: (rowId: string, field: string, val: string) => void | Promise<void>;
  cancelEdit: () => void;
}

interface EditableCellProps {
  rowId: string;
  field: string;
  value: string | number;
  type?: string;
  className?: string;
  edit: EditCtx;
}

function EditableCell({ rowId, field, value, type = "text", className = "", edit }: EditableCellProps) {
  const isEditing = edit.editId === rowId && edit.editField === field;
  if (isEditing) {
    return (
      <input
        ref={edit.editRef}
        type={type}
        value={edit.editVal}
        onChange={(e) => edit.setEditVal(e.target.value)}
        onBlur={() => edit.commitEdit(rowId, field, edit.editVal)}
        onKeyDown={(e) => {
          if (e.key === "Enter") edit.commitEdit(rowId, field, edit.editVal);
          if (e.key === "Escape") edit.cancelEdit();
        }}
        className={`w-full bg-accent/[0.06] border-b border-accent px-1 py-0.5 text-xs outline-none ${className}`}
        dir={type === "number" ? "ltr" : "rtl"}
      />
    );
  }
  // 0 is a valid value (e.g. "0 workers planned", "0 cost") so it must render
  // as "0" — not the placeholder dash. Only null / undefined / empty string
  // count as "empty".
  const isEmpty = value === null || value === undefined || value === "";
  return (
    <span
      onClick={() => edit.startEdit(rowId, field, value)}
      className={`block w-full cursor-text min-h-[1.2rem] px-1 py-0.5 hover:bg-accent/[0.05] rounded-sm transition-colors ${className}`}
    >
      {isEmpty
        ? <span className="text-charcoal/20">—</span>
        : (type === "number" ? fmt(Number(value)) : String(value))}
    </span>
  );
}

// ── Empty new-row state ───────────────────────────────────────────────────────
type NewRow = { task_name: string; subcontractor: string; workers_needed: number; materials: string; supplier: string; order_status: WeeklyPlanRow["order_status"]; planned_cost: number };
function emptyNewRow(): NewRow {
  return { task_name: "", subcontractor: "", workers_needed: 0, materials: "", supplier: "", order_status: "none", planned_cost: 0 };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function WeeklyPlanner({ projects }: { projects: Project[] }) {
  const [projectId, setProjectId] = useState<string>(projects[0]?.id ?? "");
  const [rows,      setRows]      = useState<WeeklyPlanRow[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  // Inline editing
  const [editId,    setEditId]    = useState<string | null>(null);
  const [editField, setEditField] = useState<string | null>(null);
  const [editVal,   setEditVal]   = useState<string>("");

  // Adding new row
  const [addingWeek, setAddingWeek] = useState<string | null>(null);
  const [newRow,     setNewRow]     = useState<NewRow>(emptyNewRow());
  const [saving,     setSaving]     = useState(false);

  // Collapsed weeks
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const editRef = useRef<HTMLInputElement | null>(null);

  // ── Derive visible week range ─────────────────────────────────────────────
  const todaySunday = getSundayLocal(new Date());
  const PAST_WEEKS = 4;
  const FUTURE_WEEKS = 12;
  const visibleWeeks: string[] = [];
  for (let i = -PAST_WEEKS; i <= FUTURE_WEEKS; i++) {
    visibleWeeks.push(addWeeks(todaySunday, i));
  }

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async (pid: string) => {
    if (!pid) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/admin/weekly-plan?project_id=${pid}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Load failed");
      setRows(data.rows ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה בטעינה");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (projectId) load(projectId); }, [projectId, load]);

  // ── Inline edit helpers ───────────────────────────────────────────────────
  const startEdit = (rowId: string, field: string, current: string | number) => {
    setEditId(rowId); setEditField(field); setEditVal(String(current ?? ""));
    setTimeout(() => editRef.current?.focus(), 30);
  };

  const commitEdit = async (rowId: string, field: string, val: string) => {
    setEditId(null); setEditField(null);
    const parsed = ["workers_needed", "planned_cost"].includes(field) ? Number(val) || 0 : val || null;
    // Optimistic update
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, [field]: parsed } : r));
    try {
      await fetch(`/api/admin/weekly-plan/${rowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ [field]: parsed }),
      });
    } catch { /* silent — data already updated */ }
  };

  const commitOrderStatus = async (rowId: string, val: string) => {
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, order_status: val as WeeklyPlanRow["order_status"] } : r));
    await fetch(`/api/admin/weekly-plan/${rowId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ order_status: val }),
    });
  };

  const deleteRow = async (rowId: string) => {
    setRows(prev => prev.filter(r => r.id !== rowId));
    await fetch(`/api/admin/weekly-plan/${rowId}`, { method: "DELETE", credentials: "include" });
  };

  // ── Add row ───────────────────────────────────────────────────────────────
  const handleAddRow = async (weekStart: string) => {
    if (!newRow.task_name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/weekly-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ project_id: projectId, week_start: weekStart, ...newRow }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRows(prev => [...prev, data.row]);
      setAddingWeek(null);
      setNewRow(emptyNewRow());
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה בשמירה");
    } finally { setSaving(false); }
  };

  // ── Compute running total ─────────────────────────────────────────────────
  const sortedRowsAll = [...rows].sort((a, b) => a.week_start.localeCompare(b.week_start));
  let cumulative = 0;
  const cumulativeByWeek: Record<string, number> = {};
  const weeksWithRows = [...new Set(sortedRowsAll.map(r => r.week_start))].sort();
  for (const w of weeksWithRows) {
    const weekTotal = rows.filter(r => r.week_start === w).reduce((s, r) => s + (r.planned_cost ?? 0), 0);
    cumulative += weekTotal;
    cumulativeByWeek[w] = cumulative;
  }
  const grandTotal = cumulative;

  // ── Edit context — passed to EditableCell as a single prop ────────────────
  const cancelEdit = useCallback(() => { setEditId(null); setEditField(null); }, []);
  const edit: EditCtx = useMemo(() => ({
    editId, editField, editVal, setEditVal, editRef, startEdit, commitEdit, cancelEdit,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [editId, editField, editVal]);

  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-40 text-charcoal/40 font-body text-sm">
        אין פרויקטים זמינים
      </div>
    );
  }

  return (
    <div className="font-body" dir="rtl">
      {/* ── Header bar ── */}
      <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
        <div>
          <h2 className="text-sm font-bold tracking-wide text-charcoal">מטריצה שבועית</h2>
          <p className="text-[0.75rem] text-charcoal/60 mt-0.5">תכנון משאבים, עלויות וסטטוס הזמנות לפי שבוע</p>
        </div>
        <select
          value={projectId}
          onChange={e => setProjectId(e.target.value)}
          className="text-xs border border-charcoal/15 bg-white px-3 py-1.5 rounded-sm text-charcoal focus:outline-none focus:border-accent"
        >
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* ── Grand total bar ── */}
      <div className="flex items-center justify-between bg-charcoal text-bone px-4 py-2.5 mb-1 rounded-sm">
        <span className="text-[0.75rem] font-bold tracking-[0.15em] uppercase opacity-60">סה״כ תקציב מתוכנן</span>
        <span className="text-base font-bold tracking-wide">₪ {fmt(grandTotal)}</span>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-2 mb-3 text-xs text-red-600 rounded-sm">
          <AlertCircle size={12} /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-32 gap-2 text-charcoal/40 text-xs">
          <Loader2 size={14} className="animate-spin" /> טוען…
        </div>
      ) : (
        /* ── Week sections ── */
        <div className="space-y-1">
          {visibleWeeks.map(weekStart => {
            const isPast    = weekStart < todaySunday;
            const isToday   = weekStart === todaySunday;
            const weekRows  = rows.filter(r => r.week_start === weekStart);
            const weekTotal = weekRows.reduce((s, r) => s + (r.planned_cost ?? 0), 0);
            const cumul     = cumulativeByWeek[weekStart] ?? (Object.entries(cumulativeByWeek).filter(([w]) => w <= weekStart).at(-1)?.[1] ?? 0);
            const isCollapsed = collapsed.has(weekStart);

            // Skip empty past weeks
            if (isPast && weekRows.length === 0) return null;

            return (
              <div
                key={weekStart}
                className={`border rounded-sm overflow-hidden ${
                  isToday  ? "border-accent/60"    :
                  isPast   ? "border-charcoal/10"  :
                             "border-charcoal/10"
                }`}
              >
                {/* Week header */}
                <button
                  onClick={() => setCollapsed(prev => {
                    const next = new Set(prev);
                    next.has(weekStart) ? next.delete(weekStart) : next.add(weekStart);
                    return next;
                  })}
                  className={`w-full flex items-center justify-between px-3 py-2 text-start ${
                    isToday ? "bg-accent/[0.08]" : isPast ? "bg-charcoal/[0.03]" : "bg-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`text-[0.58rem] font-bold tracking-[0.18em] uppercase shrink-0 ${
                      isToday ? "text-accent" : isPast ? "text-charcoal/35" : "text-charcoal/65"
                    }`}>
                      שבוע {weekNumber(weekStart)}
                    </span>
                    <span className={`text-[0.68rem] ${isPast ? "text-charcoal/40" : "text-charcoal/70"}`}>
                      {weekLabel(weekStart)}
                    </span>
                    {isToday && <span className="text-xs bg-accent text-bone px-1.5 py-0.5 rounded-full font-bold">שבוע זה</span>}
                    {isPast  && <span className="text-xs bg-charcoal/10 text-charcoal/65 px-1.5 py-0.5 rounded-full">היסטוריה</span>}
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    {weekTotal > 0 && (
                      <span className={`text-[0.68rem] font-semibold ${isPast ? "text-charcoal/60" : "text-charcoal/80"}`}>
                        ₪ {fmt(weekTotal)}
                      </span>
                    )}
                    {isCollapsed
                      ? <ChevronDown size={13} className="text-charcoal/30" />
                      : <ChevronUp   size={13} className="text-charcoal/30" />
                    }
                  </div>
                </button>

                {!isCollapsed && (
                  <div>
                    {/* Table */}
                    {weekRows.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse" style={{ minWidth: 780 }}>
                          <thead>
                            <tr className={`border-b ${isPast ? "bg-charcoal/[0.03] border-charcoal/8" : "bg-bone/40 border-charcoal/8"}`}>
                              {["משימה","קבלן משנה","עובדים","חומרים","ספק","סטטוס הזמנה","עלות מתוכננת",""].map((h, i) => (
                                <th key={i} className={`px-2 py-1.5 text-right text-[0.75rem] font-bold tracking-[0.1em] uppercase text-charcoal/35 ${
                                  i === 6 ? "text-left" : i === 7 ? "w-6" : ""
                                }`}>
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {weekRows.map((row, idx) => (
                              <tr
                                key={row.id}
                                className={`border-b border-charcoal/[0.05] group ${
                                  idx % 2 === 0
                                    ? (isPast ? "bg-white" : "bg-white")
                                    : (isPast ? "bg-charcoal/[0.015]" : "bg-bone/20")
                                } hover:bg-accent/[0.03] transition-colors`}
                              >
                                <td className="px-2 py-1.5 min-w-[130px]">
                                  <EditableCell rowId={row.id} field="task_name" value={row.task_name} edit={edit} />
                                </td>
                                <td className="px-2 py-1.5 min-w-[110px]">
                                  <EditableCell rowId={row.id} field="subcontractor" value={row.subcontractor ?? ""} edit={edit} />
                                </td>
                                <td className="px-2 py-1.5 w-16">
                                  <EditableCell rowId={row.id} field="workers_needed" value={row.workers_needed} type="number" edit={edit} />
                                </td>
                                <td className="px-2 py-1.5 min-w-[110px]">
                                  <EditableCell rowId={row.id} field="materials" value={row.materials ?? ""} edit={edit} />
                                </td>
                                <td className="px-2 py-1.5 min-w-[100px]">
                                  <EditableCell rowId={row.id} field="supplier" value={row.supplier ?? ""} edit={edit} />
                                </td>
                                <td className="px-2 py-1.5 w-28">
                                  <select
                                    value={row.order_status}
                                    onChange={e => commitOrderStatus(row.id, e.target.value)}
                                    className={`w-full bg-transparent text-xs cursor-pointer focus:outline-none focus:bg-accent/[0.05] rounded-sm ${ORDER_LABELS[row.order_status]?.color}`}
                                    dir="rtl"
                                  >
                                    {ORDER_OPTIONS.map(o => (
                                      <option key={o} value={o}>{ORDER_LABELS[o].label}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-2 py-1.5 w-28 text-left">
                                  <EditableCell rowId={row.id} field="planned_cost" value={row.planned_cost} type="number" className="text-left" edit={edit} />
                                </td>
                                <td className="px-1 py-1.5 w-6">
                                  <button
                                    onClick={() => deleteRow(row.id)}
                                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all"
                                    title="מחק שורה"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Add row form */}
                    {addingWeek === weekStart ? (
                      <div className={`px-3 py-3 border-t border-charcoal/8 ${isPast ? "bg-charcoal/[0.02]" : "bg-bone/30"}`}>
                        <div className="overflow-x-auto">
                          <div className="flex gap-1.5 items-end flex-wrap" style={{ minWidth: 780 }}>
                            <div className="flex-1 min-w-[120px]">
                              <label className="block text-xs text-charcoal/40 mb-0.5">משימה *</label>
                              <input autoFocus value={newRow.task_name}
                                onChange={e => setNewRow(p => ({ ...p, task_name: e.target.value }))}
                                className="w-full border border-charcoal/15 bg-white px-2 py-1.5 text-xs focus:outline-none focus:border-accent" dir="rtl" />
                            </div>
                            <div className="w-24">
                              <label className="block text-xs text-charcoal/40 mb-0.5">קבלן משנה</label>
                              <input value={newRow.subcontractor}
                                onChange={e => setNewRow(p => ({ ...p, subcontractor: e.target.value }))}
                                className="w-full border border-charcoal/15 bg-white px-2 py-1.5 text-xs focus:outline-none focus:border-accent" dir="rtl" />
                            </div>
                            <div className="w-16">
                              <label className="block text-xs text-charcoal/40 mb-0.5">עובדים</label>
                              <input type="number" min={0} value={newRow.workers_needed || ""}
                                onChange={e => setNewRow(p => ({ ...p, workers_needed: Number(e.target.value) || 0 }))}
                                className="w-full border border-charcoal/15 bg-white px-2 py-1.5 text-xs focus:outline-none focus:border-accent" dir="ltr" />
                            </div>
                            <div className="w-28">
                              <label className="block text-xs text-charcoal/40 mb-0.5">חומרים</label>
                              <input value={newRow.materials}
                                onChange={e => setNewRow(p => ({ ...p, materials: e.target.value }))}
                                className="w-full border border-charcoal/15 bg-white px-2 py-1.5 text-xs focus:outline-none focus:border-accent" dir="rtl" />
                            </div>
                            <div className="w-24">
                              <label className="block text-xs text-charcoal/40 mb-0.5">ספק</label>
                              <input value={newRow.supplier}
                                onChange={e => setNewRow(p => ({ ...p, supplier: e.target.value }))}
                                className="w-full border border-charcoal/15 bg-white px-2 py-1.5 text-xs focus:outline-none focus:border-accent" dir="rtl" />
                            </div>
                            <div className="w-28">
                              <label className="block text-xs text-charcoal/40 mb-0.5">סטטוס הזמנה</label>
                              <select value={newRow.order_status}
                                onChange={e => setNewRow(p => ({ ...p, order_status: e.target.value as WeeklyPlanRow["order_status"] }))}
                                className="w-full border border-charcoal/15 bg-white px-2 py-1.5 text-xs focus:outline-none focus:border-accent" dir="rtl">
                                {ORDER_OPTIONS.map(o => <option key={o} value={o}>{ORDER_LABELS[o].label}</option>)}
                              </select>
                            </div>
                            <div className="w-28">
                              <label className="block text-xs text-charcoal/40 mb-0.5">עלות מתוכננת (₪)</label>
                              <input type="number" min={0} value={newRow.planned_cost || ""}
                                onChange={e => setNewRow(p => ({ ...p, planned_cost: Number(e.target.value) || 0 }))}
                                className="w-full border border-charcoal/15 bg-white px-2 py-1.5 text-xs focus:outline-none focus:border-accent" dir="ltr" />
                            </div>
                            <div className="flex gap-1.5 pb-0.5">
                              <button
                                onClick={() => handleAddRow(weekStart)}
                                disabled={saving || !newRow.task_name.trim()}
                                className="flex items-center gap-1 bg-accent text-bone px-3 py-1.5 text-xs font-semibold disabled:opacity-40 hover:bg-accent-dark transition-colors"
                              >
                                {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                                שמור
                              </button>
                              <button
                                onClick={() => { setAddingWeek(null); setNewRow(emptyNewRow()); }}
                                className="px-2 py-1.5 text-xs text-charcoal/40 hover:text-charcoal transition-colors"
                              >
                                ביטול
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className={`px-3 py-1.5 border-t border-charcoal/[0.05] ${isPast ? "bg-charcoal/[0.02]" : "bg-white"}`}>
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => { setAddingWeek(weekStart); setNewRow(emptyNewRow()); }}
                            className="flex items-center gap-1 text-[0.75rem] text-charcoal/60 hover:text-accent transition-colors py-1"
                          >
                            <Plus size={11} strokeWidth={2} />
                            הוסף משימה
                          </button>
                          {/* Running total */}
                          {cumul > 0 && (
                            <span className="text-[0.75rem] text-charcoal/30 tracking-wide">
                              מצטבר עד כאן: <span className="font-semibold text-charcoal/65">₪ {fmt(cumul)}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Migration hint ── */}
      <p className="mt-5 text-[0.58rem] text-charcoal/25 text-center">
        נדרשת טבלה <code className="font-mono">weekly_plan</code> בסופאבייס — ראה הנחיות SQL
      </p>
    </div>
  );
}
