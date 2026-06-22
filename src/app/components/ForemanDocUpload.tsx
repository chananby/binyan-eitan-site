"use client";

// Foreman "drop and forget" document upload: a button that opens a minimal
// modal with one big camera button. Uploads serially to /api/foreman/documents
// and shows only a progress count and a thank-you / retry — NO list, history,
// status, amounts, vendor, or any extraction result. Zero financial exposure.

import { useRef, useState } from "react";
import { Camera, Loader2, Check, X, AlertTriangle } from "lucide-react";

type Status = "idle" | "sending" | "done" | "error";

export default function ForemanDocUpload() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState<{ i: number; n: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStatus("idle");
    setProgress(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    setStatus("sending");
    let failed = false;
    for (let i = 0; i < list.length; i++) {
      setProgress({ i: i + 1, n: list.length });
      const fd = new FormData();
      fd.append("file", list[i]);
      try {
        const res = await fetch("/api/foreman/documents", { method: "POST", body: fd });
        if (!res.ok) failed = true;
      } catch {
        failed = true;
      }
    }
    setProgress(null);
    setStatus(failed ? "error" : "done");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); reset(); }}
        className="w-full flex items-center justify-center gap-2 bg-bone border-2 border-accent/50 text-accent py-4 font-heading text-sm font-bold active:scale-95 transition-transform"
      >
        <Camera size={20} strokeWidth={1.5} /> שלח אסמכתא
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-charcoal/50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div className="bg-white w-full max-w-sm p-6 space-y-4" dir="rtl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-bold text-charcoal">שליחת אסמכתא</h2>
              <button onClick={() => setOpen(false)} className="text-charcoal/40 active:scale-90"><X size={20} /></button>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept="image/*,application/pdf"
              capture="environment"
              multiple
              className="hidden"
              onChange={e => handleFiles(e.target.files)}
            />

            {status === "idle" && (
              <button
                onClick={() => inputRef.current?.click()}
                className="w-full flex flex-col items-center gap-2 bg-accent text-bone py-10 active:scale-95 transition-transform"
              >
                <Camera size={44} strokeWidth={1.5} />
                <span className="font-heading text-base font-bold">צלם או בחר קובץ</span>
              </button>
            )}

            {status === "sending" && (
              <div className="flex flex-col items-center gap-2 py-10 text-charcoal/70">
                <Loader2 size={36} className="animate-spin text-accent" />
                <span className="text-sm font-semibold">{progress ? `שולח ${progress.i} מתוך ${progress.n}...` : "שולח..."}</span>
              </div>
            )}

            {status === "done" && (
              <div className="flex flex-col items-center gap-3 py-10 text-emerald-600">
                <Check size={48} strokeWidth={2} />
                <span className="font-heading text-lg font-bold">התקבל, תודה!</span>
                <div className="flex gap-4 mt-1">
                  <button onClick={reset} className="text-sm text-accent font-semibold">שלח עוד</button>
                  <button onClick={() => setOpen(false)} className="text-sm text-charcoal/65">סגור</button>
                </div>
              </div>
            )}

            {status === "error" && (
              <div className="flex flex-col items-center gap-3 py-10 text-red-600">
                <AlertTriangle size={40} />
                <span className="font-heading text-sm font-bold">השליחה נכשלה, נסה שוב</span>
                <button onClick={reset} className="mt-1 text-sm text-accent font-semibold">נסה שוב</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
