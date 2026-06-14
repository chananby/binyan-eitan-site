"use client";

// Continuous review queue: works through all pending documents one after the
// next without returning to the list. The queue is a stack — the current
// document is always docs[0]; approving/rejecting/deleting drops it and the
// next surfaces. Sorted so flagged/exceptional documents come first and clean
// high-confidence ones last. Admin-gated client-side (API enforces admin too).

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ChevronRight, Inbox, AlertCircle, CheckCircle2, X } from "lucide-react";
import DocumentReviewForm from "../[id]/DocumentReviewForm";
import { documentFlags, isCleanHighConfidence, type DocRow } from "../_components/labels";
import DocumentFlagsBanner from "./DocumentFlagsBanner";
import ApproveAllDialog from "./ApproveAllDialog";
import UndoToast from "./UndoToast";

type AuthState = "loading" | "unauthenticated" | "admin";
interface Opt { id: string; name: string }
type UndoState = { kind: "single" | "bulk"; docs: DocRow[] };

// Flagged first (more attention), clean high-confidence last.
function attention(doc: DocRow): number {
  const flags = documentFlags(doc);
  const errors = flags.filter(f => f.severity === "error").length;
  const warns = flags.filter(f => f.severity === "warn").length;
  return errors * 10 + warns;
}
function sortQueue(docs: DocRow[]): DocRow[] {
  return [...docs].sort((a, b) => attention(b) - attention(a));
}

export default function ReviewQueueClient() {
  const [auth, setAuth] = useState<AuthState>("loading");
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [total, setTotal] = useState(0);
  const [vendors, setVendors] = useState<Opt[]>([]);
  const [projects, setProjects] = useState<Opt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [approveAllOpen, setApproveAllOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [undo, setUndo] = useState<UndoState | null>(null);
  const [undoSeq, setUndoSeq] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/whoami", { cache: "no-store" })
      .then(r => r.json())
      .then(d => { if (!cancelled) setAuth(d?.role === "admin" ? "admin" : "unauthenticated"); })
      .catch(() => { if (!cancelled) setAuth("unauthenticated"); });
    return () => { cancelled = true; };
  }, []);

  const loadVendors = useCallback(() => {
    fetch("/api/admin/vendors", { cache: "no-store" }).then(r => r.json())
      .then(d => setVendors(d.vendors ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (auth !== "admin") return;
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const d = await fetch("/api/admin/documents?status=pending&limit=500", { cache: "no-store" }).then(r => r.json());
        if (cancelled) return;
        if (d.error) { setError(d.error); return; }
        const sorted = sortQueue(d.documents ?? []);
        setDocs(sorted); setTotal(sorted.length);
      } catch (e) {
        if (!cancelled) setError(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    loadVendors();
    fetch("/api/projects", { cache: "no-store" }).then(r => r.json())
      .then(d => setProjects(d.projects ?? [])).catch(() => {});
    return () => { cancelled = true; };
  }, [auth, loadVendors]);

  // The form did the PATCH/DELETE; here we just advance the queue + offer Undo.
  function handleAfterAction(action: "approve" | "reject" | "delete") {
    const doc = docs[0];
    setDocs(prev => prev.slice(1));
    if (action === "approve" || action === "reject") {
      setUndo({ kind: "single", docs: [doc] });
      setUndoSeq(s => s + 1);
    }
  }

  async function handleUndo() {
    if (!undo) return;
    const restore = undo.docs;
    setUndo(null);
    try {
      if (undo.kind === "single") {
        await fetch(`/api/admin/documents/${restore[0].id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "pending" }),
        });
        setDocs(prev => [restore[0], ...prev]); // back to the front (current)
      } else {
        await fetch("/api/admin/documents/bulk", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: restore.map(d => d.id), status: "pending" }),
        });
        setDocs(prev => sortQueue([...restore, ...prev]));
      }
    } catch { /* leave as-is; a refresh recovers true state */ }
  }

  async function handleApproveAll(ids: string[]) {
    if (ids.length === 0) return;
    setBulkBusy(true);
    try {
      const res = await fetch("/api/admin/documents/bulk", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, status: "approved" }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "האישור הגורף נכשל"); return; }
      const idSet = new Set(ids);
      const approved = docs.filter(d => idSet.has(d.id));
      setDocs(prev => prev.filter(d => !idSet.has(d.id)));
      setUndo({ kind: "bulk", docs: approved });
      setUndoSeq(s => s + 1);
      setApproveAllOpen(false);
    } catch (e) { setError(String(e)); }
    finally { setBulkBusy(false); }
  }

  // ── Gates ──────────────────────────────────────────────────────────────────
  if (auth === "loading" || (auth === "admin" && loading)) {
    return <div className="min-h-screen flex items-center justify-center bg-[#F5F4F0]"><Loader2 className="animate-spin text-[#8D775F]" size={32} /></div>;
  }
  if (auth === "unauthenticated") {
    const here = typeof window !== "undefined" ? window.location.pathname : "/admin/documents/review";
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F4F0] p-8 text-center">
        <Inbox size={32} strokeWidth={1.5} className="text-[#8D775F] mb-4" />
        <h1 className="text-[#2D2926] text-xl font-semibold mb-2">נדרשת התחברות</h1>
        <Link href={`/admin?redirectTo=${encodeURIComponent(here)}`} className="text-[#8D775F] underline text-sm hover:no-underline">לעמוד ההתחברות ←</Link>
      </div>
    );
  }

  const current = docs[0];
  const candidates = docs.filter(isCleanHighConfidence);
  const position = total - docs.length + 1;
  const fileUrl = current ? `/api/admin/documents/${current.id}/file` : "";
  const isPdf = (current?.mime_type ?? "").toLowerCase() === "application/pdf";

  return (
    <div className="min-h-screen bg-[#F5F4F0]">
      <header className="bg-white border-b border-[#2D2926]/10 px-4 py-2.5 flex items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2 text-sm min-w-0">
          <Link href="/admin/documents" className="text-[#8D775F] flex items-center gap-1 hover:underline shrink-0"><ChevronRight size={14} />אסמכתאות</Link>
          <span className="text-[#2D2926]/40 shrink-0">/</span>
          <span className="text-[#2D2926] font-semibold shrink-0">סקירה רצופה</span>
          {docs.length > 0 && <span className="text-[#2D2926]/50 text-xs tabular-nums shrink-0">· {Math.min(position, total)} מתוך {total}</span>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {candidates.length > 0 && (
            <button onClick={() => setApproveAllOpen(true)}
              className="flex items-center gap-1 text-xs font-semibold border border-emerald-300 text-emerald-700 rounded px-2.5 py-1.5 hover:bg-emerald-50">
              <CheckCircle2 size={13} /> אשר הכל ({candidates.length})
            </button>
          )}
          <Link href="/admin/documents" className="flex items-center gap-1 text-xs text-[#2D2926]/60 hover:text-[#2D2926] border border-[#2D2926]/15 rounded px-2.5 py-1.5">
            <X size={13} /> סגור
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4 flex items-center gap-2 text-sm">
            <AlertCircle size={16} /><span>{error}</span>
          </div>
        )}

        {!current ? (
          <div className="bg-white border border-[#2D2926]/10 rounded-md p-12 text-center">
            <CheckCircle2 size={36} strokeWidth={1.5} className="text-emerald-500 mx-auto mb-3" />
            <p className="text-[#2D2926] font-semibold mb-1">כל הממתינים נסקרו</p>
            <p className="text-[#2D2926]/55 text-sm mb-4">אין מסמכים נוספים בתור.</p>
            <Link href="/admin/documents" className="inline-flex items-center gap-1.5 text-[#8D775F] text-sm font-semibold hover:underline">
              <ChevronRight size={14} /> חזרה לתיבה
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <DocumentFlagsBanner doc={current} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white border border-[#2D2926]/10 rounded-md shadow-sm overflow-hidden">
                {isPdf
                  ? <iframe src={fileUrl} title="מסמך" className="w-full h-[55vh] lg:h-[74vh]" />
                  // eslint-disable-next-line @next/next/no-img-element
                  : <img src={fileUrl} alt="מסמך" className="w-full h-auto object-contain max-h-[55vh] lg:max-h-[74vh]" />}
              </div>
              <div className="bg-white border border-[#2D2926]/10 rounded-md shadow-sm p-4">
                <DocumentReviewForm
                  key={current.id}
                  doc={current}
                  vendors={vendors}
                  projects={projects}
                  onVendorsChange={loadVendors}
                  onAfterAction={handleAfterAction}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {approveAllOpen && (
        <ApproveAllDialog
          candidates={candidates}
          busy={bulkBusy}
          onConfirm={handleApproveAll}
          onClose={() => setApproveAllOpen(false)}
        />
      )}

      {undo && (
        <UndoToast
          key={undoSeq}
          message={undo.kind === "bulk" ? `אושרו ${undo.docs.length} מסמכים` : "המסמך אושר"}
          onUndo={handleUndo}
          onDismiss={() => setUndo(null)}
        />
      )}
    </div>
  );
}
