"use client";

// Review + approve screen for one financial document. Mobile: the document
// preview sits on top, the form below. Desktop: split view (preview | form),
// the same shape as the quotes generator. Admin-gated client-side via
// /api/admin/whoami; the API routes enforce admin independently.

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ChevronRight, Inbox, AlertCircle } from "lucide-react";
import DocumentReviewForm from "./DocumentReviewForm";
import { statusChip, displayVendor, type DocRow } from "../_components/labels";

type AuthState = "loading" | "unauthenticated" | "admin";
interface Opt { id: string; name: string }

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
    fetch("/api/projects", { cache: "no-store" }).then(r => r.json())
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Preview */}
            <div className="bg-white border border-[#2D2926]/10 rounded-md shadow-sm overflow-hidden">
              {isPdf
                ? <iframe src={fileUrl} title="מסמך" className="w-full h-[60vh] lg:h-[78vh]" />
                : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={fileUrl} alt="מסמך" className="w-full h-auto object-contain max-h-[60vh] lg:max-h-[78vh]" />
                )}
            </div>

            {/* Form */}
            <div className="bg-white border border-[#2D2926]/10 rounded-md shadow-sm p-4">
              <DocumentReviewForm doc={doc} vendors={vendors} projects={projects} onVendorsChange={loadVendors} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
