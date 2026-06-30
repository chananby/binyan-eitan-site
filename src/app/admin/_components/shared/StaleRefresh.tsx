"use client";

// Wrap a content area that re-fetches periodically. The naive pattern
//   {loading && <Spinner/>}
//   {!loading && docs.length > 0 && <List/>}
// makes the screen "jump": every refresh blanks the list back to a
// spinner and then renders it again. This wrapper keeps the previously-
// rendered children mounted and dims them while the next fetch is in
// flight, swapping them for the fresh content only when it lands.
//
// First-time loads — when no content has ever shown — still render a
// full spinner, since there's nothing useful to keep mounted yet. The
// `seenRef` is the toggle between the two modes; once true, the wrapper
// stays in "stale refresh" mode even if `hasContent` momentarily drops
// back to false (e.g. a filter that returns zero rows).

import { Loader2 } from "lucide-react";
import { useRef, type ReactNode } from "react";

export function StaleRefresh({
  loading,
  hasContent,
  spinner,
  children,
}: {
  loading: boolean;
  hasContent: boolean;
  /** Optional first-load fallback. The default is a centred bronze spinner
   *  in a py-12 box — fine for most lists; override when the surrounding
   *  layout needs something tighter or a custom message. */
  spinner?: ReactNode;
  children: ReactNode;
}) {
  const seenRef = useRef(false);
  if (hasContent) seenRef.current = true;

  // First load: nothing to keep mounted, full spinner is the right call.
  if (loading && !seenRef.current) {
    return (
      <>
        {spinner ?? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-accent" size={24} />
          </div>
        )}
      </>
    );
  }

  // Refresh: keep the existing children visible, dim them, and pin a
  // small badge to the top-end corner so the admin sees that something
  // is happening without losing their place in the list.
  const refreshing = loading && seenRef.current;

  return (
    <div className="relative">
      <div className={`transition-opacity duration-200 ${refreshing ? "opacity-60" : "opacity-100"}`}>
        {children}
      </div>
      {refreshing && (
        <div className="pointer-events-none absolute top-2 end-2 flex items-center gap-1.5 bg-white/95 border border-charcoal/10 rounded-md px-2 py-1 shadow-sm">
          <Loader2 size={11} className="animate-spin text-accent" />
          <span className="text-caption text-muted">מתעדכן…</span>
        </div>
      )}
    </div>
  );
}
