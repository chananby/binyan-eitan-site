"use client";

// Generic side-by-side compare dialog. Two normalized panes (left vs right) +
// a configurable action footer, so it serves both:
//   • upload-time dedup: existing doc  vs  the file being uploaded (not yet
//     extracted → its fields show "— (טרם חולץ)"); actions skip/upload/replace.
//   • review-time dedup: the suspected original  vs  the current document
//     (both extracted); actions delete-as-duplicate / clear-flag / close.
// Build panes with paneFromDoc / paneFromFile.

import { AlertTriangle, FileText } from "lucide-react";
import { fmtCurrency, fmtDate, displayVendor, type DocRow } from "./labels";

export interface ComparePane {
  heading: string;
  thumbUrl: string | null;
  isImage: boolean;
  vendor: string | null;
  amount: number | null;
  currency: string;
  docDate: string | null;
  docNumber: string | null;
  fileLabel: string;
  uploadedLabel: string;
  pending?: boolean;   // not yet extracted → show "— (טרם חולץ)" for AI fields
}

export interface CompareAction {
  key: string;
  label: string;
  variant: "primary" | "outline" | "neutral" | "danger";
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function fmtUploadedAt(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function paneFromDoc(doc: DocRow, heading: string): ComparePane {
  return {
    heading,
    thumbUrl: `/api/admin/documents/${doc.id}/file`,
    isImage: (doc.mime_type ?? "").startsWith("image/"),
    vendor: displayVendor(doc),
    amount: doc.total_amount ?? null,
    currency: doc.currency ?? "ILS",
    docDate: doc.doc_date ?? null,
    docNumber: doc.doc_number ?? null,
    fileLabel: doc.original_filename || "—",
    uploadedLabel: fmtUploadedAt(doc.created_at) + (doc.uploaded_by ? ` · ${doc.uploaded_by}` : ""),
  };
}

export function paneFromFile(file: File, previewUrl: string | null, heading: string): ComparePane {
  return {
    heading,
    thumbUrl: previewUrl,
    isImage: file.type.startsWith("image/"),
    vendor: null, amount: null, currency: "ILS", docDate: null, docNumber: null,
    fileLabel: `${file.name} · ${fmtBytes(file.size)}`,
    uploadedLabel: "עכשיו",
    pending: true,
  };
}

function Thumb({ src, isImage }: { src: string | null; isImage: boolean }) {
  if (src && isImage) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className="w-full h-28 object-contain bg-[#F5F4F0] rounded" />;
  }
  return (
    <div className="w-full h-28 flex items-center justify-center bg-[#F5F4F0] rounded text-[#8D775F]">
      <FileText size={32} strokeWidth={1.25} />
    </div>
  );
}

const MUTED = "text-[#2D2926]/55";
function paneVendor(p: ComparePane) { return p.pending ? <span className={MUTED}>— (טרם חולץ)</span> : (p.vendor || "—"); }
function paneAmount(p: ComparePane) { return p.pending ? <span className={MUTED}>—</span> : fmtCurrency(p.amount, p.currency); }
function paneDate(p: ComparePane)   { return p.pending ? <span className={MUTED}>—</span> : fmtDate(p.docDate); }
function paneNumber(p: ComparePane) { return p.pending ? <span className={MUTED}>—</span> : (p.docNumber || "—"); }

const VARIANT: Record<CompareAction["variant"], string> = {
  primary: "bg-[#8D775F] text-white hover:bg-[#7a6651]",
  outline: "border border-[#8D775F]/50 text-[#8D775F] hover:bg-[#8D775F]/10",
  neutral: "border border-[#2D2926]/25 text-[#2D2926]/80 hover:bg-[#F5F4F0]",
  danger:  "border border-red-300 text-red-600 hover:bg-red-50",
};

export default function DuplicateCompareDialog({
  title, subtitle, left, right, actions, onAction, busy,
}: {
  title: string;
  subtitle: string;
  left: ComparePane;
  right: ComparePane;
  actions: CompareAction[];
  onAction: (key: string) => void;
  busy?: boolean;
}) {
  const rows: { label: string; l: React.ReactNode; r: React.ReactNode }[] = [
    { label: "תצוגה",     l: <Thumb src={left.thumbUrl} isImage={left.isImage} />, r: <Thumb src={right.thumbUrl} isImage={right.isImage} /> },
    { label: "ספק",        l: paneVendor(left), r: paneVendor(right) },
    { label: "סכום",       l: paneAmount(left), r: paneAmount(right) },
    { label: "תאריך מסמך", l: paneDate(left),   r: paneDate(right) },
    { label: "מס' מסמך",   l: paneNumber(left), r: paneNumber(right) },
    { label: "קובץ",       l: <span className="truncate block">{left.fileLabel}</span>, r: <span className="truncate block">{right.fileLabel}</span> },
    { label: "הועלה",      l: left.uploadedLabel, r: right.uploadedLabel },
  ];

  return (
    <div className="fixed inset-0 z-[70] bg-[#2D2926]/55 flex items-end sm:items-center justify-center p-3" dir="rtl">
      <div className="bg-white w-full max-w-lg rounded-md shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-[#2D2926]/10 sticky top-0 bg-white">
          <AlertTriangle size={18} className="text-amber-500 shrink-0" />
          <h2 className="font-heading text-base font-bold text-[#2D2926]">{title}</h2>
        </div>

        <div className="p-4">
          <p className="text-xs text-[#2D2926]/70 mb-3">{subtitle}</p>
          <div className="grid grid-cols-[5.5rem_1fr_1fr] gap-x-2 gap-y-2 text-sm">
            <div></div>
            <div className="text-xs font-bold text-[#2D2926] text-center pb-1 border-b border-[#2D2926]/15">{left.heading}</div>
            <div className="text-xs font-bold text-[#8D775F] text-center pb-1 border-b border-[#8D775F]/30">{right.heading}</div>
            {rows.map((r, i) => (
              <div key={i} className="contents">
                <div className="text-xs font-semibold text-[#2D2926]/70 self-center">{r.label}</div>
                <div className="min-w-0 text-[#2D2926] self-center">{r.l}</div>
                <div className="min-w-0 text-[#2D2926] self-center">{r.r}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 px-4 py-3 border-t border-[#2D2926]/10 sticky bottom-0 bg-white">
          {actions.map(a => (
            <button key={a.key} onClick={() => onAction(a.key)} disabled={busy}
              className={`flex-1 min-w-[90px] py-2.5 rounded-md text-sm font-semibold disabled:opacity-50 ${VARIANT[a.variant]}`}>
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
