"use client";

import { useCallback, useState } from "react";
import type { PayrollRow } from "../types";
import type { IncompleteItem, IncompleteSummary } from "../../../../lib/attendance-incompleteness";

export interface PayrollIncomplete {
  items: IncompleteItem[];
  summary: IncompleteSummary;
}

// Payroll month selection + loaded rows + per-button export tracking.
// loadPayroll/exportPayroll hit /api/admin/payroll; exportPayroll drives
// a hidden-anchor download via blob URL. payrollExporting tracks which
// of the two split reports is in flight so each button shows its own
// spinner without blocking the other.

export function usePayroll() {
  const [payrollMonth, setPayrollMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [payrollStaffId,    setPayrollStaffId]    = useState<string>("");
  const [payrollRows,       setPayrollRows]       = useState<PayrollRow[]>([]);
  // Unified incompleteness picture for the loaded month (replaces the old
  // pending-only warning — pending is now one issue type among six).
  const [payrollIncomplete, setPayrollIncomplete] = useState<PayrollIncomplete | null>(null);
  const [payrollLoading,    setPayrollLoading]    = useState(false);
  const [payrollExporting,  setPayrollExporting]  = useState<null | "employees" | "freelancers">(null);

  // First and last day of the selected month, Israel-local YMD.
  const monthRange = useCallback(() => {
    const [y, m] = payrollMonth.split("-").map(Number);
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate(); // day 0 of next month
    return { from: `${payrollMonth}-01`, to: `${payrollMonth}-${String(lastDay).padStart(2, "0")}` };
  }, [payrollMonth]);

  const loadPayroll = useCallback(async () => {
    setPayrollLoading(true);
    try {
      const q = new URLSearchParams({ month: payrollMonth });
      if (payrollStaffId) q.set("staff_id", payrollStaffId);
      const res = await fetch(`/api/admin/payroll?${q.toString()}`);
      const data = await res.json();
      if (res.ok) setPayrollRows(data.rows ?? []);
      else setPayrollRows([]);

      // Incompleteness gate — same month/worker scope. Non-blocking: a failure
      // here just hides the banner, it never stops the payroll report loading.
      try {
        const { from, to } = monthRange();
        const iq = new URLSearchParams({ from, to });
        if (payrollStaffId) iq.set("staff_id", payrollStaffId);
        const ires = await fetch(`/api/admin/attendance/incomplete?${iq.toString()}`);
        const idata = await ires.json();
        setPayrollIncomplete(ires.ok && idata.summary ? { items: idata.items ?? [], summary: idata.summary } : null);
      } catch {
        setPayrollIncomplete(null);
      }
    } catch {
      setPayrollRows([]); setPayrollIncomplete(null);
    } finally {
      setPayrollLoading(false);
    }
  }, [payrollMonth, payrollStaffId, monthRange]);

  const exportPayroll = useCallback(async (type: "employees" | "freelancers") => {
    setPayrollExporting(type);
    try {
      const q = new URLSearchParams({ month: payrollMonth, type });
      if (payrollStaffId) q.set("staff_id", payrollStaffId);
      const res = await fetch(`/api/admin/payroll/export?${q.toString()}`);
      if (!res.ok) {
        alert("שגיאה בייצוא: " + res.status);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payroll-${type}-${payrollMonth}${payrollStaffId ? "-worker" : ""}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setPayrollExporting(null);
    }
  }, [payrollMonth, payrollStaffId]);

  return {
    payrollMonth,     setPayrollMonth,
    payrollStaffId,   setPayrollStaffId,
    payrollRows,
    payrollIncomplete,
    payrollLoading,
    payrollExporting,
    loadPayroll,
    exportPayroll,
  };
}
