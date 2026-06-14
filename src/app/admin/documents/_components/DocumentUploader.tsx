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

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Camera, Loader2, RefreshCw, AlertTriangle, Check, ClipboardPaste } from "lucide-react";
import { DOC_TYPE_LABELS, fmtCurrency, displayVendor, type DocRow } from "./labels";
import DuplicateCompareDialog, { paneFromDoc, paneFromFile } from "./DuplicateCompareDialog";
import { extractPastedImage } from "./paste-image";

// A failed extraction usually means the AI couldn't parse a clean JSON — most
// often a PDF holding several documents. Show a friendly, actionable message
// instead of the raw "JSON אינו תקין" (the original error is still kept in
// extraction_raw for debugging). HEIC/HEIF keeps its specific note.
const MULTI_DOC_MSG = "לא הצלחנו לחלץ נתונים מהקובץ. ייתכן שהוא מכיל כמה מסמכים — נסה לפצל ולהעלות כל אחד בנפרד.";
function failureText(error?: string | null): string {
  if (error && /HEIC|HEIF/i.test(error)) return error;
  return MULTI_DOC_MSG;
}

interface ResultCard {
  doc: DocRow;
  status: "done" | "failed";
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
  const [error, setError] = useState<string | null>(null);

  // Mid-series duplicate prompt. The serial loop awaits decideRef's resolver.
  const [dupPrompt, setDupPrompt] = useState<{ file: File; existing: DocRow; previewUrl: string | null } | null>(null);
  const decideRef = useRef<((d: Decision) => void) | null>(null);

  const [focused, setFocused] = useState(false);

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
    const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
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

  async function uploadOne(file: File, extra: Record<string, string>): Promise<ResultCard | "error"> {
    const fd = new FormData();
    fd.append("file", file);
    for (const [k, v] of Object.entries(extra)) fd.append(k, v);
    const res = await fetch("/api/admin/documents", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) {
      // 409 = the server safety net caught a duplicate the client check missed
      // (e.g. a concurrent upload). Surface it; don't silently drop.
      setError(res.status === 409
        ? `"${file.name}" כבר קיים במערכת — דולג.`
        : `העלאת "${file.name}" נכשלה: ${data.error ?? res.status}`);
      return "error";
    }
    return { doc: data.document, status: data.extraction?.status ?? "failed", error: data.extraction?.error };
  }

  async function handleFiles(list: File[]) {
    if (list.length === 0) return;
    setBusy(true);
    setError(null);
    setResults([]);
    const collected: ResultCard[] = [];

    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      setProgress({ i: i + 1, n: list.length });

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
          collected.push(result);
          setResults([...collected]);
        }
      } catch (e) {
        setError(`שגיאת רשת בהעלאת "${file.name}": ${String(e)}`);
      }
    }

    setProgress(null);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
    onUploaded();
  }

  async function retry(idx: number) {
    const card = results[idx];
    setResults(prev => prev.map((c, k) => (k === idx ? { ...c, retrying: true } : c)));
    try {
      const res = await fetch(`/api/admin/documents/${card.doc.id}/extract`, { method: "POST" });
      const data = await res.json();
      setResults(prev => prev.map((c, k) => k === idx
        ? { doc: data.document ?? c.doc, status: data.extraction?.status ?? "failed", error: data.extraction?.error }
        : c));
      onUploaded();
    } catch (e) {
      setResults(prev => prev.map((c, k) => (k === idx ? { ...c, retrying: false, error: String(e) } : c)));
    }
  }

  return (
    <div
      tabIndex={0}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className="bg-white border border-[#2D2926]/10 rounded-md shadow-sm p-4 focus:outline-none focus:border-[#8D775F]/50"
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        multiple
        className="hidden"
        onChange={e => handleFiles(Array.from(e.target.files ?? []))}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="w-full flex items-center justify-center gap-2 bg-[#8D775F] text-white py-4 rounded-md text-base font-semibold hover:bg-[#7a6651] disabled:opacity-50 transition-colors"
      >
        {busy
          ? <><Loader2 size={20} className="animate-spin" /> {progress ? `מעלה ${progress.i} מתוך ${progress.n}...` : "מעלה..."}</>
          : <><Camera size={20} /> הוסף מסמך</>}
      </button>

      {focused && !busy && (
        <p className="mt-2 text-xs text-[#2D2926]/55 flex items-center justify-center gap-1.5">
          <ClipboardPaste size={13} /> אפשר גם להדביק תמונה (Ctrl+V)
        </p>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-600 flex items-center gap-1.5">
          <AlertTriangle size={14} /> {error}
        </p>
      )}

      {results.length > 0 && (
        <div className="mt-3 space-y-2">
          {results.map((c, idx) => (
            <div key={c.doc.id} className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 ${c.status === "failed" ? "border-gray-200 bg-gray-50" : "border-emerald-100 bg-emerald-50/60"}`}>
              <Link href={`/admin/documents/${c.doc.id}`} className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#2D2926] truncate">{displayVendor(c.doc)}</p>
                <p className={`text-xs text-[#2D2926]/70 ${c.status === "failed" ? "" : "truncate"}`}>
                  {c.status === "failed"
                    ? failureText(c.error)
                    : `${fmtCurrency(c.doc.total_amount, c.doc.currency ?? "ILS")} · ${DOC_TYPE_LABELS[c.doc.doc_type ?? ""] ?? "—"}`}
                </p>
              </Link>
              {c.status === "failed"
                ? (
                  <button onClick={() => retry(idx)} disabled={c.retrying}
                    className="shrink-0 flex items-center gap-1 text-xs font-semibold text-[#8D775F] border border-[#8D775F]/40 rounded px-2 py-1 hover:bg-[#8D775F]/10 disabled:opacity-50">
                    {c.retrying ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} נסה שוב
                  </button>
                )
                : <Check size={18} className="shrink-0 text-emerald-600" />}
            </div>
          ))}
        </div>
      )}

      {dupPrompt && (
        <DuplicateCompareDialog
          title="הקובץ כבר קיים במערכת"
          subtitle="קובץ זהה (אותו תוכן בדיוק) כבר הועלה. השווה והכרע:"
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
