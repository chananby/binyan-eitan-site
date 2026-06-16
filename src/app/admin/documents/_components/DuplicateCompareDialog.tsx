"use client";

// Generic side-by-side compare dialog. Two normalized panes (left vs right) +
// a configurable action footer, so it serves both:
//   • upload-time dedup: existing doc  vs  the file being uploaded (not yet
//     extracted → its fields show "— (טרם חולץ)"); actions skip/upload/replace.
//   • review-time dedup: the suspected original  vs  the current document
//     (both extracted); actions delete-as-duplicate / clear-flag / close.
// Build panes with paneFromDoc / paneFromFile.

import { AlertTriangle, FileText, Maximize2, Info } from "lucide-react";
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
  fileName: string;        // original filename, shown verbatim (a differing
                           //   name is a key "maybe not a dup" signal)
  fileMeta: string;        // "PDF · 240 KB" / "תמונה · 1.2 MB" / type only
  uploadedLabel: string;
  pending?: boolean;   // not yet extracted → show "— (טרם חולץ)" for AI fields
}

// Human file-type label from a MIME string.
function typeLabel(mime: string | null): string {
  if (!mime) return "קובץ";
  if (mime === "application/pdf") return "PDF";
  if (mime.startsWith("image/")) return "תמונה";
  return mime;
}

function fileMetaLine(mime: string | null, size: number | null): string {
  const t = typeLabel(mime);
  return size != null ? `${t} · ${fmtBytes(size)}` : t;
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
    fileName: doc.original_filename || "—",
    fileMeta: fileMetaLine(doc.mime_type ?? null, doc.file_size ?? null),
    uploadedLabel: fmtUploadedAt(doc.created_at) + (doc.uploaded_by ? ` · ${doc.uploaded_by}` : ""),
  };
}

export function paneFromFile(file: File, previewUrl: string | null, heading: string): ComparePane {
  return {
    heading,
    thumbUrl: previewUrl,
    isImage: file.type.startsWith("image/"),
    vendor: null, amount: null, currency: "ILS", docDate: null, docNumber: null,
    fileName: file.name,
    fileMeta: fileMetaLine(file.type || null, file.size),
    uploadedLabel: "עכשיו",
    pending: true,
  };
}

// Real preview: image via <img>, PDF (or anything non-image) via <iframe>
// pointing at the same source — the file route serves bytes inline with the
// right Content-Type, and a local File's object-URL renders the same way. A
// "פתח" overlay opens the full document in a new tab for close inspection.
function Preview({ src, isImage, label }: { src: string | null; isImage: boolean; label: string }) {
  if (!src) {
    return (
      <div className="w-full h-40 flex flex-col items-center justify-center gap-1 bg-[#F5F4F0] rounded text-[#8D775F]/70">
        <FileText size={28} strokeWidth={1.25} />
        <span className="text-[0.6rem]">אין תצוגה</span>
      </div>
    );
  }
  return (
    <div className="relative">
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={label} className="w-full h-40 object-contain bg-[#F5F4F0] rounded" />
      ) : (
        <iframe src={src} title={label} className="w-full h-40 rounded bg-[#F5F4F0] border border-[#2D2926]/10" />
      )}
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-1 right-1 flex items-center gap-1 bg-white/90 text-[#8D775F] text-[0.6rem] font-semibold px-1.5 py-0.5 rounded shadow-sm hover:bg-white"
      >
        <Maximize2 size={10} /> פתח
      </a>
    </div>
  );
}

function FileCell({ name, meta }: { name: string; meta: string }) {
  return (
    <div className="min-w-0">
      <span className="block truncate font-medium" title={name}>{name}</span>
      <span className="block text-[0.7rem] text-[#2D2926]/55">{meta}</span>
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
  title, subtitle, note, left, right, actions, onAction, busy,
}: {
  title: string;
  subtitle: string;
  note?: string;          // optional amber hint (e.g. "names differ — maybe parts")
  left: ComparePane;
  right: ComparePane;
  actions: CompareAction[];
  onAction: (key: string) => void;
  busy?: boolean;
}) {
  const rows: { label: string; l: React.ReactNode; r: React.ReactNode }[] = [
    { label: "תצוגה",     l: <Preview src={left.thumbUrl} isImage={left.isImage} label={left.heading} />, r: <Preview src={right.thumbUrl} isImage={right.isImage} label={right.heading} /> },
    { label: "ספק",        l: paneVendor(left), r: paneVendor(right) },
    { label: "סכום",       l: paneAmount(left), r: paneAmount(right) },
    { label: "תאריך מסמך", l: paneDate(left),   r: paneDate(right) },
    { label: "מס' מסמך",   l: paneNumber(left), r: paneNumber(right) },
    { label: "קובץ",       l: <FileCell name={left.fileName} meta={left.fileMeta} />, r: <FileCell name={right.fileName} meta={right.fileMeta} /> },
    { label: "הועלה",      l: left.uploadedLabel, r: right.uploadedLabel },
  ];

  return (
    <div className="fixed inset-0 z-[70] bg-[#2D2926]/55 flex items-end sm:items-center justify-center p-3" dir="rtl">
      <div className="bg-white w-full max-w-2xl rounded-md shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-[#2D2926]/10 sticky top-0 bg-white">
          <AlertTriangle size={18} className="text-amber-500 shrink-0" />
          <h2 className="font-heading text-base font-bold text-[#2D2926]">{title}</h2>
        </div>

        <div className="p-4">
          <p className="text-xs text-[#2D2926]/70 mb-3">{subtitle}</p>
          {note && (
            <p className="flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-2 mb-3">
              <Info size={14} className="shrink-0 mt-px" /> {note}
            </p>
          )}
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
