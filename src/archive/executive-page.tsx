"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import {
  Mic, MicOff, Send, Plus, Check, Trash2, LogOut,
  Star, Calendar, FileText, AlertCircle, Loader2, X,
  ChevronDown, ChevronUp,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
type Author   = "Hanan" | "Moti";
type ItemType = "task" | "feed" | "deadline";
type DeadlineCat = "tax" | "insurance" | "milestone" | "general";

interface ExecItem {
  id: string;
  type: ItemType;
  author?: string;
  content: string;
  done: boolean;
  priority: number;
  due_date?: string;
  category?: DeadlineCat;
  created_at: string;
  updated_at?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const IL_TIME = (iso: string) =>
  new Date(iso).toLocaleString("he-IL", {
    timeZone: "Asia/Jerusalem",
    day: "2-digit", month: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });

const IL_DATE = (d: string) =>
  new Date(d + "T12:00:00Z").toLocaleDateString("he-IL", {
    day: "numeric", month: "short",
  });

const CAT_ICON:  Record<string, string> = { tax: "💰", insurance: "🛡️", milestone: "🏗️", general: "📌" };
const CAT_LABEL: Record<string, string> = { tax: "מס", insurance: "ביטוח", milestone: "אבן דרך", general: "כללי" };
const CAT_COLOR: Record<string, string> = {
  tax: "text-red-400", insurance: "text-blue-400",
  milestone: "text-emerald-400", general: "text-amber-400",
};

function isOverdue(due_date: string) {
  return due_date < new Date().toISOString().slice(0, 10);
}

// ── PIN Gate ──────────────────────────────────────────────────────────────────
function PinGate({ onAuth }: { onAuth: (author: Author) => void }) {
  const [pin,     setPin]     = useState("");
  const [error,   setError]   = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (pin.length < 3 || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/executive/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (res.ok) {
        const data = await res.json();
        onAuth(data.author as Author);
      } else {
        setError(true);
        setPin("");
      }
    } finally {
      setLoading(false);
    }
  };

  const KEYS = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

  return (
    <div className="min-h-screen bg-[#141210] flex flex-col items-center justify-center p-8"
      dir="rtl" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <Image src="/logo.png" alt="בניין איתן" width={110} height={32}
        className="mb-6 opacity-70 brightness-0 invert" />
      <p className="text-amber-400/50 text-[0.55rem] font-bold tracking-[0.3em] uppercase mb-1">
        חדר המצב
      </p>
      <h1 className="text-[#F3F2EE]/80 text-lg font-heading mb-8 tracking-wide">כניסה פרטית</h1>

      <div className="flex gap-2.5 mb-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`w-2 h-2 rounded-full border border-amber-400/30 transition-all duration-150 ${
            i < pin.length ? "bg-amber-400 scale-125" : "bg-transparent"
          }`} />
        ))}
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-1.5 text-red-400 text-xs">
          <AlertCircle size={13} /> קוד שגוי
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 w-60" dir="ltr">
        {KEYS.map((d, i) => (
          <button key={i}
            onClick={() => {
              if (d === "⌫") { setPin(p => p.slice(0, -1)); setError(false); }
              else if (d && pin.length < 6) { setPin(p => p + d); setError(false); }
            }}
            className={`h-14 border transition-all duration-100 active:scale-95 font-heading text-base
              ${!d ? "pointer-events-none border-transparent"
                : "border-amber-400/12 text-[#F3F2EE]/80 hover:bg-amber-400/8 hover:border-amber-400/25"}`}>
            {d}
          </button>
        ))}
      </div>

      <button onClick={handleSubmit} disabled={pin.length < 3 || loading}
        className="mt-5 w-60 h-12 bg-amber-400 text-[#141210] font-heading font-bold tracking-[0.18em] uppercase text-sm disabled:opacity-25 hover:bg-amber-300 transition-colors active:scale-[0.98]">
        {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : "כניסה"}
      </button>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function ExecutiveWarRoom() {
  const [authed,   setAuthed]   = useState(false);
  const [checking, setChecking] = useState(true);
  const [author,   setAuthor]   = useState<Author | null>(null);

  const [tasks,     setTasks]     = useState<ExecItem[]>([]);
  const [feed,      setFeed]      = useState<ExecItem[]>([]);
  const [deadlines, setDeadlines] = useState<ExecItem[]>([]);
  const [canvas,    setCanvas]    = useState("");
  const [canvasSaved, setCanvasSaved] = useState(true);

  const [feedInput,   setFeedInput]   = useState("");
  const [listening,   setListening]   = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [newTask,     setNewTask]     = useState("");
  const [addTask,     setAddTask]     = useState(false);
  const [newDl,       setNewDl]       = useState({ content: "", due_date: "", category: "general" as DeadlineCat });
  const [addDl,       setAddDl]       = useState(false);
  const [feedError,   setFeedError]   = useState<string | null>(null);
  const [loadError,   setLoadError]   = useState<string | null>(null);
  const [showDoneTasks, setShowDoneTasks] = useState(false);
  const [showDoneDl,    setShowDoneDl]    = useState(false);

  const canvasTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognizerRef = useRef<any>(null);

  // ── Check auth on mount ───────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/executive/auth")
      .then(async r => {
        if (r.ok) {
          const d = await r.json();
          setAuthed(true);
          setAuthor(d.author as Author);
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  // ── Load all data ─────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoadError(null);
    try {
      const [itemsRes, canvasRes] = await Promise.all([
        fetch("/api/executive/items"),
        fetch("/api/executive/canvas"),
      ]);

      if (!itemsRes.ok) {
        const err = await itemsRes.json().catch(() => ({}));
        setLoadError(err.error ?? `שגיאה בטעינה (${itemsRes.status})`);
        return;
      }

      const { items } = await itemsRes.json();
      const all: ExecItem[] = items ?? [];
      setTasks(all.filter(i => i.type === "task").sort((a, b) => a.priority - b.priority));
      setFeed(all.filter(i => i.type === "feed").sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
      setDeadlines(all.filter(i => i.type === "deadline").sort((a, b) =>
        (a.due_date ?? "").localeCompare(b.due_date ?? "")
      ));

      if (canvasRes.ok) {
        const cv = await canvasRes.json();
        setCanvas(cv.content ?? "");
      }
    } catch (e) {
      setLoadError(`בעיית תקשורת: ${String(e)}`);
    }
  }, []);

  // ── Initial load + 5-second feed poll ────────────────────────────────────
  useEffect(() => {
    if (!authed) return;
    loadAll();
    const iv = setInterval(async () => {
      const r = await fetch("/api/executive/items?type=feed").catch(() => null);
      if (!r?.ok) return;
      const { items } = await r.json();
      setFeed((items ?? []).sort((a: ExecItem, b: ExecItem) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
    }, 5000);
    return () => clearInterval(iv);
  }, [authed, loadAll]);

  // ── Canvas auto-save ──────────────────────────────────────────────────────
  const handleCanvas = (val: string) => {
    setCanvas(val);
    setCanvasSaved(false);
    if (canvasTimer.current) clearTimeout(canvasTimer.current);
    canvasTimer.current = setTimeout(async () => {
      await fetch("/api/executive/canvas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: val }),
      });
      setCanvasSaved(true);
    }, 1500);
  };

  // ── Feed post ─────────────────────────────────────────────────────────────
  const postFeed = async () => {
    if (!feedInput.trim() || !author || submitting) return;
    setSubmitting(true);
    setFeedError(null);
    try {
      const res = await fetch("/api/executive/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "feed", author, content: feedInput.trim() }),
      });
      if (res.ok) { setFeedInput(""); await loadAll(); }
      else {
        const d = await res.json().catch(() => ({}));
        setFeedError(d.error ?? `שגיאה ${res.status}`);
      }
    } catch { setFeedError("בעיית תקשורת"); }
    finally { setSubmitting(false); }
  };

  // ── Tasks ─────────────────────────────────────────────────────────────────
  const submitTask = async () => {
    if (!newTask.trim()) return;
    const res = await fetch("/api/executive/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "task", content: newTask.trim(), priority: tasks.length + 1 }),
    });
    if (res.ok) { setNewTask(""); setAddTask(false); await loadAll(); }
    else { const d = await res.json().catch(() => ({})); setLoadError(d.error ?? "שגיאה בשמירה"); }
  };

  const toggleTask = async (id: string, done: boolean) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !done } : t));
    await fetch(`/api/executive/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !done }),
    });
  };

  // ── Deadlines ─────────────────────────────────────────────────────────────
  const submitDeadline = async () => {
    if (!newDl.content.trim() || !newDl.due_date) return;
    const res = await fetch("/api/executive/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "deadline", ...newDl }),
    });
    if (res.ok) { setNewDl({ content: "", due_date: "", category: "general" }); setAddDl(false); await loadAll(); }
    else { const d = await res.json().catch(() => ({})); setLoadError(d.error ?? "שגיאה בשמירה"); }
  };

  const toggleDeadline = async (id: string, done: boolean) => {
    setDeadlines(prev => prev.map(d => d.id === id ? { ...d, done: !done } : d));
    await fetch(`/api/executive/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !done }),
    });
  };

  const deleteItem = async (id: string, type: ItemType) => {
    await fetch(`/api/executive/items/${id}`, { method: "DELETE" });
    if (type === "task")     setTasks(prev => prev.filter(t => t.id !== id));
    if (type === "feed")     setFeed(prev => prev.filter(f => f.id !== id));
    if (type === "deadline") setDeadlines(prev => prev.filter(d => d.id !== id));
  };

  // ── Voice ─────────────────────────────────────────────────────────────────
  const startListening = () => {
    interface SR { lang: string; continuous: boolean; onresult: ((e: { results: { [0]: { [0]: { transcript: string } } } }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null; start: () => void; stop: () => void; }
    interface SRCtor { new(): SR }
    const SRClass = (window as unknown as Record<string, SRCtor>).SpeechRecognition
                 ?? (window as unknown as Record<string, SRCtor>).webkitSpeechRecognition;
    if (!SRClass) return;
    const r = new SRClass();
    r.lang = "he-IL";
    r.continuous = false;
    r.onresult = e => setFeedInput(prev => (prev + " " + e.results[0][0].transcript).trim());
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    r.start();
    recognizerRef.current = r;
    setListening(true);
  };

  const logout = async () => {
    await fetch("/api/executive/auth", { method: "DELETE" });
    setAuthed(false); setAuthor(null);
  };

  // ── Render states ─────────────────────────────────────────────────────────
  if (checking) return (
    <div className="min-h-screen bg-[#141210] flex items-center justify-center">
      <Loader2 className="text-amber-400 animate-spin" size={20} />
    </div>
  );

  if (!authed) return <PinGate onAuth={a => { setAuthed(true); setAuthor(a); }} />;

  // ── Derived data ──────────────────────────────────────────────────────────
  const openTasks = tasks.filter(t => !t.done);
  const doneTasks = tasks.filter(t => t.done);
  const openDl    = deadlines.filter(d => !d.done);
  const doneDl    = deadlines.filter(d => d.done);

  const authorHe  = author === "Hanan" ? "חנן" : "מוטי";

  // ── Dashboard ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#141210] text-[#F3F2EE]" dir="rtl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>

      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#141210]/96 backdrop-blur-md border-b border-amber-400/10 px-4 flex items-center justify-between"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 10px)", paddingBottom: "10px" }}>
        <span className="text-amber-400 font-bold text-[0.6rem] tracking-[0.25em] uppercase">◆ חדר המצב</span>
        <div className="flex items-center gap-3">
          <span className="text-[#F3F2EE]/40 text-xs font-body">{authorHe}</span>
          <button onClick={logout} className="text-[#F3F2EE]/25 hover:text-[#F3F2EE]/60 transition-colors">
            <LogOut size={15} strokeWidth={1.5} />
          </button>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 py-5 space-y-5">

        {/* Error banner */}
        {loadError && (
          <div className="flex items-start gap-3 bg-red-950/60 border border-red-500/40 px-4 py-3">
            <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-red-300 text-xs font-bold mb-0.5">שגיאת מערכת</p>
              <p className="text-red-400/80 text-[0.65rem] font-mono break-all">{loadError}</p>
            </div>
            <button onClick={() => setLoadError(null)} className="text-red-400/40 hover:text-red-300 shrink-0">
              <X size={13} />
            </button>
          </div>
        )}

        {/* ══ פוקוס ══════════════════════════════════════════════════════════ */}
        <section className="bg-[#1E1B18] border border-amber-400/12 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Star size={13} className="text-amber-400 fill-amber-400" />
              <span className="text-[0.6rem] font-bold tracking-[0.22em] uppercase text-amber-400/75">פוקוס</span>
            </div>
            <button onClick={() => setAddTask(v => !v)} className="text-amber-400/40 hover:text-amber-400 transition-colors">
              <Plus size={15} strokeWidth={1.5} />
            </button>
          </div>

          {addTask && (
            <div className="flex gap-2 mb-4">
              <input value={newTask} onChange={e => setNewTask(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") submitTask(); if (e.key === "Escape") setAddTask(false); }}
                placeholder="משימה חדשה..." autoFocus
                className="flex-1 bg-[#141210] border border-amber-400/20 px-3 py-2 text-sm text-[#F3F2EE] placeholder-[#F3F2EE]/18 focus:outline-none focus:border-amber-400/45" />
              <button onClick={submitTask} className="px-3 bg-amber-400 text-[#141210] hover:bg-amber-300">
                <Check size={14} />
              </button>
              <button onClick={() => setAddTask(false)} className="px-2 text-[#F3F2EE]/25 hover:text-[#F3F2EE]/60">
                <X size={14} />
              </button>
            </div>
          )}

          {openTasks.length === 0 && !addTask && (
            <p className="text-[#F3F2EE]/18 text-xs text-center py-3">אין משימות פתוחות</p>
          )}

          <ul className="space-y-2.5">
            {openTasks.map(task => (
              <li key={task.id} className="flex items-start gap-3 group">
                <button onClick={() => toggleTask(task.id, task.done)}
                  className="mt-0.5 w-4 h-4 border shrink-0 flex items-center justify-center transition-colors border-amber-400/30 hover:border-amber-400">
                  {task.done && <Check size={10} strokeWidth={3} className="text-amber-400" />}
                </button>
                <span className="text-sm flex-1 leading-snug text-[#F3F2EE]/85">{task.content}</span>
                <button onClick={() => deleteItem(task.id, "task")}
                  className="opacity-0 group-hover:opacity-100 text-[#F3F2EE]/18 hover:text-red-400 transition-all mt-0.5">
                  <Trash2 size={12} />
                </button>
              </li>
            ))}
          </ul>

          {/* Done tasks — collapsible */}
          {doneTasks.length > 0 && (
            <div className="mt-4 pt-3 border-t border-amber-400/8">
              <button onClick={() => setShowDoneTasks(v => !v)}
                className="flex items-center gap-2 text-[#F3F2EE]/25 hover:text-[#F3F2EE]/50 transition-colors text-xs w-full">
                {showDoneTasks ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                הושלמו ({doneTasks.length})
              </button>
              {showDoneTasks && (
                <ul className="mt-2 space-y-2">
                  {doneTasks.map(task => (
                    <li key={task.id} className="flex items-start gap-3 group">
                      <button onClick={() => toggleTask(task.id, task.done)}
                        className="mt-0.5 w-4 h-4 border shrink-0 flex items-center justify-center bg-amber-400/30 border-amber-400/30">
                        <Check size={10} strokeWidth={3} className="text-amber-400/60" />
                      </button>
                      <span className="text-sm flex-1 leading-snug text-[#F3F2EE]/22 line-through">{task.content}</span>
                      <button onClick={() => deleteItem(task.id, "task")}
                        className="opacity-0 group-hover:opacity-100 text-[#F3F2EE]/18 hover:text-red-400 transition-all mt-0.5">
                        <Trash2 size={12} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        {/* ══ עדכונים ════════════════════════════════════════════════════════ */}
        <section className="bg-[#1E1B18] border border-amber-400/12 p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-[0.6rem] font-bold tracking-[0.22em] uppercase text-amber-400/75">עדכונים שוטפים</span>
          </div>

          <div className="flex gap-2 mb-4">
            <textarea value={feedInput} onChange={e => setFeedInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); postFeed(); } }}
              placeholder={`כתוב עדכון…`}
              rows={2}
              className="flex-1 bg-[#141210] border border-amber-400/18 px-3 py-2 text-sm text-[#F3F2EE] placeholder-[#F3F2EE]/18 focus:outline-none focus:border-amber-400/40 resize-none" />
            <div className="flex flex-col gap-1.5">
              <button onClick={listening ? () => { recognizerRef.current?.stop(); setListening(false); } : startListening}
                className={`p-2.5 border transition-colors ${listening
                  ? "bg-red-500/15 border-red-500/40 text-red-400"
                  : "border-amber-400/18 text-amber-400/45 hover:border-amber-400/40 hover:text-amber-400"}`}>
                {listening ? <MicOff size={15} /> : <Mic size={15} />}
              </button>
              <button onClick={postFeed} disabled={!feedInput.trim() || submitting}
                className="p-2.5 bg-amber-400 text-[#141210] hover:bg-amber-300 disabled:opacity-25 transition-colors">
                {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              </button>
            </div>
          </div>

          {feedError && (
            <div className="flex items-center gap-2 mb-3 bg-red-950/50 border border-red-500/30 px-3 py-2">
              <AlertCircle size={13} className="text-red-400 shrink-0" />
              <p className="text-red-400/90 text-xs font-mono flex-1">{feedError}</p>
              <button onClick={() => setFeedError(null)} className="text-red-400/40 hover:text-red-300"><X size={12} /></button>
            </div>
          )}

          <div className="space-y-3.5 max-h-80 overflow-y-auto overscroll-contain">
            {feed.length === 0 && (
              <p className="text-[#F3F2EE]/18 text-xs text-center py-3">אין עדכונים עדיין</p>
            )}
            {feed.map(item => {
              const isMine = item.author === author;
              return (
                <div key={item.id}
                  className={`group flex flex-col pb-3 border-b border-white/[0.04] last:border-0 ${isMine ? "items-end" : "items-start"}`}>
                  <div className={`flex items-baseline gap-2 mb-1 ${isMine ? "flex-row-reverse" : ""}`}>
                    <span className="text-[0.58rem] font-bold tracking-wider text-amber-400/65 uppercase">
                      {item.author === "Hanan" ? "חנן" : "מוטי"}
                    </span>
                    <span className="text-[0.55rem] text-[#F3F2EE]/22 font-mono">{IL_TIME(item.created_at)}</span>
                    <button onClick={() => deleteItem(item.id, "feed")}
                      className="opacity-0 group-hover:opacity-100 text-[#F3F2EE]/18 hover:text-red-400 transition-all">
                      <Trash2 size={11} />
                    </button>
                  </div>
                  <p className={`text-sm leading-relaxed max-w-[85%] px-3 py-2 ${
                    isMine
                      ? "bg-amber-400/10 text-[#F3F2EE]/85 rounded-br-none"
                      : "bg-white/[0.05] text-[#F3F2EE]/75 rounded-bl-none"
                  }`}>
                    {item.content}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ══ לוח שיתוף ═════════════════════════════════════════════════════ */}
        <section className="bg-[#1E1B18] border border-amber-400/12 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText size={13} className="text-amber-400" strokeWidth={1.5} />
              <span className="text-[0.6rem] font-bold tracking-[0.22em] uppercase text-amber-400/75">לוח שיתוף</span>
            </div>
            <span className={`text-[0.52rem] font-mono tracking-wider transition-colors ${
              canvasSaved ? "text-emerald-400/45" : "text-amber-400/45"
            }`}>
              {canvasSaved ? "✓ שמור" : "שומר…"}
            </span>
          </div>
          <textarea value={canvas} onChange={e => handleCanvas(e.target.value)}
            placeholder="הערות, קישורים, מספרים — משותף לשניכם, נשמר אוטומטית…"
            rows={9}
            className="w-full bg-[#141210] border border-amber-400/10 px-3 py-3 text-sm text-[#F3F2EE]/80 placeholder-[#F3F2EE]/14 focus:outline-none focus:border-amber-400/28 resize-none font-body leading-relaxed" />
        </section>

        {/* ══ מועדים ════════════════════════════════════════════════════════ */}
        <section className="bg-[#1E1B18] border border-amber-400/12 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar size={13} className="text-amber-400" strokeWidth={1.5} />
              <span className="text-[0.6rem] font-bold tracking-[0.22em] uppercase text-amber-400/75">מועדים</span>
            </div>
            <button onClick={() => setAddDl(v => !v)} className="text-amber-400/40 hover:text-amber-400 transition-colors">
              <Plus size={15} strokeWidth={1.5} />
            </button>
          </div>

          {addDl && (
            <div className="mb-4 p-3 bg-[#141210] border border-amber-400/12 space-y-2">
              <input value={newDl.content} onChange={e => setNewDl(p => ({ ...p, content: e.target.value }))}
                placeholder="תיאור המועד…" autoFocus
                className="w-full bg-transparent border-b border-amber-400/20 py-1.5 text-sm text-[#F3F2EE] placeholder-[#F3F2EE]/22 focus:outline-none focus:border-amber-400/50" />
              <div className="flex gap-2">
                <input type="date" value={newDl.due_date} onChange={e => setNewDl(p => ({ ...p, due_date: e.target.value }))}
                  className="flex-1 bg-[#141210] border border-amber-400/18 px-2 py-1.5 text-xs text-[#F3F2EE]/80 focus:outline-none" />
                <select value={newDl.category} onChange={e => setNewDl(p => ({ ...p, category: e.target.value as DeadlineCat }))}
                  className="bg-[#141210] border border-amber-400/18 px-2 py-1.5 text-xs text-[#F3F2EE]/80 focus:outline-none">
                  {Object.entries(CAT_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{CAT_ICON[k]} {v}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={submitDeadline} className="flex-1 py-2 bg-amber-400 text-[#141210] text-xs font-bold hover:bg-amber-300">הוסף מועד</button>
                <button onClick={() => setAddDl(false)} className="px-3 text-[#F3F2EE]/28 text-xs hover:text-[#F3F2EE]/60">ביטול</button>
              </div>
            </div>
          )}

          {openDl.length === 0 && !addDl && doneDl.length === 0 && (
            <p className="text-[#F3F2EE]/18 text-xs text-center py-3">אין מועדים</p>
          )}

          <ul className="space-y-2.5">
            {openDl.map(dl => (
              <li key={dl.id} className="flex items-center gap-3 group">
                <button onClick={() => toggleDeadline(dl.id, dl.done)}
                  className="w-4 h-4 border shrink-0 flex items-center justify-center transition-colors border-amber-400/28 hover:border-amber-400">
                  {dl.done && <Check size={10} strokeWidth={3} className="text-[#141210]" />}
                </button>
                <span className={`text-sm shrink-0 ${CAT_COLOR[dl.category ?? "general"]}`}>{CAT_ICON[dl.category ?? "general"]}</span>
                <span className="text-sm flex-1 leading-snug text-[#F3F2EE]/82">{dl.content}</span>
                {dl.due_date && (
                  <span className={`text-[0.58rem] font-mono shrink-0 ${
                    isOverdue(dl.due_date) ? "text-red-400 font-bold" : "text-[#F3F2EE]/28"
                  }`}>{IL_DATE(dl.due_date)}</span>
                )}
                <button onClick={() => deleteItem(dl.id, "deadline")}
                  className="opacity-0 group-hover:opacity-100 text-[#F3F2EE]/18 hover:text-red-400 transition-all">
                  <Trash2 size={12} />
                </button>
              </li>
            ))}
          </ul>

          {/* Done deadlines — collapsible */}
          {doneDl.length > 0 && (
            <div className="mt-4 pt-3 border-t border-amber-400/8">
              <button onClick={() => setShowDoneDl(v => !v)}
                className="flex items-center gap-2 text-[#F3F2EE]/25 hover:text-[#F3F2EE]/50 transition-colors text-xs w-full">
                {showDoneDl ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                טופל ({doneDl.length})
              </button>
              {showDoneDl && (
                <ul className="mt-2 space-y-2">
                  {doneDl.map(dl => (
                    <li key={dl.id} className="flex items-center gap-3 group">
                      <button onClick={() => toggleDeadline(dl.id, dl.done)}
                        className="w-4 h-4 border shrink-0 bg-amber-400/25 border-amber-400/25 flex items-center justify-center">
                        <Check size={10} strokeWidth={3} className="text-amber-400/50" />
                      </button>
                      <span className="text-sm flex-1 text-[#F3F2EE]/22 line-through">{dl.content}</span>
                      {dl.due_date && <span className="text-[0.55rem] text-[#F3F2EE]/18 font-mono">{IL_DATE(dl.due_date)}</span>}
                      <button onClick={() => deleteItem(dl.id, "deadline")}
                        className="opacity-0 group-hover:opacity-100 text-[#F3F2EE]/18 hover:text-red-400 transition-all">
                        <Trash2 size={12} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        <div className="text-center pb-4">
          <p className="text-[#F3F2EE]/10 text-[0.5rem] tracking-[0.2em] uppercase font-body">בניין איתן · חדר המצב</p>
        </div>

      </div>
    </div>
  );
}
