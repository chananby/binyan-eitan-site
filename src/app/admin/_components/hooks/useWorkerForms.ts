"use client";

import { useCallback, useState } from "react";
import { parseMoney } from "../../../../lib/money";
import type { StaffMember } from "../types";

// All worker-add + worker-edit form state + CRUD handlers. Largest hook
// (~53 state vars) but mechanically isolated — every handler writes to
// the server and then calls reload() from the parent to refresh the
// staff list.

export function useWorkerForms(reload: () => void) {
  // Add form
  const [newName, setNewName]   = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRole, setNewRole]   = useState("עובד");
  const [newNationalId, setNewNationalId] = useState("");
  const [newHourlyRate, setNewHourlyRate] = useState("");
  const [newDailyRate,  setNewDailyRate]  = useState("");
  const [newPin,        setNewPin]        = useState("");
  const [newEmploymentType,   setNewEmploymentType]   = useState<"hourly" | "daily" | "global">("hourly");
  const [newGlobalSalary,     setNewGlobalSalary]     = useState("");
  // New workers default to "employee" (is_freelancer=false), and the add form
  // mirrors that with travel_allowance=true. Toggling "freelancer" in the form
  // flips travel_allowance off (and vice versa) — see WorkersTab.
  const [newTravelAllowance,  setNewTravelAllowance]  = useState(true);
  const [newPensionStatus,    setNewPensionStatus]    = useState("");
  const [newHolidayEligible,  setNewHolidayEligible]  = useState(true);
  const [newIsFreelancer,     setNewIsFreelancer]     = useState(false);
  const [newOfficeOnly,       setNewOfficeOnly]       = useState(false);
  const [newLabel,            setNewLabel]            = useState("");
  const [newAttendanceExempt, setNewAttendanceExempt] = useState(false);
  const [newStartDate,        setNewStartDate]        = useState("");
  const [newEmploymentEndDate, setNewEmploymentEndDate] = useState("");
  const [newNotes,            setNewNotes]            = useState("");
  const [newBankName,         setNewBankName]         = useState("");
  const [newBankBranch,       setNewBankBranch]       = useState("");
  const [newBankAccount,      setNewBankAccount]      = useState("");
  const [newBankAccountOwner, setNewBankAccountOwner] = useState("");
  const [newBankIban,         setNewBankIban]         = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addMsg,     setAddMsg]     = useState("");

  // Edit form
  const [editingId,       setEditingId]       = useState<string | null>(null);
  const [editName,        setEditName]        = useState("");
  const [editPhone,       setEditPhone]       = useState("");
  const [editRole,        setEditRole]        = useState("עובד");
  const [editNationalId,  setEditNationalId]  = useState("");
  const [editHourlyRate,  setEditHourlyRate]  = useState("");
  const [editDailyRate,   setEditDailyRate]   = useState("");
  const [editPin,         setEditPin]         = useState("");
  const [editEmploymentType,  setEditEmploymentType]  = useState<"hourly" | "daily" | "global">("hourly");
  const [editGlobalSalary,    setEditGlobalSalary]    = useState("");
  const [editTravelAllowance, setEditTravelAllowance] = useState(false);
  const [editPensionStatus,   setEditPensionStatus]   = useState("");
  const [editHolidayEligible, setEditHolidayEligible] = useState(true);
  const [editIsFreelancer,    setEditIsFreelancer]    = useState(false);
  const [editOfficeOnly,      setEditOfficeOnly]      = useState(false);
  const [editLabel,           setEditLabel]           = useState("");
  const [editAttendanceExempt,setEditAttendanceExempt]= useState(false);
  const [editStartDate,       setEditStartDate]       = useState("");
  const [editEmploymentEndDate, setEditEmploymentEndDate] = useState("");
  const [editNotes,           setEditNotes]           = useState("");
  const [editBankName,         setEditBankName]         = useState("");
  const [editBankBranch,       setEditBankBranch]       = useState("");
  const [editBankAccount,      setEditBankAccount]      = useState("");
  const [editBankAccountOwner, setEditBankAccountOwner] = useState("");
  const [editBankIban,         setEditBankIban]         = useState("");
  // Worker's preferred attendance-flow language — kept on staff.language.
  // Default 'he' mirrors the DB column default.
  const [editLanguage,         setEditLanguage]         = useState("he");
  const [editLoading, setEditLoading] = useState(false);
  const [editMsg,     setEditMsg]     = useState("");

  const handleAddWorker = useCallback(async (e: React.FormEvent) => {
    e.preventDefault(); setAddLoading(true); setAddMsg("");
    try {
      const res  = await fetch("/api/admin/staff", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName, phone: newPhone, role: newRole, national_id: newNationalId,
          hourly_rate: parseMoney(newHourlyRate),
          daily_rate:  parseMoney(newDailyRate),
          employment_type:       newEmploymentType,
          monthly_global_salary: parseMoney(newGlobalSalary),
          travel_allowance:      newTravelAllowance,
          pension_status:        newPensionStatus,
          holiday_eligible:      newHolidayEligible,
          is_freelancer:         newIsFreelancer,
          office_only:           newOfficeOnly,
          label:                 newLabel || undefined,
          attendance_exempt:     newAttendanceExempt,
          start_date:            newStartDate || undefined,
          employment_end_date:   newEmploymentEndDate || undefined,
          notes:                 newNotes || undefined,
          pin: newPin || undefined,
          bank_name:             newBankName          || undefined,
          bank_branch:           newBankBranch        || undefined,
          bank_account:          newBankAccount       || undefined,
          bank_account_owner:    newBankAccountOwner  || undefined,
          bank_iban:             newBankIban          || undefined,
        }) });
      const data = await res.json();
      if (res.ok) {
        setAddMsg("✓ " + newName + " נוסף");
        setNewName(""); setNewPhone(""); setNewNationalId("");
        setNewHourlyRate(""); setNewDailyRate(""); setNewPin("");
        setNewEmploymentType("hourly"); setNewGlobalSalary("");
        // Reset to "employee + travel=true" — the default for a fresh add.
        setNewTravelAllowance(true); setNewPensionStatus(""); setNewHolidayEligible(true);
        setNewIsFreelancer(false); setNewOfficeOnly(false); setNewLabel(""); setNewAttendanceExempt(false);
        setNewStartDate(""); setNewEmploymentEndDate(""); setNewNotes("");
        setNewBankName(""); setNewBankBranch(""); setNewBankAccount("");
        setNewBankAccountOwner(""); setNewBankIban("");
        reload();
      } else {
        setAddMsg("שגיאה: " + (data.error ?? res.status));
      }
    } catch (err) { setAddMsg("שגיאת רשת: " + String(err)); }
    finally { setAddLoading(false); }
  }, [newName, newPhone, newRole, newNationalId, newHourlyRate, newDailyRate, newEmploymentType, newGlobalSalary, newTravelAllowance, newPensionStatus, newHolidayEligible, newIsFreelancer, newOfficeOnly, newLabel, newAttendanceExempt, newStartDate, newEmploymentEndDate, newNotes, newPin, newBankName, newBankBranch, newBankAccount, newBankAccountOwner, newBankIban, reload]);

  const startEdit = useCallback((s: StaffMember) => {
    setEditingId(s.id); setEditName(s.name); setEditPhone(s.phone); setEditRole(s.role);
    setEditNationalId(s.national_id ?? "");
    setEditHourlyRate(s.hourly_rate != null ? String(s.hourly_rate) : "");
    setEditDailyRate(s.daily_rate   != null ? String(s.daily_rate)  : "");
    setEditEmploymentType(s.employment_type ?? "hourly");
    setEditGlobalSalary(s.monthly_global_salary != null ? String(s.monthly_global_salary) : "");
    setEditTravelAllowance(!!s.travel_allowance);
    setEditPensionStatus(s.pension_status ?? "");
    setEditHolidayEligible(s.holiday_eligible !== false); // default true
    setEditIsFreelancer(!!s.is_freelancer);
    setEditOfficeOnly(!!s.office_only);
    setEditLabel(s.label ?? "");
    setEditAttendanceExempt(!!s.attendance_exempt);
    setEditStartDate(s.start_date ?? "");
    setEditEmploymentEndDate(s.employment_end_date ?? "");
    setEditNotes(s.notes ?? "");
    setEditBankName(s.bank_name                 ?? "");
    setEditBankBranch(s.bank_branch             ?? "");
    setEditBankAccount(s.bank_account           ?? "");
    setEditBankAccountOwner(s.bank_account_owner ?? "");
    setEditBankIban(s.bank_iban                 ?? "");
    setEditLanguage(s.language ?? "he");
    setEditPin(""); // always blank — admin sets a new PIN explicitly
    setEditMsg("");
  }, []);

  const handleEditWorker = useCallback(async (e: React.FormEvent) => {
    e.preventDefault(); if (!editingId) return;
    setEditLoading(true); setEditMsg("");
    try {
      const body: Record<string, unknown> = {
        name: editName, phone: editPhone, role: editRole, national_id: editNationalId,
        hourly_rate: parseMoney(editHourlyRate),
        daily_rate:  parseMoney(editDailyRate),
        employment_type:       editEmploymentType,
        monthly_global_salary: parseMoney(editGlobalSalary),
        travel_allowance:      editTravelAllowance,
        pension_status:        editPensionStatus,
        holiday_eligible:      editHolidayEligible,
        is_freelancer:         editIsFreelancer,
        office_only:           editOfficeOnly,
        label:                 editLabel.trim() || null,
        attendance_exempt:     editAttendanceExempt,
        start_date:            editStartDate || null,
        employment_end_date:   editEmploymentEndDate || null,
        notes:                 editNotes || null,
        bank_name:             editBankName          || null,
        bank_branch:           editBankBranch        || null,
        bank_account:          editBankAccount       || null,
        bank_account_owner:    editBankAccountOwner  || null,
        bank_iban:             editBankIban          || null,
        language:              editLanguage          || "he",
      };
      if (editPin) body.pin = editPin; // only send if a new PIN was entered
      const res  = await fetch(`/api/admin/staff/${editingId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (res.ok) { setEditingId(null); reload(); }
      else        { setEditMsg("שגיאה: " + (data.error ?? res.status)); }
    } catch (err) { setEditMsg("שגיאת רשת: " + String(err)); }
    finally { setEditLoading(false); }
  }, [editingId, editName, editPhone, editRole, editNationalId, editHourlyRate, editDailyRate, editEmploymentType, editGlobalSalary, editTravelAllowance, editPensionStatus, editHolidayEligible, editIsFreelancer, editOfficeOnly, editLabel, editAttendanceExempt, editStartDate, editEmploymentEndDate, editNotes, editPin, editBankName, editBankBranch, editBankAccount, editBankAccountOwner, editBankIban, editLanguage, reload]);

  const toggleActive = useCallback(async (id: string, current: boolean) => {
    await fetch(`/api/admin/staff/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !current }) });
    reload();
  }, [reload]);

  const deleteWorker = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/staff/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: "שגיאה במחיקה" }));
      alert(data.error ?? "שגיאה במחיקה");
      return;
    }
    reload();
  }, [reload]);

  return {
    newName, setNewName,
    newPhone, setNewPhone,
    newRole, setNewRole,
    newNationalId, setNewNationalId,
    newHourlyRate, setNewHourlyRate,
    newDailyRate,  setNewDailyRate,
    newPin,        setNewPin,
    newEmploymentType,   setNewEmploymentType,
    newGlobalSalary,     setNewGlobalSalary,
    newTravelAllowance,  setNewTravelAllowance,
    newPensionStatus,    setNewPensionStatus,
    newHolidayEligible,  setNewHolidayEligible,
    newIsFreelancer,     setNewIsFreelancer,
    newOfficeOnly,       setNewOfficeOnly,
    newLabel,            setNewLabel,
    newAttendanceExempt, setNewAttendanceExempt,
    newStartDate,        setNewStartDate,
    newEmploymentEndDate, setNewEmploymentEndDate,
    newNotes,            setNewNotes,
    newBankName,         setNewBankName,
    newBankBranch,       setNewBankBranch,
    newBankAccount,      setNewBankAccount,
    newBankAccountOwner, setNewBankAccountOwner,
    newBankIban,         setNewBankIban,
    addLoading, addMsg,

    editingId,       setEditingId,
    editName,        setEditName,
    editPhone,       setEditPhone,
    editRole,        setEditRole,
    editNationalId,  setEditNationalId,
    editHourlyRate,  setEditHourlyRate,
    editDailyRate,   setEditDailyRate,
    editPin,         setEditPin,
    editEmploymentType,  setEditEmploymentType,
    editGlobalSalary,    setEditGlobalSalary,
    editTravelAllowance, setEditTravelAllowance,
    editPensionStatus,   setEditPensionStatus,
    editHolidayEligible, setEditHolidayEligible,
    editIsFreelancer,    setEditIsFreelancer,
    editOfficeOnly,      setEditOfficeOnly,
    editLabel,           setEditLabel,
    editAttendanceExempt,setEditAttendanceExempt,
    editStartDate,       setEditStartDate,
    editEmploymentEndDate, setEditEmploymentEndDate,
    editNotes,           setEditNotes,
    editBankName,         setEditBankName,
    editBankBranch,       setEditBankBranch,
    editBankAccount,      setEditBankAccount,
    editBankAccountOwner, setEditBankAccountOwner,
    editBankIban,         setEditBankIban,
    editLanguage,         setEditLanguage,
    editLoading, editMsg,

    handleAddWorker,
    handleEditWorker,
    startEdit,
    toggleActive,
    deleteWorker,
  };
}
