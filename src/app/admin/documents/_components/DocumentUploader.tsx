"use client";

// Upload area for the inbox. Mobile-first: one big "add document" button that
// opens the camera / file picker (accept image + PDF, capture=environment,
// multiple). Files upload SERIALLY — the API extracts inline, so parallel
// uploads would just queue on the model anyway — with a "X of N" progress line.
//
// Duplicate handling (per-file): before each upload the client computes the
// file's SHA-256 and probes /check. If a live document with that hash exists,
// the serial loop PAUSES on a compare dialog (skip / upload-anyway / replace)
// and only continues once the user decides. The server 409 is the real safety
// net if this client check is ever bypassed.

import { useEffect, useRef, useState, type DragEvent } from "react";
import Link from "next/link";
import { Camera, Loader2, RefreshCw, AlertTriangle, Check, ClipboardPaste } from "lucide-react";
import { DOC_TYPE_LABELS, fmtCurrency, displayVendor, type DocRow } from "./labels";
import DuplicateCompareDialog, { paneFromDoc, paneFromFile } from "./DuplicateCompareDialog";
import { extractPastedImage } from "./paste-image";

// A failed extraction usually means the AI couldn't parse a clean JSON — most
// often a PDF/photo holding several documents. Show a friendly, actionable
// message instead of the raw "JSON אינו תקין" (the original error is still
// kept in extraction_raw for debugging). HEIC/HEIF keeps its specific note.
const MULTI_DOC_MSG = "זוהו כמה מסמכים בתמונה/קובץ אחד. חתוך כך שכל חשבונית תהיה בקובץ נפרד, והעלה כל אחת בנפרד.";
function failureText(error?: string | null): string {
  if (!error) return MULTI_DOC_MSG;
  if (/HEIC|HEIF/i.test(error)) return error;
  // Client-side wrapped errors (network/server failures) are already
  // user-friendly Hebrew — pass them through instead of overwriting with
  // the multi-doc note, which would mislead.
  if (/^שגיאת רשת|^שגיאת שרת/.test(error)) return error;
  return MULTI_DOC_MSG;
}

// Vercel's default request-body cap for serverless/Node functions is ~4.5 MB.
// Files above this are rejected by the platform proxy BEFORE the route runs,
// so the server's MAX_BYTES=10MB check never fires and the client receives
// raw HTML ("Request Entity Too Large") that explodes the response.json()
// parser with "Unexpected token R…". A pre-flight client-side check turns
// this into a per-file, human-readable error and skips the doomed POST.
const MAX_UPLOAD_MB    = 4.5;
const MAX_UPLOAD_BYTES = 4.5 * 1024 * 1024;
function oversizedMsg(file: File): string {
  const mb = (file.size / 1024 / 1024).toFixed(1);
  return `הקובץ "${file.name}" שוקל ${mb} MB. המגבלה ${MAX_UPLOAD_MB} MB — נסה לדחוס או לצלם באיכות נמוכה יותר.`;
}

// Same set the file picker accepts (image/* + PDF) — applied to dropped files.
const isAllowedFile = (f: File) => f.type.startsWith("image/") || f.type === "application/pdf";

interface ResultCard {
  doc: DocRow;
  status: "extracting" | "done" | "failed";
  error?: string | null;
  retrying?: boolean;
}

type Decision = "skip" | "upload" | "replace";

async function sha256Hex(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export default function DocumentUploader({ onUploaded }: { onUploaded: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ i: number; n: number } | null>(null);
  const [results, setResults] = useState<ResultCard[]>([]);
  // List, not a single string, so a batch can surface one banner per
  // failed file (oversized / network / duplicate-skip) instead of
  // showing only the last one.
  const [errors, setErrors] = useState<string[]>([]);
  const addError = (msg: string) => setErrors(prev => [...prev, msg]);

  // Mid-series duplicate prompt. The serial loop awaits decideRef's resolver.
  const [dupPrompt, setDupPrompt] = useState<{ file: File; existing: DocRow; previewUrl: string | null } | null>(null);
  const decideRef = useRef<((d: Decision) => void) | null>(null);

  const [dragOver, setDragOver] = useState(false);

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (busy) return;
    const files = Array.from(e.dataTransfer.files).filter(isAllowedFile);
    if (files.length > 0) handleFiles(files);
  }

  // Paste-to-upload: a pasted image (Ctrl/Cmd+V) goes through the exact same
  // flow as a picked file. Latest busy/handleFiles read via a ref so the
  // listener can register once. Non-image pastes are ignored silently.
  const liveRef = useRef<{ busy: boolean; handleFiles: (f: File[]) => void }>({ busy, handleFiles: () => {} });
  useEffect(() => { liveRef.current = { busy, handleFiles }; });
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      if (liveRef.current.busy) return;
      const file = extractPastedImage(e);
      if (!file) return; // not an image → leave the paste alone
      e.preventDefault();
      liveRef.current.handleFiles([file]);
    }
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, []);

  function askDuplicate(file: File, existing: DocRow): Promise<Decision> {
    // Object-URL for ANY file (images + PDFs) so the dialog shows a real
    // preview of the incoming document, not just images.
    const previewUrl = URL.createObjectURL(file);
    return new Promise<Decision>(resolve => {
      decideRef.current = (d) => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setDupPrompt(null);
        decideRef.current = null;
        resolve(d);
      };
      setDupPrompt({ file, existing, previewUrl });
    });
  }

  // Upload only — returns fast with the pending row. Extraction is a SEPARATE
  // request (runExtract) so a slow multi-page PDF can't 504 the upload itself.
  async function uploadOne(file: File, extra: Record<string, string>): Promise<ResultCard | "error"> {
    const fd = new FormData();
    fd.append("file", file);
    for (const [k, v] of Object.entries(extra)) fd.append(k, v);
    const res = await fetch("/api/admin/documents", { method: "POST", body: fd });

    // Safety net for the Vercel platform 413: the proxy returns raw text/HTML
    // (no JSON), so res.json() throws "Unexpected token R". Catch the size
    // verdict BEFORE attempting to parse, and treat any non-JSON response as
    // a generic upload failure rather than crashing the loop.
    if (res.status === 413) {
      addError(oversizedMsg(file));
      return "error";
    }
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      addError(`העלאת "${file.name}" נכשלה (תגובת שרת לא צפויה, status ${res.status}).`);
      return "error";
    }

    const data = await res.json();
    if (!res.ok) {
      // 409 = the server safety net caught a duplicate the client check missed
      // (e.g. a concurrent upload). Surface it; don't silently drop.
      addError(res.status === 409
        ? `"${file.name}" כבר קיים במערכת — דולג.`
        : `העלאת "${file.name}" נכשלה: ${data.error ?? res.status}`);
      return "error";
    }
    return { doc: data.document, status: "extracting" };
  }

  // Decoupled extraction: its own request, its own maxDuration. A failure here
  // (incl. a slow PDF) is contained to this one card — it never breaks the
  // upload flow or returns HTML to the screen.
  async function runExtract(doc: DocRow): Promise<ResultCard> {
    try {
      const res = await fetch(`/api/admin/documents/${doc.id}/extract`, { method: "POST" });
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        return { doc, status: "failed", error: `שגיאת שרת בחילוץ (status ${res.status}).` };
      }
      const data = await res.json();
      if (!res.ok) return { doc, status: "failed", error: data.error ?? `שגיאה ${res.status}` };
      return { doc: data.document ?? doc, status: data.extraction?.status ?? "failed", error: data.extraction?.error };
    } catch {
      // Network failure / aborted fetch — never leak the raw exception string
      // to the user; failureText() turns "" into the friendly multi-doc note,
      // which is wrong here, so use a specific network message instead.
      return { doc, status: "failed", error: "שגיאת רשת בחילוץ. נסה שוב." };
    }
  }

  async function handleFiles(list: File[]) {
    if (list.length === 0) return;
    setBusy(true);
    setErrors([]);
    setResults([]);
    const collected: ResultCard[] = [];

    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      setProgress({ i: i + 1, n: list.length });

      // Pre-flight size guard: anything above the Vercel proxy cap never
      // makes it to /api/admin/documents anyway — surface a clear per-file
      // message and move on to the next file instead of wasting a doomed
      // POST that returns raw HTML.
      if (file.size > MAX_UPLOAD_BYTES) {
        addError(oversizedMsg(file));
        continue;
      }

      const extra: Record<string, string> = {};
      try {
        // Pre-check by hash. Failures here fall through to a normal upload —
        // the server 409 still protects against duplicates.
        const hash = await sha256Hex(file);
        const chk = await fetch(`/api/admin/documents/check?hash=${encodeURIComponent(hash)}`, { cache: "no-store" })
          .then(r => r.json()).catch(() => ({ duplicate: false }));
        if (chk.duplicate && chk.document) {
          const decision = await askDuplicate(file, chk.document);
          if (decision === "skip") continue;
          if (decision === "upload") extra.allow_duplicate = "true";
          if (decision === "replace") extra.replace_id = chk.document.id;
        }

        const result = await uploadOne(file, extra);
        if (result !== "error") {
          // Show the card immediately as "extracting", then run extraction in
          // its own request and update the card in place when it returns.
          const idx = collected.length;
          collected.push(result);
          setResults([...collected]);
          const done = await runExtract(result.doc);
          collected[idx] = done;
          setResults([...collected]);
        }
      } catch {
        // Avoid leaking raw exception text (typically a fetch-level network
        // error). The per-file fallback covers the only path that reaches
        // here once uploadOne owns its own error mapping.
        addError(`שגיאת רשת בהעלאת "${file.name}". נסה שוב.`);
      }
    }

    setProgress(null);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
    onUploaded();
  }

  async function retry(idx: number) {
    const card = results[idx];
    setResults(prev => prev.map((c, k) => (k === idx ? { ...c, status: "extracting", retrying: true } : c)));
    const done = await runExtract(card.doc);
    setResults(prev => prev.map((c, k) => (k === idx ? done : c)));
    onUploaded();
  }

  return (
    <div className="bg-white border border-[#2D2926]/10 rounded-md shadow-sm p-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        multiple
        className="hidden"
        onChange={e => handleFiles(Array.from(e.target.files ?? []))}
      />

      {/* Dropzone — picker button + the three intake routes (click / paste / drag). */}
      <div
        onDragOver={e => { e.preventDefault(); if (!busy) setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`rounded-md border-2 border-dashed p-4 transition-colors ${dragOver ? "border-[#8D775F] bg-[#8D775F]/5" : "border-[#2D2926]/20"}`}
      >
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="w-full flex items-center justify-center gap-2 bg-[#8D775F] text-white py-4 rounded-md text-base font-semibold hover:bg-[#7a6651] disabled:opacity-50 transition-colors"
        >
          {busy
            ? <><Loader2 size={20} className="animate-spin" /> {progress ? `מעלה ${progress.i} מתוך ${progress.n}...` : "מעלה..."}</>
            : <><Camera size={20} /> הוסף מסמך</>}
        </button>

        {dragOver ? (
          <p className="mt-2.5 text-sm font-bold text-[#8D775F] text-center">שחררו כאן להעלאה ↓</p>
        ) : (
          <p className="mt-2.5 text-xs text-[#2D2926]/80 text-center flex items-center justify-center gap-1.5 flex-wrap">
            <ClipboardPaste size={13} className="text-[#2D2926]/60 shrink-0" />
            <span>או הדביקו תמונה (Ctrl+V) · או גררו קובץ לכאן</span>
          </p>
        )}
      </div>

      {errors.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {errors.map((e, i) => (
            <p key={i} className="text-sm text-red-600 flex items-start gap-1.5">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span className="leading-snug">{e}</span>
            </p>
          ))}
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-3 space-y-2">
          {results.map((c, idx) => {
            const cardClass =
              c.status === "failed"     ? "border-gray-200 bg-gray-50" :
              c.status === "extracting" ? "border-[#8D775F]/20 bg-[#8D775F]/5" :
                                          "border-emerald-100 bg-emerald-50/60";
            return (
            <div key={c.doc.id} className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 ${cardClass}`}>
              <Link href={`/admin/documents/${c.doc.id}`} className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#2D2926] truncate">{displayVendor(c.doc)}</p>
                <p className={`text-xs text-[#2D2926]/70 ${c.status === "failed" ? "" : "truncate"}`}>
                  {c.status === "failed"     ? failureText(c.error)
                   : c.status === "extracting" ? "מחלץ נתונים…"
                   : `${fmtCurrency(c.doc.total_amount, c.doc.currency ?? "ILS")} · ${DOC_TYPE_LABELS[c.doc.doc_type ?? ""] ?? "—"}`}
                </p>
              </Link>
              {c.status === "failed" ? (
                <button onClick={() => retry(idx)} disabled={c.retrying}
                  className="shrink-0 flex items-center gap-1 text-xs font-semibold text-[#8D775F] border border-[#8D775F]/40 rounded px-2 py-1 hover:bg-[#8D775F]/10 disabled:opacity-50">
                  {c.retrying ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} נסה שוב
                </button>
              ) : c.status === "extracting" ? (
                <Loader2 size={18} className="shrink-0 animate-spin text-[#8D775F]" />
              ) : (
                <Check size={18} className="shrink-0 text-emerald-600" />
              )}
            </div>
            );
          })}
        </div>
      )}

      {dupPrompt && (
        <DuplicateCompareDialog
          title="הקובץ כבר קיים במערכת"
          subtitle="קובץ זהה (אותו תוכן בדיוק) כבר הועלה. השווה והכרע:"
          note={
            dupPrompt.existing.original_filename &&
            dupPrompt.existing.original_filename !== dupPrompt.file.name
              ? "שמות הקבצים שונים; ייתכן שאלה חלקים שונים של אותה הזמנה."
              : undefined
          }
          left={paneFromDoc(dupPrompt.existing, "קיים במערכת")}
          right={paneFromFile(dupPrompt.file, dupPrompt.previewUrl, "הקובץ שאתה מעלה")}
          actions={[
            { key: "skip", label: "דלג", variant: "neutral" },
            { key: "upload", label: "העלה בכל זאת", variant: "outline" },
            { key: "replace", label: "החלף", variant: "primary" },
          ]}
          onAction={(k) => decideRef.current?.(k as Decision)}
        />
      )}
    </div>
  );
}
