"use client";

// Full-screen "you're finished" panel for the triage flow. Pulled out of
// TriageClient so the parent stays under the 400-line project ceiling —
// nothing else uses this component.

import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";

export default function TriageDoneScreen({
  total,
  assignedCount,
}: {
  total: number;
  assignedCount: number;
}) {
  const remaining = total - assignedCount;
  return (
    <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16">
      <CheckCircle2 size={64} strokeWidth={1.5} className="text-emerald-600 mb-6" />
      <h1 className="font-heading text-2xl font-bold text-charcoal mb-2">סיימת!</h1>
      <p className="text-body text-muted mb-2">
        {assignedCount === 0
          ? "אף מסמך לא שויך בסבב הזה."
          : <>שייכת <span className="font-bold text-charcoal">{assignedCount}</span> {assignedCount === 1 ? "מסמך" : "מסמכים"} מתוך {total}.</>}
      </p>
      {remaining > 0 && (
        <p className="text-caption text-muted mb-6">
          {remaining} {remaining === 1 ? "מסמך נשאר" : "מסמכים נשארו"} בלי שיוך — תוכל לחזור אליהם בסבב הבא.
        </p>
      )}
      <Link
        href="/admin/documents"
        className="inline-flex items-center gap-2 bg-accent text-bone px-5 py-2.5 rounded-md text-content font-semibold hover:bg-accent-dark transition-colors"
      >
        <ArrowRight size={16} /> חזרה לרשימת האסמכתאות
      </Link>
    </main>
  );
}
