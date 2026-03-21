"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  CheckCircle2, XCircle, AlertTriangle, Activity,
  RefreshCw, ChevronLeft, Loader2, Clock, Database,
  Server, ShieldCheck, Home, Zap, PowerOff, Power, MapPin,
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
interface AttStep { name: string; ok: boolean; detail: string; ms: number; }

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
  policy: { label: "מדיניות",           icon: <MapPin      size={15} strokeWidth={1.5} /> },
  api:    { label: "תגובת API",         icon: <Server      size={15} strokeWidth={1.5} /> },
};

function StatusIcon({ status }: { status: CheckStatus | "idle" | "running" }) {
  if (status === "idle")    return <div className="w-6 h-6 rounded-full border-2 border-white/10" />;
  if (status === "running") return <Loader2 size={24} className="animate-spin text-white/40" />;
  if (status === "ok")      return <CheckCircle2  size={24} className="text-emerald-400" />;
  if (status === "fail")    return <XCircle       size={24} className="text-red-400" />;
  return                           <AlertTriangle size={24} className="text-amber-400" />;
}

function statusBorder(s: CheckStatus | "idle" | "running") {
  if (s === "ok")   return "border-emerald-500/30 bg-emerald-500/5";
  if (s === "fail") return "border-red-500/30 bg-red-500/5";
  if (s === "warn") return "border-amber-500/30 bg-amber-500/5";
  return "border-white/8 bg-white/[0.02]";
}

function CheckCard({ r }: { r: CheckResult }) {
  return (
    <div className={`flex items-start gap-3 px-4 py-3 border ${statusBorder(r.status)} transition-colors`}>
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
  const [results,       setResults]       = useState<CheckResult[]>([]);
  const [running,       setRunning]       = useState(false);
  const [checkedAt,     setCheckedAt]     = useState<string | null>(null);
  const [authError,     setAuthError]     = useState(false);

  // Live attendance test
  const [attRunning,    setAttRunning]    = useState(false);
  const [attSteps,      setAttSteps]      = useState<AttStep[] | null>(null);
  const [attOk,         setAttOk]         = useState<boolean | null>(null);

  // Maintenance mode
  const [maintenance,   setMaintenance]   = useState<boolean | null>(null);
  const [maintLoading,  setMaintLoading]  = useState(false);

  // Load maintenance status on mount
  useEffect(() => {
    fetch("/api/admin/maintenance")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setMaintenance(d.maintenance); })
      .catch(() => {});
  }, []);

  const runDiagnostics = useCallback(async () => {
    setRunning(true); setResults([]); setCheckedAt(null); setAuthError(false);
    try {
      const res = await fetch("/api/admin/health");
      if (res.status === 401) { setAuthError(true); setRunning(false); return; }
      const data = await res.json();
      const serverResults: CheckResult[] = data.results ?? [];
      setResults(serverResults);
      setCheckedAt(data.checkedAt ?? null);

      const pingResults: CheckResult[] = await Promise.all(
        API_PINGS.map(async ({ id, name, url }) => {
          const t0 = Date.now();
          try {
            const r = await fetch(url);
            const ms = Date.now() - t0;
            return { id, section: "api", name, status: (r.ok ? (ms < 1500 ? "ok" : "warn") : "fail") as CheckStatus, detail: r.ok ? `HTTP ${r.status}` : `HTTP ${r.status} — שגיאה`, ms, fix: !r.ok ? `בדוק את ה-endpoint ${url}` : undefined };
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

  const runAttendanceTest = useCallback(async () => {
    setAttRunning(true); setAttSteps(null); setAttOk(null);
    try {
      const res = await fetch("/api/admin/health/test-attendance", { method: "POST" });
      if (res.status === 401) { setAuthError(true); return; }
      const data = await res.json();
      setAttSteps(data.steps ?? []);
      setAttOk(data.ok ?? false);
    } catch (e) {
      setAttSteps([{ name: "שגיאת רשת", ok: false, detail: String(e), ms: 0 }]);
      setAttOk(false);
    } finally {
      setAttRunning(false);
    }
  }, []);

  const toggleMaintenance = useCallback(async () => {
    if (maintenance === null) return;
    setMaintLoading(true);
    try {
      const res = await fetch("/api/admin/maintenance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: !maintenance }) });
      if (res.ok) { const d = await res.json(); setMaintenance(d.maintenance); }
    } catch { /* ignore */ }
    finally { setMaintLoading(false); }
  }, [maintenance]);

  const sections  = ["env", "db", "schema", "data", "policy", "api"];
  const grouped   = sections.map(s => ({ key: s, items: results.filter(r => r.section === s) })).filter(g => g.items.length > 0);
  const total     = results.length;
  const failed    = results.filter(r => r.status === "fail").length;
  const warned    = results.filter(r => r.status === "warn").length;
  const passed    = results.filter(r => r.status === "ok").length;
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
            <Home size={12} strokeWidth={1.5} /> דף הבית
          </Link>
          <Link href="/admin" className="flex items-center gap-1.5 text-[0.68rem] text-white/25 hover:text-accent transition-colors">
            <ChevronLeft size={13} strokeWidth={1.5} /> ממשק ניהול
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">

        {/* ── Maintenance toggle ───────────────────────────────────────────── */}
        <div className={`border px-5 py-4 flex items-center justify-between gap-4 ${maintenance ? "border-amber-500/40 bg-amber-500/[0.06]" : "border-white/8 bg-white/[0.02]"}`}>
          <div className="flex items-center gap-3">
            {maintenance
              ? <PowerOff size={20} className="text-amber-400 shrink-0" />
              : <Power     size={20} className="text-emerald-400 shrink-0" />}
            <div>
              <p className="text-sm font-bold">{maintenance ? "מצב תחזוקה — פעיל" : "האתר פעיל"}</p>
              <p className="text-[0.65rem] text-white/35 mt-0.5">
                {maintenance ? "כל הדפים הציבוריים מנותבים לדף תחזוקה" : "הדפים הציבוריים נגישים למבקרים"}
              </p>
            </div>
          </div>
          <button
            onClick={toggleMaintenance}
            disabled={maintLoading || maintenance === null}
            className={`shrink-0 px-4 py-2 text-xs font-bold tracking-wide uppercase transition-colors disabled:opacity-40 disabled:cursor-not-allowed border ${maintenance ? "border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10" : "border-amber-500/40 text-amber-400 hover:bg-amber-500/10"}`}
          >
            {maintLoading ? <Loader2 size={13} className="animate-spin" /> : maintenance ? "הפעל אתר" : "הפעל תחזוקה"}
          </button>
        </div>

        {/* ── Main diagnostics ─────────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={runDiagnostics}
              disabled={running}
              className="inline-flex items-center gap-2 bg-accent hover:bg-accent-dark disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 text-sm font-bold tracking-[0.12em] uppercase transition-colors duration-200"
            >
              {running ? <><Loader2 size={14} className="animate-spin" /> מריץ...</> : <><RefreshCw size={14} strokeWidth={2} /> הרץ אבחון מלא</>}
            </button>

            {/* Live attendance test */}
            <button
              onClick={runAttendanceTest}
              disabled={attRunning}
              className="inline-flex items-center gap-2 border border-accent/40 hover:border-accent hover:bg-accent/10 disabled:opacity-50 disabled:cursor-not-allowed text-accent px-6 py-3 text-sm font-bold tracking-[0.12em] uppercase transition-colors duration-200"
            >
              {attRunning ? <><Loader2 size={14} className="animate-spin" /> בודק...</> : <><Zap size={14} strokeWidth={2} /> בדיקת נוכחות חיה</>}
            </button>
          </div>

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
            <Link href="/admin" className="text-xs text-white/40 hover:text-accent mt-1 inline-block">→ כניסה לממשק ניהול</Link>
          </div>
        )}

        {/* Summary bar */}
        {total > 0 && !running && (
          <div className={`border px-5 py-4 flex items-center justify-between ${overallOk ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}`}>
            <div className="flex items-center gap-2">
              {overallOk ? <CheckCircle2 size={20} className="text-emerald-400" /> : <XCircle size={20} className="text-red-400" />}
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

        {/* Live attendance test results */}
        {(attSteps || attRunning) && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <Zap size={14} strokeWidth={1.5} className="text-accent/60" />
              <h2 className="text-[0.65rem] font-bold tracking-[0.2em] uppercase text-white/35">בדיקת נוכחות חיה</h2>
              {attOk !== null && (
                <span className={`text-[0.58rem] px-1.5 py-0.5 font-semibold ${attOk ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                  {attOk ? "תקין" : "נכשל"}
                </span>
              )}
            </div>
            {attRunning && <div className="h-12 border border-white/5 bg-white/[0.02] animate-pulse" />}
            {attSteps?.map((s, i) => (
              <div key={i} className={`flex items-start gap-3 px-4 py-3 border ${s.ok ? "border-emerald-500/25 bg-emerald-500/[0.04]" : "border-red-500/25 bg-red-500/[0.04]"}`}>
                <div className="pt-0.5 shrink-0">
                  {s.ok ? <CheckCircle2 size={18} className="text-emerald-400" /> : <XCircle size={18} className="text-red-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-white/85">{s.name}</p>
                    <span className={`text-[0.58rem] px-1.5 py-0.5 ${s.ms < 500 ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
                      {s.ms}ms
                    </span>
                  </div>
                  <p className="text-[0.68rem] text-white/35 mt-0.5">{s.detail}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Running skeleton */}
        {running && (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
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
        {!running && total === 0 && !authError && !attSteps && (
          <div className="text-center py-12 text-white/15">
            <Activity size={40} strokeWidth={1} className="mx-auto mb-4 opacity-30" />
            <p className="text-sm">לחץ על אחד מהכפתורים להתחלת הבדיקה</p>
          </div>
        )}

      </div>
    </div>
  );
}
