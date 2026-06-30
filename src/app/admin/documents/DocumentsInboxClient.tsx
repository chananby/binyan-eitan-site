"use client";

// Financial-documents inbox (admin only, mobile-first). Composes the upload
// area, a status bar, the filter bar, and a card list with "load more"
// pagination. Auth is gated client-side via /api/admin/whoami — same pattern
// as the quotes list screen; the API routes enforce admin independently.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ChevronRight, Inbox, AlertCircle, Package, ListChecks, CheckCircle2, Download } from "lucide-react";
import DocumentUploader from "./_components/DocumentUploader";
import DocumentFilters, { EMPTY_FILTERS, type DocFilters } from "./_components/DocumentFilters";
import DocumentCard from "./_components/DocumentCard";
import DocumentExportModal from "./_components/DocumentExportModal";
import ApproveAllDialog from "./review/ApproveAllDialog";
import { fmtCurrency, isCleanHighConfidence, type DocRow } from "./_components/labels";

type AuthState = "loading" | "unauthenticated" | "admin";
interface Opt { id: string; name: string; status?: string | null }

const PAGE = 20;

function buildDocQuery(f: DocFilters, offset: number, limit: number): string {
  const p = new URLSearchParams();
  if (f.status)     p.set("status", f.status);
  if (f.doc_type)   p.set("doc_type", f.doc_type);
  if (f.direction)  p.set("direction", f.direction);
  if (f.category)   p.set("category", f.category);
  if (f.vendor_id)  p.set("vendor_id", f.vendor_id);
  if (f.project_id) p.set("project_id", f.project_id);
  if (f.no_project) p.set("no_project", "true");
  if (f.date_from)  p.set("date_from", f.date_from);
  if (f.date_to)    p.set("date_to", f.date_to);
  if (f.duplicates_only) p.set("duplicates_only", "true");
  if (f.q)          p.set("q", f.q);
  p.set("limit", String(limit));
  p.set("offset", String(offset));
  return `/api/admin/documents?${p.toString()}`;
}

// "Download filtered" → the export ZIP with the EXACT active filters. status is
// sent explicitly: a specific value when chosen, else "any" (all statuses), so
// the ZIP matches the on-screen list (which shows every status when unfiltered).
function buildExportQuery(f: DocFilters): string {
  const p = new URLSearchParams();
  p.set("status", f.status || "any");
  if (f.doc_type)   p.set("doc_type", f.doc_type);
  if (f.direction)  p.set("direction", f.direction);
  if (f.category)   p.set("category", f.category);
  if (f.vendor_id)  p.set("vendor_id", f.vendor_id);
  if (f.project_id) p.set("project_id", f.project_id);
  if (f.no_project) p.set("no_project", "true");
  if (f.date_from)  p.set("date_from", f.date_from);
  if (f.date_to)    p.set("date_to", f.date_to);
  if (f.duplicates_only) p.set("duplicates_only", "true");
  if (f.q)          p.set("q", f.q);
  return `/api/admin/documents/export?${p.toString()}`;
}

export default function DocumentsInboxClient() {
  const [auth, setAuth] = useState<AuthState>("loading");
  const [adminName, setAdminName] = useState("");

  const [vendors, setVendors] = useState<Opt[]>([]);
  const [projects, setProjects] = useState<Opt[]>([]);
  const [filters, setFilters] = useState<DocFilters>(EMPTY_FILTERS);

  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [monthApproved, setMonthApproved] = useState<number | null>(null);
  const [duplicateCount, setDuplicateCount] = useState<number | null>(null);
  const [unlinkedCount, setUnlinkedCount] = useState<number | null>(null);
  const [filteredCount, setFilteredCount] = useState<number | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  // "Approve all high-confidence" — candidates fetched on demand from pending.
  const [approveCands, setApproveCands] = useState<DocRow[] | null>(null);
  const [approveBusy, setApproveBusy] = useState(false);

  // Resume-on-load: a quiet count surfaced under the upload card while the
  // server-side resume sweep is in flight. Null = idle (banner hidden).
  // Cleared back to null when the sweep finishes, so the chrome only appears
  // when there's actually work to wait on.
  const [resumeInFlight, setResumeInFlight] = useState<number | null>(null);

  // ── Auth probe ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/whoami", { cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        if (d?.role === "admin") { setAuth("admin"); if (d.name) setAdminName(String(d.name)); }
        else setAuth("unauthenticated");
      })
      .catch(() => { if (!cancelled) setAuth("unauthenticated"); });
    return () => { cancelled = true; };
  }, []);

  // ── Dropdown data ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (auth !== "admin") return;
    fetch("/api/admin/vendors", { cache: "no-store" }).then(r => r.json())
      .then(d => setVendors(d.vendors ?? [])).catch(() => {});
    // All projects (incl. finished) so the filter can target finished projects too.
    // include=site,overhead so the per-card project picker can offer "תקורות"
    // as a destination for company-wide expense receipts.
    fetch("/api/admin/projects?include=site,overhead", { cache: "no-store" }).then(r => r.json())
      .then(d => setProjects(d.projects ?? [])).catch(() => {});
  }, [auth]);

  // ── Status bar stats ───────────────────────────────────────────────────────
  const loadStats = useCallback(() => {
    fetch("/api/admin/documents?status=pending&limit=500", { cache: "no-store" })
      .then(r => r.json()).then(d => setPendingCount((d.documents ?? []).length)).catch(() => {});
    const today = new Date().toLocaleDateString("sv", { timeZone: "Asia/Jerusalem" });
    const first = today.slice(0, 8) + "01";
    fetch(`/api/admin/documents?status=approved&date_from=${first}&date_to=${today}&limit=500`, { cache: "no-store" })
      .then(r => r.json())
      .then(d => setMonthApproved((d.documents ?? []).reduce((s: number, x: DocRow) => s + (x.amount_ils ?? 0), 0)))
      .catch(() => {});
    fetch("/api/admin/documents?duplicates_only=true&limit=500", { cache: "no-store" })
      .then(r => r.json()).then(d => setDuplicateCount((d.documents ?? []).length)).catch(() => {});
    // Unlinked-receipts count — the banner above the list reads off this
    // so the contractor knows how big the backfill backlog is. The same
    // value drives the badge inside the banner's CTA button.
    fetch("/api/admin/documents?no_project=true&limit=500", { cache: "no-store" })
      .then(r => r.json()).then(d => setUnlinkedCount((d.documents ?? []).length)).catch(() => {});
  }, []);

  useEffect(() => { if (auth === "admin") loadStats(); }, [auth, loadStats]);

  // Resume-on-load: once the admin lands, kick off the server-side sweep that
  // re-fires extract for rows whose decoupled extraction never completed
  // (e.g. tab closed mid-batch). Runs in the background and never blocks the
  // page — the banner below is the only signal. When the sweep returns, we
  // refresh the stats + list so the indigo "ממתין לחילוץ" chips disappear.
  // The 10-minute Vercel cron is the wider safety net; this just shortcuts
  // the latency for the admin who comes back to the screen.
  useEffect(() => {
    if (auth !== "admin") return;
    let cancelled = false;
    (async () => {
      try {
        // Probe call — keeps the banner hidden when there's nothing to do.
        // The endpoint runs synchronously: it returns after it's done firing
        // extract for each picked row, so we surface the count up-front,
        // then clear when the response lands.
        const probe = await fetch("/api/admin/documents?status=pending&limit=20", { cache: "no-store" })
          .then(r => r.json()).catch(() => ({ documents: [] }));
        const stuck = (probe.documents as DocRow[] | undefined ?? [])
          .filter(d => d.extraction_status === "pending");
        if (cancelled || stuck.length === 0) return;
        setResumeInFlight(stuck.length);
        await fetch("/api/admin/documents/resume-pending", { method: "POST" })
          .catch(() => { /* swallowed — cron will eventually pick these up */ });
        if (cancelled) return;
        setResumeInFlight(null);
        loadStats();
        setFilters(f => ({ ...f })); // re-trigger the list effect
      } catch { /* best-effort — banner stays hidden */ }
    })();
    return () => { cancelled = true; };
  }, [auth, loadStats]);

  // ── List (debounced on filters) ────────────────────────────────────────────
  useEffect(() => {
    if (auth !== "admin") return;
    let cancelled = false;
    const t = setTimeout(() => {
      setLoading(true); setError(null);
      fetch(buildDocQuery(filters, 0, PAGE), { cache: "no-store" })
        .then(r => r.json())
        .then(d => {
          if (cancelled) return;
          if (d.error) { setError(d.error); setDocs([]); setFilteredCount(0); }
          else {
            const rows: DocRow[] = d.documents ?? [];
            setDocs(rows); setOffset(rows.length); setHasMore(rows.length === PAGE);
            setFilteredCount(typeof d.count === "number" ? d.count : rows.length);
          }
        })
        .catch(e => { if (!cancelled) setError(String(e)); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [auth, filters]);

  const loadMore = async () => {
    const res = await fetch(buildDocQuery(filters, offset, PAGE), { cache: "no-store" });
    const d = await res.json();
    const rows: DocRow[] = d.documents ?? [];
    setDocs(prev => [...prev, ...rows]);
    setOffset(prev => prev + rows.length);
    setHasMore(rows.length === PAGE);
  };

  const refreshAfterUpload = useCallback(() => {
    loadStats();
    setFilters(f => ({ ...f })); // re-trigger the list effect
  }, [loadStats]);

  // "Approve all high-confidence": pull pending, keep only clean high-confidence
  // docs, and open the (non-blind) confirm dialog.
  async function openApproveAll() {
    try {
      const d = await fetch("/api/admin/documents?status=pending&limit=500", { cache: "no-store" }).then(r => r.json());
      const cands = (d.documents ?? []).filter(isCleanHighConfidence);
      if (cands.length === 0) { setError("אין מסמכים בביטחון גבוה ונקיים לאישור גורף"); return; }
      setApproveCands(cands);
    } catch (e) { setError(String(e)); }
  }

  async function confirmApproveAll(ids: string[]) {
    if (ids.length === 0) return;
    setApproveBusy(true);
    try {
      const res = await fetch("/api/admin/documents/bulk", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, status: "approved" }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "האישור הגורף נכשל"); return; }
      setApproveCands(null);
      loadStats();
      setFilters(f => ({ ...f }));
    } catch (e) { setError(String(e)); }
    finally { setApproveBusy(false); }
  }

  // ── Gates ──────────────────────────────────────────────────────────────────
  if (auth === "loading") {
    return <div className="min-h-screen flex items-center justify-center bg-[#F5F4F0]"><Loader2 className="animate-spin text-[#8D775F]" size={32} /></div>;
  }
  if (auth === "unauthenticated") {
    const here = typeof window !== "undefined" ? window.location.pathname : "/admin/documents";
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F4F0] p-8 text-center">
        <Inbox size={32} strokeWidth={1.5} className="text-[#8D775F] mb-4" />
        <h1 className="text-[#2D2926] text-xl font-semibold mb-2">נדרשת התחברות</h1>
        <Link href={`/admin?redirectTo=${encodeURIComponent(here)}`} className="text-[#8D775F] underline text-sm hover:no-underline">לעמוד ההתחברות ←</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F4F0]">
      <header className="bg-white border-b border-[#2D2926]/10 px-4 py-2.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2 text-sm">
          <Link href="/admin/hub" className="text-[#8D775F] flex items-center gap-1 hover:underline"><ChevronRight size={14} />Hub</Link>
          <span className="text-[#2D2926]/40">/</span>
          <span className="text-[#2D2926] font-semibold flex items-center gap-1.5"><Inbox size={14} strokeWidth={2} />אסמכתאות</span>
        </div>
        {adminName && <div className="text-[#2D2926]/60 text-xs">מחובר כ-<span className="font-semibold text-[#2D2926]">{adminName}</span></div>}
      </header>

      <main className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        <DocumentUploader onUploaded={refreshAfterUpload} />

        {/* Resume-on-load whisper. Surfaces only while the background sweep is
            mid-flight (resumeInFlight != null). Indigo to match the row-level
            "ממתין לחילוץ" chip in DocumentCard, soft styling so it reads as an
            FYI and not as an error. Disappears the moment the sweep returns. */}
        {resumeInFlight != null && (
          <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-800 px-3 py-2 rounded-md text-sm">
            <Loader2 size={14} className="animate-spin shrink-0" />
            <span>ממשיך עיבוד של {resumeInFlight} {resumeInFlight === 1 ? "מסמך" : "מסמכים"}...</span>
          </div>
        )}

        {/* Status bar */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-[#2D2926]/10 rounded-md shadow-sm p-3 text-center">
            <p className="text-2xl font-bold text-amber-600 leading-none">{pendingCount ?? "—"}</p>
            <p className="text-xs text-[#2D2926]/60 mt-1">ממתינים לאישור</p>
          </div>
          <div className="bg-white border border-[#2D2926]/10 rounded-md shadow-sm p-3 text-center">
            <p className="text-2xl font-bold text-emerald-700 leading-none">{monthApproved == null ? "—" : fmtCurrency(monthApproved)}</p>
            <p className="text-xs text-[#2D2926]/60 mt-1">מאושר החודש</p>
          </div>
        </div>

        {pendingCount != null && pendingCount > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Link
              href="/admin/documents/review"
              className="flex items-center justify-center gap-2 bg-[#8D775F] text-white py-2.5 rounded-md text-sm font-semibold hover:bg-[#7a6651]"
            >
              <ListChecks size={16} /> סקור ממתינים ({pendingCount})
            </Link>
            <button
              onClick={openApproveAll}
              className="flex items-center justify-center gap-2 border border-emerald-300 text-emerald-700 py-2.5 rounded-md text-sm font-semibold hover:bg-emerald-50"
            >
              <CheckCircle2 size={16} /> אשר הכל בביטחון גבוה
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setExportOpen(true)}
            className="flex items-center justify-center gap-2 border border-[#8D775F]/40 text-[#8D775F] py-2.5 rounded-md text-sm font-semibold hover:bg-[#8D775F]/5"
          >
            <Package size={16} /> {'חבילה לרו"ח'}
          </button>
          {/* Download exactly the current filtered view (status + content
              filters + any date range) as a ZIP, reusing the export route. */}
          <a
            href={(filteredCount ?? 0) > 0 ? buildExportQuery(filters) : undefined}
            onClick={e => { if (!filteredCount) e.preventDefault(); }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-semibold transition-colors ${
              (filteredCount ?? 0) > 0
                ? "border border-[#8D775F]/40 text-[#8D775F] hover:bg-[#8D775F]/5"
                : "border border-[#2D2926]/10 text-[#2D2926]/30 cursor-not-allowed"}`}
          >
            <Download size={16} /> הורד את המסונן{filteredCount != null ? ` (${filteredCount})` : ""}
          </a>
        </div>

        {/* Unlinked-receipts banner — bridges the "project_id missing"
            gap that blocks per-project costs. Shown only when there
            actually ARE unlinked docs (otherwise just noise), and
            hidden again once the no_project filter is active (the
            user already chose to look at them). The CTA flips the
            filter on; existing filters are cleared so the view is
            "just the unassigned set" without leftover narrowing. */}
        {unlinkedCount != null && unlinkedCount > 0 && filters.no_project !== "1" && (
          <button
            type="button"
            onClick={() => setFilters({ ...EMPTY_FILTERS, no_project: "1" })}
            className="w-full flex items-center justify-between gap-3 bg-amber-50 border border-amber-300 rounded-md px-4 py-3 hover:bg-amber-100 transition-colors text-start"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <AlertCircle size={16} className="text-amber-700 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-amber-900">
                  {unlinkedCount} {unlinkedCount === 1 ? "אסמכתא ללא פרויקט" : "אסמכתאות ללא פרויקט"}
                </p>
                <p className="text-xs text-amber-800">
                  שיוך פרויקט חשוב לחישוב הוצאות פר-פרויקט. סנן אותן עכשיו ושייך מהכרטיס.
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold bg-amber-200 text-amber-900 border border-amber-400 px-2 py-1 rounded shrink-0 whitespace-nowrap">
              סנן ושייך ←
            </span>
          </button>
        )}

        <DocumentFilters filters={filters} setFilters={setFilters} vendors={vendors} projects={projects} duplicateCount={duplicateCount} />

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center gap-2 text-sm">
            <AlertCircle size={16} /><span>שגיאה בטעינה: {error}</span>
          </div>
        )}

        {loading && <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#8D775F]" size={24} /></div>}

        {!loading && !error && docs.length === 0 && (
          <div className="bg-white border border-[#2D2926]/10 rounded-md p-10 text-center">
            <Inbox size={28} strokeWidth={1.5} className="text-[#8D775F] mx-auto mb-2" />
            <p className="text-[#2D2926]/70 text-sm">לא נמצאו אסמכתאות</p>
          </div>
        )}

        {!loading && docs.length > 0 && (
          <div className="space-y-2">
            {docs.map(d => <DocumentCard key={d.id} doc={d} projects={projects} onChanged={refreshAfterUpload} />)}
            {hasMore && (
              <button onClick={loadMore} className="w-full py-2.5 text-sm font-semibold text-[#8D775F] border border-[#8D775F]/30 rounded-md hover:bg-[#8D775F]/5">
                טען עוד
              </button>
            )}
          </div>
        )}
      </main>

      <DocumentExportModal open={exportOpen} onClose={() => setExportOpen(false)} />

      {approveCands && (
        <ApproveAllDialog
          candidates={approveCands}
          busy={approveBusy}
          onConfirm={confirmApproveAll}
          onClose={() => setApproveCands(null)}
        />
      )}
    </div>
  );
}
