"use client";

import React from "react";
import { Field } from "./Field";
import { INPUT } from "./constants";

// Three-rate form section + attendance-exemption checkbox, used by both the
// add-worker and edit-worker flows in WorkersTab. Lives in its own file so
// WorkersTab stays under the page-size budget — every employment-related UI
// concern (employment-type select, conditional rate input, "global highlight",
// "attendance exempt" toggle) is consolidated here.
//
// The visual emphasis when employment_type='global' is intentional: a manager
// on a fixed monthly salary needs the monthly-salary field to feel primary,
// not as one option among three. Switching back to hourly/daily removes the
// emphasis, so the same component covers all three cases without surprises.
//
// `attendance_exempt` is independent of employment_type by design — a global
// manager *might* still clock in, and a salaried foreman *might* be exempt.
// We expose both as separate inputs so admins control them independently.

export type EmploymentType = "hourly" | "daily" | "global";

interface Props {
  employmentType: EmploymentType;
  setEmploymentType: (v: EmploymentType) => void;
  hourlyRate: string;
  setHourlyRate: (v: string) => void;
  dailyRate: string;
  setDailyRate: (v: string) => void;
  globalSalary: string;
  setGlobalSalary: (v: string) => void;
  attendanceExempt: boolean;
  setAttendanceExempt: (v: boolean) => void;
  /** "new" → richer placeholders for first-time add; "edit" → terser inline edit. */
  mode: "new" | "edit";
}

export default function EmploymentSection(p: Props) {
  const isGlobal = p.employmentType === "global";

  return (
    <>
      <div className={`grid grid-cols-2 gap-3 ${isGlobal ? "p-2 -m-2 bg-accent/[0.04] border border-accent/20" : ""}`}>
        <Field label="סוג העסקה">
          <select
            value={p.employmentType}
            onChange={e => p.setEmploymentType(e.target.value as EmploymentType)}
            className={INPUT}
          >
            <option value="hourly">שעתי</option>
            <option value="daily">יומי</option>
            <option value="global">גלובלי (שכר חודשי קבוע)</option>
          </select>
        </Field>

        {/* Three exclusive rate inputs — only the one matching employment_type
            renders. Stays a grid sibling so the layout doesn't jump as the
            select changes. Hourly/daily inputs dim when "global" is active —
            the values are still preserved in state, just visually backgrounded. */}
        {p.employmentType === "hourly" && (
          <Field label="שכר שעתי (₪)">
            <input
              value={p.hourlyRate}
              onChange={e => p.setHourlyRate(e.target.value)}
              type="number" min="0" step="0.5"
              placeholder={p.mode === "new" ? "45.00" : undefined}
              dir="ltr" className={INPUT}
            />
          </Field>
        )}
        {p.employmentType === "daily" && (
          <Field label="שכר יומי (₪)">
            <input
              value={p.dailyRate}
              onChange={e => p.setDailyRate(e.target.value)}
              type="number" min="0" step="1"
              placeholder={p.mode === "new" ? "350" : undefined}
              dir="ltr" className={INPUT}
            />
          </Field>
        )}
        {p.employmentType === "global" && (
          <Field label="שכר חודשי גלובלי (₪)">
            <input
              value={p.globalSalary}
              onChange={e => p.setGlobalSalary(e.target.value)}
              type="number" min="0" step="1"
              placeholder={p.mode === "new" ? "8000" : undefined}
              dir="ltr" className={`${INPUT} font-bold`}
            />
          </Field>
        )}
      </div>

      <Field label="נוכחות">
        <label className="flex items-start gap-2 text-sm py-2 cursor-pointer">
          <input
            type="checkbox"
            checked={p.attendanceExempt}
            onChange={e => p.setAttendanceExempt(e.target.checked)}
            className="accent-accent mt-0.5"
          />
          <span className="text-charcoal/70">
            פטור מנוכחות
            <span className="block text-[0.7rem] text-charcoal/40 mt-0.5">
              עובד שאינו מתחייב להחתים — לא יסומן כיום חסר ויוצג מופרד במסך הנוכחות.
            </span>
          </span>
        </label>
      </Field>
    </>
  );
}
