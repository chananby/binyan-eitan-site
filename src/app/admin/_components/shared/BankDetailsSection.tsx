"use client";

import React from "react";
import { Field } from "./Field";
import { INPUT } from "./constants";

// Bank-account details for an active worker. Used by both the add-worker
// and edit-worker flows in WorkersTab. Lives in its own file to keep
// WorkersTab under the page-size budget; mirrors EmploymentSection's
// shape so the two render side-by-side cleanly.
//
// SECURITY: these fields are populated only by the admin-authed
// /api/admin/staff routes. The foreman path in admin/staff uses a
// narrow SELECT that doesn't include bank_* columns, so nothing here
// ever reaches a non-admin client. Do NOT add these fields to props
// of any tab/portal that a non-admin can reach.

interface Props {
  bankName: string;            setBankName: (v: string) => void;
  bankBranch: string;          setBankBranch: (v: string) => void;
  bankAccount: string;         setBankAccount: (v: string) => void;
  bankAccountOwner: string;    setBankAccountOwner: (v: string) => void;
  bankIban: string;            setBankIban: (v: string) => void;
}

export default function BankDetailsSection(p: Props) {
  return (
    <details className="border border-charcoal/10 rounded-sm p-3 bg-bone-dark/30">
      <summary className="cursor-pointer text-[0.75rem] font-semibold text-charcoal/70 uppercase tracking-wider">
        פרטי חשבון בנק
      </summary>
      <div className="mt-3 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="בנק">
            <input
              value={p.bankName}
              onChange={e => p.setBankName(e.target.value)}
              placeholder="לאומי / פועלים / דיסקונט"
              className={INPUT}
            />
          </Field>
          <Field label="סניף">
            <input
              value={p.bankBranch}
              onChange={e => p.setBankBranch(e.target.value)}
              placeholder="123"
              inputMode="numeric"
              dir="ltr"
              className={INPUT}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="מספר חשבון">
            <input
              value={p.bankAccount}
              onChange={e => p.setBankAccount(e.target.value)}
              placeholder="12345678"
              inputMode="numeric"
              dir="ltr"
              className={INPUT}
            />
          </Field>
          <Field label="על שם (אופציונלי)">
            <input
              value={p.bankAccountOwner}
              onChange={e => p.setBankAccountOwner(e.target.value)}
              placeholder="אם החשבון לא על שם העובד"
              className={INPUT}
            />
          </Field>
        </div>
        <Field label="IBAN (אופציונלי)">
          <input
            value={p.bankIban}
            onChange={e => p.setBankIban(e.target.value)}
            placeholder="IL00 0000 0000 0000 0000 000"
            dir="ltr"
            className={INPUT}
          />
        </Field>
      </div>
    </details>
  );
}
