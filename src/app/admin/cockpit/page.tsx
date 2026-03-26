"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import {
  Plus, Trash2, Mic, MicOff, AlertCircle, Loader2,
  Zap, LogOut, X, ChevronLeft,
  FolderOpen, Filter, Pencil, Paperclip, UserCheck, ExternalLink, Upload,
  // Company icons (Lucide names stored in DB)
  Crown, Construction, Utensils, DoorOpen, CloudSun, Box, User,
  Building2, Hammer, HardHat, Wrench, Store, Briefcase, Globe,
  type LucideProps,
} from "lucide-react";

// ── Icon renderer — handles both emoji strings and Lucide icon names ───────────
const LUCIDE_ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  Crown, Construction, Utensils, DoorOpen, CloudSun, Box, User,
  Building2, Hammer, HardHat, Wrench, Store, Briefcase, Globe,
};

function CompanyIcon({ icon, size = 13 }: { icon: string; size?: number }) {
  // If the string contains an emoji character, render as text
  if (/\p{Extended_Pictographic}/u.test(icon)) {
    return <span className="leading-none" style={{ fontSize: size }}>{icon}</span>;
  }
  const Icon = LUCIDE_ICON_MAP[icon];
  if (Icon) return <Icon size={size} />;
  // Unknown string — just show first 2 chars as fallback
  return <span className="leading-none text-xs">{icon.slice(0, 2)}</span>;
}

// ── Types ─────────────────────────────────────────────────────────────────────
type Author  = "Hanan" | "Moti";
type ColKey  = "backlog" | "urgent" | "in_progress" | "pending" | "done";

interface Company {
  id: string; name: string; slug?: string;
  color: string; icon: string; drive_url?: string;
}
interface Task {
  id: string; title: string; notes?: string;
  status: ColKey; priority: number; author: string;
  company_id?: string; created_at: string;
  holding_companies?: Company | null;
  assigned_to?: string;
  attachment_url?: string;
}

// ── Column config ─────────────────────────────────────────────────────────────
const COLUMNS: { key: ColKey; label: string; sub: string; accent: string; pill: string }[] = [
  { key: "backlog",     label: "חדש",          sub: "טרם התחיל",        accent: "#8D775F", pill: "bg-[#8D775F]/10 text-[#8D775F]"   },
  { key: "urgent",      label: "דחוף",         sub: "מיידי",            accent: "#DC2626", pill: "bg-red-50 text-red-600"           },
  { key: "in_progress", label: "בתהליך",       sub: "מתבצע עכשיו",      accent: "#D97706", pill: "bg-amber-50 text-amber-700"       },
  { key: "pending",     label: "ממתין",        sub: "תלוי בצד חיצוני",  accent: "#2563EB", pill: "bg-blue-50 text-blue-700"         },
  { key: "done",        label: "הושלם",        sub: "טופל ונסגר",       accent: "#16A34A", pill: "bg-green-50 text-green-700"       },
];

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
function PinGate({ onAuth }: { onAuth: (a: Author) => void }) {
  const [pin, setPin]         = useState("");
  const [error, setError]     = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (pin.length < 3 || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/executive/auth", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (res.ok) { const d = await res.json(); onAuth(d.author); }
      else { setError(true); setPin(""); }
    } finally { setLoading(false); }
  };

  const KEYS = ["1","2","3","4","5","6","7","8","9","","0","⌫"];
  return (
    <div className="min-h-screen bg-[#F3F2EE] flex flex-col items-center justify-center p-8" dir="rtl">
      <Image src="/logo.png" alt="" width={110} height={30} className="mb-8 opacity-80" />
      <p className="text-[#8D775F]/70 text-[0.58rem] font-bold tracking-[0.28em] uppercase mb-2">לוח ניהול החזקות</p>
      <h1 className="text-[#2D2926]/80 text-xl font-heading mb-10 tracking-wide">כניסה פרטית</h1>
      <div className="flex gap-3 mb-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`w-2.5 h-2.5 rounded-full border-2 transition-all duration-200
            ${i < pin.length ? "bg-[#8D775F] border-[#8D775F] scale-110" : "bg-transparent border-[#D1CFCA]"}`} />
        ))}
      </div>
      {error && (
        <div className="mb-4 flex items-center gap-1.5 text-red-500 text-sm">
          <AlertCircle size={14} /> קוד שגוי, נסה שוב
        </div>
      )}
      <div className="grid grid-cols-3 gap-2.5 w-60" dir="ltr">
        {KEYS.map((d, i) => (
          <button key={i}
            onClick={() => {
              if (d === "⌫") { setPin(p => p.slice(0,-1)); setError(false); }
              else if (d && pin.length < 6) { setPin(p => p + d); setError(false); }
            }}
            className={`h-14 rounded border text-lg font-heading transition-all duration-100 active:scale-95
              ${!d ? "pointer-events-none border-transparent"
                   : "border-[#D1CFCA] bg-white text-[#2D2926]/80 hover:bg-[#E8E7E3] hover:border-[#8D775F]/50 shadow-sm"}`}>
            {d}
          </button>
        ))}
      </div>
      <button onClick={submit} disabled={pin.length < 3 || loading}
        className="mt-6 w-60 h-12 bg-[#8D775F] text-white font-heading font-bold tracking-[0.15em] uppercase text-sm rounded disabled:opacity-30 hover:bg-[#7A6451] transition-colors shadow-md">
        {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : "כניסה"}
      </button>
    </div>
  );
}

// ── Task Card ─────────────────────────────────────────────────────────────────
function TaskCard({ task, isDragging, onDragStart, onDragEnd, onDelete, onEdit, onTouchStart, companies }: {
  task: Task; isDragging: boolean;
  onDragStart: () => void; onDragEnd: () => void; onDelete: () => void; onEdit: () => void;
  onTouchStart?: (e: React.TouchEvent) => void;
  companies: Company[];
}) {
  const company = task.holding_companies ?? companies.find(c => c.id === task.company_id) ?? null;
  const date = new Date(task.created_at).toLocaleDateString("he-IL", { day: "numeric", month: "short" });

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={e => e.preventDefault()}
      onTouchStart={onTouchStart}
      onClick={e => e.stopPropagation()}
      className={`group relative p-3.5 border bg-white cursor-grab active:cursor-grabbing transition-all duration-150 select-none
        ${isDragging
          ? "opacity-30 scale-[0.96] rotate-1 shadow-none border-[#D1CFCA]"
          : "border-[#E8E7E3] hover:border-[#8D775F]/30 shadow-sm hover:shadow-md"}`}
    >
      {company && (
        <div className="flex items-center gap-1.5 mb-2">
          <CompanyIcon icon={company.icon} size={13} />
          <span className="text-[0.6rem] font-bold tracking-wide" style={{ color: company.color }}>
            {company.name}
          </span>
        </div>
      )}
      <p className="text-[0.82rem] text-[#2D2926] leading-snug break-words pe-10 font-medium">{task.title}</p>
      {task.notes && (
        <p className="text-[0.68rem] text-[#2D2926]/40 mt-1.5 line-clamp-2 leading-relaxed">{task.notes}</p>
      )}
      {task.assigned_to && (
        <div className="flex items-center gap-1 mt-1.5">
          <UserCheck size={9} className="text-[#8D775F]/60 shrink-0" />
          <span className="text-[0.62rem] text-[#8D775F]/80 font-medium truncate">{task.assigned_to}</span>
        </div>
      )}
      {task.attachment_url && (
        <a href={task.attachment_url} target="_blank" rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="flex items-center gap-1 mt-1.5 text-[0.62rem] text-blue-500 hover:text-blue-700 transition-colors">
          <Paperclip size={9} className="shrink-0" />
          <span className="truncate">קובץ מצורף</span>
          <ExternalLink size={8} className="shrink-0 opacity-60" />
        </a>
      )}
      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#F3F2EE]">
        <span className={`text-[0.6rem] font-bold px-2 py-0.5 rounded-full
          ${task.author === "Hanan" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
          {task.author === "Hanan" ? "חנן" : "מוטי"}
        </span>
        <span className="text-[0.6rem] text-[#2D2926]/25">{date}</span>
      </div>
      {/* Edit button — always slightly visible for touch devices */}
      <button
        onClick={e => { e.stopPropagation(); onEdit(); }}
        className="absolute top-2.5 end-8 opacity-25 group-hover:opacity-100 transition-opacity p-0.5 rounded text-[#2D2926]/40 hover:text-[#8D775F] hover:bg-[#F3F2EE]"
      >
        <Pencil size={11} />
      </button>
      {/* Delete button — always slightly visible for touch devices */}
      <button
        onClick={e => { e.stopPropagation(); onDelete(); }}
        className="absolute top-2.5 end-2.5 opacity-25 group-hover:opacity-100 transition-opacity p-0.5 rounded text-[#2D2926]/40 hover:text-red-500 hover:bg-red-50"
      >
        <Trash2 size={11} />
      </button>
    </div>
  );
}

// ── Quick Add ─────────────────────────────────────────────────────────────────
function QuickAdd({ colKey, companies, defaultCompanyId, onAdd, onClose }: {
  colKey: ColKey; companies: Company[];
  defaultCompanyId: string;
  onAdd: (title: string, notes: string, companyId: string, assignedTo: string, attachmentUrl: string) => Promise<string | null>;
  onClose: () => void;
}) {
  const [title,         setTitle]         = useState("");
  const [notes,         setNotes]         = useState("");
  const [companyId,     setCompanyId]     = useState(defaultCompanyId);
  const [assignedTo,    setAssignedTo]    = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [uploading,     setUploading]     = useState(false);
  const [uploadErr,     setUploadErr]     = useState<string | null>(null);
  const [saving,        setSaving]        = useState(false);
  const [addErr,        setAddErr]        = useState<string | null>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const fileInputId = useRef(`qa-file-${Math.random().toString(36).slice(2)}`).current;
  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { if (defaultCompanyId) setCompanyId(defaultCompanyId); }, [defaultCompanyId]);

  const requiresCompany = !defaultCompanyId;
  const canSubmit = title.trim() && (!requiresCompany || companyId) && !uploading;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true); setUploadErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/holding/upload", { method: "POST", body: fd });
      if (res.ok) { const { url } = await res.json(); setAttachmentUrl(url); }
      else { const d = await res.json().catch(() => ({})); setUploadErr(d.error ?? `שגיאת העלאה ${res.status}`); }
    } catch (ex) { setUploadErr(String(ex)); }
    finally { setUploading(false); }
  };

  const submit = async () => {
    if (!canSubmit || saving) return;
    setSaving(true); setAddErr(null);
    const err = await onAdd(title.trim(), notes, companyId, assignedTo.trim(), attachmentUrl);
    setSaving(false);
    if (err) setAddErr(err);
  };

  const col = COLUMNS.find(c => c.key === colKey)!;

  return (
    <div className="p-3.5 border-2 bg-white shadow-lg mt-2 space-y-2" style={{ borderColor: col.accent + "40" }}
      onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between">
        <span className="text-[0.65rem] font-bold text-[#2D2926]/50">משימה חדשה · {col.label}</span>
        <button type="button" onClick={onClose} className="text-[#2D2926]/25 hover:text-[#2D2926]/70"><X size={13} /></button>
      </div>
      <input
        ref={inputRef} value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") onClose(); }}
        placeholder="מה צריך לעשות?"
        data-voice-input
        className="w-full bg-[#FAFAF9] border border-[#E8E7E3] text-[#2D2926] text-sm px-3 py-2.5 rounded focus:outline-none focus:border-[#8D775F] placeholder:text-[#2D2926]/25"
      />
      {addErr && (
        <div className="flex items-center gap-1.5 text-[0.65rem] text-red-600 bg-red-50 border border-red-200 px-2.5 py-1.5 rounded">
          <AlertCircle size={11} /> {addErr}
        </div>
      )}
      <textarea
        value={notes} onChange={e => setNotes(e.target.value)}
        placeholder="הערות (אופציונלי)" rows={2}
        className="w-full bg-[#FAFAF9] border border-[#E8E7E3] text-[#2D2926]/80 text-[0.75rem] px-3 py-2 rounded focus:outline-none focus:border-[#8D775F] placeholder:text-[#2D2926]/20 resize-none"
      />
      <input
        value={assignedTo} onChange={e => setAssignedTo(e.target.value)}
        placeholder="מיועד ל (אופציונלי)"
        className="w-full bg-[#FAFAF9] border border-[#E8E7E3] text-[#2D2926]/80 text-[0.75rem] px-3 py-2 rounded focus:outline-none focus:border-[#8D775F] placeholder:text-[#2D2926]/20"
      />
      <select
        value={companyId} onChange={e => setCompanyId(e.target.value)}
        className={`w-full bg-[#FAFAF9] border text-[0.75rem] px-3 py-2 rounded focus:outline-none
          ${requiresCompany && !companyId ? "border-amber-300 text-[#2D2926]/40" : "border-[#E8E7E3] text-[#2D2926]/70"}`}
      >
        {requiresCompany && <option value="">— בחר חברה —</option>}
        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      {requiresCompany && !companyId && (
        <p className="text-[0.6rem] text-amber-600">יש לבחור חברה לפני השמירה</p>
      )}
      {/* File attachment */}
      {attachmentUrl ? (
        <div className="flex items-center justify-between px-2.5 py-1.5 bg-[#F3F2EE] rounded border border-[#E8E7E3]">
          <span className="flex items-center gap-1.5 text-[0.65rem] text-[#2D2926]/60 truncate">
            <Paperclip size={10} /> קובץ מצורף
          </span>
          <button type="button" onClick={() => setAttachmentUrl("")}
            className="text-[0.62rem] text-red-400 hover:text-red-600 font-medium shrink-0">הסר</button>
        </div>
      ) : (
        <label htmlFor={fileInputId}
          className={`w-full flex items-center justify-center gap-1.5 py-1.5 border border-dashed border-[#D1CFCA] rounded text-[0.68rem] text-[#2D2926]/35 hover:border-[#8D775F]/50 hover:text-[#2D2926]/60 transition-colors
            ${uploading ? "opacity-40 cursor-not-allowed pointer-events-none" : "cursor-pointer"}`}>
          {uploading ? <><Loader2 size={11} className="animate-spin" /> מעלה...</> : <><Paperclip size={11} /> צרף קובץ (אופציונלי)</>}
          <input id={fileInputId} type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
            onChange={handleFileChange} disabled={uploading} className="sr-only" />
        </label>
      )}
      {uploadErr && <p className="text-[0.62rem] text-red-500 flex items-center gap-1"><AlertCircle size={10} />{uploadErr}</p>}
      <button type="button" onClick={submit} disabled={!canSubmit || saving}
        className="w-full py-2.5 text-white text-[0.75rem] font-bold tracking-wide disabled:opacity-40 transition-colors rounded"
        style={{ background: col.accent }}>
        {saving ? <Loader2 size={13} className="animate-spin mx-auto" /> : `הוסף ל${col.label}`}
      </button>
    </div>
  );
}

// ── Edit Modal ────────────────────────────────────────────────────────────────
function EditModal({ task, companies, onSave, onClose }: {
  task: Task; companies: Company[];
  onSave: (id: string, title: string, notes: string, companyId: string, assignedTo: string, attachmentUrl: string, newStatus: ColKey) => Promise<string | null>;
  onClose: () => void;
}) {
  const [title,         setTitle]         = useState(task.title);
  const [notes,         setNotes]         = useState(task.notes ?? "");
  const [companyId,     setCompanyId]     = useState(task.company_id ?? "");
  const [assignedTo,    setAssignedTo]    = useState(task.assigned_to ?? "");
  const [attachmentUrl, setAttachmentUrl] = useState(task.attachment_url ?? "");
  const [newStatus,     setNewStatus]     = useState<ColKey>(task.status);
  const [uploading,     setUploading]     = useState(false);
  const [uploadErr,     setUploadErr]     = useState<string | null>(null);
  const [saving,        setSaving]        = useState(false);
  const [err,           setErr]           = useState<string | null>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const fileInputId = useRef(`file-${Math.random().toString(36).slice(2)}`).current;
  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // reset immediately so same file can be re-picked
    setUploading(true); setUploadErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/holding/upload", { method: "POST", body: fd });
      if (res.ok) {
        const { url } = await res.json();
        setAttachmentUrl(url);
      } else {
        const d = await res.json().catch(() => ({}));
        setUploadErr(d.error ?? `שגיאת העלאה ${res.status}`);
      }
    } catch (ex) { setUploadErr(String(ex)); }
    finally { setUploading(false); }
  };

  const submit = async () => {
    if (!title.trim() || saving) return;
    setSaving(true); setErr(null);
    const e = await onSave(task.id, title.trim(), notes, companyId, assignedTo.trim(), attachmentUrl, newStatus);
    setSaving(false);
    if (e) setErr(e); else onClose();
  };

  const isImage = attachmentUrl && /\.(jpe?g|png|gif|webp|svg)(\?|$)/i.test(attachmentUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" dir="rtl"
      onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5 space-y-3 max-h-[90dvh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-[#2D2926]/80">עריכת משימה</p>
          <button onClick={onClose} className="text-[#2D2926]/30 hover:text-[#2D2926]/70"><X size={15} /></button>
        </div>
        <input
          ref={inputRef} value={title} onChange={e => setTitle(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") onClose(); }}
          placeholder="כותרת המשימה"
          className="w-full bg-[#FAFAF9] border border-[#E8E7E3] text-[#2D2926] text-sm px-3 py-2.5 rounded focus:outline-none focus:border-[#8D775F] placeholder:text-[#2D2926]/25"
        />
        <textarea
          value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="הערות (אופציונלי)" rows={3}
          className="w-full bg-[#FAFAF9] border border-[#E8E7E3] text-[#2D2926]/80 text-[0.75rem] px-3 py-2 rounded focus:outline-none focus:border-[#8D775F] placeholder:text-[#2D2926]/20 resize-none"
        />
        <input
          value={assignedTo} onChange={e => setAssignedTo(e.target.value)}
          placeholder="מיועד ל (אופציונלי)"
          className="w-full bg-[#FAFAF9] border border-[#E8E7E3] text-[#2D2926]/80 text-[0.75rem] px-3 py-2 rounded focus:outline-none focus:border-[#8D775F] placeholder:text-[#2D2926]/20"
        />
        <select
          value={companyId} onChange={e => setCompanyId(e.target.value)}
          className="w-full bg-[#FAFAF9] border border-[#E8E7E3] text-[#2D2926]/70 text-[0.75rem] px-3 py-2 rounded focus:outline-none"
        >
          <option value="">— ללא חברה —</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select
          value={newStatus} onChange={e => setNewStatus(e.target.value as ColKey)}
          className="w-full bg-[#FAFAF9] border border-[#E8E7E3] text-[#2D2926]/70 text-[0.75rem] px-3 py-2 rounded focus:outline-none"
        >
          {COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label} — {c.sub}</option>)}
        </select>

        {/* Attachment section */}
        <div className="space-y-2">
          {attachmentUrl ? (
            <div className="border border-[#E8E7E3] rounded-lg overflow-hidden">
              {isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={attachmentUrl} alt="קובץ מצורף" className="w-full max-h-40 object-cover" />
              ) : (
                <a href={attachmentUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2.5 text-[0.75rem] text-blue-600 hover:bg-blue-50 transition-colors">
                  <Paperclip size={13} /> פתח קובץ מצורף <ExternalLink size={11} className="opacity-60" />
                </a>
              )}
              <div className="flex items-center justify-between px-3 py-1.5 bg-[#FAFAF9] border-t border-[#E8E7E3]">
                <span className="text-[0.62rem] text-[#2D2926]/40">קובץ מצורף</span>
                <button type="button" onClick={() => setAttachmentUrl("")}
                  className="text-[0.62rem] text-red-400 hover:text-red-600 font-medium">הסר</button>
              </div>
            </div>
          ) : (
            /* Use <label htmlFor> — works reliably on all browsers/mobile without programmatic .click() */
            <label htmlFor={fileInputId}
              className={`w-full flex items-center justify-center gap-2 py-2 border border-dashed border-[#D1CFCA] rounded-lg text-[0.72rem] text-[#2D2926]/40 hover:border-[#8D775F]/50 hover:text-[#2D2926]/70 transition-colors select-none
                ${uploading ? "opacity-40 cursor-not-allowed pointer-events-none" : "cursor-pointer"}`}>
              {uploading ? <><Loader2 size={12} className="animate-spin" /> מעלה...</> : <><Upload size={12} /> צרף תמונה / קובץ</>}
              {/* sr-only keeps the input in DOM flow so browsers allow the click — never use display:none */}
              <input id={fileInputId} type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                onChange={handleFileChange} disabled={uploading} className="sr-only" />
            </label>
          )}
          {uploadErr && (
            <p className="text-[0.62rem] text-red-500 flex items-center gap-1"><AlertCircle size={10} />{uploadErr}</p>
          )}
        </div>

        {err && (
          <div className="flex items-center gap-1.5 text-[0.65rem] text-red-600 bg-red-50 border border-red-200 px-2.5 py-1.5 rounded">
            <AlertCircle size={11} /> {err}
          </div>
        )}
        <div className="flex gap-2 pt-1">
          <button onClick={onClose}
            className="flex-1 py-2 text-[0.75rem] font-semibold text-[#2D2926]/50 border border-[#E8E7E3] rounded hover:bg-[#F3F2EE] transition-colors">
            ביטול
          </button>
          <button onClick={submit} disabled={!title.trim() || saving || uploading}
            className="flex-1 py-2 text-[0.75rem] font-bold text-white bg-[#8D775F] rounded hover:bg-[#7A6451] disabled:opacity-40 transition-colors">
            {saving ? <Loader2 size={13} className="animate-spin mx-auto" /> : "שמירה"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Cockpit() {
  const [authed,   setAuthed]   = useState(false);
  const [checking, setChecking] = useState(true);
  const [author,   setAuthor]   = useState<Author | null>(null);

  const [companies,     setCompanies]     = useState<Company[]>([]);
  const [tasks,         setTasks]         = useState<Task[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [filterCompany, setFilterCompany] = useState<string | null>(null);
  const [dragTaskId,    setDragTaskId]    = useState<string | null>(null); // visual only
  const dragIdRef = useRef<string | null>(null);                           // authoritative source for handleDrop
  const [dragOverCol,   setDragOverCol]   = useState<ColKey | null>(null);
  const [addingTo,      setAddingTo]      = useState<ColKey | null>(null);
  const [showSidebar,   setShowSidebar]   = useState(false);
  const [listening,     setListening]     = useState(false);
  const [dragError,     setDragError]     = useState<string | null>(null);
  const [editingTask,   setEditingTask]   = useState<Task | null>(null);
  const [mobileCol,     setMobileCol]     = useState<ColKey>("backlog");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognizerRef = useRef<any>(null);

  // Touch drag refs (avoid stale closures via refs, not state)
  const touchGhostRef    = useRef<HTMLDivElement | null>(null);
  const touchDraggingRef = useRef(false);
  const touchTaskIdRef   = useRef<string | null>(null);
  // handleDropRef lets the non-passive useEffect always call the latest handleDrop
  const handleDropRef = useRef<((col: ColKey) => Promise<void>) | null>(null);

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
      else { const d = await tRes.json().catch(() => ({})); setError(d.error ?? "שגיאה בטעינת משימות"); }
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (authed) loadData(); }, [authed, loadData]);

  // onDragEnd fires on the card after every drag (success or cancel).
  // Clears both the ref (authoritative) and the visual state.
  const clearDragState = useCallback(() => {
    dragIdRef.current = null;
    setDragTaskId(null);
    setDragOverCol(null);
  }, []);

  const handleDrop = useCallback(async (colKey: ColKey) => {
    const taskId = dragIdRef.current;
    clearDragState();
    if (!taskId) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === colKey) return;

    const prevStatus = task.status;

    // Deep-copy the array so React always registers the change
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: colKey } : { ...t }));

    try {
      const res = await fetch(`/api/holding/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: colKey }),
      });

      if (!res.ok) {
        // Roll back
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: prevStatus } : { ...t }));
        // Try JSON first, fall back to raw text so we always see something useful
        let errDetail: string;
        try {
          const txt = await res.text();
          try { errDetail = JSON.stringify(JSON.parse(txt), null, 2); }
          catch { errDetail = txt.slice(0, 600); }  // HTML or plain text — truncate
        } catch { errDetail = `HTTP ${res.status} ${res.statusText}`; }
        alert(`שגיאת עדכון (${res.status}):\n\n${errDetail}`);
      }
    } catch (networkErr) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: prevStatus } : { ...t }));
      alert("שגיאת רשת (גרירה ושחרור):\n" + String(networkErr));
    }
  }, [tasks, clearDragState]);

  // Keep handleDropRef in sync so touch listeners (registered once) always call the current version
  useEffect(() => { handleDropRef.current = handleDrop; }, [handleDrop]);

  // Non-passive touch listeners for drag-and-drop on touch devices (tablets)
  useEffect(() => {
    const onTouchMove = (e: TouchEvent) => {
      if (!touchDraggingRef.current) return;
      e.preventDefault(); // prevents page scroll during drag — needs non-passive listener
      const touch = e.touches[0];
      const ghost = touchGhostRef.current;
      if (ghost) {
        ghost.style.left = `${touch.clientX - 80}px`;
        ghost.style.top  = `${touch.clientY - 28}px`;
        // Temporarily hide ghost to detect element underneath it
        ghost.style.visibility = "hidden";
        const el = document.elementFromPoint(touch.clientX, touch.clientY);
        ghost.style.visibility = "";
        let node = el as HTMLElement | null;
        while (node && !node.dataset?.colKey) node = node.parentElement;
        const ck = node?.dataset?.colKey as ColKey | undefined;
        // Update visual highlight (access React state setter directly — ref-safe)
        setDragOverCol(ck ?? null);
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!touchDraggingRef.current) return;
      touchDraggingRef.current = false;
      // Remove ghost
      const ghost = touchGhostRef.current;
      if (ghost) { ghost.remove(); touchGhostRef.current = null; }
      setDragTaskId(null);
      setDragOverCol(null);
      // Find column under lifted finger
      const touch = e.changedTouches[0];
      let node = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null;
      while (node && !node.dataset?.colKey) node = node.parentElement;
      const ck = node?.dataset?.colKey as ColKey | undefined;
      if (ck && touchTaskIdRef.current) {
        dragIdRef.current = touchTaskIdRef.current;
        handleDropRef.current?.(ck);
      } else {
        dragIdRef.current = null;
      }
      touchTaskIdRef.current = null;
    };

    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend",  onTouchEnd);
    return () => {
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend",  onTouchEnd);
    };
  }, []); // empty — uses refs throughout

  const startTouchDrag = useCallback((task: Task, e: React.TouchEvent) => {
    touchDraggingRef.current  = true;
    touchTaskIdRef.current    = task.id;
    dragIdRef.current         = task.id;
    setDragTaskId(task.id);
    const touch = e.touches[0];
    const ghost = document.createElement("div");
    ghost.style.cssText = [
      "position:fixed", "z-index:9999", "pointer-events:none",
      `left:${touch.clientX - 80}px`, `top:${touch.clientY - 28}px`,
      "background:white", "border:1.5px solid #8D775F", "border-radius:8px",
      "padding:6px 12px", "max-width:180px", "font-size:0.75rem",
      "color:#2D2926", "box-shadow:0 8px 24px rgba(0,0,0,0.18)",
      "opacity:0.92", "white-space:nowrap", "overflow:hidden", "text-overflow:ellipsis",
    ].join(";");
    ghost.textContent = task.title;
    document.body.appendChild(ghost);
    touchGhostRef.current = ghost;
  }, []);

  const addTask = useCallback(async (colKey: ColKey, title: string, notes: string, companyId: string, assignedTo: string, attachmentUrl: string): Promise<string | null> => {
    try {
      const res = await fetch("/api/holding/tasks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, notes: notes || undefined, status: colKey,
          company_id:     companyId     || undefined,
          assigned_to:    assignedTo    || undefined,
          attachment_url: attachmentUrl || undefined,
        }),
      });
      if (res.ok) { await loadData(); setAddingTo(null); return null; }
      const d = await res.json().catch(() => ({}));
      return d.error ?? `שגיאה ${res.status} — בדוק שטבלת holding_tasks קיימת בסופאבייס`;
    } catch (e) { return `שגיאת רשת: ${String(e)}`; }
  }, [loadData]);

  const deleteTask = useCallback(async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    await fetch(`/api/holding/tasks/${id}`, { method: "DELETE" });
  }, []);

  const saveEdit = useCallback(async (
    id: string, title: string, notes: string, companyId: string, assignedTo: string, attachmentUrl: string, newStatus: ColKey,
  ): Promise<string | null> => {
    try {
      const res = await fetch(`/api/holding/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, notes: notes || null, company_id: companyId || null,
          assigned_to: assignedTo || null, attachment_url: attachmentUrl || null,
          status: newStatus,
        }),
      });
      if (res.ok) {
        setTasks(prev => prev.map(t => t.id === id
          ? { ...t, title, status: newStatus, notes: notes || undefined, company_id: companyId || undefined,
              assigned_to: assignedTo || undefined, attachment_url: attachmentUrl || undefined }
          : { ...t }
        ));
        return null;
      }
      const txt = await res.text().catch(() => "");
      try { return JSON.parse(txt)?.error ?? `שגיאה ${res.status}`; }
      catch { return txt.slice(0, 200) || `שגיאה ${res.status}`; }
    } catch (e) { return `שגיאת רשת: ${String(e)}`; }
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

  const safeTasks   = tasks.filter(Boolean) as Task[];
  const visibleTasks = filterCompany
    ? safeTasks.filter(t => t.company_id === filterCompany || t.holding_companies?.id === filterCompany)
    : safeTasks;
  const urgentAll = safeTasks.filter(t => t.status === "urgent");
  const colTasks  = (key: ColKey) => visibleTasks.filter(t => t.status === key);

  if (checking) return (
    <div className="min-h-screen bg-[#F3F2EE] flex items-center justify-center">
      <Loader2 size={22} className="animate-spin text-[#8D775F]/40" />
    </div>
  );
  if (!authed) return <PinGate onAuth={a => { setAuthed(true); setAuthor(a); }} />;

  return (
    <div className="min-h-screen bg-[#F3F2EE] text-[#2D2926] flex flex-col" dir="rtl">

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <header className="shrink-0 bg-white border-b border-[#E8E7E3] px-5 py-3.5 z-30">
        <div className="flex items-center gap-4 mb-4">
          <Image src="/logo.png" alt="" width={76} height={21} className="opacity-75 shrink-0" />
          <div className="h-5 w-px bg-[#D1CFCA]" />
          <div>
            <p className="text-[0.52rem] font-bold tracking-[0.22em] uppercase text-[#8D775F]/60">החזקות</p>
            <p className="text-[0.82rem] font-bold text-[#2D2926]/80 leading-none mt-0.5">לוח ניהול</p>
          </div>
          <div className="flex-1" />

          {/* Voice — hidden on mobile */}
          <button onClick={listening ? stopVoice : startVoice}
            className={`hidden md:flex items-center gap-2 px-3.5 py-2 rounded-full border text-[0.7rem] font-semibold transition-colors
              ${listening
                ? "border-red-300 text-red-500 bg-red-50 animate-pulse"
                : "border-[#D1CFCA] text-[#2D2926]/50 hover:border-[#8D775F]/50 hover:text-[#2D2926]"}`}>
            {listening ? <><MicOff size={13}/> עצור</> : <><Mic size={13}/> כתיבה קולית</>}
          </button>
          {/* Voice icon-only on mobile */}
          <button onClick={listening ? stopVoice : startVoice}
            className={`md:hidden p-2 rounded-full border transition-colors
              ${listening
                ? "border-red-300 text-red-500 bg-red-50 animate-pulse"
                : "border-[#D1CFCA] text-[#2D2926]/50"}`}>
            {listening ? <MicOff size={15}/> : <Mic size={15}/>}
          </button>

          {/* Urgent */}
          <button onClick={() => setShowSidebar(s => !s)}
            className={`relative flex items-center gap-2 px-3.5 py-2 rounded-full border text-[0.7rem] font-semibold transition-colors
              ${showSidebar
                ? "border-red-300 text-red-600 bg-red-50"
                : "border-[#D1CFCA] text-[#2D2926]/50 hover:text-[#2D2926]"}`}>
            <Zap size={13} />
            <span className="hidden md:inline">דחוף</span>
            {urgentAll.length > 0 && (
              <span className="absolute -top-1.5 -start-1.5 w-4.5 h-4.5 min-w-[1.1rem] min-h-[1.1rem] rounded-full bg-red-500 text-white text-[0.55rem] font-bold flex items-center justify-center px-1">
                {urgentAll.length}
              </span>
            )}
          </button>

          {/* Author */}
          <div className="flex items-center gap-2.5">
            <span className={`text-[0.68rem] font-bold px-2.5 py-1 rounded-full
              ${author === "Hanan" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
              {author === "Hanan" ? "חנן" : "מוטי"}
            </span>
            <button onClick={logout} className="p-1.5 rounded-full text-[#2D2926]/25 hover:text-[#2D2926]/70 hover:bg-[#F3F2EE] transition-colors">
              <LogOut size={14} />
            </button>
          </div>
        </div>

        {/* Company chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
          <button onClick={() => setFilterCompany(null)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[0.7rem] font-semibold transition-colors
              ${!filterCompany
                ? "bg-[#2D2926] border-[#2D2926] text-white"
                : "border-[#D1CFCA] text-[#2D2926]/50 hover:text-[#2D2926] hover:border-[#2D2926]/40"}`}>
            <Filter size={10} /> הכל
          </button>

          {companies.map(c => (
            <div key={c.id} className="shrink-0 flex items-center gap-0.5">
              <button
                onClick={() => setFilterCompany(filterCompany === c.id ? null : c.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[0.7rem] font-semibold transition-all"
                style={filterCompany === c.id
                  ? { borderColor: c.color, color: "white", background: c.color }
                  : { borderColor: "#E8E7E3", color: "#2D2926", opacity: 0.7, background: "white" }}>
                <CompanyIcon icon={c.icon} size={12} /> {c.name}
              </button>
              {c.drive_url && (
                <a href={c.drive_url} target="_blank" rel="noopener noreferrer"
                  className="p-1.5 text-[#2D2926]/20 hover:text-[#8D775F] transition-colors rounded-full"
                  title={`פתח Drive — ${c.name}`}>
                  <FolderOpen size={11} />
                </a>
              )}
            </div>
          ))}
        </div>
      </header>

      {/* ── Mobile column tabs ───────────────────────────────────────────────── */}
      <div className="md:hidden shrink-0 bg-white border-b border-[#E8E7E3] px-2 py-2 flex gap-1 overflow-x-auto">
        {COLUMNS.map(col => (
          <button key={col.key} onClick={() => setMobileCol(col.key)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.7rem] font-bold transition-all
              ${mobileCol === col.key
                ? "text-white shadow-sm"
                : "text-[#2D2926]/50 bg-[#F3F2EE] hover:bg-[#E8E7E3]"}`}
            style={mobileCol === col.key ? { background: col.accent } : {}}>
            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: mobileCol === col.key ? "white" : col.accent, opacity: mobileCol === col.key ? 0.7 : 1 }} />
            {col.label}
            {colTasks(col.key).length > 0 && (
              <span className={`text-[0.58rem] font-bold px-1 rounded-full ${mobileCol === col.key ? "bg-white/20" : "bg-[#D1CFCA]/60"}`}>
                {colTasks(col.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Kanban */}
        <main className="flex-1 overflow-x-auto overflow-y-hidden">
          {error && (
            <div className="m-4 flex items-center gap-2 text-red-600 text-sm border border-red-200 bg-red-50 px-4 py-3 rounded">
              <AlertCircle size={14} /> {error}
            </div>
          )}
          {dragError && (
            <div className="mx-4 mt-3 flex items-center gap-2 text-red-600 text-sm border border-red-200 bg-red-50 px-4 py-2.5 rounded shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
              <AlertCircle size={13} />
              <span className="font-medium">שגיאה בגרירה:</span> {dragError}
            </div>
          )}
          {/* Desktop kanban — horizontal scroll */}
          <div className="hidden md:flex gap-4 h-full p-5 min-w-[950px]">
            {COLUMNS.map(col => {
              const colItems     = colTasks(col.key);
              const isDragTarget = dragOverCol === col.key;
              const isAdding     = addingTo === col.key;

              return (
                <div key={col.key}
                  data-col-key={col.key}
                  className={`flex flex-col w-[230px] shrink-0 rounded-xl transition-all duration-150 cursor-pointer
                    ${isDragTarget ? "ring-2 ring-offset-1" : ""}`}
                  style={{
                    background: isDragTarget ? col.pill.includes("red") ? "#FEF2F2" : col.pill.includes("amber") ? "#FFFBEB" : col.pill.includes("blue") ? "#EFF6FF" : col.pill.includes("green") ? "#F0FDF4" : "#F3F2EE" : "transparent",
                    outlineColor: isDragTarget ? col.accent : undefined,
                  }}
                  onDragOver={e => { e.preventDefault(); setDragOverCol(col.key); }}
                  onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverCol(null); }}
                  onDrop={e => { e.preventDefault(); handleDrop(col.key); }}
                  onClick={() => { if (!isAdding) setAddingTo(col.key); }}
                >
                  {/* Column header */}
                  <div className="flex items-center justify-between px-3 py-3 mb-1">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ background: col.accent }} />
                      <div>
                        <p className="text-[0.78rem] font-bold text-[#2D2926]/85 leading-none">{col.label}</p>
                        <p className="text-[0.58rem] text-[#2D2926]/35 mt-0.5">{col.sub}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {colItems.length > 0 && (
                        <span className={`text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full ${col.pill}`}>
                          {colItems.length}
                        </span>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); setAddingTo(isAdding ? null : col.key); }}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[#2D2926]/30 hover:text-[#2D2926] hover:bg-[#E8E7E3] transition-colors"
                      >
                        {isAdding ? <X size={12} /> : <Plus size={12} />}
                      </button>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="mx-3 h-px mb-2" style={{ background: col.accent + "25" }} />

                  {/* Quick add */}
                  {isAdding && (
                    <div className="px-2">
                      <QuickAdd colKey={col.key} companies={companies}
                        defaultCompanyId={filterCompany ?? ""}
                        onAdd={(title, notes, cid, assignedTo, attachUrl) => addTask(col.key, title, notes, cid, assignedTo, attachUrl)}
                        onClose={() => setAddingTo(null)} />
                    </div>
                  )}

                  {/* Task list */}
                  <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2 min-h-[120px]">
                    {loading && colItems.length === 0 && (
                      <div className="flex justify-center pt-10">
                        <Loader2 size={16} className="animate-spin text-[#2D2926]/15" />
                      </div>
                    )}
                    {!loading && colItems.length === 0 && !isAdding && (
                      <div className="flex flex-col items-center justify-center pt-8 gap-2 pointer-events-none">
                        <div className="w-10 h-10 rounded-full border-2 border-dashed border-[#D1CFCA] flex items-center justify-center">
                          <Plus size={14} className="text-[#D1CFCA]" />
                        </div>
                        <p className="text-[0.62rem] text-[#2D2926]/20">לחץ להוספה</p>
                      </div>
                    )}
                    {colItems.map(task => (
                      <TaskCard key={task.id} task={task}
                        isDragging={dragTaskId === task.id}
                        onDragStart={() => {
                          dragIdRef.current = task.id;
                          setDragTaskId(task.id);
                        }}
                        onDragEnd={clearDragState}
                        onTouchStart={e => startTouchDrag(task, e)}
                        onDelete={() => deleteTask(task.id)}
                        onEdit={() => setEditingTask(task)}
                        companies={companies} />
                    ))}
                    {/* Always-visible add button at the bottom */}
                    {!isAdding && (
                      <button
                        onClick={e => { e.stopPropagation(); setAddingTo(col.key); }}
                        className="w-full mt-1 py-1.5 flex items-center justify-center gap-1.5 text-[0.65rem] text-[#2D2926]/25 hover:text-[#2D2926]/60 hover:bg-[#E8E7E3]/60 rounded transition-colors border border-transparent hover:border-[#E8E7E3]"
                      >
                        <Plus size={11} /> הוסף משימה
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile single-column view */}
          {(() => {
            const col      = COLUMNS.find(c => c.key === mobileCol)!;
            const colItems = colTasks(mobileCol);
            const isAdding = addingTo === mobileCol;
            return (
              <div className="md:hidden flex flex-col h-full p-3" key={mobileCol}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: col.accent }} />
                    <p className="text-sm font-bold text-[#2D2926]/85">{col.label}</p>
                    <p className="text-[0.68rem] text-[#2D2926]/35">{col.sub}</p>
                  </div>
                  <button onClick={() => setAddingTo(isAdding ? null : mobileCol)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.7rem] font-bold text-white transition-colors active:scale-95"
                    style={{ background: col.accent }}>
                    {isAdding ? <><X size={11} /> ביטול</> : <><Plus size={11} /> הוסף</>}
                  </button>
                </div>
                {isAdding && (
                  <div className="mb-3">
                    <QuickAdd colKey={mobileCol} companies={companies}
                      defaultCompanyId={filterCompany ?? ""}
                      onAdd={(title, notes, cid, assignedTo, attachUrl) => addTask(mobileCol, title, notes, cid, assignedTo, attachUrl)}
                      onClose={() => setAddingTo(null)} />
                  </div>
                )}
                <div className="flex-1 overflow-y-auto space-y-2.5 pb-4">
                  {loading && colItems.length === 0 && (
                    <div className="flex justify-center pt-10"><Loader2 size={16} className="animate-spin text-[#2D2926]/15" /></div>
                  )}
                  {!loading && colItems.length === 0 && !isAdding && (
                    <div className="flex flex-col items-center justify-center pt-12 gap-3 text-center">
                      <div className="w-12 h-12 rounded-full border-2 border-dashed border-[#D1CFCA] flex items-center justify-center">
                        <Plus size={16} className="text-[#D1CFCA]" />
                      </div>
                      <p className="text-[0.7rem] text-[#2D2926]/25">אין משימות בעמודה זו</p>
                    </div>
                  )}
                  {colItems.map(task => (
                    <TaskCard key={task.id} task={task}
                      isDragging={false}
                      onDragStart={() => {}}
                      onDragEnd={() => {}}
                      onDelete={() => deleteTask(task.id)}
                      onEdit={() => setEditingTask(task)}
                      companies={companies} />
                  ))}
                </div>
              </div>
            );
          })()}
        </main>

        {/* Urgent sidebar */}
        {showSidebar && (
          <aside className="w-72 shrink-0 border-s border-[#E8E7E3] bg-white overflow-y-auto flex flex-col">
            <div className="sticky top-0 bg-white flex items-center justify-between px-4 py-3.5 border-b border-[#E8E7E3] z-10">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-red-500" />
                <p className="text-sm font-bold text-red-600">משימות דחופות</p>
                {urgentAll.length > 0 && (
                  <span className="text-[0.62rem] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                    {urgentAll.length}
                  </span>
                )}
              </div>
              <button onClick={() => setShowSidebar(false)}
                className="p-1.5 rounded-full text-[#2D2926]/25 hover:text-[#2D2926]/70 hover:bg-[#F3F2EE] transition-colors">
                <ChevronLeft size={14} />
              </button>
            </div>

            {urgentAll.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center p-6">
                <span className="text-3xl">🎉</span>
                <p className="text-sm text-[#2D2926]/40 font-medium">אין משימות דחופות</p>
              </div>
            ) : (
              <div className="p-3 space-y-2.5">
                {urgentAll.map(task => {
                  const company = task.holding_companies ?? companies.find(c => c.id === task.company_id) ?? null;
                  return (
                    <div key={task.id} className="p-3.5 rounded-lg border border-red-100 bg-red-50/60 hover:bg-red-50 transition-colors">
                      {company && (
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <CompanyIcon icon={company.icon} size={14} />
                          <span className="text-[0.6rem] font-bold" style={{ color: company.color }}>{company.name}</span>
                        </div>
                      )}
                      <p className="text-sm text-[#2D2926] leading-snug font-medium">{task.title}</p>
                      <div className="flex items-center justify-between mt-2.5">
                        <span className={`text-[0.62rem] font-bold px-2 py-0.5 rounded-full
                          ${task.author === "Hanan" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                          {task.author === "Hanan" ? "חנן" : "מוטי"}
                        </span>
                        <button onClick={() => deleteTask(task.id)}
                          className="p-1 rounded text-[#2D2926]/20 hover:text-red-500 hover:bg-red-100 transition-colors">
                          <Trash2 size={12} />
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

      {/* Mobile bottom */}
      <div className="shrink-0 border-t border-[#E8E7E3] bg-white px-4 py-3 flex items-center justify-between md:hidden">
        <a href="/admin/hub" className="text-[0.68rem] text-[#2D2926]/40 hover:text-[#2D2926] font-medium">
          ← מרכז שליטה
        </a>
        <button onClick={() => setAddingTo(mobileCol)}
          className="flex items-center gap-2 px-4 py-2 bg-[#8D775F] text-white text-sm font-bold rounded-full hover:bg-[#7A6451] transition-colors">
          <Plus size={14} /> הוסף ל{COLUMNS.find(c => c.key === mobileCol)!.label}
        </button>
      </div>

      {/* Edit modal */}
      {editingTask && (
        <EditModal
          task={editingTask}
          companies={companies}
          onSave={saveEdit}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  );
}
