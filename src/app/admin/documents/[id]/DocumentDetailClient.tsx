"use client";

// Review + approve screen for one financial document. Mobile: the document
// preview sits on top, the form below. Desktop: split view (preview | form),
// the same shape as the quotes generator. Admin-gated client-side via
// /api/admin/whoami; the API routes enforce admin independently.

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ChevronRight, Inbox, AlertCircle } from "lucide-react";
import DocumentReviewForm from "./DocumentReviewForm";
import DocumentPreview from "../_components/DocumentPreview";
import { statusChip, displayVendor, type DocRow } from "../_components/labels";

type AuthState = "loading" | "unauthenticated" | "admin";
interface Opt { id: string; name: string; status?: string | null }

export default function DocumentDetailClient({ id }: { id: string }) {
  const [auth, setAuth] = useState<AuthState>("loading");
  const [doc, setDoc] = useState<DocRow | null>(null);
  const [vendors, setVendors] = useState<Opt[]>([]);
  const [projects, setProjects] = useState<Opt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        {doc && (() => { const c = statusChip(doc); return (
          <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${c.className}`}>{c.label}</span>
        ); })()}
      </header>

      <main className="max-w-6xl mx-auto px-4 py-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4 flex items-center gap-2 text-sm">
            <AlertCircle size={16} /><span>{error}</span>
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
