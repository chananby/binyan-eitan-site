"use client";

// Persistent yellow banner shown while an admin is acting-as-foreman. Exiting
// clears the view cookie (DELETE /api/admin/impersonate) and reloads — the
// admin's own session cookie was never touched, so they land back in admin.

import { useState } from "react";
import { Eye, X, Loader2 } from "lucide-react";

export default function ViewAsBanner({ viewedName }: { viewedName: string | null }) {
  const [exiting, setExiting] = useState(false);

  async function exit() {
    setExiting(true);
    try { await fetch("/api/admin/impersonate", { method: "DELETE" }); } catch { /* reload anyway */ }
    window.location.reload();
  }

  return (
    <div dir="rtl" className="sticky top-0 z-[60] bg-amber-400 text-amber-950 px-4 py-2 flex items-center justify-between gap-3 shadow-md">
      <span className="flex items-center gap-2 text-sm font-semibold min-w-0">
        <Eye size={16} className="shrink-0" />
        <span className="truncate">פועל בתור {viewedName ?? "מנהל עבודה"}</span>
      </span>
      <button
        onClick={exit}
        disabled={exiting}
        className="shrink-0 flex items-center gap-1 text-sm font-bold bg-amber-950 text-amber-50 rounded px-3 py-1 hover:bg-amber-900 disabled:opacity-60"
      >
        {exiting ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />} חזרה לאדמין
      </button>
    </div>
  );
}
