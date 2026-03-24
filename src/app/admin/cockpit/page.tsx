"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import {
  Plus, Trash2, Mic, MicOff, AlertCircle, Loader2,
  Zap, LogOut, ExternalLink, X, ChevronRight,
  FolderOpen, SlidersHorizontal,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
type Author  = "Hanan" | "Moti";
type ColKey  = "backlog" | "urgent" | "in_progress" | "pending" | "done";

interface Company {
  id:        string;
  name:      string;
  slug:      string;
  color:     string;
  icon:      string;
  drive_url?: string;
}

interface Task {
  id:         string;
  title:      string;
  notes?:     string;
  status:     ColKey;
  priority:   number;
  author:     string;
  company_id?: string;
  created_at: string;
  holding_companies?: Company | null;
}

// ── Column config ──────────────────────────────────────────────────────────────
const COLUMNS: { key: ColKey; label: string; accent: string; bg: string }[] = [
  { key: "backlog",     label: "Backlog",     accent: "#6B7280", bg: "rgba(107,114,128,0.06)" },
  { key: "urgent",      label: "דחוף",        accent: "#EF4444", bg: "rgba(239,68,68,0.07)"   },
  { key: "in_progress", label: "בביצוע",      accent: "#F59E0B", bg: "rgba(245,158,11,0.07)"  },
  { key: "pending",     label: "ממתין",       accent: "#3B82F6", bg: "rgba(59,130,246,0.07)"  },
  { key: "done",        label: "הושלם",       accent: "#10B981", bg: "rgba(16,185,129,0.07)"  },
];

// ── Fallback company list (if DB empty) ───────────────────────────────────────
const DEFAULT_COMPANIES: Company[] = [
  { id: "shulchan",  name: "שולחן המלך",         slug: "shulchan",  color: "#D4A017", icon: "🍽️" },
  { id: "binyan",    name: "בניין איתן",           slug: "binyan",    color: "#4A7FA5", icon: "🏗️" },
  { id: "smartsky",  name: "Smart Sky",           slug: "smartsky",  color: "#38BDF8", icon: "✈️" },
  { id: "deletot",   name: "דלתות ניקנור",        slug: "deletot",   color: "#8B6348", icon: "🚪" },
  { id: "overseas",  name: "Overseas Restaurant", slug: "overseas",  color: "#4CAF50", icon: "🌍" },
  { id: "steel",     name: "Prime Steel",         slug: "steel",     color: "#9AA3B0", icon: "⚙️" },
  { id: "personal",  name: "אישי",                slug: "personal",  color: "#9B59B6", icon: "👤" },
];

// ── PIN Gate (reused from war room) ───────────────────────────────────────────
function PinGate({ onAuth }: { onAuth: (author: Author) => void }) {
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
      else { setError(true); setPin(""); }
    } finally { setLoading(false); }
  };

  const KEYS = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

  return (
    <div className="min-h-screen bg-[#141210] flex flex-col items-center justify-center p-8" dir="rtl">
      <Image src="/logo.png" alt="בניין איתן" width={100} height={28} className="mb-6 opacity-60 brightness-0 invert" />
      <p className="text-amber-400/50 text-[0.55rem] font-bold tracking-[0.3em] uppercase mb-1">Multi-Entity Cockpit</p>
      <h1 className="text-[#F3F2EE]/70 text-lg font-heading mb-8 tracking-wide">כניסה פרטית</h1>
      <div className="flex gap-2.5 mb-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`w-2 h-2 rounded-full border border-amber-400/30 transition-all duration-150
            ${i < pin.length ? "bg-amber-400 scale-125" : "bg-transparent"}`} />
        ))}
      </div>
      {error && <div className="mb-4 flex items-center gap-1.5 text-red-400 text-xs"><AlertCircle size={13} /> קוד שגוי</div>}
      <div className="grid grid-cols-3 gap-2 w-56" dir="ltr">
        {KEYS.map((d, i) => (
          <button key={i}
            onClick={() => {
              if (d === "⌫") { setPin(p => p.slice(0,-1)); setError(false); }
              else if (d && pin.length < 6) { setPin(p => p + d); setError(false); }
            }}
            className={`h-13 border transition-all duration-100 active:scale-95 font-heading text-base py-3
              ${!d ? "pointer-events-none border-transparent"
                   : "border-amber-400/12 text-[#F3F2EE]/80 hover:bg-amber-400/8 hover:border-amber-400/25"}`}>
            {d}
          </button>
        ))}
      </div>
      <button onClick={submit} disabled={pin.length < 3 || loading}
        className="mt-5 w-56 h-11 bg-amber-400 text-[#141210] font-heading font-bold tracking-[0.18em] uppercase text-sm disabled:opacity-25 hover:bg-amber-300 transition-colors">
        {loading ? <Loader2 size={15} className="animate-spin mx-auto" /> : "כניסה"}
      </button>
    </div>
  );
}

// ── Task Card ─────────────────────────────────────────────────────────────────
function TaskCard({
  task, isDragging, onDragStart, onDelete, companies,
}: {
  task: Task;
  isDragging: boolean;
  onDragStart: () => void;
  onDelete: () => void;
  companies: Company[];
}) {
  const company = task.holding_companies
    ?? companies.find(c => c.id === task.company_id)
    ?? null;

  const date = new Date(task.created_at).toLocaleDateString("he-IL", {
    day: "numeric", month: "short",
  });

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={`group relative p-3 border cursor-grab active:cursor-grabbing transition-all duration-150 select-none
        ${isDragging
          ? "opacity-40 scale-[0.97] border-white/20 bg-white/5"
          : "border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/15"}`}
    >
      {/* Company bar */}
      {company && (
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-[0.7rem]">{company.icon}</span>
          <span className="text-[0.6rem] font-bold tracking-wide truncate" style={{ color: company.color }}>
            {company.name}
          </span>
        </div>
      )}

      {/* Title */}
      <p className="text-[0.8rem] text-white/85 leading-snug break-words pr-5">{task.title}</p>

      {/* Notes preview */}
      {task.notes && (
        <p className="text-[0.65rem] text-white/30 mt-1.5 line-clamp-2 leading-snug">{task.notes}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-white/[0.05]">
        <span className={`text-[0.58rem] font-bold px-1.5 py-0.5 border
          ${task.author === "Hanan"
            ? "border-amber-400/25 text-amber-400/70"
            : "border-blue-400/25 text-blue-400/70"}`}>
          {task.author === "Hanan" ? "ח" : "מ"}
        </span>
        <span className="text-[0.58rem] text-white/20">{date}</span>
      </div>

      {/* Delete */}
      <button
        onClick={e => { e.stopPropagation(); onDelete(); }}
        className="absolute top-2 end-2 opacity-0 group-hover:opacity-100 transition-opacity text-white/25 hover:text-red-400"
      >
        <Trash2 size={11} />
      </button>
    </div>
  );
}

// ── Quick Add Form ─────────────────────────────────────────────────────────────
function QuickAdd({
  colKey, companies, author, onAdd, onClose,
}: {
  colKey: ColKey;
  companies: Company[];
  author: Author;
  onAdd: (title: string, notes: string, companyId: string) => Promise<void>;
  onClose: () => void;
}) {
  const [title,     setTitle]     = useState("");
  const [notes,     setNotes]     = useState("");
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [saving,    setSaving]    = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const submit = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    await onAdd(title.trim(), notes, companyId);
    setSaving(false);
  };

  return (
    <div className="p-3 border border-amber-400/20 bg-[#1a1714] space-y-2 mt-2">
      <input
        ref={inputRef}
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") onClose(); }}
        placeholder="כותרת המשימה..."
        className="w-full bg-white/5 border border-white/10 text-white/90 text-[0.78rem] px-2.5 py-2 focus:outline-none focus:border-amber-400/30 placeholder:text-white/20"
      />
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="הערות (אופציונלי)"
        rows={2}
        className="w-full bg-white/5 border border-white/10 text-white/80 text-[0.72rem] px-2.5 py-1.5 focus:outline-none focus:border-amber-400/30 placeholder:text-white/20 resize-none"
      />
      <select
        value={companyId}
        onChange={e => setCompanyId(e.target.value)}
        className="w-full bg-[#1a1714] border border-white/10 text-white/70 text-[0.72rem] px-2.5 py-1.5 focus:outline-none"
      >
        {companies.map(c => (
          <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
        ))}
      </select>
      <div className="flex gap-2">
        <button onClick={submit} disabled={!title.trim() || saving}
          className="flex-1 py-1.5 bg-amber-400 text-[#141210] text-[0.72rem] font-bold tracking-wide disabled:opacity-40 hover:bg-amber-300 transition-colors">
          {saving ? <Loader2 size={12} className="animate-spin mx-auto" /> : `הוסף ל-${COLUMNS.find(c=>c.key===colKey)?.label}`}
        </button>
        <button onClick={onClose} className="px-3 py-1.5 border border-white/10 text-white/40 hover:text-white/70 transition-colors">
          <X size={13} />
        </button>
      </div>
    </div>
  );
}

// ── Main Cockpit ───────────────────────────────────────────────────────────────
export default function Cockpit() {
  const [authed,    setAuthed]    = useState(false);
  const [checking,  setChecking]  = useState(true);
  const [author,    setAuthor]    = useState<Author | null>(null);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [tasks,     setTasks]     = useState<Task[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const [filterCompany, setFilterCompany] = useState<string | null>(null);
  const [dragTaskId,    setDragTaskId]    = useState<string | null>(null);
  const [dragOverCol,   setDragOverCol]   = useState<ColKey | null>(null);
  const [addingTo,      setAddingTo]      = useState<ColKey | null>(null);
  const [showSidebar,   setShowSidebar]   = useState(false);
  const [listening,     setListening]     = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognizerRef = useRef<any>(null);

  // ── Auth check ─────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/executive/auth")
      .then(async r => { if (r.ok) { const d = await r.json(); setAuthed(true); setAuthor(d.author); } })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [cRes, tRes] = await Promise.all([
        fetch("/api/holding/companies"),
        fetch("/api/holding/tasks"),
      ]);
      if (cRes.ok) {
        const { companies: co } = await cRes.json();
        setCompanies(co.length > 0 ? co : DEFAULT_COMPANIES);
      } else {
        setCompanies(DEFAULT_COMPANIES);
      }
      if (tRes.ok) {
        const { tasks: t } = await tRes.json();
        setTasks(t ?? []);
      } else {
        const d = await tRes.json().catch(() => ({}));
        setError(d.error ?? `שגיאה (${tRes.status})`);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (authed) loadData(); }, [authed, loadData]);

  // ── DnD ────────────────────────────────────────────────────────────────────
  const handleDrop = useCallback(async (colKey: ColKey) => {
    if (!dragTaskId || dragTaskId === null) return;
    const task = tasks.find(t => t.id === dragTaskId);
    if (!task || task.status === colKey) { setDragTaskId(null); setDragOverCol(null); return; }

    setTasks(prev => prev.map(t => t.id === dragTaskId ? { ...t, status: colKey } : t));
    setDragTaskId(null); setDragOverCol(null);

    const res = await fetch(`/api/holding/tasks/${dragTaskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: colKey }),
    });
    if (!res.ok) {
      // revert
      setTasks(prev => prev.map(t => t.id === dragTaskId ? { ...t, status: task.status } : t));
    }
  }, [dragTaskId, tasks]);

  // ── Add task ───────────────────────────────────────────────────────────────
  const addTask = useCallback(async (colKey: ColKey, title: string, notes: string, companyId: string) => {
    const res = await fetch("/api/holding/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, notes: notes || undefined, status: colKey, company_id: companyId || undefined }),
    });
    if (res.ok) {
      const { task } = await res.json();
      setTasks(prev => [task, ...prev]);
      setAddingTo(null);
    }
  }, []);

  // ── Delete task ────────────────────────────────────────────────────────────
  const deleteTask = useCallback(async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    await fetch(`/api/holding/tasks/${id}`, { method: "DELETE" });
  }, []);

  // ── Voice ──────────────────────────────────────────────────────────────────
  const startVoice = useCallback(() => {
    if (typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) { alert("הדפדפן לא תומך בזיהוי קול"); return; }
    const r = new SR();
    r.lang = "he-IL"; r.interimResults = false; r.maxAlternatives = 1;
    r.onresult = (e: { results: { [key: number]: { [key: number]: { transcript: string } } } }) => {
      const text = e.results[0][0].transcript.trim();
      if (text) {
        const col: ColKey = "backlog";
        setAddingTo(col);
        setTimeout(() => {
          const input = document.querySelector<HTMLInputElement>("[data-voice-input]");
          if (input) { input.value = text; input.dispatchEvent(new Event("input", { bubbles: true })); }
        }, 100);
      }
      setListening(false);
    };
    r.onerror = () => setListening(false);
    r.onend   = () => setListening(false);
    recognizerRef.current = r;
    r.start(); setListening(true);
  }, []);

  const stopVoice = useCallback(() => {
    recognizerRef.current?.stop(); setListening(false);
  }, []);

  // ── Computed ───────────────────────────────────────────────────────────────
  const visibleTasks = filterCompany
    ? tasks.filter(t => t.company_id === filterCompany || t.holding_companies?.id === filterCompany)
    : tasks;

  const urgentAll = tasks.filter(t => t.status === "urgent");

  const colTasks = (key: ColKey) => visibleTasks.filter(t => t.status === key);

  const logout = async () => {
    await fetch("/api/executive/auth", { method: "DELETE" });
    setAuthed(false); setAuthor(null);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (checking) return (
    <div className="min-h-screen bg-[#141210] flex items-center justify-center">
      <Loader2 size={20} className="animate-spin text-white/20" />
    </div>
  );
  if (!authed) return <PinGate onAuth={a => { setAuthed(true); setAuthor(a); }} />;

  return (
    <div className="min-h-screen bg-[#0F0D0B] text-white flex flex-col" dir="rtl">

      {/* ── Top Bar ──────────────────────────────────────────────────────────── */}
      <header className="shrink-0 border-b border-white/[0.06] bg-[#141210] px-4 py-3 z-30">
        <div className="flex items-center gap-3 mb-3">
          {/* Logo + title */}
          <div className="flex items-center gap-2.5 shrink-0">
            <Image src="/logo.png" alt="" width={80} height={22} className="opacity-60 brightness-0 invert" />
            <div>
              <p className="text-[0.5rem] font-bold tracking-[0.25em] uppercase text-white/20">Holding</p>
              <p className="text-[0.75rem] font-bold text-white/80 leading-none">Multi-Entity Cockpit</p>
            </div>
          </div>

          <div className="flex-1" />

          {/* Voice */}
          <button
            onClick={listening ? stopVoice : startVoice}
            className={`flex items-center gap-1.5 px-3 py-1.5 border text-[0.68rem] font-bold tracking-wide transition-colors
              ${listening
                ? "border-red-500/40 text-red-400 bg-red-500/10 animate-pulse"
                : "border-white/10 text-white/40 hover:text-white/70 hover:border-white/20"}`}
          >
            {listening ? <><MicOff size={12}/> עצור</> : <><Mic size={12}/> קול</>}
          </button>

          {/* Urgent sidebar toggle */}
          <button
            onClick={() => setShowSidebar(s => !s)}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 border text-[0.68rem] font-bold tracking-wide transition-colors
              ${showSidebar
                ? "border-red-500/40 text-red-400 bg-red-500/[0.08]"
                : "border-white/10 text-white/40 hover:text-white/70"}`}
          >
            <Zap size={12} />
            דחוף
            {urgentAll.length > 0 && (
              <span className="absolute -top-1 -start-1 w-4 h-4 rounded-full bg-red-500 text-white text-[0.55rem] font-bold flex items-center justify-center">
                {urgentAll.length}
              </span>
            )}
          </button>

          {/* Author + Logout */}
          <div className="flex items-center gap-2">
            <span className={`text-[0.65rem] font-bold px-2 py-1 border
              ${author === "Hanan" ? "border-amber-400/30 text-amber-400" : "border-blue-400/30 text-blue-400"}`}>
              {author === "Hanan" ? "חנן" : "מוטי"}
            </span>
            <button onClick={logout} className="text-white/20 hover:text-white/60 transition-colors">
              <LogOut size={14} />
            </button>
          </div>
        </div>

        {/* Company chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
          <button
            onClick={() => setFilterCompany(null)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 border text-[0.68rem] font-bold tracking-wide transition-colors
              ${!filterCompany
                ? "border-white/30 text-white/90 bg-white/[0.06]"
                : "border-white/[0.07] text-white/30 hover:text-white/60 hover:border-white/15"}`}
          >
            <SlidersHorizontal size={11} />
            הכל
          </button>

          {companies.map(c => (
            <div key={c.id} className="shrink-0 flex items-center gap-1.5">
              <button
                onClick={() => setFilterCompany(filterCompany === c.id ? null : c.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 border text-[0.68rem] font-bold tracking-wide transition-colors
                  ${filterCompany === c.id
                    ? "bg-white/[0.06]"
                    : "border-white/[0.07] text-white/40 hover:border-white/20 hover:text-white/70"}`}
                style={filterCompany === c.id ? { borderColor: c.color + "60", color: c.color } : {}}
              >
                <span className="text-[0.8rem]">{c.icon}</span>
                {c.name}
              </button>
              {c.drive_url && (
                <a href={c.drive_url} target="_blank" rel="noopener noreferrer"
                  className="text-white/15 hover:text-white/50 transition-colors p-1.5"
                  title={`Google Drive — ${c.name}`}>
                  <FolderOpen size={11} />
                </a>
              )}
            </div>
          ))}
        </div>
      </header>

      {/* ── Body ──────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Kanban ──────────────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-x-auto overflow-y-hidden">
          {error && (
            <div className="m-4 flex items-center gap-2 text-red-400 text-xs border border-red-500/20 bg-red-500/[0.06] px-4 py-2.5">
              <AlertCircle size={13} /> {error}
            </div>
          )}

          <div className="flex gap-3 h-full p-4 min-w-[900px]">
            {COLUMNS.map(col => {
              const colItems = colTasks(col.key);
              const isDragTarget = dragOverCol === col.key;

              return (
                <div key={col.key}
                  className={`flex flex-col w-[220px] shrink-0 rounded-none transition-all duration-150
                    ${isDragTarget ? "ring-1" : ""}`}
                  style={{ background: isDragTarget ? col.bg : undefined, outline: isDragTarget ? `1px solid ${col.accent}50` : undefined }}
                  onDragOver={e => { e.preventDefault(); setDragOverCol(col.key); }}
                  onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverCol(null); }}
                  onDrop={() => handleDrop(col.key)}
                >
                  {/* Column header */}
                  <div className="flex items-center justify-between px-3 py-2.5 mb-2 border-b"
                    style={{ borderColor: col.accent + "30" }}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: col.accent }} />
                      <span className="text-[0.72rem] font-bold tracking-wide text-white/80">{col.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[0.6rem] text-white/30 font-mono">{colItems.length}</span>
                      <button
                        onClick={() => setAddingTo(addingTo === col.key ? null : col.key)}
                        className="text-white/20 hover:text-white/70 transition-colors"
                      >
                        {addingTo === col.key ? <X size={13} /> : <Plus size={13} />}
                      </button>
                    </div>
                  </div>

                  {/* Quick add */}
                  {addingTo === col.key && (
                    <QuickAdd
                      colKey={col.key}
                      companies={companies}
                      author={author!}
                      onAdd={(title, notes, companyId) => addTask(col.key, title, notes, companyId)}
                      onClose={() => setAddingTo(null)}
                    />
                  )}

                  {/* Task list */}
                  <div className="flex-1 overflow-y-auto space-y-2 px-1 py-1 min-h-[200px]">
                    {loading && colItems.length === 0 && (
                      <div className="flex justify-center pt-8">
                        <Loader2 size={14} className="animate-spin text-white/15" />
                      </div>
                    )}
                    {!loading && colItems.length === 0 && (
                      <div className="flex flex-col items-center justify-center pt-8 gap-1.5 opacity-0 hover:opacity-100 transition-opacity cursor-default">
                        <div className="w-6 h-6 border border-white/[0.06] flex items-center justify-center">
                          <Plus size={10} className="text-white/20" />
                        </div>
                        <p className="text-[0.58rem] text-white/15">גרור לכאן</p>
                      </div>
                    )}
                    {colItems.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        isDragging={dragTaskId === task.id}
                        onDragStart={() => setDragTaskId(task.id)}
                        onDelete={() => deleteTask(task.id)}
                        companies={companies}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </main>

        {/* ── Urgent Sidebar ────────────────────────────────────────────────── */}
        {showSidebar && (
          <aside className="w-72 shrink-0 border-s border-white/[0.06] bg-[#120D0B] overflow-y-auto flex flex-col">
            <div className="sticky top-0 bg-[#120D0B] flex items-center justify-between px-4 py-3 border-b border-white/[0.06] z-10">
              <div className="flex items-center gap-2">
                <Zap size={13} className="text-red-400" />
                <p className="text-[0.68rem] font-bold tracking-wide text-red-400">כל הדחוף</p>
                <span className="text-[0.6rem] text-white/30 font-mono">{urgentAll.length}</span>
              </div>
              <button onClick={() => setShowSidebar(false)} className="text-white/20 hover:text-white/60">
                <ChevronRight size={14} />
              </button>
            </div>

            {urgentAll.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-[0.65rem] text-white/20">אין משימות דחופות 🎉</p>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {urgentAll.map(task => {
                  const company = task.holding_companies
                    ?? companies.find(c => c.id === task.company_id)
                    ?? null;
                  return (
                    <div key={task.id} className="p-3 border border-red-500/15 bg-red-500/[0.04]">
                      {company && (
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="text-[0.65rem]">{company.icon}</span>
                          <span className="text-[0.58rem] font-bold" style={{ color: company.color }}>
                            {company.name}
                          </span>
                        </div>
                      )}
                      <p className="text-[0.75rem] text-white/85 leading-snug">{task.title}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className={`text-[0.58rem] font-bold px-1.5 py-0.5 border
                          ${task.author === "Hanan"
                            ? "border-amber-400/25 text-amber-400/70"
                            : "border-blue-400/25 text-blue-400/70"}`}>
                          {task.author === "Hanan" ? "חנן" : "מוטי"}
                        </span>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="text-white/15 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </aside>
        )}
      </div>

      {/* ── Bottom bar (mobile add) ───────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-white/[0.06] bg-[#141210] px-4 py-2.5 flex items-center justify-between md:hidden">
        <a href="/admin/hub" className="text-[0.65rem] text-white/25 hover:text-white/60 flex items-center gap-1.5">
          <ExternalLink size={11} /> Hub
        </a>
        <button
          onClick={() => setAddingTo("backlog")}
          className="flex items-center gap-1.5 px-4 py-2 bg-amber-400 text-[#141210] text-[0.72rem] font-bold"
        >
          <Plus size={13} /> משימה חדשה
        </button>
      </div>
    </div>
  );
}
