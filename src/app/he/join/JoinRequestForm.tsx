"use client";

// JoinRequestForm — client-side form for /he/join. The server-component
// page.tsx in the same folder owns the metadata + renders this. We
// split because Next.js metadata can only ship from a server component,
// while the form needs hooks. Same shape as he/change-order/page.tsx.
//
// /he/join is a SIBLING of /he/internal — outside the PinGate layout
// at /he/internal/layout.tsx — so a worker with no PIN can land here.
//
// The form posts to /api/join-request (also public, rate-limited).
// Client-side uses the SAME validateJoinRequest the server uses, so
// inline errors mirror what the server would return — the round-trip
// is a confirmation, not a discovery.

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Send, CheckCircle, AlertCircle, ChevronRight, Loader2 } from "lucide-react";
import { validateJoinRequest, MAX_NAME_CHARS, MAX_DESCRIPTION_CHARS } from "../../../lib/join-requests-validate";

type FieldErrors = Partial<Record<"full_name" | "phone" | "description", string>>;

export default function JoinRequestForm() {
  const [fullName, setFullName]       = useState("");
  const [phone, setPhone]             = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors]           = useState<FieldErrors>({});
  const [submitting, setSubmitting]   = useState(false);
  // server-side message: 409 dup, 429 rate-limit, 500 generic.
  const [serverMsg, setServerMsg]     = useState<string | null>(null);
  const [submitted, setSubmitted]     = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setServerMsg(null);

    // Client-side validation runs the SAME pure module the server uses,
    // so when the form passes here it's already what the server expects.
    const result = validateJoinRequest({ full_name: fullName, phone, description });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const res = await fetch("/api/join-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.data),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.ok) {
        setSubmitted(true);
      } else if (res.status === 400 && d.fields) {
        // Server caught a field we missed — reflect it back inline.
        setErrors(d.fields as FieldErrors);
      } else {
        setServerMsg(d.error || "שגיאה בשליחה — נסה שוב.");
      }
    } catch {
      setServerMsg("שגיאת רשת — נסה שוב.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-bone flex items-center justify-center px-6 py-16" dir="rtl">
        <div className="max-w-md w-full bg-white border border-charcoal/10 rounded-md shadow-sm p-8 text-center space-y-4">
          <CheckCircle size={48} strokeWidth={1.25} className="text-green-500 mx-auto" />
          <h1 className="font-heading text-2xl font-bold text-charcoal">תודה!</h1>
          <p className="font-body text-sm text-charcoal/70 leading-relaxed">
            הבקשה שלך התקבלה. ניצור איתך קשר בהקדם בטלפון שמסרת.
          </p>
          <Link
            href="/he"
            className="inline-flex items-center gap-1 text-accent font-body text-sm hover:underline"
          >
            <ChevronRight size={14} strokeWidth={1.5} />
            חזרה לדף הבית
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bone px-6 py-16" dir="rtl">
      <div className="max-w-md mx-auto">
        <Link href="/he" className="font-body text-xs text-charcoal/60 hover:text-accent inline-flex items-center gap-1 mb-6">
          <ChevronRight size={13} strokeWidth={1.5} />
          לדף הבית
        </Link>

        <h1 className="font-heading text-2xl font-bold text-charcoal mb-2">בקשת הצטרפות</h1>
        <p className="font-body text-sm text-charcoal/65 leading-relaxed mb-6">
          רוצה להצטרף לצוות בניין איתן? מלא/י את הפרטים ונחזור אליך בהקדם.
        </p>

        <form onSubmit={onSubmit} className="bg-white border border-charcoal/10 rounded-md shadow-sm p-5 space-y-4">
          <Field
            label="שם מלא"
            required
            error={errors.full_name}
          >
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              maxLength={MAX_NAME_CHARS}
              autoComplete="name"
              className="w-full border border-charcoal/15 rounded px-3 py-2 text-sm focus:outline-none focus:border-accent transition-colors"
              placeholder="ישראל ישראלי"
            />
          </Field>

          <Field
            label="טלפון"
            required
            error={errors.phone}
            hint="ניצור איתך קשר במספר הזה"
          >
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              dir="ltr"
              className="w-full border border-charcoal/15 rounded px-3 py-2 text-sm focus:outline-none focus:border-accent transition-colors text-end"
              placeholder="050-1234567"
            />
          </Field>

          <Field
            label="תיאור קצר"
            error={errors.description}
            hint={`ספר/י בקצרה על תפקידך וניסיונך (אופציונלי). עד ${MAX_DESCRIPTION_CHARS} תווים.`}
          >
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={MAX_DESCRIPTION_CHARS}
              rows={4}
              className="w-full border border-charcoal/15 rounded px-3 py-2 text-sm focus:outline-none focus:border-accent transition-colors resize-none"
              placeholder="לדוגמה: עובד שיפוצים כללי, ניסיון 5 שנים בעבודות גמר…"
            />
          </Field>

          {serverMsg && (
            <div className="flex items-start gap-2 border border-red-200 bg-red-50 rounded px-3 py-2">
              <AlertCircle size={14} strokeWidth={1.5} className="text-red-400 mt-0.5 shrink-0" />
              <p className="font-body text-xs text-red-600 leading-snug">{serverMsg}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-accent text-bone py-3 rounded font-heading text-sm font-bold tracking-wider uppercase hover:bg-accent-dark disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
          >
            {submitting
              ? <><Loader2 size={16} className="animate-spin" /> שולח…</>
              : <><Send size={14} strokeWidth={1.75} /> שלח בקשה</>}
          </button>
        </form>
      </div>
    </main>
  );
}

interface FieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}
function Field({ label, required, error, hint, children }: FieldProps) {
  return (
    <label className="block space-y-1">
      <span className="font-body text-xs font-semibold text-charcoal/70">
        {label}
        {required && <span className="text-red-500 mx-1">*</span>}
      </span>
      {children}
      {error
        ? <p className="font-body text-[0.7rem] text-red-600 leading-snug">{error}</p>
        : hint ? <p className="font-body text-[0.7rem] text-charcoal/60 leading-snug">{hint}</p>
        : null}
    </label>
  );
}
