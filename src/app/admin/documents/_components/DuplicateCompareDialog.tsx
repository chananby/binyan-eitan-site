"use client";

// Windows-style "this file already exists" comparison. Shown mid-upload when
// the pre-check finds a live document with the same file hash. Side-by-side:
// the existing (extracted) document vs. the raw file being uploaded. Three
// per-file decisions: skip / upload anyway / replace.

import { AlertTriangle, FileText } from "lucide-react";
import { fmtCurrency, fmtDate, displayVendor, type DocRow } from "./labels";

type Decision = "skip" | "upload" | "replace";

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

export default function DuplicateCompareDialog({
  existing, incoming, onDecide, busy,
}: {
  existing: DocRow;
  incoming: { file: File; previewUrl: string | null };
  onDecide: (d: Decision) => void;
  busy?: boolean;
}) {
  const existingIsImage = (existing.mime_type ?? "").startsWith("image/");
  const incomingIsImage = incoming.file.type.startsWith("image/");

  const rows: { label: string; existing: React.ReactNode; incoming: React.ReactNode }[] = [
    {
      label: "תצוגה",
      existing: <Thumb src={`/api/admin/documents/${existing.id}/file`} isImage={existingIsImage} />,
      incoming: <Thumb src={incoming.previewUrl} isImage={incomingIsImage} />,
    },
    { label: "ספק",        existing: displayVendor(existing),                              incoming: <span className="text-[#2D2926]/40">— (טרם חולץ)</span> },
    { label: "סכום",       existing: fmtCurrency(existing.total_amount, existing.currency ?? "ILS"), incoming: <span className="text-[#2D2926]/40">—</span> },
    { label: "תאריך מסמך", existing: fmtDate(existing.doc_date),                           incoming: <span className="text-[#2D2926]/40">—</span> },
    { label: "מס' מסמך",   existing: existing.doc_number || "—",                           incoming: <span className="text-[#2D2926]/40">—</span> },
    { label: "קובץ",       existing: <span className="truncate block">{existing.original_filename || "—"}</span>, incoming: <span className="truncate block">{incoming.file.name} · {fmtBytes(incoming.file.size)}</span> },
    { label: "הועלה",      existing: fmtUploadedAt(existing.created_at) + (existing.uploaded_by ? ` · ${existing.uploaded_by}` : ""), incoming: "עכשיו" },
  ];

  return (
    <div className="fixed inset-0 z-[70] bg-[#2D2926]/55 flex items-end sm:items-center justify-center p-3" dir="rtl">
      <div className="bg-white w-full max-w-lg rounded-md shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-[#2D2926]/10 sticky top-0 bg-white">
          <AlertTriangle size={18} className="text-amber-500 shrink-0" />
          <h2 className="font-heading text-base font-bold text-[#2D2926]">הקובץ כבר קיים במערכת</h2>
        </div>

        <div className="p-4">
          <p className="text-xs text-[#2D2926]/55 mb-3">קובץ זהה (אותו תוכן בדיוק) כבר הועלה. השווה והכרע:</p>
          <div className="grid grid-cols-[5.5rem_1fr_1fr] gap-x-2 gap-y-2 text-sm">
            <div></div>
            <div className="text-xs font-bold text-[#2D2926]/70 text-center pb-1 border-b border-[#2D2926]/10">קיים במערכת</div>
            <div className="text-xs font-bold text-[#8D775F] text-center pb-1 border-b border-[#8D775F]/30">הקובץ שאתה מעלה</div>
            {rows.map((r, i) => (
              <div key={i} className="contents">
                <div className="text-xs text-[#2D2926]/50 self-center">{r.label}</div>
                <div className="min-w-0 text-[#2D2926] self-center">{r.existing}</div>
                <div className="min-w-0 text-[#2D2926] self-center">{r.incoming}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 px-4 py-3 border-t border-[#2D2926]/10 sticky bottom-0 bg-white">
          <button onClick={() => onDecide("skip")} disabled={busy}
            className="flex-1 min-w-[90px] border border-[#2D2926]/20 text-[#2D2926]/70 py-2.5 rounded-md text-sm font-semibold hover:bg-[#F5F4F0] disabled:opacity-50">
            דלג
          </button>
          <button onClick={() => onDecide("upload")} disabled={busy}
            className="flex-1 min-w-[110px] border border-[#8D775F]/40 text-[#8D775F] py-2.5 rounded-md text-sm font-semibold hover:bg-[#8D775F]/10 disabled:opacity-50">
            העלה בכל זאת
          </button>
          <button onClick={() => onDecide("replace")} disabled={busy}
            className="flex-1 min-w-[90px] bg-[#8D775F] text-white py-2.5 rounded-md text-sm font-semibold hover:bg-[#7a6651] disabled:opacity-50">
            החלף
          </button>
        </div>
      </div>
    </div>
  );
}
