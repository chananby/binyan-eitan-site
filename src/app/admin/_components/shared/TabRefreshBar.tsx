"use client";

import { useState, useEffect } from "react";
import { Loader2, RefreshCw } from "lucide-react";

export function TabRefreshBar({ loading, onRefresh, lastRefreshed }: {
  loading: boolean; onRefresh: () => void; lastRefreshed: Date | null;
}) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 15_000);
    return () => clearInterval(iv);
  }, []);

  const secs = lastRefreshed ? Math.round((Date.now() - lastRefreshed.getTime()) / 1000) : null;
  const timeStr = secs === null ? null
    : secs < 10  ? "עכשיו"
    : secs < 60  ? `לפני ${secs} שניות`
    : secs < 120 ? "לפני דקה"
    : `לפני ${Math.round(secs / 60)} דקות`;

  return (
    <div className="flex items-center justify-end gap-2.5">
      {timeStr && !loading && (
        <span className="text-[0.62rem] text-charcoal/70 tabular-nums">עודכן {timeStr}</span>
      )}
      <button
        onClick={onRefresh}
        disabled={loading}
        className="flex items-center gap-1.5 border border-charcoal/12 hover:border-accent px-2.5 py-1 text-[0.72rem] text-charcoal/70 hover:text-accent disabled:opacity-40 transition-colors duration-150"
      >
        {loading
          ? <><Loader2 size={10} className="animate-spin" /> מרענן...</>
          : <><RefreshCw size={10} strokeWidth={1.5} /> רענן</>}
      </button>
    </div>
  );
}
