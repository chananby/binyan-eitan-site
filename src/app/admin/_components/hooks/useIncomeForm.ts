"use client";

import { useState, useCallback } from "react";
import { parsePositive } from "../../../../lib/money";

// Income add form (admin income tab). Posts a single payment to
// /api/admin/income; the parent's loadIncome() callback is invoked on
// success so the income totals + table re-render.

export function useIncomeForm(loadIncome: () => void) {
  const [incProjectId, setIncProjectId] = useState("");
  const [incAmount,    setIncAmount]    = useState("");
  const [incDesc,      setIncDesc]      = useState("");
  const [incDate,      setIncDate]      = useState(new Date().toISOString().slice(0, 10));
  const [incLoading,   setIncLoading]   = useState(false);
  const [incMsg,       setIncMsg]       = useState("");

  const handleAddIncome = useCallback(async (e: React.FormEvent) => {
    e.preventDefault(); setIncLoading(true); setIncMsg("");
    const amount = parsePositive(incAmount);
    if (amount === null) { setIncMsg("שגיאה: סכום חייב להיות מספר חיובי"); setIncLoading(false); return; }
    try {
      const res  = await fetch("/api/admin/income", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: incProjectId, amount, description: incDesc, received_date: incDate }) });
      const data = await res.json();
      if (res.ok) { setIncMsg("✓ תשלום נרשם"); setIncAmount(""); setIncDesc(""); loadIncome(); }
      else        { setIncMsg("שגיאה: " + (data.error ?? res.status)); }
    } catch (err) { setIncMsg("שגיאת רשת: " + String(err)); }
    finally { setIncLoading(false); }
  }, [incProjectId, incAmount, incDesc, incDate, loadIncome]);

  return {
    incProjectId, setIncProjectId,
    incAmount,    setIncAmount,
    incDesc,      setIncDesc,
    incDate,      setIncDate,
    incLoading,
    incMsg,
    handleAddIncome,
  };
}
