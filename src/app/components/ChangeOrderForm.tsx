"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle, RotateCcw, PenLine, Camera, ArrowRight, ArrowLeft } from "lucide-react";
import { useLang } from "./LangContext";

// ── Formspree endpoint ─────────────────────────────────────────────────────────
const FORMSPREE_URL = `https://formspree.io/f/${
  process.env.NEXT_PUBLIC_FORMSPREE_FORM_ID ?? "xkoqgylz"
}`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function isCanvasBlank(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return true;
  return !ctx.getImageData(0, 0, canvas.width, canvas.height).data.some((v) => v !== 0);
}

function nowLabel() {
  return new Date().toLocaleString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Resize photo to max 900px wide before encoding to keep payload reasonable
function resizeAndEncode(file: File, maxW = 900): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new window.Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// ── Signature Pad ─────────────────────────────────────────────────────────────

function SignaturePad({
  sigRef,
  clearLabel,
  onStart,
  onClear,
}: {
  sigRef: React.RefObject<HTMLCanvasElement>;
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
      canvas.width = parent ? parent.clientWidth : canvas.offsetWidth;
      canvas.height = parent ? parent.clientHeight : 180;
    };
    init();

    const getCtx = () => {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.strokeStyle = "#2D2926";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
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
      e.preventDefault();
      drawing.current = true;
      setHasSig(true);
      onStart();
      const { x, y } = getXY(e);
      lx = x; ly = y;
      const ctx = getCtx();
      if (!ctx) return;
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = "#2D2926";
      ctx.fill();
    };
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!drawing.current) return;
      e.preventDefault();
      const { x, y } = getXY(e);
      const ctx = getCtx();
      if (!ctx) return;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(x, y);
      ctx.stroke();
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
      const saved = canvas.toDataURL();
      init();
      const ctx = getCtx();
      if (!ctx || !hasSig) return;
      const img = new window.Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = saved;
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
    const canvas = sigRef.current;
    if (!canvas) return;
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setHasSig(false);
    onClear();
  }, [sigRef, onClear]);

  return (
    <div>
      <div
        className="relative overflow-hidden border border-charcoal/20 bg-white"
        style={{ height: 180 }}
      >
        {/* Baseline */}
        <div className="pointer-events-none absolute inset-x-8 bottom-10 h-px bg-charcoal/[0.07]" />
        {!hasSig && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 select-none">
            <PenLine size={22} className="text-charcoal/20" />
            <span className="font-body text-xs tracking-wider text-charcoal/25">
              חתום עם אצבע או עכבר
            </span>
          </div>
        )}
        <canvas
          ref={sigRef}
          className="absolute inset-0 h-full w-full touch-none"
          style={{ cursor: "crosshair" }}
        />
      </div>
      <button
        type="button"
        onClick={clear}
        className="mt-2 inline-flex items-center gap-1.5 font-body text-xs text-charcoal/40 transition-colors duration-200 hover:text-accent"
      >
        <RotateCcw size={11} />
        {clearLabel}
      </button>
    </div>
  );
}

// ── Section Header ────────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="h-px flex-1 bg-warm-gray-light" />
      <span className="font-body text-[0.62rem] font-semibold tracking-[0.25em] uppercase text-accent">
        {label}
      </span>
      <div className="h-px flex-1 bg-warm-gray-light" />
    </div>
  );
}

// ── Field ─────────────────────────────────────────────────────────────────────

function Field({
  label,
  name,
  required,
  multiline,
  type = "text",
}: {
  label: string;
  name: string;
  required?: boolean;
  multiline?: boolean;
  type?: string;
}) {
  const base =
    "w-full bg-transparent border-b border-charcoal/20 py-3 font-body text-sm text-charcoal text-start placeholder-transparent focus:outline-none focus:border-accent transition-colors duration-200 peer";
  return (
    <div className="relative">
      {multiline ? (
        <textarea name={name} id={name} required={required} rows={4}
          className={`${base} resize-none`} placeholder=" " />
      ) : (
        <input type={type} name={name} id={name} required={required}
          min={type === "number" ? "0" : undefined}
          step={type === "number" ? "0.01" : undefined}
          className={base} placeholder=" " />
      )}
      <label
        htmlFor={name}
        className="pointer-events-none absolute start-0 top-3 font-body text-sm text-charcoal/40 uppercase tracking-widest transition-all
          peer-focus:-top-3.5 peer-focus:text-[0.6rem] peer-focus:font-semibold peer-focus:text-accent
          peer-[:not(:placeholder-shown)]:-top-3.5 peer-[:not(:placeholder-shown)]:text-[0.6rem]"
      >
        {label}
      </label>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

type Status = "idle" | "sending" | "success" | "error";

const CATEGORIES = [
  { value: "", label: "— בחר קטגוריה —" },
  { value: "שלד", label: "שלד" },
  { value: "חשמל", label: "חשמל" },
  { value: "אינסטלציה", label: "אינסטלציה" },
  { value: "מיזוג אוויר", label: "מיזוג אוויר" },
  { value: "ריצוף וחיפוי", label: "ריצוף וחיפוי" },
  { value: "נגרות", label: "נגרות" },
  { value: "אחר", label: "אחר" },
];

export default function ChangeOrderForm() {
  const { lang, dir } = useLang();
  const sigRef = useRef<HTMLCanvasElement>(null);
  const sigHiddenRef = useRef<HTMLInputElement>(null);
  const photoHiddenRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<Status>("idle");
  const [sigErr, setSigErr] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [now] = useState(nowLabel);

  const ArrowBack = dir === "rtl" ? ArrowRight : ArrowLeft;

  const handlePhotoChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    const dataUrl = await resizeAndEncode(file);
    setPhotoPreview(dataUrl);
    setPhotoName(file.name);
    if (photoHiddenRef.current) photoHiddenRef.current.value = dataUrl;
  }, []);

  const removePhoto = useCallback(() => {
    setPhotoPreview(null);
    setPhotoName(null);
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
    if (sigHiddenRef.current) sigHiddenRef.current.value = canvas.toDataURL("image/png");
    setStatus("sending");
    try {
      const res = await fetch(FORMSPREE_URL, {
        method: "POST",
        body: new FormData(e.currentTarget),
        headers: { Accept: "application/json" },
      });
      setStatus(res.ok ? "success" : "error");
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
            <p className="font-heading text-xl font-bold text-charcoal leading-snug">
              הטופס נשלח בהצלחה
            </p>
            <p className="mt-2 font-body text-sm text-charcoal/50">עותק נשלח למשרד לאישור סופי.</p>
          </div>
          <Link
            href={`/${lang}`}
            className="mt-2 inline-flex items-center gap-2 font-body text-sm font-semibold tracking-wider uppercase text-accent hover:text-accent-dark transition-colors"
          >
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
          <Link
            href={`/${lang}`}
            className="inline-flex items-center gap-2 font-body text-xs font-semibold tracking-widest uppercase text-charcoal/40 hover:text-accent transition-colors duration-200"
          >
            <ArrowBack size={12} />
            {lang === "he" ? "חזרה לאתר" : "Back"}
          </Link>
        </div>

        {/* Document card */}
        <div className="bg-bone border border-warm-gray-light shadow-sm">

          {/* ── Card header ── */}
          <div className="border-b border-warm-gray-light px-8 py-8 text-center">
            <Image
              src="/logo.png"
              alt="Binyan Eitan"
              width={130}
              height={37}
              className="mx-auto h-9 w-auto brightness-0 opacity-85 mb-6"
            />
            <h1 className="font-heading text-xl font-bold text-charcoal leading-tight md:text-2xl">
              פרוטוקול אישור שינויים ותוספות
            </h1>
            <p className="mt-1 font-body text-[0.65rem] font-semibold tracking-[0.25em] uppercase text-charcoal/35">
              חברת בניין איתן בע&quot;מ
            </p>
          </div>

          {/* ── Date/time badge ── */}
          <div className="flex items-center justify-between bg-charcoal/[0.03] border-b border-warm-gray-light px-8 py-3">
            <span className="font-body text-[0.6rem] font-semibold tracking-[0.22em] uppercase text-charcoal/35">
              תאריך ושעה
            </span>
            <span className="font-body text-sm font-semibold text-charcoal tabular-nums">{now}</span>
            <input type="hidden" name="datetime" value={now} readOnly />
          </div>

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} className="px-8 py-8 space-y-10">

            {/* 1 — Project Info */}
            <div className="space-y-7">
              <SectionHeader label="פרטי הפרויקט" />
              <Field label="שם הפרויקט" name="project_name" required />
              <Field label="שם המאשר / המפקח" name="approver_name" required />
            </div>

            {/* 2 — Work Details */}
            <div className="space-y-7">
              <SectionHeader label="פרטי העבודה" />

              {/* Category dropdown */}
              <div className="relative">
                <label
                  htmlFor="work_category"
                  className="block font-body text-[0.6rem] font-semibold tracking-[0.22em] uppercase text-charcoal/40 mb-2"
                >
                  קטגוריית עבודה
                </label>
                <select
                  id="work_category"
                  name="work_category"
                  required
                  defaultValue=""
                  className="w-full appearance-none bg-transparent border-b border-charcoal/20 py-3 font-body text-sm text-charcoal focus:outline-none focus:border-accent transition-colors duration-200 cursor-pointer"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value} disabled={c.value === ""}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute end-1 top-8 text-charcoal/30">▾</div>
              </div>

              <Field label="תיאור השינוי / התוספת" name="description" required multiline />
            </div>

            {/* 3 — Photos */}
            <div className="space-y-4">
              <SectionHeader label="תיעוד מהשטח" />

              <input
                ref={fileInputRef}
                id="site_photo"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoChange}
                className="sr-only"
              />
              <input type="hidden" name="site_photo_data" ref={photoHiddenRef} />

              {!photoPreview ? (
                <label
                  htmlFor="site_photo"
                  className="flex cursor-pointer items-center justify-center gap-3 border border-dashed border-accent/40 bg-accent/[0.03] px-5 py-5 transition-colors duration-200 hover:border-accent hover:bg-accent/[0.06]"
                >
                  <Camera size={20} className="shrink-0 text-accent/70" />
                  <span className="font-body text-sm text-charcoal/60 leading-snug">
                    צילום מהשטח או העלאת קבצים
                  </span>
                </label>
              ) : (
                <div className="border border-warm-gray-light overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoPreview} alt="תצוגה מקדימה" className="w-full object-cover max-h-64 block" />
                  <div className="flex items-center justify-between gap-3 border-t border-warm-gray-light bg-bone-dark px-4 py-2">
                    <span className="font-body text-[0.62rem] text-charcoal/40 truncate">{photoName}</span>
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="shrink-0 font-body text-[0.62rem] text-charcoal/40 hover:text-red-500 transition-colors duration-200 uppercase tracking-wider"
                    >
                      הסר ×
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 4 — Pricing */}
            <div className="space-y-4">
              <SectionHeader label="תמחור" />
              <Field label="מחיר מוסכם (₪)" name="agreed_price" required type="number" />
              <p className="font-body text-[0.65rem] text-charcoal/35 tracking-wide">
                * המחיר אינו כולל מע&quot;מ
              </p>
            </div>

            {/* 5 — Approval Status */}
            <div className="space-y-5">
              <SectionHeader label="סטטוס אישור" />
              <div className="flex flex-col gap-3">
                {[
                  { value: "מאושר", label: "מאושר" },
                  { value: "מאושר עם הערות", label: "מאושר עם הערות" },
                  { value: "נדחה", label: "נדחה" },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className="flex cursor-pointer items-center gap-4 border border-transparent px-4 py-3 transition-colors duration-200 hover:border-warm-gray-light hover:bg-bone-dark has-[:checked]:border-accent/30 has-[:checked]:bg-accent/[0.04]"
                  >
                    <input
                      type="radio"
                      name="approval_status"
                      value={opt.value}
                      required
                      className="h-4 w-4 accent-[#8D775F] cursor-pointer"
                    />
                    <span className="font-body text-sm font-medium text-charcoal">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 6 — Signature */}
            <div className="space-y-4">
              <SectionHeader label="חתימה ואישור סופי" />

              {/* Legal disclaimer */}
              <div className="border border-accent/20 bg-accent/[0.03] px-5 py-4">
                <p className="font-body text-xs leading-relaxed text-charcoal/60">
                  חתימה על טופס זה מהווה אישור סופי לביצוע השינוי/התוספת ולהתחייבות לתשלום בגינה.
                </p>
              </div>

              <SignaturePad
                sigRef={sigRef}
                clearLabel="נקה חתימה"
                onStart={() => setSigErr(false)}
                onClear={handleSigClear}
              />
              <input type="hidden" name="signature" ref={sigHiddenRef} />

              {sigErr && (
                <p className="font-body text-xs text-red-500">
                  יש לחתום על הטופס לפני השליחה.
                </p>
              )}
            </div>

            {/* Error */}
            {status === "error" && (
              <p className="font-body text-sm text-red-500 text-center">
                שגיאה בשליחה — אנא נסה שוב.
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full bg-accent py-4 font-body text-sm font-semibold tracking-[0.2em] uppercase text-bone transition-colors duration-300 hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status === "sending" ? "שולח…" : "שלח לאישור המשרד"}
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
