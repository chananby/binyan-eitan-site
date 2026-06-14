"use client";

// "Approve all high-confidence" confirmation — deliberately NOT a blind action.
// Shows the count + total ₪, and an itemised list (vendor / amount / date) with
// a per-item checkbox so the admin can drop any row before approving. Confirm
// approves exactly the still-checked ids.

import { useState } from "react";
import { CheckCircle2, X, Loader2 } from "lucide-react";
import { fmtCurrency, fmtDate, displayVendor, type DocRow } from "../_components/labels";

export default function ApproveAllDialog({ candidates, onConfirm, onClose, busy }: {
  candidates: DocRow[];
  onConfirm: (ids: string[]) => void;
  onClose: () => void;
  busy?: boolean;
}) {
  const [checked, setChecked] = useState<Set<string>>(() => new Set(candidates.map(c => c.id)));
  const selected = candidates.filter(c => checked.has(c.id));
  const total = selected.reduce((s, c) => s + (c.total_amount ?? 0), 0);

  const toggle = (id: string) =>
    setChecked(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });

  return (
    <div className="fixed inset-0 z-[70] bg-[#2D2926]/55 flex items-end sm:items-center justify-center p-3" dir="rtl">
      <div className="bg-white w-full max-w-lg rounded-md shadow-xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#2D2926]/10">
          <h2 className="font-heading text-base font-bold flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600" /> אישור גורף
          </h2>
          <button onClick={onClose} className="text-[#2D2926]/40 active:scale-90"><X size={20} /></button>
        </div>

        <div className="px-5 py-3 bg-emerald-50/60 border-b border-emerald-100">
          <p className="text-sm text-[#2D2926]">
            <span className="font-bold">{selected.length}</span> מסמכים · סה&quot;כ <span className="font-bold">{fmtCurrency(total)}</span>
          </p>
          <p className="text-xs text-[#2D2926]/55 mt-0.5">ביטחון גבוה, כל שדות החובה מלאים, ללא דגלים. הסר סימון כדי לדלג על פריט.</p>
        </div>

        <div className="overflow-y-auto flex-1 divide-y divide-[#2D2926]/5">
          {candidates.map(c => (
            <label key={c.id} className="flex items-center gap-3 px-5 py-2.5 cursor-pointer hover:bg-[#F5F4F0]/50">
              <input type="checkbox" checked={checked.has(c.id)} onChange={() => toggle(c.id)} className="accent-emerald-600 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#2D2926] truncate">{displayVendor(c)}</p>
                <p className="text-xs text-[#2D2926]/55 tabular-nums">{fmtCurrency(c.total_amount, c.currency ?? "ILS")} · {fmtDate(c.doc_date)}</p>
              </div>
            </label>
          ))}
        </div>

        <div className="px-4 py-3 border-t border-[#2D2926]/10 flex gap-2">
          <button onClick={onClose} disabled={busy}
            className="flex-1 border border-[#2D2926]/20 text-[#2D2926]/70 py-2.5 rounded-md text-sm font-semibold hover:bg-[#F5F4F0] disabled:opacity-50">
            ביטול
          </button>
          <button onClick={() => onConfirm([...checked])} disabled={busy || selected.length === 0}
            className="flex-1 bg-emerald-600 text-white py-2.5 rounded-md text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-1.5">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={16} />} אשר {selected.length}
          </button>
        </div>
      </div>
    </div>
  );
}
