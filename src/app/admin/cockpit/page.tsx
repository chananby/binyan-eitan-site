"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import {
  Plus, Trash2, Mic, MicOff, AlertCircle, Loader2,
  Zap, LogOut, X, ChevronRight,
  FolderOpen, SlidersHorizontal,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
type Author  = "Hanan" | "Moti";
type ColKey  = "backlog" | "urgent" | "in_progress" | "pending" | "done";

interface Company {
  id:        string;
  name:      string;
  slug?:     string;
  color:     string;
  icon:      string;
  drive_url?: string;
}

interface Task {
  id:          string;
  title:       string;
  notes?:      string;
  status:      ColKey;
  priority:    number;
  author:      string;
  company_id?: string;
  created_at:  string;
  holding_companies?: Company | null;
}

// ── Column config ─────────────────────────────────────────────────────────────
const COLUMNS: { key: ColKey; label: string; accent: string; lightBg: string }[] = [
  { key: "backlog",     label: "בקלוג",    accent: "#8D775F", lightBg: "#F3F2EE" },
  { key: "urgent",      label: "דחוף",     accent: "#DC2626", lightBg: "#FEF2F2" },
  { key: "in_progress", label: "בביצוע",   accent: "#D97706", lightBg: "#FFFBEB" },
  { key: "pending",     label: "ממתין",    accent: "#2563EB", lightBg: "#EFF6FF" },
  { key: "done",        label: "הושלם",    accent: "#16A34A", lightBg: "#F0FDF4" },
];

// ── Fallback company list ─────────────────────────────────────────────────────
const DEFAULT_COMPANIES: Company[] = [
  { id: "shulchan", name: "שולחן המלך",         color: "#D4A017", icon: "🍽️" },
  { id: "binyan",   name: "בניין איתן",           color: "#4A7FA5", icon: "🏗️" },
  { id: "smartsky", name: "Smart Sky",           color: "#0284C7", icon: "✈️" },
  { id: "deletot",  name: "דלתות ניקנור",        color: "#8B6348", icon: "🚪" },
  { id: "overseas", name: "Overseas Restaurant", color: "#16A34A", icon: "🌍" },
  { id: "steel",    name: "Prime Steel",         color: "#64748B", icon: "⚙️" },
  { id: "personal", name: "אישי",                color: "#7C3AED", icon: "👤" },
];

// ── PIN Gate ──────────────────────────────────────────────────────────────────
function PinGate({ onAuth }: { onAuth: (author: Author) => void }) {
  const [pin,     setPin]     = useState("");
  const [error,   setError]   = useState(false);
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
    <div className="min-h-screen bg-[#F3F2EE] flex flex-col items-center justify-center p-8" dir="rtl">
      <Image src="/logo.png" alt="בניין איתן" width={110} height={30} className="mb-6 opacity-70" />
      <p className="text-[#8D775F] text-[0.55rem] font-bold tracking-[0.3em] uppercase mb-1">לוח שליטה</p>
      <h1 className="text-[#2D2926]/70 text-lg font-heading mb-8 tracking-wide">כניסה פרטית</h1>
      <div className="flex gap-2.5 mb-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`w-2 h-2 rounded-full border border-[#8D775F]/40 transition-all duration-150
            ${i < pin.length ? "bg-[#8D775F] scale-125" : "bg-transparent"}`} />
        ))}
      </div>
      {error && (
        <div className="mb-4 flex items-center gap-1.5 text-red-500 text-xs">
          <AlertCircle size={13} /> קוד שגוי
        </div>
      )}
      <div className="grid grid-cols-3 gap-2 w-56" dir="ltr">
        {KEYS.map((d, i) => (
          <button key={i}
            onClick={() => {
              if (d === "⌫") { setPin(p => p.slice(0,-1)); setError(false); }
              else if (d && pin.length < 6) { setPin(p => p + d); setError(false); }
            }}
            className={`h-13 py-3 border transition-all duration-100 active:scale-95 font-heading text-base
              ${!d ? "pointer-events-none border-transparent"
                   : "border-[#D1CFCA] text-[#2D2926]/70 bg-white hover:bg-[#E8E7E3] hover:border-[#8D775F]/40"}`}>
            {d}
          </button>
        ))}
      </div>
      <button onClick={submit} disabled={pin.length < 3 || loading}
        className="mt-5 w-56 h-11 bg-[#8D775F] text-white font-heading font-bold tracking-[0.18em] uppercase text-sm disabled:opacity-30 hover:bg-[#7A6451] transition-colors">
        {loading ? <Loader2 size={15} className="animate-spin mx-auto" /> : "כניסה"}
      </button>
    </div>
  );
}

// ── Task Card ─────────────────────────────────────────────────────────────────
function TaskCard({
  task, isDragging, onDragStart, onDelete, companies,
}: {
  task: Task; isDragging: boolean;
  onDragStart: () => void; onDelete: () => void; companies: Company[];
}) {
  const company = task.holding_companies ?? companies.find(c => c.id === task.company_id) ?? null;
  const date = new Date(task.created_at).toLocaleDateString("he-IL", { day: "numeric", month: "short" });

  return (
    <div
      draggable onDragStart={onDragStart}
      className={`group relative p-3 border bg-white cursor-grab active:cursor-grabbing transition-all duration-150 select-none shadow-sm
        ${isDragging ? "opacity-40 scale-[0.97] shadow-none" : "border-[#D1CFCA] hover:border-[#8D775F]/40 hover:shadow-md"}`}
    >
      {company && (
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-[0.72rem]">{company.icon}</span>
          <span className="text-[0.6rem] font-bold tracking-wide truncate" style={{ color: company.color }}>
            {company.name}
          </span>
        </div>
      )}
      <p className="text-[0.8rem] text-[#2D2926] leading-snug break-words pe-5">{task.title}</p>
      {task.notes && (
        <p className="text-[0.65rem] text-[#2D2926]/40 mt-1.5 line-clamp-2 leading-snug">{task.notes}</p>
      )}
      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-[#E8E7E3]">
        <span className={`text-[0.58rem] font-bold px-1.5 py-0.5 border
          ${task.author === "Hanan" ? "border-amber-500/30 text-amber-700" : "border-blue-500/30 text-blue-700"}`}>
          {task.author === "Hanan" ? "ח" : "מ"}
        </span>
        <span className="text-[0.58rem] text-[#2D2926]/30">{date}</span>
      </div>
      <button
        onClick={e => { e.stopPropagation(); onDelete(); }}
        className="absolute top-2 end-2 opacity-0 group-hover:opacity-100 transition-opacity text-[#2D2926]/20 hover:text-red-500"
      >
        <Trash2 size={11} />
      </button>
    </div>
  );
}

// ── Quick Add ─────────────────────────────────────────────────────────────────
function QuickAdd({ colKey, companies, onAdd, onClose }: {
  colKey: ColKey; companies: Company[];
  onAdd: (title: string, notes: string, companyId: string) => Promise<string | null>;
  onClose: () => void;
}) {
  const [title,     setTitle]     = useState("");
  const [notes,     setNotes]     = useState("");
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [saving,    setSaving]    = useState(false);
  const [addErr,    setAddErr]    = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const submit = async () => {
    if (!title.trim() || saving) return;
    setSaving(true); setAddErr(null);
    const err = await onAdd(title.trim(), notes, companyId);
    setSaving(false);
    if (err) setAddErr(err);
  };

  return (
    <div className="p-3 border border-[#8D775F]/30 bg-[#FDFCFA] space-y-2 mt-2 shadow-sm">
      <input
        ref={inputRef} value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") onClose(); }}
        placeholder="כותרת המשימה..."
        data-voice-input
        className="w-full bg-white border border-[#D1CFCA] text-[#2D2926] text-[0.78rem] px-2.5 py-2 focus:outline-none focus:border-[#8D775F] placeholder:text-[#2D2926]/25"
      />
      {addErr && (
        <p className="flex items-center gap-1.5 text-[0.65rem] text-red-600 border border-red-200 bg-red-50 px-2.5 py-1.5">
          <AlertCircle size={11} /> {addErr}
        </p>
      )}
      <textarea
        value={notes} onChange={e => setNotes(e.target.value)}
        placeholder="הערות (אופציונלי)" rows={2}
        className="w-full bg-white border border-[#D1CFCA] text-[#2D2926]/80 text-[0.72rem] px-2.5 py-1.5 focus:outline-none focus:border-[#8D775F] placeholder:text-[#2D2926]/20 resize-none"
      />
      <select
        value={companyId} onChange={e => setCompanyId(e.target.value)}
        className="w-full bg-white border border-[#D1CFCA] text-[#2D2926]/70 text-[0.72rem] px-2.5 py-1.5 focus:outline-none"
      >
        {companies.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
      </select>
      <div className="flex gap-2">
        <button onClick={submit} disabled={!title.trim() || saving}
          className="flex-1 py-1.5 bg-[#8D775F] text-white text-[0.72rem] font-bold tracking-wide disabled:opacity-40 hover:bg-[#7A6451] transition-colors">
          {saving ? <Loader2 size={12} className="animate-spin mx-auto" /> : `הוסף ל-${COLUMNS.find(c=>c.key===colKey)?.label}`}
        </button>
        <button onClick={onClose} className="px-3 py-1.5 border border-[#D1CFCA] text-[#2D2926]/40 hover:text-[#2D2926] transition-colors">
          <X size={13} />
        </button>
      </div>
    </div>
  );
}

// ── Main Cockpit ──────────────────────────────────────────────────────────────
export default function Cockpit() {
  const [authed,   setAuthed]   = useState(false);
  const [checking, setChecking] = useState(true);
  const [author,   setAuthor]   = useState<Author | null>(null);

  const [companies,      setCompanies]      = useState<Company[]>([]);
  const [tasks,          setTasks]          = useState<Task[]>([]);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [filterCompany,  setFilterCompany]  = useState<string | null>(null);
  const [dragTaskId,     setDragTaskId]     = useState<string | null>(null);
  const [dragOverCol,    setDragOverCol]    = useState<ColKey | null>(null);
  const [addingTo,       setAddingTo]       = useState<ColKey | null>(null);
  const [showSidebar,    setShowSidebar]    = useState(false);
  const [listening,      setListening]      = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognizerRef = useRef<any>(null);

  useEffect(() => {
    fetch("/api/executive/auth")
      .then(async r => { if (r.ok) { const d = await r.json(); setAuthed(true); setAuthor(d.author); } })
      .catch(() => {}).finally(() => setChecking(false));
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [cRes, tRes] = await Promise.all([
        fetch("/api/holding/companies"),
        fetch("/api/holding/tasks"),
      ]);
      if (cRes.ok) { const { companies: co } = await cRes.json(); setCompanies(co.length > 0 ? co : DEFAULT_COMPANIES); }
      else setCompanies(DEFAULT_COMPANIES);
      if (tRes.ok) { const { tasks: t } = await tRes.json(); setTasks(t ?? []); }
      else { const d = await tRes.json().catch(() => ({})); setError(d.error ?? `שגיאה (${tRes.status})`); }
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (authed) loadData(); }, [authed, loadData]);

  const handleDrop = useCallback(async (colKey: ColKey) => {
    if (!dragTaskId) return;
    const task = tasks.find(t => t.id === dragTaskId);
    if (!task || task.status === colKey) { setDragTaskId(null); setDragOverCol(null); return; }
    setTasks(prev => prev.map(t => t.id === dragTaskId ? { ...t, status: colKey } : t));
    setDragTaskId(null); setDragOverCol(null);
    const res = await fetch(`/api/holding/tasks/${dragTaskId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: colKey }),
    });
    if (!res.ok) setTasks(prev => prev.map(t => t.id === dragTaskId ? { ...t, status: task.status } : t));
  }, [dragTaskId, tasks]);

  const addTask = useCallback(async (colKey: ColKey, title: string, notes: string, companyId: string): Promise<string | null> => {
    try {
      const res = await fetch("/api/holding/tasks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, notes: notes || undefined, status: colKey, company_id: companyId || undefined }),
      });
      if (res.ok) {
        const { task } = await res.json();
        setTasks(prev => [task, ...prev]);
        setAddingTo(null);
        return null;
      }
      const d = await res.json().catch(() => ({}));
      return d.error ?? `שגיאה ${res.status} — האם יצרת את טבלת holding_tasks בסופאבייס?`;
    } catch (e) {
      return `שגיאת רשת: ${String(e)}`;
    }
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    await fetch(`/api/holding/tasks/${id}`, { method: "DELETE" });
  }, []);

  const startVoice = useCallback(() => {
    if (typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) { alert("הדפדפן לא תומך בזיהוי קול"); return; }
    const r = new SR();
    r.lang = "he-IL"; r.interimResults = false; r.maxAlternatives = 1;
    r.onresult = (e: { results: { [k: number]: { [k: number]: { transcript: string } } } }) => {
      const text = e.results[0][0].transcript.trim();
      if (text) {
        setAddingTo("backlog");
        setTimeout(() => {
          const input = document.querySelector<HTMLInputElement>("[data-voice-input]");
          if (input) { input.value = text; input.dispatchEvent(new Event("input", { bubbles: true })); }
        }, 150);
      }
      setListening(false);
    };
    r.onerror = () => setListening(false);
    r.onend   = () => setListening(false);
    recognizerRef.current = r; r.start(); setListening(true);
  }, []);

  const stopVoice = useCallback(() => { recognizerRef.current?.stop(); setListening(false); }, []);
  const logout    = async () => { await fetch("/api/executive/auth", { method: "DELETE" }); setAuthed(false); setAuthor(null); };

  const visibleTasks = filterCompany
    ? tasks.filter(t => t.company_id === filterCompany || t.holding_companies?.id === filterCompany)
    : tasks;
  const urgentAll = tasks.filter(t => t.status === "urgent");
  const colTasks  = (key: ColKey) => visibleTasks.filter(t => t.status === key);

  if (checking) return (
    <div className="min-h-screen bg-[#F3F2EE] flex items-center justify-center">
      <Loader2 size={20} className="animate-spin text-[#8D775F]/40" />
    </div>
  );
  if (!authed) return <PinGate onAuth={a => { setAuthed(true); setAuthor(a); }} />;

  return (
    <div className="min-h-screen bg-[#F3F2EE] text-[#2D2926] flex flex-col" dir="rtl">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="shrink-0 border-b border-[#D1CFCA] bg-white px-4 py-3 z-30 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-2.5 shrink-0">
            <Image src="/logo.png" alt="" width={80} height={22} className="opacity-80" />
            <div>
              <p className="text-[0.5rem] font-bold tracking-[0.25em] uppercase text-[#2D2926]/30">החזקות</p>
              <p className="text-[0.75rem] font-bold text-[#2D2926]/80 leading-none">לוח שליטה</p>
            </div>
          </div>
          <div className="flex-1" />

          {/* Voice */}
          <button onClick={listening ? stopVoice : startVoice}
            className={`flex items-center gap-1.5 px-3 py-1.5 border text-[0.68rem] font-bold tracking-wide transition-colors
              ${listening
                ? "border-red-400 text-red-500 bg-red-50 animate-pulse"
                : "border-[#D1CFCA] text-[#2D2926]/50 hover:text-[#2D2926] hover:border-[#8D775F]/40"}`}>
            {listening ? <><MicOff size={12}/> עצור הקלטה</> : <><Mic size={12}/> הכתבה</>}
          </button>

          {/* Urgent toggle */}
          <button onClick={() => setShowSidebar(s => !s)}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 border text-[0.68rem] font-bold tracking-wide transition-colors
              ${showSidebar
                ? "border-red-400 text-red-500 bg-red-50"
                : "border-[#D1CFCA] text-[#2D2926]/50 hover:text-[#2D2926]"}`}>
            <Zap size={12} />
            דחוף
            {urgentAll.length > 0 && (
              <span className="absolute -top-1.5 -start-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[0.55rem] font-bold flex items-center justify-center">
                {urgentAll.length}
              </span>
            )}
          </button>

          {/* Author + logout */}
          <div className="flex items-center gap-2">
            <span className={`text-[0.65rem] font-bold px-2 py-1 border
              ${author === "Hanan" ? "border-amber-500/40 text-amber-700 bg-amber-50" : "border-blue-500/40 text-blue-700 bg-blue-50"}`}>
              {author === "Hanan" ? "חנן" : "מוטי"}
            </span>
            <button onClick={logout} className="text-[#2D2926]/25 hover:text-[#2D2926]/70 transition-colors">
              <LogOut size={14} />
            </button>
          </div>
        </div>

        {/* Company chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <button onClick={() => setFilterCompany(null)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 border text-[0.68rem] font-bold tracking-wide transition-colors
              ${!filterCompany
                ? "border-[#8D775F] text-[#8D775F] bg-[#8D775F]/[0.06]"
                : "border-[#D1CFCA] text-[#2D2926]/40 hover:text-[#2D2926] hover:border-[#2D2926]/25"}`}>
            <SlidersHorizontal size={11} /> הכל
          </button>

          {companies.map(c => (
            <div key={c.id} className="shrink-0 flex items-center gap-1">
              <button
                onClick={() => setFilterCompany(filterCompany === c.id ? null : c.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 border text-[0.68rem] font-bold tracking-wide transition-colors"
                style={filterCompany === c.id
                  ? { borderColor: c.color, color: c.color, backgroundColor: c.color + "10" }
                  : { borderColor: "#D1CFCA", color: "#2D2926", opacity: 0.55 }}>
                <span className="text-[0.8rem]">{c.icon}</span> {c.name}
              </button>
              {c.drive_url && (
                <a href={c.drive_url} target="_blank" rel="noopener noreferrer"
                  className="p-1.5 text-[#2D2926]/20 hover:text-[#8D775F] transition-colors" title={`Drive — ${c.name}`}>
                  <FolderOpen size={11} />
                </a>
              )}
            </div>
          ))}
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Kanban */}
        <main className="flex-1 overflow-x-auto overflow-y-hidden">
          {error && (
            <div className="m-4 flex items-center gap-2 text-red-600 text-xs border border-red-200 bg-red-50 px-4 py-2.5">
              <AlertCircle size={13} /> {error}
            </div>
          )}
          <div className="flex gap-3 h-full p-4 min-w-[900px]">
            {COLUMNS.map(col => {
              const colItems    = colTasks(col.key);
              const isDragTarget = dragOverCol === col.key;
              return (
                <div key={col.key}
                  className="flex flex-col w-[220px] shrink-0 transition-all duration-150"
                  style={{ background: isDragTarget ? col.lightBg : "transparent", outline: isDragTarget ? `2px solid ${col.accent}30` : undefined }}
                  onDragOver={e => { e.preventDefault(); setDragOverCol(col.key); }}
                  onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverCol(null); }}
                  onDrop={() => handleDrop(col.key)}
                >
                  {/* Column header */}
                  <div className="flex items-center justify-between px-3 py-2.5 mb-2 border-b-2"
                    style={{ borderColor: col.accent + "40" }}>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: col.accent }} />
                      <span className="text-[0.72rem] font-bold tracking-wide text-[#2D2926]/80">{col.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[0.6rem] text-[#2D2926]/30 font-mono tabular-nums">{colItems.length}</span>
                      <button onClick={() => setAddingTo(addingTo === col.key ? null : col.key)}
                        className="text-[#2D2926]/25 hover:text-[#2D2926]/70 transition-colors">
                        {addingTo === col.key ? <X size={13} /> : <Plus size={13} />}
                      </button>
                    </div>
                  </div>

                  {addingTo === col.key && (
                    <QuickAdd colKey={col.key} companies={companies}
                      onAdd={(title, notes, cid) => addTask(col.key, title, notes, cid)}
                      onClose={() => setAddingTo(null)} />

                  )}

                  <div className="flex-1 overflow-y-auto space-y-2 px-1 py-1 min-h-[200px]">
                    {loading && colItems.length === 0 && (
                      <div className="flex justify-center pt-8">
                        <Loader2 size={14} className="animate-spin text-[#2D2926]/20" />
                      </div>
                    )}
                    {!loading && colItems.length === 0 && (
                      <div className="flex items-center justify-center pt-10">
                        <p className="text-[0.6rem] text-[#2D2926]/15 border-2 border-dashed border-[#D1CFCA] px-3 py-2">
                          גרור לכאן
                        </p>
                      </div>
                    )}
                    {colItems.map(task => (
                      <TaskCard key={task.id} task={task}
                        isDragging={dragTaskId === task.id}
                        onDragStart={() => setDragTaskId(task.id)}
                        onDelete={() => deleteTask(task.id)}
                        companies={companies} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </main>

        {/* Urgent Sidebar */}
        {showSidebar && (
          <aside className="w-72 shrink-0 border-s border-[#D1CFCA] bg-white overflow-y-auto flex flex-col shadow-lg">
            <div className="sticky top-0 bg-white flex items-center justify-between px-4 py-3 border-b border-[#D1CFCA] z-10">
              <div className="flex items-center gap-2">
                <Zap size={13} className="text-red-500" />
                <p className="text-[0.68rem] font-bold tracking-wide text-red-600">כל הדחוף</p>
                <span className="text-[0.6rem] text-[#2D2926]/30 font-mono">{urgentAll.length}</span>
              </div>
              <button onClick={() => setShowSidebar(false)} className="text-[#2D2926]/25 hover:text-[#2D2926]/70">
                <ChevronRight size={14} />
              </button>
            </div>

            {urgentAll.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-[0.65rem] text-[#2D2926]/25">אין משימות דחופות 🎉</p>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {urgentAll.map(task => {
                  const company = task.holding_companies ?? companies.find(c => c.id === task.company_id) ?? null;
                  return (
                    <div key={task.id} className="p-3 border border-red-200 bg-red-50">
                      {company && (
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="text-[0.65rem]">{company.icon}</span>
                          <span className="text-[0.58rem] font-bold" style={{ color: company.color }}>{company.name}</span>
                        </div>
                      )}
                      <p className="text-[0.75rem] text-[#2D2926] leading-snug">{task.title}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className={`text-[0.58rem] font-bold px-1.5 py-0.5 border
                          ${task.author === "Hanan" ? "border-amber-400/40 text-amber-700" : "border-blue-400/40 text-blue-700"}`}>
                          {task.author === "Hanan" ? "ח" : "מ"}
                        </span>
                        <button onClick={() => deleteTask(task.id)} className="text-[#2D2926]/20 hover:text-red-500 transition-colors">
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

      {/* Mobile bottom bar */}
      <div className="shrink-0 border-t border-[#D1CFCA] bg-white px-4 py-2.5 flex items-center justify-between md:hidden">
        <a href="/admin/hub" className="text-[0.65rem] text-[#2D2926]/30 hover:text-[#2D2926] flex items-center gap-1.5">
          מרכז שליטה
        </a>
        <button onClick={() => setAddingTo("backlog")}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#8D775F] text-white text-[0.72rem] font-bold hover:bg-[#7A6451] transition-colors">
          <Plus size={13} /> משימה חדשה
        </button>
      </div>
    </div>
  );
}
