"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function EnError({
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
      dir="ltr"
      className="min-h-screen flex items-center justify-center bg-charcoal text-bone px-6 font-body"
    >
      <div className="max-w-lg w-full text-center">
        <div className="w-16 h-16 bg-charcoal-light rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-accent"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-heading font-semibold mb-4 tracking-tight">
          Something went wrong
        </h1>
        <p className="text-warm-gray-light mb-8 leading-relaxed">
          An unexpected error occurred while loading the page. Our team has been
          notified and will look into it. In the meantime, please try reloading
          or return to the homepage.
        </p>
        {process.env.NODE_ENV === "development" && (
          <pre className="text-xs text-left bg-charcoal-light p-4 rounded mb-6 overflow-auto max-h-40 text-warm-gray-light">
            {error.message}
            {error.digest && `\n\nDigest: ${error.digest}`}
          </pre>
        )}
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={reset}
            className="px-6 py-3 bg-bone text-charcoal rounded-lg font-medium hover:bg-bone-dark transition-colors"
          >
            Try again
          </button>
          <a
            href="/en"
            className="px-6 py-3 bg-charcoal-light text-bone rounded-lg font-medium hover:bg-warm-gray transition-colors border border-warm-gray/20"
          >
            Back to home
          </a>
        </div>
      </div>
    </div>
  );
}
