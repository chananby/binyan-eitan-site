"use client";

import { useCallback, useState } from "react";
import type { AttReportData } from "../types";
import type { WorkerHistoryDay } from "../../../../lib/worker-history-aggregate";

// Two related slices: the attendance-report download form (date range +
// data + loading/error) and the per-worker history sub-tab (staff +
// date range + days). loadHistory is exposed so the parent's useEffect
// can fire it when the sub-tab + selection change.

export function useAttendanceReport() {
  // Attendance report download UI
  const attTodayStr   = new Date().toLocaleDateString("sv", { timeZone: "Asia/Jerusalem" });
  const attWeekAgoStr = new Date(Date.now() - 6 * 86_400_000).toLocaleDateString("sv", { timeZone: "Asia/Jerusalem" });
  const [attReportFrom,    setAttReportFrom]    = useState(attWeekAgoStr);
  const [attReportTo,      setAttReportTo]      = useState(attTodayStr);
  const [attReportLoading, setAttReportLoading] = useState(false);
  const [attReportErr,     setAttReportErr]     = useState<string | null>(null);
  const [attReportData,    setAttReportData]    = useState<AttReportData | null>(null);

  // Per-worker history sub-tab
  const [historyStaffId,   setHistoryStaffId]   = useState("");
  const [historyFrom, setHistoryFrom] = useState(() =>
    new Date(Date.now() - 29 * 86_400_000).toLocaleDateString("sv", { timeZone: "Asia/Jerusalem" })
  );
  const [historyTo, setHistoryTo] = useState(() =>
    new Date().toLocaleDateString("sv", { timeZone: "Asia/Jerusalem" })
  );
  const [historyDays,    setHistoryDays]    = useState<WorkerHistoryDay[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError,   setHistoryError]   = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!historyStaffId) {
      setHistoryDays([]); setHistoryError(null); return;
    }
    setHistoryLoading(true); setHistoryError(null);
    try {
      const q = new URLSearchParams({ from: historyFrom, to: historyTo });
      const res = await fetch(`/api/admin/staff/${historyStaffId}/history?${q.toString()}`);
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error ?? `שגיאה ${res.status}`); }
      const d = await res.json();
      setHistoryDays(d.days ?? []);
    } catch (e) {
      setHistoryError(e instanceof Error ? e.message : String(e));
      setHistoryDays([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [historyStaffId, historyFrom, historyTo]);

  return {
    attReportFrom,    setAttReportFrom,
    attReportTo,      setAttReportTo,
    attReportLoading, setAttReportLoading,
    attReportErr,     setAttReportErr,
    attReportData,    setAttReportData,
    historyStaffId,   setHistoryStaffId,
    historyFrom,      setHistoryFrom,
    historyTo,        setHistoryTo,
    historyDays,
    historyLoading,
    historyError,
    loadHistory,
  };
}
