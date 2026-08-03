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

  // System settings: location enforcement (radius + monthly remote-exit cap + master switch).
  // These are ENFORCEMENT thresholds — the far-threshold above is a VISUAL warning only. The
  // two layers are intentionally separate: an admin can keep a tight 50m visual chip while
  // enforcement kicks in only above 100m. attendance-settings.ts explains the model.
  gpsEnforce:               boolean;
  setGpsEnforce:            (v: boolean) => void;
  gpsEnforceRadius:         number;
  gpsEnforceRadiusInput:    string;
  setGpsEnforceRadiusInput: (v: string) => void;
  remoteExitCap:            number;
  remoteExitCapInput:       string;
  setRemoteExitCapInput:    (v: string) => void;
  gpsEnforceSaving:         boolean;
  gpsEnforceMsg:            string;
  onSaveGpsEnforcement:     () => void | Promise<void>;

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
  gpsEnforce, setGpsEnforce,
  gpsEnforceRadius, gpsEnforceRadiusInput, setGpsEnforceRadiusInput,
  remoteExitCap,    remoteExitCapInput,    setRemoteExitCapInput,
  gpsEnforceSaving, gpsEnforceMsg, onSaveGpsEnforcement,
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
          <p className="text-caption text-charcoal/65">מחובר/ת כ:</p>
          <p className="text-content font-semibold text-charcoal" dir="ltr">{adminEmail ?? "—"}</p>
          {adminName && <p className="text-content text-charcoal/65">{adminName}</p>}
        </div>
      </Card>

      <Card title="הגדרות מערכת — נוכחות">
        <Field label="סף מרחק מאתר העבודה (מטרים)">
          <div className="flex items-center gap-2 max-w-md">
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
              className="bg-accent text-bone px-3 py-2 text-micro font-semibold tracking-wider uppercase hover:bg-accent-dark disabled:opacity-40 transition-colors shrink-0"
            >
              {farThresholdSaving ? "שומר..." : "שמור"}
            </button>
          </div>
          <p className="text-content text-charcoal/70 mt-1.5 leading-relaxed">
            החתמה שמתבצעת מעל המרחק הזה מהאתר תקבל דגל אדום באזור הנוכחות.
            ההחתמה עדיין תקפה — זו רק התראה שמאפשרת לך לבדוק.
            ברירת מחדל מומלצת: 500 מטר (כדי לכסות חניה + סטיות ב-GPS).
          </p>
          {farThresholdMsg && (
            <p className={`text-caption mt-2 ${farThresholdMsg.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>{farThresholdMsg}</p>
          )}
        </Field>
      </Card>

      <Card title="הגדרות מערכת — אכיפת מיקום">
        <div className="space-y-3 max-w-md">
          <label className="flex items-center gap-2 select-none">
            <input
              type="checkbox"
              checked={gpsEnforce}
              onChange={(e) => setGpsEnforce(e.target.checked)}
              className="accent-accent"
            />
            <span className="text-caption font-semibold text-charcoal">אכיפת מיקום פעילה</span>
          </label>
          <p className="text-content text-charcoal/70 leading-relaxed">
            כשמופעל: כניסה מעל הרדיוס תיחסם, יציאה מעל הרדיוס תיספר מול תקרה חודשית.
            כשמכובה: המרחק עדיין נרשם על השורה, אבל אף החתמה לא נחסמת — מתג חירום
            אם מתגלה שהרדיוס צר מדי.
          </p>

          <Field label="רדיוס אכיפה (מטרים)">
            <input
              type="number"
              min={0}
              step={10}
              value={gpsEnforceRadiusInput}
              onChange={(e) => setGpsEnforceRadiusInput(e.target.value)}
              className={INPUT}
              dir="ltr"
              disabled={gpsEnforceSaving}
            />
            <p className="text-content text-charcoal/70 mt-1.5 leading-relaxed">
              מרחק מקסימלי בין העובד לאתר כדי לאפשר החתמת כניסה. סף האזהרה הוויזואלי
              (הצ&apos;יפ האדום) הוא הגדרה נפרדת ויכול להיות צר יותר.
            </p>
          </Field>

          <Field label="תקרת יציאות מרחוק לחודש">
            <input
              type="number"
              min={0}
              step={1}
              value={remoteExitCapInput}
              onChange={(e) => setRemoteExitCapInput(e.target.value)}
              className={INPUT}
              dir="ltr"
              disabled={gpsEnforceSaving}
            />
            <p className="text-content text-charcoal/70 mt-1.5 leading-relaxed">
              מעל הרדיוס = &quot;יציאה מרחוק&quot;. עד המכסה יעברו; מעליה יחסמו עם 409.
            </p>
          </Field>

          <div className="flex items-center gap-2">
            <button
              onClick={onSaveGpsEnforcement}
              disabled={gpsEnforceSaving}
              className="bg-accent text-bone px-3 py-2 text-micro font-semibold tracking-wider uppercase hover:bg-accent-dark disabled:opacity-40 transition-colors"
            >
              {gpsEnforceSaving ? "שומר..." : "שמור"}
            </button>
            {gpsEnforceMsg && (
              <p className={`text-caption ${gpsEnforceMsg.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>{gpsEnforceMsg}</p>
            )}
          </div>
        </div>
      </Card>

      <Card title="שנה סיסמה">
        <form onSubmit={onChangePassword} className="space-y-3 max-w-md">
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
            <div className={`flex items-center gap-2 text-caption ${pwMsg.kind === "ok" ? "text-green-600" : "text-red-500"}`}>
              {pwMsg.kind === "ok" ? <Check size={14} strokeWidth={2} /> : <AlertCircle size={14} strokeWidth={1.5} />}
              <span>{pwMsg.text}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={pwSaving || !pwCurrent || !pwNew || !pwConfirm}
            className="w-full bg-accent py-3 font-body text-caption font-semibold tracking-[0.18em] uppercase text-bone hover:bg-accent-dark disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center gap-2"
          >
            {pwSaving ? <><Loader2 size={14} className="animate-spin" /> שומר...</> : "שמור סיסמה חדשה"}
          </button>
        </form>
      </Card>
    </div>
  );
}
