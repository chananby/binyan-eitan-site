"use client";

/**
 * AttendanceReportMistake — inline form for the worker portal's history
 * view. Lets the worker flag an existing attendance row as incorrect
 * (optionally proposing a corrected HH:MM time) and ship a reason to the
 * admin for review via /api/worker/corrections.
 *
 * Lives as its own file because AttendanceForm.tsx is already large; the
 * parent only imports + renders it, no business logic added there.
 *
 * Two languages — he + ru — matching AttendanceForm's existing pattern.
 */

import { useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";

type Lang = "he" | "ru";

const T: Record<Lang, {
  title: string; proposedLabel: string; reasonLabel: string;
  reasonPlaceholder: string; submit: string; sending: string; cancel: string;
  reasonRequired: string; tooMany: string; alreadyOpen: string;
  outOfWindow: string; generic: string;
}> = {
  he: {
    title:             "דווח על טעות ברשומה",
    proposedLabel:     "שעה נכונה (אופציונלי)",
    reasonLabel:       "מה הטעות?",
    reasonPlaceholder: "למשל: יצאתי ב-18:30 ולא ב-17:00 כפי שמופיע",
    submit:            "שלח לאישור",
    sending:           "שולח…",
    cancel:            "ביטול",
    reasonRequired:    "נא להסביר במה הטעות",
    tooMany:           "יותר מדי בקשות. נסה שוב בעוד כמה דקות.",
    alreadyOpen:       "כבר נשלחה בקשת תיקון לרשומה זו, ממתינה לאישור.",
    outOfWindow:       "ניתן לדווח על טעות רק לרשומות מהחודש הנוכחי או הקודם.",
    generic:           "שגיאה — נסה שוב.",
  },
  ru: {
    title:             "Сообщить об ошибке",
    proposedLabel:     "Правильное время (опционально)",
    reasonLabel:       "В чём ошибка?",
    reasonPlaceholder: "Например: я ушёл в 18:30, а не в 17:00",
    submit:            "Отправить",
    sending:           "Отправка…",
    cancel:            "Отмена",
    reasonRequired:    "Опишите ошибку",
    tooMany:           "Слишком много попыток. Попробуйте через несколько минут.",
    alreadyOpen:       "Запрос на исправление уже отправлен и ожидает решения.",
    outOfWindow:       "Можно отправить запрос только за текущий или предыдущий месяц.",
    generic:           "Ошибка — попробуйте снова.",
  },
};

export default function AttendanceReportMistake(p: {
  attendanceId: string;
  lang: Lang;
  onCancel: () => void;
  onSent:   () => void; // parent reloads history, swaps button for chip
}) {
  const t = T[p.lang];
  const [proposed, setProposed] = useState("");
  const [reason,   setReason]   = useState("");
  const [busy,     setBusy]     = useState(false);
  const [err,      setErr]      = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) { setErr(t.reasonRequired); return; }
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/worker/corrections", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendance_id: p.attendanceId,
          reason:        reason.trim(),
          ...(proposed.trim() ? { proposed_time: proposed.trim() } : {}),
        }),
      });
      if (res.ok) { p.onSent(); return; }
      if (res.status === 429) { setErr(t.tooMany); }
      else if (res.status === 409) { setErr(t.alreadyOpen); }
      else if (res.status === 403) { setErr(t.outOfWindow); }
      else {
        const b = await res.json().catch(() => ({}));
        setErr(b.error ?? t.generic);
      }
    } catch {
      setErr(t.generic);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="bg-amber-50/60 border border-amber-200 p-3 space-y-2.5">
      <p className="font-body text-xs font-semibold text-amber-800">{t.title}</p>
      <label className="flex flex-col gap-1">
        <span className="text-[0.65rem] uppercase tracking-wider text-charcoal/55">{t.proposedLabel}</span>
        <input
          type="time"
          value={proposed}
          onChange={(e) => setProposed(e.target.value)}
          className="border border-charcoal/20 bg-white px-2 py-1.5 text-sm focus:outline-none focus:border-accent"
          dir="ltr"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[0.65rem] uppercase tracking-wider text-charcoal/55">{t.reasonLabel}</span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t.reasonPlaceholder}
          rows={2}
          required
          className="border border-charcoal/20 bg-white px-2 py-1.5 text-sm focus:outline-none focus:border-accent resize-none"
        />
      </label>
      {err && (
        <p className="flex items-center gap-1.5 text-xs text-red-600">
          <AlertCircle size={12} /> {err}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white py-2 text-xs font-semibold tracking-wider uppercase transition-colors flex items-center justify-center gap-1.5"
        >
          {busy ? <><Loader2 size={12} className="animate-spin" /> {t.sending}</> : t.submit}
        </button>
        <button
          type="button"
          onClick={p.onCancel}
          disabled={busy}
          className="flex-1 border border-charcoal/15 text-charcoal/55 py-2 text-xs font-semibold tracking-wider uppercase hover:border-accent hover:text-accent disabled:opacity-40 transition-colors"
        >
          {t.cancel}
        </button>
      </div>
    </form>
  );
}
