"use client";

// Review + approve screen for one financial document. Mobile: the document
// preview sits on top, the form below. Desktop: split view (preview | form),
// the same shape as the quotes generator. Admin-gated client-side via
// /api/admin/whoami; the API routes enforce admin independently.

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ChevronRight, Inbox, AlertCircle, RefreshCw } from "lucide-react";
import DocumentReviewForm from "./DocumentReviewForm";
import DocumentPreview from "../_components/DocumentPreview";
import DuplicateChip from "../_components/DuplicateChip";
import { statusChip, displayVendor, type DocRow } from "../_components/labels";

type AuthState = "loading" | "unauthenticated" | "admin";
interface Opt { id: string; name: string; status?: string | null; staff_id?: string | null }
interface StaffOpt { id: string; name: string; is_freelancer?: boolean }
interface LoadedSplit { project_id: string; amount: number }

export default function DocumentDetailClient({ id }: { id: string }) {
  const router = useRouter();
  // Set true the moment this doc is deleted (as a duplicate) so the load effect
  // never re-fetches a now-deleted id and flashes a 404 instead of navigating.
  const leavingRef = useRef(false);
  const [auth, setAuth] = useState<AuthState>("loading");
  const [doc, setDoc] = useState<DocRow | null>(null);
  const [vendors, setVendors] = useState<Opt[]>([]);
  const [projects, setProjects] = useState<Opt[]>([]);
  // Staff list — used by the vendor→staff link widget in the review form
  // and by the salary-doc auto-split suggestion. Fetched once on mount.
  const [staff, setStaff] = useState<StaffOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  // Multi-project split state for this doc. Fetched on mount and after
  // any mutation via loadSplits so the form can seed the split panel and
  // decide whether to open in split-mode. null means "not fetched yet".
  const [existingSplits, setExistingSplits] = useState<LoadedSplit[] | null>(null);
  // Invoice ↔ payment link state. primaryDoc is the target of doc.linked_document_id
  // (evidence points to a primary); inboundEvidence is the docs pointing AT us.
  const [primaryDoc, setPrimaryDoc] = useState<DocRow | null>(null);
  const [inboundEvidence, setInboundEvidence] = useState<DocRow[]>([]);

  const loadSplits = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/documents/${id}/splits`, { cache: "no-store" });
      if (!r.ok) { setExistingSplits([]); return; }
      const d = await r.json();
      const list: LoadedSplit[] = (d.splits ?? []).map((s: { project_id: string; amount: number | string }) => ({
        project_id: s.project_id,
        amount: typeof s.amount === "string" ? parseFloat(s.amount) : s.amount,
      }));
      setExistingSplits(list);
    } catch {
      setExistingSplits([]);
    }
  }, [id]);

  const loadLinks = useCallback(async (currentDoc: DocRow | null) => {
    if (!currentDoc) { setPrimaryDoc(null); setInboundEvidence([]); return; }
    // Primary lookup — fetch the doc this one points at. GETting the whole
    // /admin/documents/[linked_id] payload is fine (single row, admin-only).
    try {
      if (currentDoc.linked_document_id) {
        const r = await fetch(`/api/admin/documents/${currentDoc.linked_document_id}`, { cache: "no-store" });
        if (r.ok) {
          const d = await r.json();
          setPrimaryDoc(d.document ?? null);
        } else {
          setPrimaryDoc(null);
        }
      } else {
        setPrimaryDoc(null);
      }
    } catch {
      setPrimaryDoc(null);
    }
    // Inbound — every live doc whose linked_document_id points at this one.
    // Reuses the list endpoint's linked_document_id filter (added downstream
    // by proxy; the list endpoint accepts arbitrary column filters via the
    // supabase REST layer for admin-scoped keys — cheaper than a new endpoint
    // just for this one query. Falls back to empty array on failure so the
    // UI stays quiet.
    try {
      const r = await fetch(`/api/admin/documents?limit=50`, { cache: "no-store" });
      if (r.ok) {
        const d = await r.json();
        const docs = (d.documents ?? []) as DocRow[];
        setInboundEvidence(docs.filter((x) => x.linked_document_id === currentDoc.id));
      } else {
        setInboundEvidence([]);
      }
    } catch {
      setInboundEvidence([]);
    }
  }, []);

  const reloadLinks = useCallback(async () => {
    // Re-fetch the doc itself first (linked_document_id may have changed),
    // then reload the link graph anchored on the fresh row.
    try {
      const r = await fetch(`/api/admin/documents/${id}`, { cache: "no-store" });
      if (r.ok) {
        const d = await r.json();
        setDoc(d.document);
        loadLinks(d.document);
      }
    } catch { /* stay on stale — better than an error banner */ }
  }, [id, loadLinks]);

  // Re-run extraction for a doc that hasn't been extracted yet (pending — incl.
  // a zombie from an old upload timeout) or whose extraction failed. The
  // /extract endpoint is its own request, so it never times out the page.
  async function reExtract() {
    if (!doc) return;
    setExtracting(true); setError(null);
    try {
      const res = await fetch(`/api/admin/documents/${doc.id}/extract`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? `שגיאה ${res.status}`);
      else setDoc(data.document);
    } catch (e) { setError(String(e)); }
    finally { setExtracting(false); }
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/whoami", { cache: "no-store" })
      .then(r => r.json())
      .then(d => { if (!cancelled) setAuth(d?.role === "admin" ? "admin" : "unauthenticated"); })
      .catch(() => { if (!cancelled) setAuth("unauthenticated"); });
    return () => { cancelled = true; };
  }, []);

  const loadVendors = () => {
    fetch("/api/admin/vendors", { cache: "no-store" }).then(r => r.json())
      .then(d => setVendors(d.vendors ?? [])).catch(() => {});
  };

  useEffect(() => {
    if (auth !== "admin") return;
    if (leavingRef.current) return;   // doc was deleted → don't refetch a dead id
    let cancelled = false;
    setLoading(true); setError(null);
    fetch(`/api/admin/documents/${id}`, { cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        if (d.error) { setError(d.error); return; }
        setDoc(d.document);
        loadLinks(d.document);
      })
      .catch(e => { if (!cancelled) setError(String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    loadVendors();
    // /api/admin/projects (not /api/projects) so documents can be filed to
    // ANY project, including finished ones, with status for grouping.
    // include=site,overhead surfaces the "תקורות" destination.
    fetch("/api/admin/projects?include=site,overhead", { cache: "no-store" }).then(r => r.json())
      .then(d => setProjects(d.projects ?? [])).catch(() => {});
    // Staff (name only — we don't need rates here; just to render the
    // vendor→staff link picker and to attribute auto-split proposals).
    fetch("/api/admin/staff", { cache: "no-store" }).then(r => r.json())
      .then(d => setStaff((d.staff ?? []).map((s: { id: string; name: string; is_freelancer?: boolean }) => ({
        id: s.id, name: s.name, is_freelancer: s.is_freelancer,
      })))).catch(() => {});
    loadSplits();
    return () => { cancelled = true; };
  }, [auth, id, loadSplits, loadLinks]);

  if (auth === "loading" || (auth === "admin" && loading)) {
    return <div className="min-h-screen flex items-center justify-center bg-[#F5F4F0]"><Loader2 className="animate-spin text-[#8D775F]" size={32} /></div>;
  }
  if (auth === "unauthenticated") {
    const here = typeof window !== "undefined" ? window.location.pathname : `/admin/documents/${id}`;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F4F0] p-8 text-center">
        <Inbox size={32} strokeWidth={1.5} className="text-[#8D775F] mb-4" />
        <h1 className="text-[#2D2926] text-xl font-semibold mb-2">נדרשת התחברות</h1>
        <Link href={`/admin?redirectTo=${encodeURIComponent(here)}`} className="text-[#8D775F] underline text-sm hover:no-underline">לעמוד ההתחברות ←</Link>
      </div>
    );
  }

  const fileUrl = `/api/admin/documents/${id}/file`;
  const isPdf = (doc?.mime_type ?? "").toLowerCase() === "application/pdf";

  return (
    <div className="min-h-screen bg-[#F5F4F0]">
      <header className="bg-white border-b border-[#2D2926]/10 px-4 py-2.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2 text-sm min-w-0">
          <Link href="/admin/documents" className="text-[#8D775F] flex items-center gap-1 hover:underline shrink-0"><ChevronRight size={14} />אסמכתאות</Link>
          <span className="text-[#2D2926]/40 shrink-0">/</span>
          <span className="text-[#2D2926] font-semibold truncate">{doc ? displayVendor(doc) : "מסמך"}</span>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {doc && (
            <DuplicateChip
              doc={doc}
              onDeleted={() => { leavingRef.current = true; router.push("/admin/documents"); }}
              onCleared={() => setDoc(d => (d ? { ...d, possible_duplicate_of: null } : d))}
            />
          )}
          {doc && (() => { const c = statusChip(doc); return (
            <span className={`rounded px-2 py-0.5 text-xs font-semibold ${c.className}`}>{c.label}</span>
          ); })()}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4 flex items-center gap-2 text-sm">
            <AlertCircle size={16} /><span>{error}</span>
          </div>
        )}

        {doc && (doc.extraction_status === "pending" || doc.extraction_status === "failed") && (
          <div className={`mb-4 flex items-center justify-between gap-3 rounded-md border px-4 py-3 text-sm ${doc.extraction_status === "failed" ? "border-gray-200 bg-gray-50 text-[#2D2926]/70" : "border-indigo-200 bg-indigo-50 text-indigo-800"}`}>
            <span>{doc.extraction_status === "failed" ? "החילוץ האוטומטי נכשל. אפשר לנסות שוב או למלא ידנית." : "המסמך ממתין לחילוץ נתונים אוטומטי."}</span>
            <button onClick={reExtract} disabled={extracting}
              className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-[#8D775F] border border-[#8D775F]/40 rounded px-2.5 py-1.5 hover:bg-[#8D775F]/10 disabled:opacity-50">
              {extracting ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              {extracting ? "מחלץ…" : doc.extraction_status === "failed" ? "נסה שוב" : "חלץ נתונים"}
            </button>
          </div>
        )}

        {doc && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Preview — wider pane (3/5) so the document is readable */}
            <div className="lg:col-span-3 bg-white border border-[#2D2926]/10 rounded-md shadow-sm overflow-hidden">
              <DocumentPreview fileUrl={fileUrl} isPdf={isPdf} />
            </div>

            {/* Form */}
            <div className="lg:col-span-2 bg-white border border-[#2D2926]/10 rounded-md shadow-sm p-4">
              <DocumentReviewForm
                doc={doc}
                vendors={vendors}
                projects={projects}
                staff={staff}
                onVendorsChange={loadVendors}
                existingSplits={existingSplits ?? undefined}
                onSplitsChanged={loadSplits}
                primaryDoc={primaryDoc}
                inboundEvidence={inboundEvidence}
                onLinkChanged={reloadLinks}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
