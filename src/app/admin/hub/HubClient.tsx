"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  AlertCircle, ExternalLink, Loader2, Search,
  ShieldCheck, Wrench, X,
} from "lucide-react";
import type { UIRoute, APIRoute } from "../../../lib/discover-routes";
import type { ExternalLinkGroup } from "../../../data/external-links";

type Author = "Hanan" | "Moti";

// ── Helpers ───────────────────────────────────────────────────────────────────
function groupBy<T>(arr: T[], key: (t: T) => string): Record<string, T[]> {
  return arr.reduce<Record<string, T[]>>((acc, item) => {
    const k = key(item);
    (acc[k] ??= []).push(item);
    return acc;
  }, {});
}

// ── PIN Gate (dark theme) ─────────────────────────────────────────────────────
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
    <div className="min-h-screen bg-[#141210] flex flex-col items-center justify-center p-8">
      <Wrench size={22} strokeWidth={1.5} className="text-[#8D775F] mb-5" />
      <p className="text-[#8D775F]/50 text-[0.55rem] font-bold tracking-[0.28em] uppercase mb-1">מרכז שליטה</p>
      <h1 className="text-white/65 text-lg font-bold mb-8">כניסה פרטית</h1>

      <div className="flex gap-3 mb-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`w-2 h-2 rounded-full border transition-all duration-200
            ${i < pin.length ? "bg-[#8D775F] border-[#8D775F]" : "bg-transparent border-white/20"}`} />
        ))}
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-1.5 text-red-400 text-xs">
          <AlertCircle size={13} /> קוד שגוי, נסה שוב
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 w-52" dir="ltr">
        {KEYS.map((d, i) => (
          <button key={i}
            onClick={() => {
              if (d === "⌫") { setPin(p => p.slice(0, -1)); setError(false); }
              else if (d && pin.length < 6) { setPin(p => p + d); setError(false); }
            }}
            className={`h-12 rounded border text-base font-bold transition-all active:scale-95
              ${!d ? "pointer-events-none border-transparent"
                   : "border-white/[0.08] bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:border-white/20"}`}>
            {d}
          </button>
        ))}
      </div>

      <button
        onClick={submit}
        disabled={pin.length < 3 || loading}
        className="mt-5 w-52 h-11 bg-[#8D775F] text-white font-bold tracking-[0.1em] text-sm rounded disabled:opacity-25 hover:bg-[#7A6451] transition-colors">
        {loading ? <Loader2 size={15} className="animate-spin mx-auto" /> : "כניסה"}
      </button>
    </div>
  );
}

// ── Method badge ──────────────────────────────────────────────────────────────
const METHOD_COLORS: Record<string, string> = {
  GET:    "bg-green-900/60 text-green-400",
  POST:   "bg-blue-900/60 text-blue-400",
  PUT:    "bg-orange-900/60 text-orange-400",
  DELETE: "bg-red-900/60 text-red-400",
  PATCH:  "bg-purple-900/60 text-purple-400",
};

function MethodBadge({ method }: { method: string }) {
  return (
    <span className={`text-[0.55rem] font-bold px-1.5 py-0.5 rounded ${METHOD_COLORS[method] ?? "bg-white/10 text-white/40"}`}>
      {method}
    </span>
  );
}

// ── Card components ───────────────────────────────────────────────────────────
function UICard({ route }: { route: UIRoute }) {
  return (
    <Link href={route.url}
      className="flex items-center gap-3 px-3.5 py-3 border border-white/[0.07] bg-white/[0.02]
        hover:bg-white/[0.05] hover:border-white/15 transition-all group rounded-sm">
      <div className="flex-1 min-w-0">
        <p className="text-[0.8rem] font-semibold text-white/75 group-hover:text-white/90 leading-snug truncate">{route.label}</p>
        <p className="text-[0.6rem] text-white/25 mt-0.5 truncate font-mono">{route.url}</p>
      </div>
    </Link>
  );
}

function ExtCard({ item }: { item: { label: string; url: string; description?: string } }) {
  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-3 px-3.5 py-3 border border-white/[0.07] bg-white/[0.02]
        hover:bg-white/[0.05] hover:border-white/15 transition-all group rounded-sm">
      <div className="flex-1 min-w-0">
        <p className="text-[0.8rem] font-semibold text-white/75 group-hover:text-white/90 leading-snug">{item.label}</p>
        {item.description && (
          <p className="text-[0.6rem] text-white/25 mt-0.5 truncate">{item.description}</p>
        )}
      </div>
      <ExternalLink size={11} className="shrink-0 text-white/15 group-hover:text-white/40" />
    </a>
  );
}

function APICard({ route }: { route: APIRoute }) {
  return (
    <a href={route.url} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-3 px-3.5 py-2.5 border border-white/[0.05] bg-white/[0.015]
        hover:bg-white/[0.04] hover:border-white/10 transition-all group rounded-sm">
      <div className="flex-1 min-w-0">
        <p className="text-[0.72rem] font-mono text-white/45 group-hover:text-white/65 truncate">{route.url}</p>
        <div className="flex items-center gap-1 mt-1 flex-wrap">
          {route.methods.length > 0
            ? route.methods.map(m => <MethodBadge key={m} method={m} />)
            : <span className="text-[0.55rem] text-white/15">method unknown</span>
          }
        </div>
      </div>
      <ExternalLink size={10} className="shrink-0 text-white/10 group-hover:text-white/30" />
    </a>
  );
}

// ── Section block ─────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[0.55rem] font-bold tracking-[0.22em] uppercase text-white/20 mb-3">
      {children}
    </p>
  );
}

function CategoryLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[0.58rem] text-[#8D775F]/55 tracking-wider uppercase mb-1.5 px-0.5">
      {children}
    </p>
  );
}

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ on, onToggle, label }: { on: boolean; onToggle: (v: boolean) => void; label: string }) {
  return (
    <button onClick={() => onToggle(!on)} className="flex items-center gap-2 group">
      <span className="text-[0.6rem] text-white/30 select-none group-hover:text-white/50 transition-colors">{label}</span>
      <div dir="ltr"
        className={`relative w-9 h-[18px] rounded-full transition-colors ${on ? "bg-[#8D775F]" : "bg-white/10"}`}>
        <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-all duration-200 ${on ? "left-[18px]" : "left-0.5"}`} />
      </div>
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export interface HubClientProps {
  uiRoutes: UIRoute[];
  apiRoutes: APIRoute[];
  externalLinks: ExternalLinkGroup[];
}

export default function HubClient({ uiRoutes, apiRoutes, externalLinks }: HubClientProps) {
  const [author, setAuthor]   = useState<Author | null>(null);
  const [checking, setChecking] = useState(true);
  const [query, setQuery]     = useState("");
  const [showApi, setShowApi] = useState(false);

  // Check existing auth cookie
  useEffect(() => {
    fetch("/api/executive/auth")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.author) setAuthor(d.author as Author); })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  // Load API toggle from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      setShowApi(localStorage.getItem("hub_show_api") === "true");
    }
  }, []);

  const handleApiToggle = (val: boolean) => {
    setShowApi(val);
    if (typeof window !== "undefined") localStorage.setItem("hub_show_api", val ? "true" : "false");
  };

  // ── Filtered & grouped data ────────────────────────────────────────────────
  const q = query.toLowerCase();

  const uiGroups = useMemo(() => {
    const filtered = uiRoutes.filter(r =>
      !q || r.label.toLowerCase().includes(q) || r.url.toLowerCase().includes(q)
    );
    return groupBy(filtered, r => r.category);
  }, [uiRoutes, q]);

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

  // ── Auth gate ──────────────────────────────────────────────────────────────
  if (checking) return <div className="min-h-screen bg-[#141210]" />;
  if (!author)  return <PinGate onAuth={setAuthor} />;

  const hasUiResults  = Object.keys(uiGroups).length > 0;
  const hasExtResults = extGroups.length > 0;
  const hasApiResults = Object.keys(apiGroups).length > 0;

  return (
    <div className="min-h-screen bg-[#141210] text-white" dir="rtl">

      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-[#141210]/95 backdrop-blur-sm border-b border-white/[0.06] px-4 md:px-6 py-3.5">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <Wrench size={15} strokeWidth={1.5} className="text-[#8D775F] shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[0.5rem] font-bold tracking-[0.25em] uppercase text-white/20 leading-none">בניין איתן</p>
              <h1 className="text-[0.88rem] font-bold text-white/85 leading-none mt-0.5">מרכז שליטה</h1>
            </div>
            <div className="flex items-center gap-4">
              <Toggle on={showApi} onToggle={handleApiToggle} label="API" />
              <div className="flex items-center gap-1.5">
                <span className="text-[0.58rem] text-white/20">{author === "Hanan" ? "חנן" : "מוטי"}</span>
                <ShieldCheck size={11} strokeWidth={1.5} className="text-white/10" />
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative" dir="ltr">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
            <input
              type="text"
              placeholder="Search..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-full pl-8 pr-7 py-1.5
                text-[0.78rem] text-white/70 placeholder-white/20
                focus:outline-none focus:border-[#8D775F]/50 transition-colors"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50">
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 space-y-8">

        {/* UI Routes */}
        <section>
          <SectionLabel>כלים פנימיים {uiRoutes.length > 0 && `(${uiRoutes.length})`}</SectionLabel>
          {hasUiResults ? (
            <div className="space-y-4">
              {Object.entries(uiGroups).map(([cat, routes]) => (
                <div key={cat}>
                  <CategoryLabel>{cat}</CategoryLabel>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
                    {routes.map(r => <UICard key={r.url} route={r} />)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/20 text-sm py-3">
              {q ? "אין תוצאות" : "לא נמצאו כלים (auto-discovery לא הצליח — ראה OPEN_QUESTIONS)"}
            </p>
          )}
        </section>

        {/* External Links */}
        <section>
          <SectionLabel>קישורים חיצוניים</SectionLabel>
          {hasExtResults ? (
            <div className="space-y-4">
              {extGroups.map(g => (
                <div key={g.category}>
                  <CategoryLabel>{g.category}</CategoryLabel>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
                    {g.items.map(item => <ExtCard key={item.label} item={item} />)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/20 text-sm py-3">אין תוצאות</p>
          )}
        </section>

        {/* API Endpoints (toggle) */}
        {showApi && (
          <section>
            <SectionLabel>API Endpoints {apiRoutes.length > 0 && `(${apiRoutes.length})`}</SectionLabel>
            {hasApiResults ? (
              <div className="space-y-4">
                {Object.entries(apiGroups).map(([cat, routes]) => (
                  <div key={cat}>
                    <CategoryLabel>{cat}</CategoryLabel>
                    <div className="space-y-1">
                      {routes.map(r => <APICard key={r.url} route={r} />)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/20 text-sm py-3">
                {q ? "אין תוצאות" : "לא נמצאו API routes (auto-discovery לא הצליח)"}
              </p>
            )}
          </section>
        )}

        <p className="text-center text-[0.52rem] text-white/[0.08] pt-2 pb-4">
          /admin/hub · {uiRoutes.length} כלים · {apiRoutes.length} endpoints
        </p>
      </div>
    </div>
  );
}
