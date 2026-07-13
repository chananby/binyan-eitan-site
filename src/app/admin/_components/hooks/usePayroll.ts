"use client";

import { useCallback, useState } from "react";
import type { PayrollRow } from "../types";

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
  const [payrollPending,    setPayrollPending]    = useState(0);
  const [payrollLoading,    setPayrollLoading]    = useState(false);
  const [payrollExporting,  setPayrollExporting]  = useState<null | "employees" | "freelancers">(null);

  const loadPayroll = useCallback(async () => {
    setPayrollLoading(true);
    try {
      const q = new URLSearchParams({ month: payrollMonth });
      if (payrollStaffId) q.set("staff_id", payrollStaffId);
      const res = await fetch(`/api/admin/payroll?${q.toString()}`);
      const data = await res.json();
      if (res.ok) { setPayrollRows(data.rows ?? []); setPayrollPending(data.pendingCount ?? 0); }
      else { setPayrollRows([]); setPayrollPending(0); }
    } catch {
      setPayrollRows([]); setPayrollPending(0);
    } finally {
      setPayrollLoading(false);
    }
  }, [payrollMonth, payrollStaffId]);

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
    payrollPending,
    payrollLoading,
    payrollExporting,
    loadPayroll,
    exportPayroll,
  };
}
