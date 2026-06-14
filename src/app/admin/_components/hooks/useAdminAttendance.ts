"use client";

import { useCallback, useState } from "react";
import type { AttendanceRecord } from "../types";
import type { ManualType } from "../tabs/AttendanceTab";

// The largest hook — bundles three sub-domains of the admin attendance tab:
//   • Retroactive edit (one row at a time)        — editAtt*, startEditAtt, handleEditAtt, handleEditAndApproveAtt
//   • Manual entry on behalf of a worker          — manual*, handleManualEntry
//   • Pending-row approve/reject actions          — pendingActionId, approveAttRecord, rejectAttRecord
//   • 7-day recent log (for retroactive editing)  — recentLogs*, loadRecentLogs
//
// pendingRecords + correctionRequests stay in AdminPortal because the
// dashboard's AttentionPanel reads them. The parent passes in setters so
// the approve/reject handlers can update the canonical list directly,
// matching the pre-refactor behavior byte-for-byte.

interface Inputs {
  reload: () => void;
  loadPending: () => void | Promise<void>;
  setPendingRecords: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  setPendingErr: (v: string | null) => void;
}

export function useAdminAttendance({ reload, loadPending, setPendingRecords, setPendingErr }: Inputs) {
  // Edit slice
  const [editAttId,        setEditAttId]        = useState<string | null>(null);
  const [editAttAction,    setEditAttAction]    = useState("כניסה");
  const [editAttProject,   setEditAttProject]   = useState("");
  const [editAttTimestamp, setEditAttTimestamp] = useState("");
  const [editAttLoading,   setEditAttLoading]   = useState(false);
  const [editAttMsg,       setEditAttMsg]       = useState("");
  const [editAttIsPending, setEditAttIsPending] = useState(false);

  // Manual entry slice (admin acts on behalf of a worker)
  const [manualOpen,      setManualOpen]      = useState(false);
  const [manualStaffId,   setManualStaffId]   = useState("");
  const [manualDate,      setManualDate]      = useState("");
  const [manualType,      setManualType]      = useState<ManualType>("regular");
  const [manualEntryTime, setManualEntryTime] = useState("");
  const [manualExitTime,  setManualExitTime]  = useState("");
  const [manualProject,   setManualProject]   = useState("");
  const [manualNotes,     setManualNotes]     = useState("");
  const [manualLoading,   setManualLoading]   = useState(false);
  const [manualMsg,       setManualMsg]       = useState<string | null>(null);
  const [manualErr,       setManualErr]       = useState<string | null>(null);

  // Pending approve/reject single-flight tracking
  const [pendingActionId,  setPendingActionId]  = useState<string | null>(null);

  // Recent (7-day) log for retroactive editing
  const [recentLogs,        setRecentLogs]        = useState<AttendanceRecord[]>([]);
  const [recentLogsLoading, setRecentLogsLoading] = useState(false);
  const [recentLogsErr,     setRecentLogsErr]     = useState<string | null>(null);
  const [recentLogsVisible, setRecentLogsVisible] = useState(false);

  const loadRecentLogs = useCallback(async () => {
    setRecentLogsLoading(true); setRecentLogsErr(null);
    try {
      const res = await fetch("/api/admin/attendance/recent?days=7");
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error ?? `שגיאה ${res.status}`); }
      const d = await res.json(); setRecentLogs(d.records ?? []);
    } catch (e) { setRecentLogsErr(String(e)); }
    finally { setRecentLogsLoading(false); }
  }, []);

  const approveAttRecord = useCallback(async (id: string) => {
    if (pendingActionId) return;
    setPendingActionId(id); setPendingErr(null);
    try {
      const res = await fetch(`/api/admin/attendance/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "approved" }) });
      if (res.ok) setPendingRecords(p => p.filter(r => r.id !== id));
      else { const d = await res.json().catch(() => ({})); setPendingErr("שגיאה באישור: " + (d.error ?? res.status)); }
    } catch { setPendingErr("שגיאת רשת — לא ניתן לאשר. נסה שוב."); }
    finally { setPendingActionId(null); }
  }, [pendingActionId, setPendingErr, setPendingRecords]);

  const rejectAttRecord = useCallback(async (id: string) => {
    if (pendingActionId) return;
    setPendingActionId(id); setPendingErr(null);
    try {
      const res = await fetch(`/api/admin/attendance/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "rejected" }) });
      if (res.ok) setPendingRecords(p => p.filter(r => r.id !== id));
      else { const d = await res.json().catch(() => ({})); setPendingErr("שגיאה בדחייה: " + (d.error ?? res.status)); }
    } catch { setPendingErr("שגיאת רשת — לא ניתן לדחות. נסה שוב."); }
    finally { setPendingActionId(null); }
  }, [pendingActionId, setPendingErr, setPendingRecords]);

  const startEditAtt = useCallback((r: AttendanceRecord, isPending = false) => {
    setEditAttId(r.id);
    setEditAttIsPending(isPending);
    setEditAttAction(r.action === "in" ? "כניסה" : r.action === "out" ? "יציאה" : r.action);
    setEditAttProject(r.project?.id ?? "");
    setEditAttTimestamp(r.timestamp_label ?? "");
    setEditAttMsg("");
  }, []);

  const handleEditAtt = useCallback(async (e: React.FormEvent) => {
    e.preventDefault(); if (!editAttId) return;
    setEditAttLoading(true); setEditAttMsg("");
    try {
      const res  = await fetch(`/api/admin/attendance/${editAttId}`, { method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: editAttAction, project_id: editAttProject || null, timestamp_label: editAttTimestamp }) });
      const data = await res.json();
      if (res.ok) {
        const wasPending = editAttIsPending;
        setEditAttId(null); setEditAttIsPending(false);
        if (wasPending) loadPending();
        else if (recentLogsVisible) loadRecentLogs();
        reload();
      } else { setEditAttMsg("שגיאה: " + (data.error ?? res.status)); }
    } catch (err) { setEditAttMsg("שגיאת רשת: " + String(err)); }
    finally { setEditAttLoading(false); }
  }, [editAttId, editAttAction, editAttProject, editAttTimestamp, editAttIsPending, recentLogsVisible, loadPending, loadRecentLogs, reload]);

  const handleEditAndApproveAtt = useCallback(async () => {
    if (!editAttId) return;
    setEditAttLoading(true); setEditAttMsg("");
    try {
      const res  = await fetch(`/api/admin/attendance/${editAttId}`, { method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: editAttAction, project_id: editAttProject || null, timestamp_label: editAttTimestamp, status: "approved" }) });
      const data = await res.json();
      if (res.ok) { setEditAttId(null); setEditAttIsPending(false); loadPending(); reload(); }
      else        { setEditAttMsg("שגיאה: " + (data.error ?? res.status)); }
    } catch (err) { setEditAttMsg("שגיאת רשת: " + String(err)); }
    finally { setEditAttLoading(false); }
  }, [editAttId, editAttAction, editAttProject, editAttTimestamp, loadPending, reload]);

  const handleManualEntry = useCallback(async (e: React.FormEvent) => {
    e.preventDefault(); setManualLoading(true); setManualErr(null); setManualMsg(null);
    try {
      const res = await fetch("/api/admin/attendance/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staff_id:   manualStaffId,
          date:       manualDate,
          type:       manualType,
          entry_time: manualEntryTime || undefined,
          exit_time:  manualExitTime  || undefined,
          project_id: manualProject   || undefined,
          notes:      manualNotes     || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const isWorkType = manualType === "regular" || manualType === "overtime";
        const count = data.created === 2
          ? "2 רשומות (כניסה + יציאה)"
          : isWorkType ? "רשומה פתוחה (כניסה בלבד)" : "רשומה אחת";
        setManualMsg(`נוסף בהצלחה ✓ — ${count}`);
        setManualOpen(false);
        setManualStaffId(""); setManualDate(""); setManualType("regular");
        setManualEntryTime(""); setManualExitTime(""); setManualProject(""); setManualNotes("");
        reload();
      } else { setManualErr("שגיאה: " + (data.error ?? res.status)); }
    } catch (err) { setManualErr("שגיאת רשת: " + String(err)); }
    finally { setManualLoading(false); }
  }, [manualStaffId, manualDate, manualType, manualEntryTime, manualExitTime, manualProject, manualNotes, reload]);

  return {
    editAttId,        setEditAttId,
    editAttAction,    setEditAttAction,
    editAttProject,   setEditAttProject,
    editAttTimestamp, setEditAttTimestamp,
    editAttLoading,
    editAttMsg,
    editAttIsPending,

    manualOpen,      setManualOpen,
    manualStaffId,   setManualStaffId,
    manualDate,      setManualDate,
    manualType,      setManualType,
    manualEntryTime, setManualEntryTime,
    manualExitTime,  setManualExitTime,
    manualProject,   setManualProject,
    manualNotes,     setManualNotes,
    manualLoading,
    manualMsg,       setManualMsg,
    manualErr,       setManualErr,

    pendingActionId,

    recentLogs,
    recentLogsLoading,
    recentLogsErr,
    recentLogsVisible, setRecentLogsVisible,

    loadRecentLogs,
    approveAttRecord,
    rejectAttRecord,
    startEditAtt,
    handleEditAtt,
    handleEditAndApproveAtt,
    handleManualEntry,
  };
}
