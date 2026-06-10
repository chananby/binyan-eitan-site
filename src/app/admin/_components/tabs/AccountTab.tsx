"use client";

import React from "react";
import { Loader2, AlertCircle, Check } from "lucide-react";
import { Card } from "../shared/Card";
import { Field } from "../shared/Field";
import { INPUT } from "../shared/constants";

type PwMsg = { kind: "ok" | "err"; text: string } | null;

type Props = {
  // Identity
  adminEmail: string | null;
  adminName:  string | null;

  // System setting: attendance distance threshold
  farThresholdM:        number;
  farThresholdInput:    string;
  setFarThresholdInput: (v: string) => void;
  farThresholdSaving:   boolean;
  farThresholdMsg:      string;
  onSaveFarThreshold:   () => void | Promise<void>;

  // Change-password form
  pwCurrent:   string;
  setPwCurrent: (v: string) => void;
  pwNew:       string;
  setPwNew:    (v: string) => void;
  pwConfirm:   string;
  setPwConfirm: (v: string) => void;
  pwSaving:    boolean;
  pwMsg:       PwMsg;
  onChangePassword: (e: React.FormEvent) => void | Promise<void>;
};

export default function AccountTab({
  adminEmail, adminName,
  farThresholdM, farThresholdInput, setFarThresholdInput,
  farThresholdSaving, farThresholdMsg, onSaveFarThreshold,
  pwCurrent, setPwCurrent,
  pwNew,     setPwNew,
  pwConfirm, setPwConfirm,
  pwSaving, pwMsg,
  onChangePassword,
}: Props) {
  return (
    <div className="space-y-3">
      <Card title="הגדרות חשבון">
        <div className="space-y-1.5 pb-2 border-b border-warm-gray-light">
          <p className="text-[0.7rem] text-charcoal/50">מחובר/ת כ:</p>
          <p className="text-sm font-semibold text-charcoal" dir="ltr">{adminEmail ?? "—"}</p>
          {adminName && <p className="text-xs text-charcoal/50">{adminName}</p>}
        </div>
      </Card>

      <Card title="הגדרות מערכת — נוכחות">
        <Field label="סף מרחק מאתר העבודה (מטרים)">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              step={50}
              value={farThresholdInput}
              onChange={e => setFarThresholdInput(e.target.value)}
              className={INPUT + " flex-1"}
              dir="ltr"
            />
            <button
              onClick={onSaveFarThreshold}
              disabled={farThresholdSaving || farThresholdInput === String(farThresholdM)}
              className="bg-accent text-bone px-3 py-2 text-xs font-semibold tracking-wider uppercase hover:bg-accent-dark disabled:opacity-40 transition-colors shrink-0"
            >
              {farThresholdSaving ? "שומר..." : "שמור"}
            </button>
          </div>
          <p className="text-[0.62rem] text-charcoal/55 mt-1.5 leading-relaxed">
            החתמה שמתבצעת מעל המרחק הזה מהאתר תקבל דגל אדום באזור הנוכחות.
            ההחתמה עדיין תקפה — זו רק התראה שמאפשרת לך לבדוק.
            ברירת מחדל מומלצת: 500 מטר (כדי לכסות חניה + סטיות ב-GPS).
          </p>
          {farThresholdMsg && (
            <p className={`text-xs mt-2 ${farThresholdMsg.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>{farThresholdMsg}</p>
          )}
        </Field>
      </Card>

      <Card title="שנה סיסמה">
        <form onSubmit={onChangePassword} className="space-y-3">
          <Field label="סיסמה נוכחית">
            <input
              type="password"
              autoComplete="current-password"
              value={pwCurrent}
              onChange={e => setPwCurrent(e.target.value)}
              className={INPUT}
              disabled={pwSaving}
            />
          </Field>
          <Field label="סיסמה חדשה (8 תווים לפחות)">
            <input
              type="password"
              autoComplete="new-password"
              value={pwNew}
              onChange={e => setPwNew(e.target.value)}
              className={INPUT}
              disabled={pwSaving}
            />
          </Field>
          <Field label="אישור סיסמה חדשה">
            <input
              type="password"
              autoComplete="new-password"
              value={pwConfirm}
              onChange={e => setPwConfirm(e.target.value)}
              className={INPUT}
              disabled={pwSaving}
            />
          </Field>

          {pwMsg && (
            <div className={`flex items-center gap-2 text-sm ${pwMsg.kind === "ok" ? "text-green-600" : "text-red-500"}`}>
              {pwMsg.kind === "ok" ? <Check size={14} strokeWidth={2} /> : <AlertCircle size={14} strokeWidth={1.5} />}
              <span>{pwMsg.text}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={pwSaving || !pwCurrent || !pwNew || !pwConfirm}
            className="w-full bg-accent py-3 font-body text-sm font-semibold tracking-[0.18em] uppercase text-bone hover:bg-accent-dark disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center gap-2"
          >
            {pwSaving ? <><Loader2 size={14} className="animate-spin" /> שומר...</> : "שמור סיסמה חדשה"}
          </button>
        </form>
      </Card>
    </div>
  );
}
