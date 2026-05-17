"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function InternalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div
      dir="rtl"
      className="min-h-screen flex items-center justify-center bg-bone px-6 font-body"
    >
      <div className="max-w-md w-full bg-white rounded-2xl border border-glass-border shadow-sm p-8 text-center">
        <div className="w-12 h-12 bg-bone-dark rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-6 h-6 text-accent"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-heading font-semibold text-charcoal mb-2">
          משהו השתבש באזור הפנימי
        </h1>
        <p className="text-sm text-charcoal-light mb-6 leading-relaxed">
          קרתה שגיאה לא צפויה. הצוות קיבל התראה. נסה לטעון מחדש.
        </p>
        {process.env.NODE_ENV === "development" && (
          <pre
            dir="ltr"
            className="text-xs text-left bg-bone-dark p-3 rounded mb-4 overflow-auto max-h-40 text-charcoal-light"
          >
            {error.message}
            {error.digest && `\n\nDigest: ${error.digest}`}
          </pre>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 bg-charcoal text-bone rounded-lg text-sm font-medium hover:bg-charcoal-light transition-colors"
          >
            נסה שוב
          </button>
          <a
            href="/internal"
            className="px-4 py-2 bg-bone-dark text-charcoal rounded-lg text-sm font-medium hover:bg-warm-gray-light transition-colors"
          >
            חזרה לדשבורד
          </a>
        </div>
      </div>
    </div>
  );
}
