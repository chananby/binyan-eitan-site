"use client";

import React from "react";
import { UserPlus, RefreshCw } from "lucide-react";
import { Card } from "../shared/Card";
import { Field } from "../shared/Field";
import { Btn } from "../shared/Btn";
import { TabRefreshBar } from "../shared/TabRefreshBar";
import { INPUT } from "../shared/constants";
import { AutoGrowTextarea } from "../../../components/AutoGrowTextarea";

type EmploymentType = "hourly" | "daily" | "global";

interface StaffMember {
  id: string;
  name: string;
  phone: string;
  role: string;
  active: boolean;
  national_id?: string | null;
  hourly_rate?: number | null;
  daily_rate?: number | null;
  employment_type?: EmploymentType;
  monthly_global_salary?: number | null;
  travel_allowance?: boolean;
  pension_status?: string | null;
  holiday_eligible?: boolean;
  has_pin?: boolean;
}

type Props = {
  staff: StaffMember[];

  // New-worker form state
  newName: string;            setNewName:            (v: string) => void;
  newPhone: string;           setNewPhone:           (v: string) => void;
  newRole: string;            setNewRole:            (v: string) => void;
  newNationalId: string;      setNewNationalId:      (v: string) => void;
  newEmploymentType: EmploymentType; setNewEmploymentType: (v: EmploymentType) => void;
  newHourlyRate: string;      setNewHourlyRate:      (v: string) => void;
  newDailyRate: string;       setNewDailyRate:       (v: string) => void;
  newGlobalSalary: string;    setNewGlobalSalary:    (v: string) => void;
  newTravelAllowance: boolean; setNewTravelAllowance: (v: boolean) => void;
  newHolidayEligible: boolean; setNewHolidayEligible: (v: boolean) => void;
  newPensionStatus: string;   setNewPensionStatus:   (v: string) => void;
  newPin: string;             setNewPin:             (v: string) => void;
  addLoading: boolean;
  addMsg: string;
  onAddWorker: (e: React.FormEvent) => void | Promise<void>;

  // Edit-worker form state
  editingId: string | null;   setEditingId: (v: string | null) => void;
  editName: string;           setEditName:            (v: string) => void;
  editPhone: string;          setEditPhone:           (v: string) => void;
  editRole: string;           setEditRole:            (v: string) => void;
  editNationalId: string;     setEditNationalId:      (v: string) => void;
  editEmploymentType: EmploymentType; setEditEmploymentType: (v: EmploymentType) => void;
  editHourlyRate: string;     setEditHourlyRate:      (v: string) => void;
  editDailyRate: string;      setEditDailyRate:       (v: string) => void;
  editGlobalSalary: string;   setEditGlobalSalary:    (v: string) => void;
  editTravelAllowance: boolean; setEditTravelAllowance: (v: boolean) => void;
  editHolidayEligible: boolean; setEditHolidayEligible: (v: boolean) => void;
  editPensionStatus: string;  setEditPensionStatus:   (v: string) => void;
  editPin: string;            setEditPin:             (v: string) => void;
  editLoading: boolean;
  editMsg: string;
  onEditWorker: (e: React.FormEvent) => void | Promise<void>;
  onStartEdit:  (s: StaffMember) => void;
  onToggleActive: (id: string, active: boolean) => void | Promise<void>;
  onOpenVacation: (staffId: string) => void | Promise<void>;
  onReload: () => void | Promise<void>;

  // TabRefreshBar
  lastRefreshed: Date | null;
  refreshing: boolean;
  dataLoading: boolean;
  onTabRefresh: () => void;
};

export default function WorkersTab(p: Props) {
  return (
    <div className="space-y-5">
      <TabRefreshBar loading={p.refreshing || p.dataLoading} onRefresh={p.onTabRefresh} lastRefreshed={p.lastRefreshed} />
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <UserPlus size={16} strokeWidth={1.5} className="text-accent" />
          <h2 className="font-heading text-base font-bold">הוספת עובד</h2>
        </div>
        <form onSubmit={p.onAddWorker} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="שם מלא"><AutoGrowTextarea value={p.newName} onChange={e => p.setNewName(e.target.value)} required placeholder="ישראל ישראלי" className={INPUT} /></Field>
            <Field label="טלפון"><input value={p.newPhone} onChange={e => p.setNewPhone(e.target.value)} required placeholder="05X-XXXXXXX" type="tel" dir="ltr" className={INPUT} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="תפקיד">
              <select value={p.newRole} onChange={e => p.setNewRole(e.target.value)} className={INPUT}>
                <option value="עובד">עובד</option><option value="ממונה">ממונה</option><option value="מנהל">מנהל</option>
              </select>
            </Field>
            <Field label='ת"ז (אופציונלי)'>
              <input value={p.newNationalId} onChange={e => p.setNewNationalId(e.target.value.replace(/\D/g, ""))} placeholder="123456789" inputMode="numeric" maxLength={9} dir="ltr" className={INPUT} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="סוג העסקה">
              <select value={p.newEmploymentType} onChange={e => p.setNewEmploymentType(e.target.value as EmploymentType)} className={INPUT}>
                <option value="hourly">שעתי</option>
                <option value="daily">יומי</option>
                <option value="global">גלובלי</option>
              </select>
            </Field>
            {p.newEmploymentType === "hourly" && (
              <Field label="שכר שעתי (₪)"><input value={p.newHourlyRate} onChange={e => p.setNewHourlyRate(e.target.value)} type="number" min="0" step="0.5" placeholder="45.00" dir="ltr" className={INPUT} /></Field>
            )}
            {p.newEmploymentType === "daily" && (
              <Field label="שכר יומי (₪)"><input value={p.newDailyRate}  onChange={e => p.setNewDailyRate(e.target.value)}  type="number" min="0" step="1" placeholder="350" dir="ltr" className={INPUT} /></Field>
            )}
            {p.newEmploymentType === "global" && (
              <Field label="שכר חודשי גלובלי (₪)"><input value={p.newGlobalSalary} onChange={e => p.setNewGlobalSalary(e.target.value)} type="number" min="0" step="1" placeholder="8000" dir="ltr" className={INPUT} /></Field>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="דמי נסיעות">
              <label className="flex items-center gap-2 text-sm py-2.5 cursor-pointer">
                <input type="checkbox" checked={p.newTravelAllowance} onChange={e => p.setNewTravelAllowance(e.target.checked)} className="accent-accent" />
                <span className="text-charcoal/70">זכאי לנסיעות</span>
              </label>
            </Field>
            <Field label="זכאות לחגים">
              <label className="flex items-center gap-2 text-sm py-2.5 cursor-pointer">
                <input type="checkbox" checked={p.newHolidayEligible} onChange={e => p.setNewHolidayEligible(e.target.checked)} className="accent-accent" />
                <span className="text-charcoal/70">זכאי לתשלום על חגים</span>
              </label>
            </Field>
          </div>
          <Field label="סטטוס פנסיה (טקסט חופשי)">
            <AutoGrowTextarea value={p.newPensionStatus} onChange={e => p.setNewPensionStatus(e.target.value)} placeholder="פעיל / תקופת המתנה / לא הוסדר" className={INPUT} />
          </Field>
          {p.newRole === "ממונה" && (
            <Field label="PIN לכניסה לפורטל (4–8 ספרות)">
              <input value={p.newPin} onChange={e => p.setNewPin(e.target.value.replace(/\D/g, "").slice(0, 8))} type="text" inputMode="numeric" maxLength={8} placeholder="1234" dir="ltr" className={INPUT} />
            </Field>
          )}
          <Btn loading={p.addLoading}>הוסף עובד</Btn>
          {p.addMsg && <p className={`text-xs ${p.addMsg.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>{p.addMsg}</p>}
        </form>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading text-base font-bold">עובדים ({p.staff.length})</h2>
          <button onClick={p.onReload} className="flex items-center gap-1 text-xs text-charcoal/40 hover:text-accent transition-colors">
            <RefreshCw size={12} strokeWidth={1.5} /> רענן
          </button>
        </div>
        {p.staff.length === 0 && <p className="text-sm text-charcoal/30 text-center py-4">אין עובדים רשומים</p>}
        <div className="divide-y divide-charcoal/5">
          {p.staff.map(s => p.editingId === s.id ? (
            <form key={s.id} onSubmit={p.onEditWorker} className="py-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Field label="שם"><AutoGrowTextarea value={p.editName} onChange={e => p.setEditName(e.target.value)} required className={INPUT} /></Field>
                <Field label="טלפון"><input value={p.editPhone} onChange={e => p.setEditPhone(e.target.value)} required type="tel" dir="ltr" className={INPUT} /></Field>
                <Field label="תפקיד">
                  <select value={p.editRole} onChange={e => p.setEditRole(e.target.value)} className={INPUT}>
                    <option value="עובד">עובד</option><option value="ממונה">ממונה</option><option value="מנהל">מנהל</option>
                  </select>
                </Field>
                <Field label='ת"ז'><input value={p.editNationalId} onChange={e => p.setEditNationalId(e.target.value.replace(/\D/g, ""))} inputMode="numeric" maxLength={9} dir="ltr" className={INPUT} /></Field>
                <Field label="סוג העסקה">
                  <select value={p.editEmploymentType} onChange={e => p.setEditEmploymentType(e.target.value as EmploymentType)} className={INPUT}>
                    <option value="hourly">שעתי</option>
                    <option value="daily">יומי</option>
                    <option value="global">גלובלי</option>
                  </select>
                </Field>
                {p.editEmploymentType === "hourly" && (
                  <Field label="שכר שעתי (₪)"><input value={p.editHourlyRate} onChange={e => p.setEditHourlyRate(e.target.value)} type="number" min="0" step="0.5" dir="ltr" className={INPUT} /></Field>
                )}
                {p.editEmploymentType === "daily" && (
                  <Field label="שכר יומי (₪)"><input value={p.editDailyRate}  onChange={e => p.setEditDailyRate(e.target.value)}  type="number" min="0" step="1" dir="ltr" className={INPUT} /></Field>
                )}
                {p.editEmploymentType === "global" && (
                  <Field label="שכר חודשי גלובלי (₪)"><input value={p.editGlobalSalary} onChange={e => p.setEditGlobalSalary(e.target.value)} type="number" min="0" step="1" dir="ltr" className={INPUT} /></Field>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="דמי נסיעות">
                  <label className="flex items-center gap-2 text-sm py-2.5 cursor-pointer">
                    <input type="checkbox" checked={p.editTravelAllowance} onChange={e => p.setEditTravelAllowance(e.target.checked)} className="accent-accent" />
                    <span className="text-charcoal/70">זכאי</span>
                  </label>
                </Field>
                <Field label="זכאות לחגים">
                  <label className="flex items-center gap-2 text-sm py-2.5 cursor-pointer">
                    <input type="checkbox" checked={p.editHolidayEligible} onChange={e => p.setEditHolidayEligible(e.target.checked)} className="accent-accent" />
                    <span className="text-charcoal/70">זכאי</span>
                  </label>
                </Field>
              </div>
              <Field label="סטטוס פנסיה">
                <AutoGrowTextarea value={p.editPensionStatus} onChange={e => p.setEditPensionStatus(e.target.value)} placeholder="פעיל / תקופת המתנה / לא הוסדר" className={INPUT} />
              </Field>
              {p.editRole === "ממונה" && (
                <Field label="PIN חדש (השאר ריק לשמירת הנוכחי)">
                  <input value={p.editPin} onChange={e => p.setEditPin(e.target.value.replace(/\D/g, "").slice(0, 8))} type="text" inputMode="numeric" maxLength={8} placeholder="4–8 ספרות" dir="ltr" className={INPUT} />
                </Field>
              )}
              {p.editMsg && <p className="text-xs text-red-500">{p.editMsg}</p>}
              <div className="flex gap-2">
                <button type="submit" disabled={p.editLoading} className="flex-1 bg-accent py-2 text-xs font-semibold text-bone hover:bg-accent-dark disabled:opacity-40 transition-colors">{p.editLoading ? "שומר..." : "שמור"}</button>
                <button type="button" onClick={() => p.setEditingId(null)} className="flex-1 border border-charcoal/20 py-2 text-xs text-charcoal/50 hover:border-accent transition-colors">ביטול</button>
              </div>
            </form>
          ) : (
            <div key={s.id} className={`flex items-center justify-between py-3 gap-2 ${!s.active ? "opacity-45" : ""}`}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{s.name}</p>
                <p className="text-[0.7rem] text-charcoal/40 tabular-nums" dir="ltr">{s.phone}</p>
                {(s.hourly_rate || s.daily_rate) && (
                  <p className="text-[0.65rem] text-accent/70">
                    {s.hourly_rate ? `₪${s.hourly_rate}/ש׳` : ""}{s.hourly_rate && s.daily_rate ? " · " : ""}{s.daily_rate ? `₪${s.daily_rate}/יום` : ""}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-[0.65rem] text-charcoal/40">{s.role}</span>
                {s.role === "ממונה" && (
                  <span className={`text-[0.55rem] px-1.5 py-0.5 ${s.has_pin ? "bg-accent/10 text-accent" : "bg-red-50 text-red-400"}`}>
                    {s.has_pin ? "PIN מוגדר" : "ללא PIN"}
                  </span>
                )}
              </div>
              <span className={`text-[0.65rem] px-2 py-0.5 shrink-0 ${s.active ? "bg-green-50 text-green-600" : "bg-charcoal/5 text-charcoal/40"}`}>{s.active ? "פעיל" : "לא פעיל"}</span>
              <button onClick={() => p.onStartEdit(s)} className="text-[0.7rem] border border-charcoal/15 px-2.5 py-1 hover:border-accent hover:text-accent transition-colors shrink-0">ערוך</button>
              <button onClick={() => p.onOpenVacation(s.id)} className="text-[0.7rem] border border-charcoal/15 px-2.5 py-1 hover:border-accent hover:text-accent transition-colors shrink-0">חופשה</button>
              <button onClick={() => p.onToggleActive(s.id, s.active)} className="text-[0.7rem] border border-charcoal/15 px-2.5 py-1 hover:border-accent hover:text-accent transition-colors shrink-0">{s.active ? "השבת" : "הפעל"}</button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
