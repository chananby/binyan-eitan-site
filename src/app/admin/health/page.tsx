"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  CheckCircle2, XCircle, AlertTriangle, Activity,
  RefreshCw, ChevronLeft, Loader2, Clock, Database,
  Server, ShieldCheck, Home,
} from "lucide-react";

type CheckStatus = "ok" | "fail" | "warn";
interface CheckResult {
  id: string;
  section: string;
  name: string;
  status: CheckStatus;
  detail: string;
  fix?: string;
  ms?: number;
}

const API_PINGS = [
  { id: "ping_projects",   name: "/api/admin/projects",  url: "/api/admin/projects" },
  { id: "ping_tasks",      name: "/api/admin/tasks",      url: "/api/admin/tasks" },
  { id: "ping_milestones", name: "/api/admin/milestones", url: "/api/admin/milestones" },
  { id: "ping_staff",      name: "/api/admin/staff",      url: "/api/admin/staff" },
];

const SECTION_META: Record<string, { label: string; icon: React.ReactNode }> = {
  env:    { label: "סביבה",           icon: <ShieldCheck size={15} strokeWidth={1.5} /> },
  db:     { label: "בסיס נתונים",      icon: <Database    size={15} strokeWidth={1.5} /> },
  schema: { label: "סכמת DB",          icon: <Database    size={15} strokeWidth={1.5} /> },
  data:   { label: "תקינות נתונים",    icon: <Activity    size={15} strokeWidth={1.5} /> },
  api:    { label: "תגובת API",         icon: <Server      size={15} strokeWidth={1.5} /> },
};

function StatusIcon({ status }: { status: CheckStatus | "idle" | "running" }) {
  if (status === "idle")    return <div className="w-6 h-6 rounded-full border-2 border-white/10" />;
  if (status === "running") return <Loader2 size={24} className="animate-spin text-white/40" />;
  if (status === "ok")      return <CheckCircle2  size={24} className="text-emerald-400" />;
  if (status === "fail")    return <XCircle       size={24} className="text-red-400" />;
  return                           <AlertTriangle size={24} className="text-amber-400" />;
}

function statusColor(s: CheckStatus | "idle" | "running") {
  if (s === "ok")      return "border-emerald-500/30 bg-emerald-500/5";
  if (s === "fail")    return "border-red-500/30 bg-red-500/5";
  if (s === "warn")    return "border-amber-500/30 bg-amber-500/5";
  return "border-white/8 bg-white/[0.02]";
}

function CheckCard({ r }: { r: CheckResult }) {
  return (
    <div className={`flex items-start gap-3 px-4 py-3 border ${statusColor(r.status)} transition-colors`}>
      <div className="pt-0.5 shrink-0"><StatusIcon status={r.status} /></div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-white/90">{r.name}</p>
          {r.ms !== undefined && (
            <span className={`flex items-center gap-1 text-[0.6rem] px-1.5 py-0.5 ${r.ms < 500 ? "bg-emerald-500/10 text-emerald-400" : r.ms < 1500 ? "bg-amber-500/10 text-amber-400" : "bg-red-500/10 text-red-400"}`}>
              <Clock size={9} /> {r.ms}ms
            </span>
          )}
        </div>
        <p className="text-xs text-white/40 mt-0.5">{r.detail}</p>
        {r.fix && (
          <div className="mt-2 flex items-start gap-1.5 text-[0.68rem] text-amber-300/80 bg-amber-500/[0.06] border border-amber-500/15 px-2.5 py-1.5">
            <span className="shrink-0 mt-px">⚑</span>
            <span>{r.fix}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionBlock({ sectionKey, results }: { sectionKey: string; results: CheckResult[] }) {
  const meta   = SECTION_META[sectionKey];
  const failed = results.filter(r => r.status === "fail").length;
  const warned = results.filter(r => r.status === "warn").length;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className="text-white/30">{meta?.icon}</span>
        <h2 className="text-[0.65rem] font-bold tracking-[0.2em] uppercase text-white/35">{meta?.label ?? sectionKey}</h2>
        {failed > 0 && <span className="text-[0.58rem] px-1.5 py-0.5 bg-red-500/15 text-red-400 font-semibold">{failed} שגיאה</span>}
        {warned > 0 && <span className="text-[0.58rem] px-1.5 py-0.5 bg-amber-500/15 text-amber-400 font-semibold">{warned} אזהרה</span>}
      </div>
      <div className="space-y-1.5">
        {results.map(r => <CheckCard key={r.id} r={r} />)}
      </div>
    </div>
  );
}

export default function HealthPage() {
  const [results,    setResults]    = useState<CheckResult[]>([]);
  const [running,    setRunning]    = useState(false);
  const [checkedAt,  setCheckedAt]  = useState<string | null>(null);
  const [authError,  setAuthError]  = useState(false);

  const runDiagnostics = useCallback(async () => {
    setRunning(true);
    setResults([]);
    setCheckedAt(null);
    setAuthError(false);

    try {
      // 1. Server-side checks
      const res = await fetch("/api/admin/health");
      if (res.status === 401) { setAuthError(true); setRunning(false); return; }
      const data = await res.json();
      const serverResults: CheckResult[] = data.results ?? [];
      setResults(serverResults);
      setCheckedAt(data.checkedAt ?? null);

      // 2. API pings (client-side, measured from browser)
      const pingResults: CheckResult[] = await Promise.all(
        API_PINGS.map(async ({ id, name, url }) => {
          const t0 = Date.now();
          try {
            const r = await fetch(url);
            const ms = Date.now() - t0;
            return {
              id, section: "api", name,
              status: (r.ok ? (ms < 1500 ? "ok" : "warn") : "fail") as CheckStatus,
              detail: r.ok ? `HTTP ${r.status}` : `HTTP ${r.status} — שגיאה`,
              ms,
              fix: !r.ok ? `בדוק את ה-API endpoint ${url}` : undefined,
            };
          } catch (e) {
            return { id, section: "api", name, status: "fail" as CheckStatus, detail: String(e), ms: Date.now() - t0, fix: `ה-endpoint ${url} לא מגיב` };
          }
        })
      );
      setResults(prev => [...prev, ...pingResults]);
    } catch (e) {
      setResults([{ id: "network", section: "env", name: "שגיאת רשת", status: "fail", detail: String(e) }]);
    } finally {
      setRunning(false);
    }
  }, []);

  // Group by section
  const sections = ["env", "db", "schema", "data", "api"];
  const grouped  = sections.map(s => ({ key: s, items: results.filter(r => r.section === s) })).filter(g => g.items.length > 0);

  const total  = results.length;
  const failed = results.filter(r => r.status === "fail").length;
  const warned = results.filter(r => r.status === "warn").length;
  const passed = results.filter(r => r.status === "ok").length;
  const overallOk = total > 0 && failed === 0;

  return (
    <div className="min-h-screen bg-[#1a1714] text-white" dir="rtl">

      {/* Top bar */}
      <div className="border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity size={18} strokeWidth={1.5} className="text-accent" />
          <div>
            <p className="text-[0.58rem] font-bold tracking-[0.2em] uppercase text-white/30">בנין איתן</p>
            <h1 className="text-sm font-bold text-white/90 leading-none">בדיקת מערכת</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/he" className="flex items-center gap-1.5 text-[0.68rem] text-white/25 hover:text-white/60 transition-colors">
            <Home size={12} strokeWidth={1.5} />
            דף הבית
          </Link>
          <Link href="/admin" className="flex items-center gap-1.5 text-[0.68rem] text-white/25 hover:text-accent transition-colors">
            <ChevronLeft size={13} strokeWidth={1.5} />
            ממשק ניהול
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">

        {/* Run button + summary */}
        <div className="text-center space-y-5">
          <button
            onClick={runDiagnostics}
            disabled={running}
            className="inline-flex items-center gap-2.5 bg-accent hover:bg-accent-dark disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-4 text-sm font-bold tracking-[0.15em] uppercase transition-colors duration-200"
          >
            {running
              ? <><Loader2 size={16} className="animate-spin" /> מריץ אבחון...</>
              : <><RefreshCw size={16} strokeWidth={2} /> הרץ אבחון מלא</>
            }
          </button>

          {checkedAt && (
            <p className="text-[0.6rem] text-white/20 tabular-nums">
              נבדק: {new Date(checkedAt).toLocaleString("he-IL")}
            </p>
          )}
        </div>

        {/* Auth error */}
        {authError && (
          <div className="border border-red-500/30 bg-red-500/5 px-5 py-4 text-center">
            <p className="text-sm text-red-400 font-semibold">לא מחובר כמנהל</p>
            <Link href="/admin" className="text-xs text-white/40 hover:text-accent mt-1 inline-block">
              → כניסה לממשק ניהול
            </Link>
          </div>
        )}

        {/* Summary bar */}
        {total > 0 && !running && (
          <div className={`border px-5 py-4 flex items-center justify-between ${overallOk ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}`}>
            <div className="flex items-center gap-2">
              {overallOk
                ? <CheckCircle2 size={20} className="text-emerald-400" />
                : <XCircle      size={20} className="text-red-400" />}
              <p className="text-sm font-bold">
                {overallOk ? "המערכת תקינה" : `נמצאו ${failed} שגיאות`}
                {warned > 0 && ` · ${warned} אזהרות`}
              </p>
            </div>
            <div className="flex items-center gap-4 text-[0.65rem]">
              <span className="text-emerald-400">{passed} תקין</span>
              {warned > 0 && <span className="text-amber-400">{warned} אזהרה</span>}
              {failed > 0 && <span className="text-red-400">{failed} שגיאה</span>}
            </div>
          </div>
        )}

        {/* Running skeleton */}
        {running && (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 border border-white/5 bg-white/[0.02] animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
            ))}
          </div>
        )}

        {/* Results grouped by section */}
        {!running && grouped.length > 0 && (
          <div className="space-y-6">
            {grouped.map(g => <SectionBlock key={g.key} sectionKey={g.key} results={g.items} />)}
          </div>
        )}

        {/* Empty state */}
        {!running && total === 0 && !authError && (
          <div className="text-center py-16 text-white/15">
            <Activity size={40} strokeWidth={1} className="mx-auto mb-4 opacity-30" />
            <p className="text-sm">לחץ על הכפתור להרצת אבחון מלא</p>
          </div>
        )}

      </div>
    </div>
  );
}
