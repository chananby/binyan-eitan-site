"use client";

// Review + approve screen for one financial document. Mobile: the document
// preview sits on top, the form below. Desktop: split view (preview | form),
// the same shape as the quotes generator. Admin-gated client-side via
// /api/admin/whoami; the API routes enforce admin independently.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ChevronRight, Inbox, AlertCircle, RefreshCw } from "lucide-react";
import DocumentReviewForm from "./DocumentReviewForm";
import DocumentPreview from "../_components/DocumentPreview";
import DuplicateChip from "../_components/DuplicateChip";
import { statusChip, displayVendor, type DocRow } from "../_components/labels";

type AuthState = "loading" | "unauthenticated" | "admin";
interface Opt { id: string; name: string; status?: string | null }

export default function DocumentDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [auth, setAuth] = useState<AuthState>("loading");
  const [doc, setDoc] = useState<DocRow | null>(null);
  const [vendors, setVendors] = useState<Opt[]>([]);
  const [projects, setProjects] = useState<Opt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);

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
    let cancelled = false;
    setLoading(true); setError(null);
    fetch(`/api/admin/documents/${id}`, { cache: "no-store" })
      .then(r => r.json())
      .then(d => { if (cancelled) return; if (d.error) setError(d.error); else setDoc(d.document); })
      .catch(e => { if (!cancelled) setError(String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    loadVendors();
    // /api/admin/projects (not /api/projects) so documents can be filed to
    // ANY project, including finished ones, with status for grouping.
    fetch("/api/admin/projects", { cache: "no-store" }).then(r => r.json())
      .then(d => setProjects(d.projects ?? [])).catch(() => {});
    return () => { cancelled = true; };
  }, [auth, id]);

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
              onDeleted={() => router.push("/admin/documents")}
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
              <DocumentReviewForm doc={doc} vendors={vendors} projects={projects} onVendorsChange={loadVendors} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
