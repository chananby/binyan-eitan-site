"use client";

// Editable review form for one financial document. All fields PATCH back to
// /api/admin/documents/[id]. "אשר" sends every field + status=approved in a
// single request (save-and-approve); "דחה" does the same with status=rejected;
// "שמור" updates fields only. Vendors can be created inline.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, X, Save, Trash2, Plus } from "lucide-react";
import {
  DOC_TYPE_LABELS, DIRECTION_LABELS, CATEGORY_LABELS,
  DOC_TYPE_OPTIONS, DIRECTION_OPTIONS, CATEGORY_OPTIONS, type DocRow,
} from "../_components/labels";

interface Opt { id: string; name: string }

const FIELD = "w-full border border-[#2D2926]/15 rounded-md bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#8D775F]";
const LABEL = "text-xs text-[#2D2926]/60 mb-1 block";

function numOrNull(v: string): number | null {
  const t = v.trim();
  if (t === "") return null;
  const n = Number(t.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

export default function DocumentReviewForm({
  doc, vendors, projects, onVendorsChange, onAfterAction,
}: {
  doc: DocRow;
  vendors: Opt[];
  projects: Opt[];
  onVendorsChange: () => void;
  // Optional override for what happens after approve/reject/delete. The detail
  // page leaves it unset (→ navigate to the list); the review queue passes a
  // handler that advances to the next pending document instead.
  onAfterAction?: (action: "approve" | "reject" | "delete") => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    doc_type:          doc.doc_type ?? "",
    direction:         doc.direction ?? "",
    vendor_id:         doc.vendor_id ?? "",
    doc_number:        doc.doc_number ?? "",
    doc_date:          doc.doc_date ?? "",
    amount_before_vat: doc.amount_before_vat?.toString() ?? "",
    vat_amount:        doc.vat_amount?.toString() ?? "",
    total_amount:      doc.total_amount?.toString() ?? "",
    currency:          doc.currency ?? "ILS",
    category:          doc.category ?? "",
    project_id:        doc.project_id ?? "",
    description:       doc.description ?? "",
    notes:             doc.notes ?? "",
  });
  const [busy, setBusy] = useState<null | "save" | "approve" | "reject" | "delete">(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Inline vendor creation
  const [newVendorOpen, setNewVendorOpen] = useState(false);
  const [newVendorName, setNewVendorName] = useState("");
  const [creatingVendor, setCreatingVendor] = useState(false);

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function createVendor() {
    const name = newVendorName.trim();
    if (!name) return;
    setCreatingVendor(true); setErr(null);
    try {
      const res = await fetch("/api/admin/vendors", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? "יצירת ספק נכשלה"); return; }
      onVendorsChange();
      set("vendor_id", data.vendor.id);
      setNewVendorOpen(false); setNewVendorName("");
    } catch (e) { setErr(String(e)); }
    finally { setCreatingVendor(false); }
  }

  async function submit(action: "save" | "approve" | "reject") {
    setBusy(action); setErr(null); setMsg(null);
    const body: Record<string, unknown> = {
      doc_type:          form.doc_type || null,
      direction:         form.direction || null,
      vendor_id:         form.vendor_id || null,
      doc_number:        form.doc_number || null,
      doc_date:          form.doc_date || null,
      amount_before_vat: numOrNull(form.amount_before_vat),
      vat_amount:        numOrNull(form.vat_amount),
      total_amount:      numOrNull(form.total_amount),
      currency:          form.currency || null,
      category:          form.category || null,
      project_id:        form.project_id || null,
      description:       form.description || null,
      notes:             form.notes || null,
    };
    if (action === "approve") body.status = "approved";
    if (action === "reject")  body.status = "rejected";
    try {
      const res = await fetch(`/api/admin/documents/${doc.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? `שגיאה ${res.status}`); return; }
      if (action === "save") { setMsg("נשמר ✓"); return; }
      if (onAfterAction) onAfterAction(action);
      else router.push("/admin/documents");
    } catch (e) { setErr(String(e)); }
    finally { setBusy(null); }
  }

  async function remove() {
    if (!confirm("למחוק את המסמך? פעולה זו מסירה אותו מהרשימה.")) return;
    setBusy("delete"); setErr(null);
    try {
      const res = await fetch(`/api/admin/documents/${doc.id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setErr(d.error ?? "מחיקה נכשלה"); return; }
      if (onAfterAction) onAfterAction("delete");
      else router.push("/admin/documents");
    } catch (e) { setErr(String(e)); }
    finally { setBusy(null); }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>סוג מסמך</label>
          <select value={form.doc_type} onChange={e => set("doc_type", e.target.value)} className={FIELD}>
            <option value="">—</option>
            {DOC_TYPE_OPTIONS.map(t => <option key={t} value={t}>{DOC_TYPE_LABELS[t]}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL}>כיוון</label>
          <select value={form.direction} onChange={e => set("direction", e.target.value)} className={FIELD}>
            <option value="">—</option>
            {DIRECTION_OPTIONS.map(d => <option key={d} value={d}>{DIRECTION_LABELS[d]}</option>)}
          </select>
        </div>
      </div>

      {/* Vendor */}
      <div>
        <label className={LABEL}>ספק</label>
        {!newVendorOpen ? (
          <div className="flex gap-2">
            <select value={form.vendor_id} onChange={e => set("vendor_id", e.target.value)} className={FIELD}>
              <option value="">— ללא ספק —</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
            <button type="button" onClick={() => setNewVendorOpen(true)}
              className="shrink-0 flex items-center gap-1 text-xs font-semibold text-[#8D775F] border border-[#8D775F]/40 rounded px-2 hover:bg-[#8D775F]/10">
              <Plus size={13} /> חדש
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input value={newVendorName} onChange={e => setNewVendorName(e.target.value)} placeholder="שם ספק חדש" className={FIELD} />
            <button type="button" onClick={createVendor} disabled={creatingVendor}
              className="shrink-0 flex items-center gap-1 text-xs font-semibold text-white bg-[#8D775F] rounded px-3 disabled:opacity-50">
              {creatingVendor ? <Loader2 size={13} className="animate-spin" /> : "צור"}
            </button>
            <button type="button" onClick={() => { setNewVendorOpen(false); setNewVendorName(""); }}
              className="shrink-0 text-[#2D2926]/50 px-1"><X size={16} /></button>
          </div>
        )}
        {doc.vendor_name_raw && !form.vendor_id && (
          <p className="text-xs text-[#2D2926]/45 mt-1">זוהה במסמך: {doc.vendor_name_raw}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>{"מס' מסמך"}</label>
          <input value={form.doc_number} onChange={e => set("doc_number", e.target.value)} className={FIELD} dir="ltr" />
        </div>
        <div>
          <label className={LABEL}>תאריך</label>
          <input type="date" value={form.doc_date} onChange={e => set("doc_date", e.target.value)} className={FIELD} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={LABEL}>{'לפני מע"מ'}</label>
          <input value={form.amount_before_vat} onChange={e => set("amount_before_vat", e.target.value)} className={FIELD} dir="ltr" inputMode="decimal" />
        </div>
        <div>
          <label className={LABEL}>{'מע"מ'}</label>
          <input value={form.vat_amount} onChange={e => set("vat_amount", e.target.value)} className={FIELD} dir="ltr" inputMode="decimal" />
        </div>
        <div>
          <label className={LABEL}>{'סה"כ'}</label>
          <input value={form.total_amount} onChange={e => set("total_amount", e.target.value)} className={FIELD} dir="ltr" inputMode="decimal" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>קטגוריה</label>
          <select value={form.category} onChange={e => set("category", e.target.value)} className={FIELD}>
            <option value="">—</option>
            {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL}>פרויקט</label>
          <select value={form.project_id} onChange={e => set("project_id", e.target.value)} className={FIELD}>
            <option value="">— ללא פרויקט —</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className={LABEL}>תיאור</label>
        <input value={form.description} onChange={e => set("description", e.target.value)} className={FIELD} />
      </div>
      <div>
        <label className={LABEL}>הערות</label>
        <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} className={FIELD} />
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}
      {msg && <p className="text-sm text-emerald-700">{msg}</p>}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-1">
        <button onClick={() => submit("approve")} disabled={busy !== null}
          className="flex-1 min-w-[100px] flex items-center justify-center gap-1.5 bg-emerald-600 text-white py-2.5 rounded-md text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
          {busy === "approve" ? <Loader2 size={15} className="animate-spin" /> : <Check size={16} />} אשר
        </button>
        <button onClick={() => submit("reject")} disabled={busy !== null}
          className="flex-1 min-w-[90px] flex items-center justify-center gap-1.5 border border-red-300 text-red-600 py-2.5 rounded-md text-sm font-semibold hover:bg-red-50 disabled:opacity-50">
          {busy === "reject" ? <Loader2 size={15} className="animate-spin" /> : <X size={16} />} דחה
        </button>
        <button onClick={() => submit("save")} disabled={busy !== null}
          className="flex-1 min-w-[90px] flex items-center justify-center gap-1.5 border border-[#8D775F]/40 text-[#8D775F] py-2.5 rounded-md text-sm font-semibold hover:bg-[#8D775F]/10 disabled:opacity-50">
          {busy === "save" ? <Loader2 size={15} className="animate-spin" /> : <Save size={16} />} שמור
        </button>
        <button onClick={remove} disabled={busy !== null}
          className="shrink-0 flex items-center justify-center gap-1.5 border border-[#2D2926]/15 text-[#2D2926]/50 py-2.5 px-3 rounded-md text-sm hover:text-red-600 hover:border-red-300 disabled:opacity-50">
          {busy === "delete" ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={16} />}
        </button>
      </div>
    </div>
  );
}
