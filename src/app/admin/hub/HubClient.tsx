"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  AlertCircle, ChevronDown, ChevronUp, ExternalLink, Loader2,
  LogOut, Pencil, Pin, PinOff, Plus, Search, ShieldCheck,
  StickyNote, Trash2, Wrench, X,
} from "lucide-react";
import type { UIRoute, APIRoute } from "../../../lib/discover-routes";
import type { ExternalLinkGroup } from "../../../data/external-links";

type Author = "Hanan" | "Moti";

interface AdminNote {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function groupBy<T>(arr: T[], key: (t: T) => string): Record<string, T[]> {
  return arr.reduce<Record<string, T[]>>((acc, item) => {
    const k = key(item);
    (acc[k] ??= []).push(item);
    return acc;
  }, {});
}

// ── PIN Gate ──────────────────────────────────────────────────────────────────
function PinGate({ onAuth }: { onAuth: (a: Author) => void }) {
  const [pin, setPin]         = useState("");
  const [error, setError]     = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (pin.length < 3 || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/executive/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (res.ok) { const d = await res.json(); onAuth(d.author); }
      else        { setError(true); setPin(""); }
    } finally { setLoading(false); }
  };

  const KEYS = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

  return (
    <div className="min-h-screen bg-[#F5F4F0] flex flex-col items-center justify-center p-8">
      <Wrench size={22} strokeWidth={1.5} className="text-[#8D775F] mb-5" />
      <p className="text-[#8D775F] text-xs font-bold tracking-[0.28em] uppercase mb-1.5">מרכז שליטה</p>
      <h1 className="text-[#2D2926] text-xl font-semibold mb-8">כניסה פרטית</h1>

      <div className="flex gap-3 mb-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`w-2.5 h-2.5 rounded-full border-2 transition-all duration-200
            ${i < pin.length ? "bg-[#8D775F] border-[#8D775F]" : "bg-transparent border-[#2D2926]/20"}`} />
        ))}
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-1.5 text-red-500 text-xs font-medium">
          <AlertCircle size={13} /> קוד שגוי — נסה שוב
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 w-56" dir="ltr">
        {KEYS.map((d, i) => (
          <button key={i}
            onClick={() => {
              if (d === "⌫") { setPin(p => p.slice(0, -1)); setError(false); }
              else if (d && pin.length < 6) { setPin(p => p + d); setError(false); }
            }}
            className={`h-12 rounded-lg text-base font-semibold transition-all active:scale-95
              ${!d ? "pointer-events-none"
                   : "bg-white border border-[#2D2926]/10 text-[#2D2926]/70 hover:border-[#8D775F]/50 hover:text-[#8D775F] shadow-sm"}`}>
            {d}
          </button>
        ))}
      </div>

      <button
        onClick={submit}
        disabled={pin.length < 3 || loading}
        className="mt-5 w-56 h-12 bg-[#8D775F] text-white font-semibold tracking-widest text-sm rounded-lg
          disabled:opacity-30 hover:bg-[#7A6451] transition-colors shadow-sm">
        {loading ? <Loader2 size={15} className="animate-spin mx-auto" /> : "כניסה"}
      </button>
    </div>
  );
}

// ── Quick-access config ───────────────────────────────────────────────────────
const QUICK_LINKS: { label: string; url: string; ext: boolean; desc: string; underConstruction?: boolean }[] = [
  { label: "כניסת עובד",               url: "/attendance",                    ext: false, desc: "טופס צ׳ק-אין ויציאה" },
  { label: "ניהול משימות פנים ארגוני", url: "https://admin.binyaneitan.com",  ext: true,  desc: "מערכת המשימות הפנים ארגונית" },
  { label: "פורטל ניהול",              url: "/admin",                         ext: false, desc: "נוכחות, עובדים, פרויקטים, תקציב" },
  { label: "Google Analytics",         url: "https://analytics.google.com",   ext: true,  desc: "GA4 — G-1CWQG6YY4H" },
  { label: "עורך תוכן",               url: "/internal/content-editor",       ext: false, desc: "תרגומים · מאמרים · פרויקטים" },
];

const QUICK_STORAGE_KEY = "hub_quick_order";

function QuickCard({
  item, editMode, isFirst, isLast, onUp, onDown,
}: {
  item: typeof QUICK_LINKS[number];
  editMode: boolean;
  isFirst: boolean;
  isLast: boolean;
  onUp: () => void;
  onDown: () => void;
}) {
  const inner = (
    <div className={`relative flex flex-col gap-1 px-4 py-4 border-2 bg-white rounded-xl h-full transition-all group
      ${editMode
        ? "border-[#8D775F]/30 cursor-default select-none"
        : "border-[#E0DFD9] hover:border-[#8D775F] hover:shadow-md"}`}>
      {editMode && (
        <div className="absolute top-1.5 left-1.5 flex gap-1" dir="ltr">
          <button onClick={e => { e.preventDefault(); onUp(); }}
            disabled={isFirst}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#2D2926]/40
              hover:text-[#8D775F] hover:bg-[#8D775F]/10 disabled:opacity-20 disabled:cursor-not-allowed transition-colors">
            <ChevronUp size={16} />
          </button>
          <button onClick={e => { e.preventDefault(); onDown(); }}
            disabled={isLast}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#2D2926]/40
              hover:text-[#8D775F] hover:bg-[#8D775F]/10 disabled:opacity-20 disabled:cursor-not-allowed transition-colors">
            <ChevronDown size={16} />
          </button>
        </div>
      )}
      <div className={`flex items-start justify-between gap-2 ${editMode ? "pt-7" : ""}`}>
        <div className="flex flex-col gap-0.5 min-w-0">
          <p className={`text-sm font-bold leading-snug transition-colors
            ${editMode ? "text-[#2D2926]/70" : "text-[#2D2926] group-hover:text-[#8D775F]"}`}>
            {item.label}
          </p>
          {item.underConstruction && (
            <span className="text-[0.6rem] text-amber-600/70 font-medium leading-none">🚧 בעבודה</span>
          )}
        </div>
        {item.ext && !editMode && (
          <ExternalLink size={13} className="shrink-0 mt-0.5 text-[#2D2926]/20 group-hover:text-[#8D775F]/60 transition-colors" />
        )}
      </div>
      <p className="text-xs text-[#2D2926]/40 leading-snug">{item.desc}</p>
    </div>
  );
  if (editMode) return <div>{inner}</div>;
  return item.ext
    ? <a href={item.url} target="_blank" rel="noopener noreferrer" className="block">{inner}</a>
    : <Link href={item.url} className="block">{inner}</Link>;
}

// ── Method badge ──────────────────────────────────────────────────────────────
const METHOD_META: Record<string, { color: string; he: string }> = {
  GET:    { color: "bg-green-50 text-green-700 border border-green-200",    he: "קריאה" },
  POST:   { color: "bg-blue-50 text-blue-700 border border-blue-200",      he: "יצירה" },
  PUT:    { color: "bg-orange-50 text-orange-700 border border-orange-200", he: "עדכון" },
  DELETE: { color: "bg-red-50 text-red-700 border border-red-200",         he: "מחיקה" },
  PATCH:  { color: "bg-purple-50 text-purple-700 border border-purple-200", he: "תיקון" },
};

function MethodBadge({ method }: { method: string }) {
  const meta = METHOD_META[method];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded
      ${meta?.color ?? "bg-[#2D2926]/5 text-[#2D2926]/40"}`}>
      {method}
      {meta && <span className="opacity-60 font-normal">· {meta.he}</span>}
    </span>
  );
}

// ── Admin portal tab sub-items ────────────────────────────────────────────────
const ADMIN_TAB_ITEMS: { label: string; hash: string; desc: string }[] = [
  { label: "דשבורד",         hash: "",           desc: "סיכום יומי — נוכחות, עובדים, פרויקטים" },
  { label: "נוכחות",          hash: "attendance", desc: "אישור בקשות, עריכה ידנית, דוח שעות" },
  { label: "עובדים",          hash: "staff",      desc: "ניהול עובדים, PINs, סטטוס פעילות" },
  { label: "פרויקטים",        hash: "projects",   desc: "פרויקטים פעילים, שיוך, היסטוריה" },
  { label: "הוצאות",          hash: "expenses",   desc: "חומרים, קבלנים, הזמנות" },
  { label: "תכנון",           hash: "planning",   desc: "משימות, אבני דרך, לוח זמנים" },
  { label: "מטריצה שבועית",  hash: "weekly",     desc: "תצוגת משימות לפי ימי השבוע" },
  { label: "הכנסות",          hash: "income",     desc: "תשלומים לפי פרויקט" },
];

// ── Card components ───────────────────────────────────────────────────────────
function UICard({ route }: { route: UIRoute }) {
  return (
    <Link href={route.url}
      className="flex items-center gap-3 px-4 py-3.5 border border-[#E0DFD9] bg-white
        hover:border-[#8D775F]/50 hover:shadow-sm transition-all group rounded-lg">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#2D2926] group-hover:text-[#8D775F] leading-snug truncate transition-colors">
          {route.label}
        </p>
        <p className="text-xs text-[#2D2926]/35 mt-0.5 truncate font-mono">{route.url}</p>
      </div>
    </Link>
  );
}

function UICardExpanded({ route }: { route: UIRoute }) {
  return (
    <div className="col-span-full border border-[#E0DFD9] bg-white rounded-lg overflow-hidden">
      {/* Header — links to the portal root */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#F9F9F7] border-b border-[#E0DFD9]">
        <div>
          <p className="text-sm font-bold text-[#2D2926]">{route.label}</p>
          <p className="text-xs text-[#2D2926]/30 font-mono">{route.url}</p>
        </div>
        <span className="text-[0.6rem] text-[#2D2926]/25 uppercase tracking-widest font-semibold">
          {ADMIN_TAB_ITEMS.length} לשוניות
        </span>
      </div>
      {/* Sub-grid: gap-px on [#E0DFD9] bg creates 1 px dividers between cells */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[#E0DFD9]">
        {ADMIN_TAB_ITEMS.map(item => (
          <Link
            key={item.hash || "dashboard"}
            href={item.hash ? `/admin#${item.hash}` : "/admin"}
            className="bg-white px-4 py-3 hover:bg-[#F5F4F0] transition-colors group">
            <p className="text-xs font-semibold text-[#2D2926] group-hover:text-[#8D775F] transition-colors leading-snug">
              {item.label}
            </p>
            <p className="text-[0.65rem] text-[#2D2926]/35 mt-0.5 leading-snug">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ExtCard({ item }: { item: { label: string; url: string; description?: string } }) {
  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-3 px-4 py-3.5 border border-[#E0DFD9] bg-white
        hover:border-[#8D775F]/50 hover:shadow-sm transition-all group rounded-lg">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#2D2926] group-hover:text-[#8D775F] leading-snug transition-colors">
          {item.label}
        </p>
        {item.description && !item.description.startsWith("# TODO") && (
          <p className="text-xs text-[#2D2926]/35 mt-0.5 truncate">{item.description}</p>
        )}
      </div>
      <ExternalLink size={12} className="shrink-0 text-[#2D2926]/20 group-hover:text-[#8D775F]/60 transition-colors" />
    </a>
  );
}

function APICard({ route }: { route: APIRoute }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border border-[#E0DFD9] bg-white/60 rounded-lg">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-mono text-[#2D2926]/50 truncate">{route.url}</p>
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          {route.methods.length > 0
            ? route.methods.map(m => <MethodBadge key={m} method={m} />)
            : <span className="text-xs text-[#2D2926]/25">שיטה לא ידועה</span>
          }
        </div>
      </div>
    </div>
  );
}

// ── Section / Category labels ─────────────────────────────────────────────────
function SectionLabel({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h2 className="text-[0.95rem] font-bold text-[#2D2926] shrink-0">{children}</h2>
      <div className="flex-1 h-px bg-[#E0DFD9]" />
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

function CategoryLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold text-[#8D775F] uppercase tracking-wider mb-2 px-0.5">
      {children}
    </p>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export interface HubClientProps {
  uiRoutes: UIRoute[];
  apiRoutes: APIRoute[];
  externalLinks: ExternalLinkGroup[];
}

export default function HubClient({ uiRoutes, apiRoutes, externalLinks }: HubClientProps) {
  const [author, setAuthor]       = useState<Author | null>(null);
  const [checking, setChecking]   = useState(true);
  const [query, setQuery]         = useState("");
  const [showApi, setShowApi]     = useState(false);
  const [editQuick, setEditQuick] = useState(false);
  const [quickOrder, setQuickOrder] = useState<number[]>(() =>
    Array.from({ length: QUICK_LINKS.length }, (_, i) => i)
  );

  // Personal notes
  const [notes, setNotes]               = useState<AdminNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [noteFormOpen, setNoteFormOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [draftTitle,    setDraftTitle]    = useState("");
  const [draftBody,     setDraftBody]     = useState("");
  const [draftPinned,   setDraftPinned]   = useState(false);
  const [noteSaving,    setNoteSaving]    = useState(false);
  // Tracks pin toggles in flight to prevent the double-click race where a
  // second click sends a PATCH with the pre-toggle value before the first
  // returned and updated local state.
  const [pinningIds, setPinningIds] = useState<Set<string>>(new Set());

  async function loadNotes() {
    setNotesLoading(true);
    try {
      const res  = await fetch("/api/admin/notes");
      const data = await res.json();
      if (res.ok) setNotes(data.notes ?? []);
    } catch { /* ignore */ }
    finally { setNotesLoading(false); }
  }
  function openNewNote() {
    setEditingNoteId(null); setDraftTitle(""); setDraftBody(""); setDraftPinned(false);
    setNoteFormOpen(true);
  }
  function openEditNote(n: AdminNote) {
    setEditingNoteId(n.id); setDraftTitle(n.title); setDraftBody(n.body); setDraftPinned(n.pinned);
    setNoteFormOpen(true);
  }
  function closeNoteForm() {
    setNoteFormOpen(false); setEditingNoteId(null);
    setDraftTitle(""); setDraftBody(""); setDraftPinned(false);
  }
  async function saveNote() {
    if (!draftTitle.trim() || noteSaving) return;
    setNoteSaving(true);
    try {
      const payload = { title: draftTitle.trim(), body: draftBody, pinned: draftPinned };
      const res = editingNoteId
        ? await fetch(`/api/admin/notes/${editingNoteId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/notes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (res.ok) {
        closeNoteForm();
        await loadNotes();
      }
    } finally { setNoteSaving(false); }
  }
  async function togglePin(n: AdminNote) {
    if (pinningIds.has(n.id)) return; // already in flight
    setPinningIds((s) => new Set(s).add(n.id));
    try {
      await fetch(`/api/admin/notes/${n.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !n.pinned }),
      });
      await loadNotes();
    } finally {
      setPinningIds((s) => { const next = new Set(s); next.delete(n.id); return next; });
    }
  }
  async function deleteNote(id: string) {
    if (!confirm("למחוק את הפתקית?")) return;
    await fetch(`/api/admin/notes/${id}`, { method: "DELETE" });
    await loadNotes();
  }

  // Load notes once we know we're authed
  useEffect(() => {
    if (author) loadNotes();
  }, [author]);

  // Check existing auth cookie
  useEffect(() => {
    fetch("/api/executive/auth")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.author) setAuthor(d.author as Author); })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  // Load API toggle + quick order from localStorage
  useEffect(() => {
    setShowApi(localStorage.getItem("hub_show_api") === "true");
    const saved = localStorage.getItem(QUICK_STORAGE_KEY);
    if (saved) {
      try {
        const parsed: number[] = JSON.parse(saved);
        if (
          parsed.length === QUICK_LINKS.length &&
          parsed.every((n, _, a) => a.indexOf(n) === a.lastIndexOf(n) && n >= 0 && n < QUICK_LINKS.length)
        ) setQuickOrder(parsed);
      } catch { /* ignore */ }
    }
  }, []);

  const moveQuick = (idx: number, dir: 1 | -1) => {
    const next = [...quickOrder];
    [next[idx], next[idx + dir]] = [next[idx + dir], next[idx]];
    setQuickOrder(next);
    localStorage.setItem(QUICK_STORAGE_KEY, JSON.stringify(next));
  };

  const handleApiToggle = (val: boolean) => {
    setShowApi(val);
    if (typeof window !== "undefined") localStorage.setItem("hub_show_api", val ? "true" : "false");
  };

  const handleLogout = async () => {
    await fetch("/api/executive/auth", { method: "DELETE" }).catch(() => {});
    setAuthor(null);
  };

  // ── Filtered & grouped data ────────────────────────────────────────────────
  const q = query.toLowerCase();

  const filteredQuick = useMemo(() => {
    if (!q) return quickOrder;
    return quickOrder.filter(idx =>
      QUICK_LINKS[idx].label.toLowerCase().includes(q) ||
      QUICK_LINKS[idx].desc.toLowerCase().includes(q) ||
      QUICK_LINKS[idx].url.toLowerCase().includes(q)
    );
  }, [quickOrder, q]);

  const uiGroups = useMemo(() => {
    const filtered = uiRoutes.filter(r =>
      !q || r.label.toLowerCase().includes(q) || r.url.toLowerCase().includes(q)
    );
    return groupBy(filtered, r => r.category);
  }, [uiRoutes, q]);

  const uiTotal = useMemo(
    () => Object.values(uiGroups).reduce((s, g) => s + g.length, 0),
    [uiGroups]
  );

  const extGroups = useMemo(() =>
    externalLinks
      .map(g => ({
        ...g,
        items: g.items.filter(item =>
          !q || item.label.toLowerCase().includes(q) || (item.description ?? "").toLowerCase().includes(q)
        ),
      }))
      .filter(g => g.items.length > 0),
    [externalLinks, q]
  );

  const apiGroups = useMemo(() => {
    const filtered = apiRoutes.filter(r =>
      !q || r.url.toLowerCase().includes(q) || r.label.toLowerCase().includes(q)
    );
    return groupBy(filtered, r => r.category);
  }, [apiRoutes, q]);

  const apiTotal = useMemo(
    () => Object.values(apiGroups).reduce((s, g) => s + g.length, 0),
    [apiGroups]
  );

  // ── Auth gate ──────────────────────────────────────────────────────────────
  if (checking) return <div className="min-h-screen bg-[#F5F4F0]" />;
  if (!author)  return <PinGate onAuth={setAuthor} />;

  const hasUiResults  = Object.keys(uiGroups).length > 0;
  const hasExtResults = extGroups.length > 0;
  const hasApiResults = Object.keys(apiGroups).length > 0;

  return (
    <div className="min-h-screen bg-[#F5F4F0] text-[#2D2926]" dir="rtl">

      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-[#E0DFD9] px-4 md:px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-3.5">
            <Wrench size={16} strokeWidth={1.5} className="text-[#8D775F] shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold tracking-[0.2em] uppercase text-[#2D2926]/30 leading-none">בניין איתן</p>
              <h1 className="text-[0.95rem] font-bold text-[#2D2926] leading-none mt-0.5">מרכז שליטה</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#2D2926]/40">{author === "Hanan" ? "חנן" : "מוטי"}</span>
              <ShieldCheck size={12} strokeWidth={1.5} className="text-[#8D775F]/50" />
              <button
                onClick={handleLogout}
                title="התנתק"
                className="w-7 h-7 flex items-center justify-center rounded-lg text-[#2D2926]/25
                  hover:text-red-400 hover:bg-red-50 transition-colors">
                <LogOut size={13} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute end-3 top-1/2 -translate-y-1/2 text-[#2D2926]/30 pointer-events-none" />
            <input
              type="text"
              placeholder="חיפוש..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full bg-[#F5F4F0] border border-[#E0DFD9] rounded-full pe-9 ps-4 py-2
                text-sm text-[#2D2926] placeholder-[#2D2926]/30
                focus:outline-none focus:border-[#8D775F]/60 transition-colors"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute start-3 top-1/2 -translate-y-1/2 text-[#2D2926]/30 hover:text-[#2D2926]/60">
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 space-y-10">

        {/* Quick access — always visible, filtered during search */}
        {filteredQuick.length > 0 && (
          <section>
            <SectionLabel action={
              !q ? (
                <button
                  onClick={() => setEditQuick(v => !v)}
                  className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full transition-colors
                    ${editQuick
                      ? "bg-[#8D775F] text-white"
                      : "text-[#2D2926]/40 hover:text-[#8D775F] hover:bg-[#8D775F]/10"}`}>
                  <Pencil size={10} />
                  {editQuick ? "סיום" : "סדר"}
                </button>
              ) : undefined
            }>
              גישה מהירה{q ? ` (${filteredQuick.length})` : ""}
            </SectionLabel>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {filteredQuick.map((linkIdx, orderIdx) => (
                <QuickCard
                  key={QUICK_LINKS[linkIdx].url}
                  item={QUICK_LINKS[linkIdx]}
                  editMode={editQuick && !q}
                  isFirst={orderIdx === 0}
                  isLast={orderIdx === filteredQuick.length - 1}
                  onUp={() => moveQuick(orderIdx, -1)}
                  onDown={() => moveQuick(orderIdx, 1)}
                />
              ))}
            </div>
          </section>
        )}

        {/* UI Routes */}
        <section>
          <SectionLabel>
            כלים פנימיים{q && uiTotal > 0 ? ` (${uiTotal})` : ""}
          </SectionLabel>
          {hasUiResults ? (
            <div className="space-y-5">
              {Object.entries(uiGroups).map(([cat, routes]) => (
                <div key={cat}>
                  <CategoryLabel>{cat}</CategoryLabel>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {routes.map(r =>
                      r.url === "/admin"
                        ? <UICardExpanded key={r.url} route={r} />
                        : <UICard key={r.url} route={r} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[#2D2926]/30 text-sm py-3">
              {q ? "אין תוצאות" : "לא נמצאו כלים"}
            </p>
          )}
        </section>

        {/* External Links */}
        <section>
          <SectionLabel>קישורים חיצוניים</SectionLabel>
          {hasExtResults ? (
            <div className="space-y-5">
              {extGroups.map(g => (
                <div key={g.category}>
                  <CategoryLabel>{g.category}</CategoryLabel>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {g.items.map(item => <ExtCard key={item.label} item={item} />)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[#2D2926]/30 text-sm py-3">אין תוצאות</p>
          )}
        </section>

        {/* Personal Notes */}
        <section>
          <SectionLabel action={
            <button
              onClick={openNewNote}
              className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#8D775F] text-white hover:bg-[#7A6451] transition-colors inline-flex items-center gap-1"
            >
              <Plus size={11} strokeWidth={2.5} /> פתקית
            </button>
          }>
            פתקיות אישיות{notes.length > 0 ? ` (${notes.length})` : ""}
          </SectionLabel>

          {noteFormOpen && (
            <div className="bg-white border-2 border-[#8D775F]/40 rounded-lg p-4 mb-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <StickyNote size={14} className="text-[#8D775F]" />
                <p className="text-xs font-bold text-[#2D2926]">{editingNoteId ? "ערוך פתקית" : "פתקית חדשה"}</p>
              </div>
              <input
                type="text"
                value={draftTitle}
                onChange={e => setDraftTitle(e.target.value)}
                placeholder="כותרת (למשל: 'Vercel 2FA backup')"
                maxLength={200}
                autoFocus
                className="w-full border border-[#E0DFD9] bg-[#F5F4F0] px-3 py-2 text-sm focus:border-[#8D775F] focus:outline-none transition-colors"
              />
              <textarea
                value={draftBody}
                onChange={e => setDraftBody(e.target.value)}
                placeholder="הערה / רמז (לא לסיסמאות — רק רמזים, חשבונות, ואיפה למצוא מה שצריך)"
                rows={4}
                maxLength={5000}
                className="w-full border border-[#E0DFD9] bg-[#F5F4F0] px-3 py-2 text-sm focus:border-[#8D775F] focus:outline-none transition-colors resize-y"
              />
              {/* Soft warning when the body looks like it contains a password (10+
                  non-whitespace chars with both letters AND digits). Doesn't block
                  save — just a nudge. Matches the policy stated in placeholder. */}
              {/\S*[A-Za-z]\S*\d\S*|\S*\d\S*[A-Za-z]\S*/.test(draftBody) && /\S{10,}/.test(draftBody) && (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded -mt-1">
                  ⚠ נראה כמו סיסמה בתוך ההערה. השדה לא מוצפן — אחסן רק רמזים (איפה למצוא, מי בעלי החשבון), לא סיסמאות עצמן.
                </p>
              )}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={draftPinned} onChange={e => setDraftPinned(e.target.checked)} className="accent-[#8D775F]" />
                  <span className="text-[#2D2926]/70">הצמד למעלה</span>
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={closeNoteForm}
                    className="text-xs px-3 py-1.5 border border-[#E0DFD9] text-[#2D2926]/60 hover:border-[#8D775F] transition-colors"
                  >
                    ביטול
                  </button>
                  <button
                    onClick={saveNote}
                    disabled={!draftTitle.trim() || noteSaving}
                    className="text-xs px-3 py-1.5 bg-[#8D775F] text-white hover:bg-[#7A6451] disabled:opacity-40 transition-colors inline-flex items-center gap-1"
                  >
                    {noteSaving ? <><Loader2 size={11} className="animate-spin" /> שומר…</> : "שמור"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {notesLoading && notes.length === 0 ? (
            <p className="text-[#2D2926]/30 text-sm py-3">טוען…</p>
          ) : notes.length === 0 && !noteFormOpen ? (
            <p className="text-[#2D2926]/30 text-sm py-3">
              אין עדיין פתקיות. לחץ "+ פתקית" להוסיף רמזים לחשבונות, 2FA, וכל מה ששווה לזכור.
              <br />
              <span className="text-[0.7rem] text-[#2D2926]/40">⚠ לא לאחסן סיסמאות כאן — השתמש ב-password manager.</span>
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {notes.map(n => (
                <div key={n.id} className="bg-white border border-[#E0DFD9] rounded-lg p-3 group hover:border-[#8D775F]/40 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1 min-w-0">
                      {n.pinned && <Pin size={11} className="text-[#8D775F] shrink-0" fill="currentColor" />}
                      <p className="text-sm font-bold text-[#2D2926] truncate">{n.title}</p>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => togglePin(n)}
                        disabled={pinningIds.has(n.id)}
                        title={n.pinned ? "בטל הצמדה" : "הצמד"}
                        className="p-1 hover:bg-[#F5F4F0] rounded disabled:opacity-50 disabled:cursor-wait"
                      >
                        {n.pinned ? <PinOff size={11} className="text-[#2D2926]/50" /> : <Pin size={11} className="text-[#2D2926]/50" />}
                      </button>
                      <button onClick={() => openEditNote(n)} title="ערוך" className="p-1 hover:bg-[#F5F4F0] rounded">
                        <Pencil size={11} className="text-[#2D2926]/50" />
                      </button>
                      <button onClick={() => deleteNote(n.id)} title="מחק" className="p-1 hover:bg-red-50 rounded">
                        <Trash2 size={11} className="text-red-500/70" />
                      </button>
                    </div>
                  </div>
                  {n.body && (
                    <p className="text-xs text-[#2D2926]/60 leading-relaxed whitespace-pre-wrap break-words">
                      {n.body}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* API Endpoints — toggle lives at the section level */}
        <section>
          <SectionLabel action={
            <button
              onClick={() => handleApiToggle(!showApi)}
              className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors
                ${showApi
                  ? "bg-[#8D775F] text-white"
                  : "text-[#2D2926]/40 hover:text-[#8D775F] hover:bg-[#8D775F]/10"}`}>
              {showApi ? "הסתר" : "הצג"}
            </button>
          }>
            ממשקים{showApi && (q ? apiTotal > 0 : apiRoutes.length > 0) ? ` (${q ? apiTotal : apiRoutes.length})` : ""}
          </SectionLabel>
          {showApi && (
            hasApiResults ? (
              <div className="space-y-5">
                {Object.entries(apiGroups).map(([cat, routes]) => (
                  <div key={cat}>
                    <CategoryLabel>{cat}</CategoryLabel>
                    <div className="space-y-1.5">
                      {routes.map(r => <APICard key={r.url} route={r} />)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[#2D2926]/30 text-sm py-3">
                {q ? "אין תוצאות" : "לא נמצאו ממשקים"}
              </p>
            )
          )}
        </section>

        <p className="text-center text-xs text-[#2D2926]/20 pt-2 pb-6">
          /admin/hub · {uiRoutes.length} כלים · {apiRoutes.length} ממשקים
        </p>
      </div>
    </div>
  );
}
