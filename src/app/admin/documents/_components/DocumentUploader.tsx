"use client";

// Upload area for the inbox. Mobile-first: one big "add document" button that
// opens the camera / file picker (accept image + PDF, capture=environment,
// multiple). Files upload SERIALLY — the API extracts inline, so parallel
// uploads would just queue on the model anyway — with a "X of N" progress
// line. Each finished upload shows a result card (vendor / amount / type) with
// a retry button when extraction failed.

import { useRef, useState } from "react";
import Link from "next/link";
import { Camera, Loader2, RefreshCw, AlertTriangle, Check } from "lucide-react";
import { DOC_TYPE_LABELS, fmtCurrency, displayVendor, type DocRow } from "./labels";

interface ResultCard {
  doc: DocRow;
  status: "done" | "failed";
  error?: string | null;
  retrying?: boolean;
}

export default function DocumentUploader({ onUploaded }: { onUploaded: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ i: number; n: number } | null>(null);
  const [results, setResults] = useState<ResultCard[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    setBusy(true);
    setError(null);
    setResults([]);
    const collected: ResultCard[] = [];

    for (let i = 0; i < list.length; i++) {
      setProgress({ i: i + 1, n: list.length });
      const fd = new FormData();
      fd.append("file", list[i]);
      try {
        const res = await fetch("/api/admin/documents", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) {
          setError(`העלאת "${list[i].name}" נכשלה: ${data.error ?? res.status}`);
          continue;
        }
        collected.push({ doc: data.document, status: data.extraction?.status ?? "failed", error: data.extraction?.error });
        setResults([...collected]);
      } catch (e) {
        setError(`שגיאת רשת בהעלאת "${list[i].name}": ${String(e)}`);
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
    <div className="bg-white border border-[#2D2926]/10 rounded-md shadow-sm p-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        multiple
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
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
                <p className="text-xs text-[#2D2926]/60 truncate">
                  {c.status === "failed"
                    ? (c.error || "החילוץ נכשל")
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
    </div>
  );
}
