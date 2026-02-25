"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { CheckCircle, RotateCcw, PenLine } from "lucide-react";
import { useLang } from "./LangContext";

const FORMSPREE_URL = "https://formspree.io/office@binyaneitan.com";

// ── Copy ──────────────────────────────────────────────────────────────────────
const UI = {
  en: {
    docLabel: "CHANGE ORDER",
    heading: "Change Order Approval",
    company: "Binyan Eitan Construction Ltd.",
    projectName: "Project Name",
    clientName: "Client / Supervisor Name",
    description: "Description of Change / Addition",
    price: "Agreed Price (₪)",
    date: "Date",
    signatureSection: "Authorising Signature",
    signatureHint: "Sign with finger or mouse",
    clearSig: "Clear",
    submit: "Submit & Send to Office",
    sending: "Sending…",
    success: "Form submitted successfully — a copy has been sent to the office.",
    error: "Submission failed. Please try again.",
    sigRequired: "Please sign the form before submitting.",
    required: "required",
  },
  he: {
    docLabel: "אישור שינוי",
    heading: "טופס אישור שינויים",
    company: 'חברת בניין איתן בע"מ',
    projectName: "שם הפרויקט",
    clientName: "שם הלקוח / המפקח",
    description: "תיאור השינוי / התוספת",
    price: "מחיר מוסכם (₪)",
    date: "תאריך",
    signatureSection: "חתימה מאשרת",
    signatureHint: "חתום עם אצבע או עכבר",
    clearSig: "נקה",
    submit: "שלח לאישור המשרד",
    sending: "שולח…",
    success: "הטופס נשלח בהצלחה ועותק נשלח למשרד",
    error: "שגיאה בשליחה. אנא נסו שוב.",
    sigRequired: "יש לחתום על הטופס לפני השליחה.",
    required: "חובה",
  },
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function isCanvasBlank(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return true;
  return !ctx.getImageData(0, 0, canvas.width, canvas.height).data.some((v) => v !== 0);
}

function todayLabel(lang: string) {
  return new Date().toLocaleDateString(lang === "he" ? "he-IL" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ── Signature Pad ─────────────────────────────────────────────────────────────

function SignaturePad({
  sigRef,
  hint,
  clearLabel,
  onStart,
}: {
  sigRef: React.RefObject<HTMLCanvasElement>;
  hint: string;
  clearLabel: string;
  onStart: () => void;
}) {
  const drawing = useRef(false);
  const [hasSig, setHasSig] = useState(false);

  // Initialise canvas size and attach pointer events
  useEffect(() => {
    const canvas = sigRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    const init = () => {
      canvas.width = parent ? parent.clientWidth : canvas.offsetWidth;
      canvas.height = parent ? parent.clientHeight : 160;
    };
    init();

    const getCtx = () => {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.strokeStyle = "#1A1A1A";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
      return ctx;
    };

    let lx = 0, ly = 0;

    const getXY = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      if ("touches" in e && e.touches.length > 0) {
        return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
      }
      return { x: (e as MouseEvent).clientX - rect.left, y: (e as MouseEvent).clientY - rect.top };
    };

    const start = (e: MouseEvent | TouchEvent) => {
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
      ctx.fillStyle = "#1A1A1A";
      ctx.fill();
    };

    const move = (e: MouseEvent | TouchEvent) => {
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

    const stop = () => { drawing.current = false; };

    canvas.addEventListener("mousedown", start);
    canvas.addEventListener("mousemove", move);
    canvas.addEventListener("mouseup", stop);
    canvas.addEventListener("mouseleave", stop);
    canvas.addEventListener("touchstart", start, { passive: false });
    canvas.addEventListener("touchmove", move, { passive: false });
    canvas.addEventListener("touchend", stop);

    // Re-init if container resizes (orientation change on mobile)
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
      canvas.removeEventListener("mousedown", start);
      canvas.removeEventListener("mousemove", move);
      canvas.removeEventListener("mouseup", stop);
      canvas.removeEventListener("mouseleave", stop);
      canvas.removeEventListener("touchstart", start);
      canvas.removeEventListener("touchmove", move);
      canvas.removeEventListener("touchend", stop);
      ro.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sigRef]);

  const clear = useCallback(() => {
    const canvas = sigRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setHasSig(false);
  }, [sigRef]);

  return (
    <div>
      {/* Canvas wrapper */}
      <div
        className="relative bg-white border border-charcoal/25 overflow-hidden"
        style={{ height: 160 }}
      >
        {/* Decorative baseline */}
        <div className="absolute inset-x-6 bottom-8 h-px bg-charcoal/[0.08] pointer-events-none" />

        {/* Empty-state hint */}
        {!hasSig && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none select-none">
            <PenLine size={20} className="text-charcoal/20" />
            <span className="font-body text-xs text-charcoal/30 tracking-wider">{hint}</span>
          </div>
        )}

        {/* The actual canvas */}
        <canvas
          ref={sigRef}
          className="absolute inset-0 w-full h-full touch-none"
          style={{ cursor: "crosshair" }}
        />
      </div>

      {/* Clear button */}
      <button
        type="button"
        onClick={clear}
        className="mt-2 inline-flex items-center gap-1.5 font-body text-xs text-charcoal/40 hover:text-charcoal/70 transition-colors duration-200"
      >
        <RotateCcw size={11} />
        {clearLabel}
      </button>
    </div>
  );
}

// ── Form Field ────────────────────────────────────────────────────────────────

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
    "w-full bg-transparent border-b border-charcoal/20 py-3 font-body text-sm text-charcoal text-start placeholder-transparent focus:outline-none focus:border-accent transition-colors peer";

  return (
    <div className="relative">
      {multiline ? (
        <textarea
          name={name}
          id={name}
          required={required}
          rows={3}
          className={`${base} resize-none`}
          placeholder=" "
        />
      ) : (
        <input
          type={type}
          name={name}
          id={name}
          required={required}
          min={type === "number" ? "0" : undefined}
          step={type === "number" ? "1" : undefined}
          className={base}
          placeholder=" "
        />
      )}
      <label
        htmlFor={name}
        className="absolute start-0 top-3 font-body text-sm text-charcoal/40 transition-all
          peer-focus:-top-3.5 peer-focus:text-[0.62rem] peer-focus:font-semibold peer-focus:text-accent
          peer-[:not(:placeholder-shown)]:-top-3.5 peer-[:not(:placeholder-shown)]:text-[0.62rem]
          uppercase tracking-widest pointer-events-none"
      >
        {label}
      </label>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

type Status = "idle" | "sending" | "success" | "error";

export default function ChangeOrderForm() {
  const { lang, dir } = useLang();
  const ui = UI[lang as "en" | "he"];
  const sigRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [sigErr, setSigErr] = useState(false);
  const today = todayLabel(lang);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const canvas = sigRef.current;
    if (!canvas || isCanvasBlank(canvas)) {
      setSigErr(true);
      return;
    }
    setSigErr(false);
    setStatus("sending");

    const fd = new FormData(e.currentTarget);

    // Attach signature as PNG file (Formspree multipart)
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/png")
    );
    if (blob) fd.append("signature_image", blob, `signature-${Date.now()}.png`);

    // Also include a compact JPEG preview as text fallback
    const mini = document.createElement("canvas");
    mini.width = 400;
    mini.height = Math.round(400 * (canvas.height / canvas.width));
    mini.getContext("2d")?.drawImage(canvas, 0, 0, mini.width, mini.height);
    fd.append("signature_preview_url", mini.toDataURL("image/jpeg", 0.75));

    try {
      const res = await fetch(FORMSPREE_URL, {
        method: "POST",
        body: fd,
        headers: { Accept: "application/json" },
      });
      setStatus(res.ok ? "success" : "error");
    } catch {
      setStatus("error");
    }
  }

  // ── Success screen ──
  if (status === "success") {
    return (
      <div className="min-h-screen bg-bone flex items-center justify-center px-6 py-16" dir={dir}>
        <div className="flex flex-col items-center gap-6 text-center max-w-md">
          <div className="opacity-80 brightness-0">
            <Image src="/logo.png" alt="Binyan Eitan" width={120} height={34} className="h-8 w-auto" />
          </div>
          <CheckCircle size={52} strokeWidth={1.3} className="text-accent" />
          <p className="font-heading text-xl font-bold text-charcoal leading-snug max-w-xs">
            {ui.success}
          </p>
        </div>
      </div>
    );
  }

  // ── Form screen ──
  return (
    <div className="min-h-screen bg-[#EDEAE4] flex items-start justify-center py-8 px-4" dir={dir}>
      <div className="w-full max-w-xl">

        {/* ── Document card ── */}
        <div className="bg-white shadow-lg">

          {/* Document header */}
          <div className="border-b border-charcoal/[0.09] px-7 py-5">
            <div className="flex items-center justify-between gap-4">
              <div className="opacity-85 brightness-0">
                <Image src="/logo.png" alt="Binyan Eitan" width={110} height={31} className="h-7 w-auto" />
              </div>
              <div className="text-end">
                <p className="font-body text-[0.6rem] font-semibold tracking-[0.25em] uppercase text-charcoal/35 mb-0.5">
                  {ui.docLabel}
                </p>
                <h1 className="font-heading text-base font-bold text-charcoal leading-tight">
                  {ui.heading}
                </h1>
                <p className="font-body text-[0.6rem] text-charcoal/40 mt-0.5">{ui.company}</p>
              </div>
            </div>
          </div>

          {/* Date badge */}
          <div className="bg-charcoal/[0.03] border-b border-charcoal/[0.07] px-7 py-3 flex items-center justify-between">
            <span className="font-body text-[0.62rem] font-semibold tracking-[0.2em] uppercase text-charcoal/40">
              {ui.date}
            </span>
            <span className="font-body text-sm font-semibold text-charcoal tabular-nums">{today}</span>
            <input type="hidden" name="date" value={today} readOnly />
          </div>

          {/* Form fields */}
          <form onSubmit={handleSubmit} className="px-7 py-7 space-y-7">

            <Field label={ui.projectName} name="project_name" required />
            <Field label={ui.clientName} name="client_name" required />
            <Field label={ui.description} name="description" required multiline />
            <Field label={ui.price} name="agreed_price" required type="number" />

            {/* Divider */}
            <div className="border-t border-charcoal/[0.08]" />

            {/* Signature section */}
            <div>
              <p className="font-body text-[0.62rem] font-semibold tracking-[0.22em] uppercase text-charcoal/40 mb-3">
                {ui.signatureSection}
              </p>
              <SignaturePad
                sigRef={sigRef}
                hint={ui.signatureHint}
                clearLabel={ui.clearSig}
                onStart={() => setSigErr(false)}
              />
              {sigErr && (
                <p className="mt-2 font-body text-xs text-red-500">{ui.sigRequired}</p>
              )}
            </div>

            {/* Error */}
            {status === "error" && (
              <p className="font-body text-sm text-red-500 text-center">{ui.error}</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full bg-charcoal text-bone py-4 font-body text-sm font-semibold tracking-[0.18em] uppercase transition-colors duration-300 hover:bg-charcoal-light disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === "sending" ? ui.sending : ui.submit}
            </button>
          </form>
        </div>

        {/* Footer note */}
        <p className="mt-4 text-center font-body text-[0.6rem] tracking-wider text-charcoal/30 uppercase">
          {lang === "he" ? "מסמך פנימי — בניין איתן" : "Internal Document — Binyan Eitan"}
        </p>
      </div>
    </div>
  );
}
