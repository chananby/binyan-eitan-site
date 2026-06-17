"use client";

// Worker self-history view. Groups attendance rows by date, computes
// hours-per-day, and exposes a per-cell "report mistake" entry-point
// that opens AttendanceReportMistake inline. Pending manual entries
// surface in a separate amber block at the bottom.

import { Loader2, Pencil } from "lucide-react";
import Screen from "./Screen";
import AttendanceReportMistake from "./AttendanceReportMistake";
import type { Lang, ScreenStrings } from "./i18n";
import type { HistoryRecord, CorrectionSummary } from "./types";
import { labelWithDayHe } from "../../../lib/date-utils";
import { israelWallClockToISO } from "../../../lib/israel-time";

interface Props {
  t: ScreenStrings;
  lang: Lang;
  onLangChange: (l: Lang) => void;
  backHref: string;
  backLabel: string;
  historyRecords: HistoryRecord[];
  historyName: string | null;
  historyLoading: boolean;
  historyError: string | null;
  corrections: Record<string, CorrectionSummary>;
  reportingId: string | null;
  setReportingId: (v: string | null) => void;
  onShowManual: () => void;
  onReset: () => void;
  onFetchHistory: () => void;
}

// Parse "DD.MM.YYYY, HH:MM" or "DD.MM.YYYY HH:MM" → Date (Israel-local).
function parseLabel(label: string | null | undefined): Date | null {
  if (!label) return null;
  const parts = label.replace(",", "").trim().split(/\s+/);
  if (parts.length < 2) return null;
  const [datePart, timePart] = parts;
  const [d, m, y] = datePart.split(".");
  const [h, min]  = timePart.split(":");
  if (!d || !m || !y || !h || !min) return null;
  try {
    const ymd = `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
    const hm  = `${h.padStart(2,"0")}:${min.padStart(2,"0")}`;
    const dt = new Date(israelWallClockToISO(ymd, hm));
    return isNaN(dt.getTime()) ? null : dt;
  } catch { return null; }
}
function labelTime(label: string | null | undefined): string {
  const dt = parseLabel(label);
  if (!dt) return "";
  return dt.toLocaleTimeString("he-IL", { timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit", hour12: false });
}
function clockDt(r: HistoryRecord): Date {
  return r.clock_at ? new Date(r.clock_at) : (parseLabel(r.timestamp_label) ?? new Date(r.created_at));
}
function clockTime(r: HistoryRecord | null | undefined): string {
  if (!r) return "";
  if (r.clock_at) return new Date(r.clock_at).toLocaleTimeString("he-IL", { timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit", hour12: false });
  return labelTime(r.timestamp_label);
}

function dayNameFromDt(dt: Date | null, t: ScreenStrings): string {
  if (!dt) return "";
  const name = t.weekdays[dt.getDay()];
  return t.dayPrefix ? `${t.dayPrefix} ${name}` : name;
}

type DayRow = {
  date: string; dayName: string; project: string;
  entry: string; exit: string; hours: number | null;
  entryId?: string; exitId?: string;
};

export default function HistoryScreen(p: Props) {
  const pendingEntries = p.historyRecords.filter(r => r.status === "pending");

  const dayRows: DayRow[] = (() => {
    const sorted = [...p.historyRecords].filter(r => r.status !== "pending").sort((a, b) =>
      clockDt(a).getTime() - clockDt(b).getTime()
    );
    const byDate = new Map<string, { entries: HistoryRecord[]; exits: HistoryRecord[]; project: string }>();
    for (const r of sorted) {
      const key = clockDt(r).toLocaleDateString("he-IL", { timeZone: "Asia/Jerusalem", day: "2-digit", month: "2-digit", year: "numeric" });
      if (!byDate.has(key)) byDate.set(key, { entries: [], exits: [], project: r.project?.name ?? "—" });
      const day = byDate.get(key)!;
      if (r.action === "כניסה" || r.action === "in") day.entries.push(r);
      else day.exits.push(r);
      if (r.project?.name) day.project = r.project.name;
    }
    return [...byDate.entries()].map(([date, day]) => {
      const first = day.entries[0] ?? null;
      const last  = day.exits[day.exits.length - 1] ?? null;
      let hours: number | null = null;
      if (first && last) {
        const diff = clockDt(last).getTime() - clockDt(first).getTime();
        if (diff > 0) hours = Math.round(diff / 36_000) / 100;
      }
      const dayDt = first ? clockDt(first) : (last ? clockDt(last) : null);
      return {
        date, dayName: dayNameFromDt(dayDt, p.t), project: day.project,
        entry: clockTime(first), exit: clockTime(last), hours,
        entryId: first?.id, exitId: last?.id,
      };
    }).reverse();
  })();

  // Discreet pencil next to a time → opens the report-mistake form. Hidden
  // only while a request is pending (the server rejects a second one with a
  // 409). After approved/rejected the pencil returns so the worker can file a
  // fresh request — a rejected fix can simply be corrected and resubmitted.
  function reportPencil(recordId: string | undefined) {
    if (!recordId || p.corrections[recordId]?.status === "pending") return null;
    return (
      <button
        type="button"
        onClick={() => p.setReportingId(recordId)}
        className="ms-1 text-charcoal/40 hover:text-accent transition-colors"
        title={p.t.reportMistakeTooltip}
      ><Pencil size={11} strokeWidth={1.75} /></button>
    );
  }

  // Status chip for a record that has a correction request. Pending is a soft
  // amber; approved/rejected stay neutral charcoal (a correct/rejected time is
  // not an error to alarm about). The side label tells which time it refers to.
  function statusChip(sideLabel: string, recordId: string | undefined) {
    if (!recordId) return null;
    const corr = p.corrections[recordId];
    if (!corr) return null;
    const text = corr.status === "approved" ? p.t.corrApproved
               : corr.status === "rejected" ? p.t.corrRejected
               : p.t.corrPending;
    const tone = corr.status === "pending"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-charcoal/5 text-charcoal/70 border-charcoal/15";
    return (
      <span className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[0.55rem] font-semibold leading-none ${tone}`}>
        <span className="text-charcoal/40">{sideLabel}</span>{text}
      </span>
    );
  }

  const totalHours = dayRows.reduce((s, r) => s + (r.hours ?? 0), 0);

  return (
    <Screen backHref={p.backHref} backLabel={p.backLabel} lang={p.lang} onLangChange={p.onLangChange}>
      <div className="w-full text-center space-y-1">
        <p className="font-body text-[0.75rem] font-bold tracking-[0.22em] uppercase text-accent/70">{p.t.historyTitle}</p>
        {p.historyName && <p className="font-heading text-lg font-bold text-charcoal">{p.historyName}</p>}
      </div>
      <div className="w-full space-y-2">
        {p.historyLoading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-charcoal/40">
            <Loader2 size={18} className="animate-spin" />
            <span className="font-body text-sm">{p.t.loadingHistory}</span>
          </div>
        ) : p.historyError ? (
          <p className="text-center font-body text-sm text-red-400 py-4">{p.historyError}</p>
        ) : dayRows.length === 0 && pendingEntries.length === 0 ? (
          <p className="text-center font-body text-sm text-charcoal/40 py-4">{p.t.noHistory}</p>
        ) : (
          <div className="w-full space-y-1">
            {/* Header */}
            <div className="grid grid-cols-4 gap-1 px-2 py-1.5 text-[0.58rem] font-semibold text-charcoal/40 uppercase tracking-wide border-b border-charcoal/8">
              <span>{p.t.historyColDate}</span>
              <span className="text-center">{p.t.historyColEntry}</span>
              <span className="text-center">{p.t.historyColExit}</span>
              <span className="text-end">{p.t.historyColHours}</span>
            </div>
            <div className="divide-y divide-charcoal/8 max-h-[48vh] overflow-y-auto">
              {dayRows.map((row, i) => {
                const reportTarget = (p.reportingId === row.entryId ? row.entryId
                                    : p.reportingId === row.exitId  ? row.exitId
                                    : null);
                return (
                  <div key={i} className="px-2 py-4 space-y-2">
                    <div className="grid grid-cols-4 gap-1 items-center">
                      <div className="min-w-0">
                        {row.dayName && <p className="font-body text-[0.58rem] font-semibold text-accent/70">{row.dayName}</p>}
                        <p className="font-body text-xs text-charcoal/70 tabular-nums" dir="ltr">{row.date}</p>
                        {row.project !== "—" && <p className="font-body text-[0.58rem] text-charcoal/35 truncate" title={row.project}>{row.project}</p>}
                      </div>
                      <span className="font-body text-xs font-semibold text-charcoal/80 text-center tabular-nums inline-flex items-center justify-center">
                        {row.entry || "—"}{reportPencil(row.entryId)}
                      </span>
                      <span className="font-body text-xs font-semibold text-charcoal/80 text-center tabular-nums inline-flex items-center justify-center">
                        {row.exit || "—"}{reportPencil(row.exitId)}
                      </span>
                      <span className="font-body text-sm font-bold text-charcoal text-end tabular-nums">
                        {row.hours !== null ? row.hours.toFixed(1) : "—"}
                      </span>
                    </div>
                    {(p.corrections[row.entryId ?? ""] || p.corrections[row.exitId ?? ""]) && (
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {statusChip(p.t.clockIn, row.entryId)}
                        {statusChip(p.t.clockOut, row.exitId)}
                      </div>
                    )}
                    {reportTarget && (
                      <AttendanceReportMistake
                        attendanceId={reportTarget}
                        lang={p.lang}
                        onCancel={() => p.setReportingId(null)}
                        onSent={() => p.onFetchHistory()}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            {/* Total */}
            <div className="flex items-center justify-between bg-white border border-charcoal/10 shadow-sm px-3 py-2.5 mt-1">
              <span className="font-body text-xs font-semibold text-charcoal/60">{p.t.historyTotal}</span>
              <span className="font-heading text-base font-bold text-charcoal tabular-nums">{totalHours.toFixed(1)} {p.t.historyHoursUnit}</span>
            </div>
          </div>
        )}
      </div>
      {/* Pending manual entries */}
      {pendingEntries.length > 0 && (
        <div className="w-full space-y-1">
          <p className="font-body text-[0.75rem] font-bold tracking-[0.2em] uppercase text-amber-500 px-1">{p.t.pendingBadge}</p>
          <div className="border border-amber-200 bg-amber-50 divide-y divide-amber-100">
            {pendingEntries.map(r => (
              <div key={r.id} className="flex items-center justify-between px-3 py-2 gap-3">
                <span className="text-xs font-semibold text-charcoal/80">
                  {(r.action === "in" || r.action === "כניסה") ? p.t.clockIn : p.t.clockOut}
                </span>
                <span className="font-body text-xs text-charcoal/60 flex-1">{labelWithDayHe(r.timestamp_label) ?? "—"}</span>
                <span className="font-body text-[0.75rem] text-amber-600 bg-amber-100 px-1.5 py-0.5">{p.t.pendingBadge}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={p.onShowManual}
        className="w-full border border-accent/40 py-3 font-body text-sm font-semibold tracking-wider text-accent hover:bg-accent/5 transition-colors duration-200">
        + {p.t.manualBtn}
      </button>
      <button onClick={p.onReset}
        className="w-full border border-charcoal/20 py-4 font-body text-sm font-semibold tracking-wider uppercase text-charcoal/50 hover:border-accent hover:text-accent transition-colors duration-200">
        {p.t.backToForm}
      </button>
      {/* Clearance so the totals bar / actions never hide behind the
          fixed FloatingWhatsApp button (bottom-6 left-6, size-14). */}
      <div aria-hidden className="h-12 w-full shrink-0" />
    </Screen>
  );
}
