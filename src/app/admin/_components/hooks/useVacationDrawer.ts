"use client";

import { useState, useCallback } from "react";
import type { VacationRecord } from "../types";

// Per-staff vacation drawer — bundles state for the add-vacation form plus
// the loaded rows for the currently-open worker. The drawer is opened by
// passing a staffId to openDrawer(); closeDrawer() (or opening another
// worker) resets the local form. All mutations write to the server and
// re-load the row list — no in-place state shortcuts.

export function useVacationDrawer() {
  const [vacationFor,     setVacationFor]     = useState<string | null>(null);
  const [vacationRows,    setVacationRows]    = useState<VacationRecord[]>([]);
  const [vacationDate,    setVacationDate]    = useState("");
  const [vacationHalf,    setVacationHalf]    = useState(false);
  const [vacationLoading, setVacationLoading] = useState(false);
  const [vacationMsg,     setVacationMsg]     = useState("");

  const loadVacationRows = useCallback(async (staffId: string) => {
    try {
      const res = await fetch(`/api/admin/vacation?staff_id=${staffId}`);
      const data = await res.json();
      if (res.ok) setVacationRows(data.records ?? []);
    } catch { /* keep current rows */ }
  }, []);

  const openVacationDrawer = useCallback(async (staffId: string) => {
    setVacationFor(staffId);
    setVacationDate(""); setVacationHalf(false); setVacationMsg("");
    await loadVacationRows(staffId);
  }, [loadVacationRows]);

  const handleAddVacation = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vacationFor || !vacationDate) return;
    setVacationLoading(true); setVacationMsg("");
    try {
      const res = await fetch("/api/admin/vacation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staff_id: vacationFor, date: vacationDate, half_day: vacationHalf }),
      });
      const data = await res.json();
      if (res.ok) {
        setVacationDate(""); setVacationHalf(false);
        await loadVacationRows(vacationFor);
      } else {
        setVacationMsg("שגיאה: " + (data.error ?? res.status));
      }
    } catch (err) {
      setVacationMsg("שגיאת רשת: " + String(err));
    } finally {
      setVacationLoading(false);
    }
  }, [vacationFor, vacationDate, vacationHalf, loadVacationRows]);

  const handleDeleteVacation = useCallback(async (id: string) => {
    if (!vacationFor) return;
    await fetch(`/api/admin/vacation/${id}`, { method: "DELETE" });
    await loadVacationRows(vacationFor);
  }, [vacationFor, loadVacationRows]);

  return {
    vacationFor, setVacationFor,
    vacationRows,
    vacationDate, setVacationDate,
    vacationHalf, setVacationHalf,
    vacationLoading,
    vacationMsg,
    openVacationDrawer,
    handleAddVacation,
    handleDeleteVacation,
  };
}
