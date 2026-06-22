"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle, RotateCcw, PenLine, Camera, ArrowRight, ArrowLeft } from "lucide-react";
import { useLang } from "./LangContext";

interface ProjectOption { id: string; name: string; status: string; }

// ── Helpers ───────────────────────────────────────────────────────────────────

function isCanvasBlank(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return true;
  return !ctx.getImageData(0, 0, canvas.width, canvas.height).data.some((v) => v !== 0);
}

function nowLabel() {
  return new Date().toLocaleString("he-IL", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

async function uploadToBlob(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Upload failed");
  return data.url as string;
}

// ── Signature Pad ─────────────────────────────────────────────────────────────

function SignaturePad({
  sigRef, clearLabel, onStart, onClear,
}: {
  sigRef: React.RefObject<HTMLCanvasElement | null>;
  clearLabel: string;
  onStart: () => void;
  onClear: () => void;
}) {
  const drawing = useRef(false);
  const [hasSig, setHasSig] = useState(false);

  useEffect(() => {
    const canvas = sigRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    const init = () => {
      canvas.width  = parent ? parent.clientWidth : canvas.offsetWidth;
      canvas.height = parent ? parent.clientHeight : 180;
    };
    init();

    const getCtx = () => {
      const ctx = canvas.getContext("2d");
      if (ctx) { ctx.strokeStyle = "#2D2926"; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.lineJoin = "round"; }
      return ctx;
    };

    let lx = 0, ly = 0;
    const getXY = (e: MouseEvent | TouchEvent) => {
      const r = canvas.getBoundingClientRect();
      if ("touches" in e && e.touches.length > 0)
        return { x: e.touches[0].clientX - r.left, y: e.touches[0].clientY - r.top };
      return { x: (e as MouseEvent).clientX - r.left, y: (e as MouseEvent).clientY - r.top };
    };

    const onStart_ = (e: MouseEvent | TouchEvent) => {
      e.preventDefault(); drawing.current = true; setHasSig(true); onStart();
      const { x, y } = getXY(e); lx = x; ly = y;
      const ctx = getCtx(); if (!ctx) return;
      ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = "#2D2926"; ctx.fill();
    };
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!drawing.current) return; e.preventDefault();
      const { x, y } = getXY(e); const ctx = getCtx(); if (!ctx) return;
      ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(x, y); ctx.stroke();
      lx = x; ly = y;
    };
    const onStop = () => { drawing.current = false; };

    canvas.addEventListener("mousedown", onStart_);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseup", onStop);
    canvas.addEventListener("mouseleave", onStop);
    canvas.addEventListener("touchstart", onStart_, { passive: false });
    canvas.addEventListener("touchmove", onMove, { passive: false });
    canvas.addEventListener("touchend", onStop);

    const ro = new ResizeObserver(() => {
      const saved = canvas.toDataURL(); init();
      const ctx = getCtx(); if (!ctx || !hasSig) return;
      const img = new window.Image(); img.onload = () => ctx.drawImage(img, 0, 0); img.src = saved;
    });
    if (parent) ro.observe(parent);

    return () => {
      canvas.removeEventListener("mousedown", onStart_);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseup", onStop);
      canvas.removeEventListener("mouseleave", onStop);
      canvas.removeEventListener("touchstart", onStart_);
      canvas.removeEventListener("touchmove", onMove);
      canvas.removeEventListener("touchend", onStop);
      ro.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sigRef]);

  const clear = useCallback(() => {
    const canvas = sigRef.current; if (!canvas) return;
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setHasSig(false); onClear();
  }, [sigRef, onClear]);

  return (
    <div>
      <div className="relative overflow-hidden border border-charcoal/20 bg-white" style={{ height: 180 }}>
        <div className="pointer-events-none absolute inset-x-8 bottom-10 h-px bg-charcoal/[0.07]" />
        {!hasSig && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 select-none">
            <PenLine size={22} className="text-charcoal/20" />
            <span className="font-body text-xs tracking-wider text-charcoal/25">חתום עם אצבע או עכבר</span>
          </div>
        )}
        <canvas ref={sigRef} className="absolute inset-0 h-full w-full touch-none" style={{ cursor: "crosshair" }} />
      </div>
      <button type="button" onClick={clear}
        className="mt-2 inline-flex items-center gap-1.5 font-body text-xs text-charcoal/40 transition-colors duration-200 hover:text-accent">
        <RotateCcw size={11} /> {clearLabel}
      </button>
    </div>
  );
}

// ── Block wrapper ─────────────────────────────────────────────────────────────

function Block({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <div className="border border-warm-gray-light bg-bone">
      <div className="flex items-center gap-3 border-b border-warm-gray-light bg-charcoal/[0.025] px-6 py-3">
        <span className="font-body text-[0.58rem] font-bold tracking-[0.25em] uppercase text-accent-dark">{num}</span>
        <span className="font-body text-[0.62rem] font-bold tracking-[0.22em] uppercase text-charcoal/65">{title}</span>
      </div>
      <div className="px-6 py-6 space-y-6">{children}</div>
    </div>
  );
}

// Uncontrolled auto-grow textarea — keeps form-submit behavior (name attr,
// no React-controlled value) but grows vertically with typed content so the
// user always sees what they wrote. The Formspree POST receives the field
// the same way as a plain <textarea>.
function AutoGrowField({
  name, id, required, className, placeholder, minRows = 1,
}: {
  name: string; id?: string; required?: boolean; className?: string;
  placeholder?: string; minRows?: number;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + 2 + "px";
  };
  useEffect(() => {
    resize();
    // Line wrapping depends on viewport width — recompute on resize and
    // orientation change so the field stays correctly sized on mobile.
    const onResize = () => resize();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);
  return (
    <textarea
      ref={ref}
      name={name}
      id={id}
      required={required}
      rows={minRows}
      className={className}
      placeholder={placeholder}
      onInput={resize}
    />
  );
}

// ── Field ─────────────────────────────────────────────────────────────────────

function Field({ label, name, required, multiline, type = "text" }: {
  label: string; name: string; required?: boolean; multiline?: boolean; type?: string;
}) {
  const base = "w-full bg-transparent border-b border-charcoal/20 py-3 font-body text-sm text-charcoal text-start placeholder-transparent focus:outline-none focus:border-accent transition-colors duration-200 peer";
  return (
    <div className="relative">
      {multiline ? (
        // Auto-grow: starts at ~3 rows, grows with content so the user
        // always sees what they typed (no scrolling inside the field).
        <AutoGrowField name={name} id={name} required={required} className={`${base} resize-none`} placeholder=" " minRows={3} />
      ) : (
        <input type={type} name={name} id={name} required={required}
          min={type === "number" ? "0" : undefined}
          step={type === "number" ? "0.01" : undefined}
          className={base} placeholder=" " />
      )}
      <label htmlFor={name}
        className="pointer-events-none absolute start-0 top-3 font-body text-sm text-charcoal/40 uppercase tracking-widest transition-all
          peer-focus:-top-3.5 peer-focus:text-[0.75rem] peer-focus:font-semibold peer-focus:text-accent
          peer-[:not(:placeholder-shown)]:-top-3.5 peer-[:not(:placeholder-shown)]:text-[0.75rem]">
        {label}
      </label>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

type Status = "idle" | "sending" | "success" | "error";

const CATEGORIES = [
  { value: "",            label: "— בחר קטגוריה —" },
  { value: "שלד",         label: "שלד" },
  { value: "חשמל",        label: "חשמל" },
  { value: "אינסטלציה",   label: "אינסטלציה" },
  { value: "מיזוג אוויר", label: "מיזוג אוויר" },
  { value: "ריצוף וחיפוי",label: "ריצוף וחיפוי" },
  { value: "נגרות",       label: "נגרות" },
  { value: "אחר",         label: "אחר" },
];

export default function ChangeOrderForm() {
  const { lang, dir } = useLang();
  const sigRef       = useRef<HTMLCanvasElement>(null);
  const sigHiddenRef = useRef<HTMLInputElement>(null);
  const photoHiddenRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [status, setStatus]               = useState<Status>("idle");
  const [sigErr, setSigErr]               = useState(false);
  const [photoPreview, setPhotoPreview]   = useState<string | null>(null);
  const [photoName, setPhotoName]         = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoUploadErr, setPhotoUploadErr] = useState<string | null>(null);
  const [now]                             = useState(nowLabel);
  const [projects, setProjects]           = useState<ProjectOption[]>([]);
  const [projectId, setProjectId]         = useState("");

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => { if (d.projects) setProjects(d.projects); })
      .catch(() => {}); // non-critical — form still works, just no dropdown
  }, []);

  const ArrowBack = dir === "rtl" ? ArrowRight : ArrowLeft;

  const handlePhotoChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoName(file.name);
    setPhotoUploadErr(null);
    setPhotoUploading(true);
    if (photoHiddenRef.current) photoHiddenRef.current.value = "";
    try {
      const url = await uploadToBlob(file);
      if (photoHiddenRef.current) photoHiddenRef.current.value = url;
    } catch (err) {
      setPhotoUploadErr(err instanceof Error ? err.message : "שגיאה בהעלאה");
      setPhotoPreview(null); setPhotoName(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      setPhotoUploading(false);
    }
  }, []);

  const removePhoto = useCallback(() => {
    setPhotoPreview(null); setPhotoName(null); setPhotoUploadErr(null);
    if (photoHiddenRef.current) photoHiddenRef.current.value = "";
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleSigClear = useCallback(() => {
    if (sigHiddenRef.current) sigHiddenRef.current.value = "";
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const canvas = sigRef.current;
    if (!canvas || isCanvasBlank(canvas)) {
      setSigErr(true);
      canvas?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSigErr(false);
    setStatus("sending");

    const fd = new FormData(e.currentTarget);
    const fields = Object.fromEntries(fd.entries());

    try {
      const res = await fetch("/api/change-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId || null,
          specific_location: fields.specific_location,
          approver_name: fields.approver_name,
          approver_email: fields.approver_email,
          work_category: fields.work_category,
          description: fields.description,
          schedule_impact: fields.schedule_impact === "yes",
          site_photo_url: fields.site_photo_url || null,
          pricing_type: fields.pricing_type,
          agreed_price: fields.agreed_price,
          approval_status: fields.approval_status,
          datetime: fields.datetime,
          signature_data_url: canvas.toDataURL("image/png"),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus("success");
      } else {
        console.error("[change-order]", data.error);
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  // ── Success ──
  if (status === "success") {
    return (
      <div className="min-h-screen bg-bone flex items-center justify-center px-6 py-16" dir={dir}>
        <div className="flex flex-col items-center gap-6 text-center max-w-sm">
          <Image src="/logo.png" alt="Binyan Eitan" width={130} height={37} className="h-9 w-auto opacity-80 brightness-0" />
          <CheckCircle size={56} strokeWidth={1.2} className="text-accent" />
          <div>
            <p className="font-heading text-xl font-bold text-charcoal leading-snug">הטופס נשלח בהצלחה</p>
            <p className="mt-2 font-body text-sm text-charcoal/65">
              עותק נשלח למשרד ולמאשר לאישור סופי.
            </p>
          </div>
          <Link href={`/${lang}`}
            className="mt-2 inline-flex items-center gap-2 font-body text-sm font-semibold tracking-wider uppercase text-accent hover:text-accent-dark transition-colors">
            <ArrowBack size={14} />
            {lang === "he" ? "חזרה לאתר" : "Back to site"}
          </Link>
        </div>
      </div>
    );
  }

  // ── Form ──
  return (
    <div className="min-h-screen bg-bone-dark py-10 px-4" dir="rtl">
      <div className="mx-auto w-full max-w-2xl">

        {/* Back link */}
        <div className="mb-6 text-start">
          <Link href={`/${lang}/internal`}
            className="inline-flex items-center gap-2 font-body text-xs font-semibold tracking-widest uppercase text-charcoal/40 hover:text-accent transition-colors duration-200">
            <ArrowBack size={12} />
            {lang === "he" ? "פורטל צוות" : "Staff Portal"}
          </Link>
        </div>

        {/* Document card */}
        <div className="bg-bone border border-warm-gray-light shadow-sm overflow-hidden">

          {/* ── Card header ── */}
          <div className="border-b border-warm-gray-light px-8 py-8 text-center">
            <Image src="/logo.png" alt="Binyan Eitan" width={130} height={37}
              className="mx-auto h-9 w-auto brightness-0 opacity-85 mb-6" />
            <h1 className="font-heading text-xl font-bold text-charcoal leading-tight md:text-2xl">
              פרוטוקול אישור שינויים ותוספות
            </h1>
            <p className="mt-1 font-body text-[0.75rem] font-semibold tracking-[0.25em] uppercase text-charcoal/35">
              חברת בניין איתן בע&quot;מ
            </p>
          </div>

          {/* ── Date/time badge ── */}
          <div className="flex items-center justify-between bg-charcoal/[0.03] border-b border-warm-gray-light px-8 py-3">
            <span className="font-body text-[0.75rem] font-semibold tracking-[0.22em] uppercase text-charcoal/35">
              תאריך ושעה
            </span>
            <span className="font-body text-sm font-semibold text-charcoal tabular-nums">{now}</span>
            <input type="hidden" name="datetime" value={now} readOnly />
          </div>

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5 md:px-8 md:py-8">

            {/* ── Block 1: Project & Identity ── */}
            <Block num="01" title="פרטי הפרויקט והמאשר / Project & Identity">

              {/* Project selector */}
              <div className="relative">
                <label htmlFor="project_select"
                  className="block font-body text-[0.75rem] font-semibold tracking-[0.22em] uppercase text-charcoal/40 mb-2">
                  פרויקט / Project *
                </label>
                <select
                  id="project_select"
                  required
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full appearance-none bg-transparent border-b border-charcoal/20 py-3 font-body text-sm text-charcoal focus:outline-none focus:border-accent transition-colors duration-200 cursor-pointer"
                >
                  <option value="">— בחר פרויקט —</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute end-1 top-8 text-charcoal/30">▾</div>
              </div>

              <Field label="מיקום ספציפי (קומה/חדר) / Specific Location" name="specific_location" />
              <Field label="שם המאשר / Approver Name" name="approver_name" required />
              <Field label="אימייל המאשר / Approver Email" name="approver_email" required type="email" />
            </Block>

            {/* ── Block 2: Work Details ── */}
            <Block num="02" title="פרטי העבודה / Work Details">

              {/* Category */}
              <div className="relative">
                <label htmlFor="work_category"
                  className="block font-body text-[0.75rem] font-semibold tracking-[0.22em] uppercase text-charcoal/40 mb-2">
                  קטגוריית עבודה / Category
                </label>
                <select id="work_category" name="work_category" required defaultValue=""
                  className="w-full appearance-none bg-transparent border-b border-charcoal/20 py-3 font-body text-sm text-charcoal focus:outline-none focus:border-accent transition-colors duration-200 cursor-pointer">
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value} disabled={c.value === ""}>{c.label}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute end-1 top-8 text-charcoal/30">▾</div>
              </div>

              <Field label="תיאור השינוי / Description" name="description" required multiline />

              {/* Schedule impact checkbox */}
              <label className="flex cursor-pointer items-start gap-3 border border-transparent px-4 py-3 transition-colors duration-200 hover:border-warm-gray-light hover:bg-bone-dark has-[:checked]:border-accent/30 has-[:checked]:bg-accent/[0.04]">
                <input
                  type="checkbox"
                  name="schedule_impact"
                  value="yes"
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#8D775F] cursor-pointer"
                />
                <span className="font-body text-sm text-charcoal/70 leading-snug">
                  השינוי משפיע על לוחות הזמנים
                  <span className="block text-[0.62rem] text-charcoal/40 mt-0.5">
                    Does this change affect the project schedule?
                  </span>
                </span>
              </label>

              {/* Photo upload */}
              <div className="space-y-3">
                <p className="font-body text-[0.75rem] font-semibold tracking-[0.22em] uppercase text-charcoal/40">
                  תיעוד מהשטח / Site Photo
                </p>
                <input ref={fileInputRef} id="site_photo" type="file" accept="image/*" capture="environment"
                  onChange={handlePhotoChange} className="sr-only" />
                <input type="hidden" name="site_photo_url" ref={photoHiddenRef} />

                {!photoPreview ? (
                  <label htmlFor="site_photo"
                    className="flex cursor-pointer items-center justify-center gap-3 border border-dashed border-accent/40 bg-accent/[0.03] px-5 py-5 transition-colors duration-200 hover:border-accent hover:bg-accent/[0.06]">
                    <Camera size={20} className="shrink-0 text-accent-dark" />
                    <span className="font-body text-sm text-charcoal/60 leading-snug">
                      צילום מהשטח או העלאת קובץ
                    </span>
                  </label>
                ) : (
                  <div className="border border-warm-gray-light overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoPreview} alt="תצוגה מקדימה" className="w-full object-cover max-h-64 block" />
                    <div className="flex items-center justify-between gap-3 border-t border-warm-gray-light bg-bone-dark px-4 py-2">
                      <span className="font-body text-[0.62rem] text-charcoal/40 truncate">{photoName}</span>
                      {photoUploading ? (
                        <span className="shrink-0 font-body text-[0.62rem] text-accent-dark tracking-wider animate-pulse">מעלה…</span>
                      ) : (
                        <button type="button" onClick={removePhoto}
                          className="shrink-0 font-body text-[0.62rem] text-charcoal/40 hover:text-red-500 transition-colors duration-200 uppercase tracking-wider">
                          הסר ×
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {photoUploadErr && (
                  <p className="font-body text-xs text-red-500">שגיאה: {photoUploadErr}</p>
                )}
              </div>
            </Block>

            {/* ── Block 3: Financials ── */}
            <Block num="03" title="תמחור / Financials">

              {/* Pricing type */}
              <div className="space-y-2">
                <p className="font-body text-[0.75rem] font-semibold tracking-[0.22em] uppercase text-charcoal/40">
                  סוג תמחור / Pricing Type
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: "global",     he: "מחיר גלובלי",   en: "Global Price" },
                    { value: "unit_based", he: "לפי יחידות",     en: "Unit Based" },
                  ].map((opt) => (
                    <label key={opt.value}
                      className="flex cursor-pointer items-center gap-3 border border-transparent px-4 py-3 transition-colors duration-200 hover:border-warm-gray-light hover:bg-bone-dark has-[:checked]:border-accent/40 has-[:checked]:bg-accent/[0.05]">
                      <input type="radio" name="pricing_type" value={opt.value} required
                        className="h-4 w-4 shrink-0 accent-[#8D775F] cursor-pointer" />
                      <span className="font-body text-sm text-charcoal leading-snug">
                        {opt.he}
                        <span className="block text-[0.62rem] text-charcoal/40">{opt.en}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <Field label="סכום כולל (₪) / Total Amount" name="agreed_price" required type="number" />

              <p className="font-body text-[0.75rem] text-charcoal/35 tracking-wide border-s-2 border-accent/30 ps-3">
                המחיר אינו כולל מע&quot;מ — Price does not include VAT
              </p>
            </Block>

            {/* ── Block 4: Confirmation ── */}
            <Block num="04" title="אישור וחתימה / Confirmation">

              {/* Approval status */}
              <div className="space-y-2">
                <p className="font-body text-[0.75rem] font-semibold tracking-[0.22em] uppercase text-charcoal/40">
                  החלטת המאשר / Decision
                </p>
                <div className="flex flex-col gap-2">
                  {[
                    { value: "מאושר",              label: "מאושר / Approved" },
                    { value: "מאושר עם הערות",     label: "מאושר עם הערות / Approved with Notes" },
                    { value: "נדחה",               label: "נדחה / Rejected" },
                  ].map((opt) => (
                    <label key={opt.value}
                      className="flex cursor-pointer items-center gap-4 border border-transparent px-4 py-3 transition-colors duration-200 hover:border-warm-gray-light hover:bg-bone-dark has-[:checked]:border-accent/30 has-[:checked]:bg-accent/[0.04]">
                      <input type="radio" name="approval_status" value={opt.value} required
                        className="h-4 w-4 accent-[#8D775F] cursor-pointer" />
                      <span className="font-body text-sm font-medium text-charcoal">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Legal disclaimer */}
              <div className="border border-accent/20 bg-accent/[0.03] px-5 py-4">
                <p className="font-body text-xs leading-relaxed text-charcoal/65">
                  חתימה על טופס זה מהווה אישור סופי לביצוע השינוי והתחייבות לתשלום.
                </p>
                <p className="mt-1 font-body text-[0.62rem] leading-relaxed text-charcoal/40">
                  Signature on this form constitutes final approval for the change and commitment to payment.
                </p>
              </div>

              <SignaturePad sigRef={sigRef} clearLabel="נקה חתימה" onStart={() => setSigErr(false)} onClear={handleSigClear} />
              <input type="hidden" name="signature" ref={sigHiddenRef} />

              {sigErr && (
                <p className="font-body text-xs text-red-500">יש לחתום על הטופס לפני השליחה.</p>
              )}
            </Block>

            {/* Error */}
            {status === "error" && (
              <p className="font-body text-sm text-red-500 text-center">שגיאה בשליחה — אנא נסה שוב.</p>
            )}

            {/* Submit */}
            <button type="submit" disabled={status === "sending" || photoUploading}
              className="w-full bg-accent py-4 font-body text-sm font-semibold tracking-[0.2em] uppercase text-bone transition-colors duration-300 hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-50">
              {status === "sending" ? "שולח…" : photoUploading ? "ממתין להעלאת תמונה…" : "שלח לאישור המשרד"}
            </button>
          </form>
        </div>

        {/* Footer note */}
        <p className="mt-5 text-center font-body text-[0.58rem] tracking-widest uppercase text-charcoal/25">
          מסמך פנימי — בניין איתן בע&quot;מ
        </p>
      </div>
    </div>
  );
}
