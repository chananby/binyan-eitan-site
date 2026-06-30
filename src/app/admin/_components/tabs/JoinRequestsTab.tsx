"use client";

/**
 * JoinRequestsTab — admin queue of "new worker wants to join"
 * submissions from the public /he/join form.
 *
 *   List   — pending requests, newest first.
 *   אשר   — opens ApproveWorkerDialog (creates a staff row + links the
 *           join_request to it).
 *   דחה   — confirm + POST reject; the row leaves the list.
 *
 * The list, the badge count, and the loader live in AdminPortal so
 * the count stays visible even while the admin is on another tab.
 * This component is the presentation surface + per-row action wiring.
 */

import { useState } from "react";
import { Loader2, AlertTriangle, RefreshCw, UserPlus, X, Inbox } from "lucide-react";
import { Card } from "../shared/Card";
import ApproveWorkerDialog from "../shared/ApproveWorkerDialog";

export interface JoinRequest {
  id: string;
  full_name: string;
  phone: string;
  description: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_at: string | null;
  staff_id: string | null;
  rejection_note: string | null;
}

interface Props {
  requests: JoinRequest[];
  loading: boolean;
  error: string | null;
  /** Refetch the join requests list — bound to "רענן" and to post-reject. */
  onReload: () => void | Promise<void>;
  /** Called after an approval succeeds. The container refreshes both the
   *  requests list (the approved one drops from pending) and the workers
   *  list (the new staff row needs to appear without a hard reload). */
  onApproved: () => void | Promise<void>;
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("he-IL", {
      timeZone: "Asia/Jerusalem",
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

export default function JoinRequestsTab({ requests, loading, error, onReload, onApproved }: Props) {
  const [approveFor, setApproveFor] = useState<JoinRequest | null>(null);
  const [rejecting,  setRejecting]  = useState<string | null>(null);

  async function reject(r: JoinRequest) {
    const note = window.prompt(
      `לדחות את בקשת ${r.full_name}?\nהערה (אופציונלי):`,
      "",
    );
    // prompt returns null on cancel — distinct from "" on confirm-empty.
    if (note === null) return;

    setRejecting(r.id);
    try {
      const res = await fetch(`/api/admin/join-requests/${r.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          ...(note.trim() ? { rejection_note: note.trim() } : {}),
        }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        alert(`דחייה נכשלה: ${b.error ?? res.status}`);
        return;
      }
      await onReload();
    } catch (err) {
      alert("שגיאת רשת: " + String(err));
    } finally {
      setRejecting(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-body text-xs text-charcoal/70 leading-snug">
          בקשות הצטרפות עובדים חדשים שמחכות לבדיקה.
        </p>
        <button
          type="button"
          onClick={() => onReload()}
          className="flex items-center gap-1 text-xs text-charcoal/65 hover:text-accent shrink-0"
        >
          <RefreshCw size={12} /> רענן
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-12 text-charcoal/65">
          <Loader2 size={18} className="animate-spin" /> טוען בקשות…
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center gap-3 py-12">
          <AlertTriangle size={32} className="text-amber-500" />
          <p className="text-sm text-charcoal/70">{error}</p>
          <button
            type="button"
            onClick={() => onReload()}
            className="flex items-center gap-1.5 border border-accent/40 text-accent rounded px-3 py-1.5 text-sm hover:bg-accent/10"
          >
            <RefreshCw size={13} /> נסה שוב
          </button>
        </div>
      )}

      {!loading && !error && requests.length === 0 && (
        <Card>
          <div className="flex flex-col items-center justify-center gap-2 py-8">
            <Inbox size={28} strokeWidth={1.5} className="text-charcoal/35" />
            <p className="text-sm text-charcoal/65">אין בקשות הצטרפות ממתינות.</p>
          </div>
        </Card>
      )}

      {!loading && !error && requests.length > 0 && (
        <Card>
          <div className="divide-y divide-charcoal/15">
            {requests.map((r) => (
              <div key={r.id} className="py-3 space-y-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="font-heading text-sm font-bold text-charcoal truncate">{r.full_name}</p>
                    <p className="text-xs text-charcoal/70 tabular-nums" dir="ltr">{r.phone}</p>
                    <p className="text-[0.7rem] text-charcoal/55 mt-0.5">{formatWhen(r.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setApproveFor(r)}
                      disabled={rejecting === r.id}
                      className="flex items-center gap-1.5 bg-accent text-bone px-3 py-1.5 rounded text-xs font-semibold hover:bg-accent-dark disabled:opacity-40 transition-colors"
                    >
                      <UserPlus size={12} /> אשר
                    </button>
                    <button
                      type="button"
                      onClick={() => reject(r)}
                      disabled={rejecting === r.id}
                      className="flex items-center gap-1.5 border border-red-300 text-red-600 px-3 py-1.5 rounded text-xs font-semibold hover:bg-red-50 disabled:opacity-40 transition-colors"
                    >
                      {rejecting === r.id ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                      דחה
                    </button>
                  </div>
                </div>
                {r.description && (
                  <p className="text-xs text-charcoal/70 bg-bone rounded px-2 py-1.5 leading-snug">
                    {r.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      <ApproveWorkerDialog
        open={!!approveFor}
        request={approveFor}
        onClose={() => setApproveFor(null)}
        onApproved={async () => {
          setApproveFor(null);
          await onApproved();
        }}
      />
    </div>
  );
}
