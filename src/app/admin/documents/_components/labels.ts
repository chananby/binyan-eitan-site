// Shared Hebrew labels, status styling, formatters, and the DocRow shape for
// the financial-documents inbox + detail screens. Kept in one place so both
// pages render identical chips and value labels.

export interface DocRow {
  id: string;
  original_filename: string | null;
  mime_type: string | null;
  status: string;            // pending | approved | rejected
  extraction_status: string; // pending | done | failed
  doc_type: string | null;
  direction: string | null;
  vendor_id: string | null;
  vendor_name_raw: string | null;
  doc_number: string | null;
  doc_date: string | null;
  amount_before_vat: number | null;
  vat_amount: number | null;
  total_amount: number | null;
  currency: string | null;
  category: string | null;
  project_id: string | null;
  description: string | null;
  notes: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  uploaded_by?: string | null;
  file_hash?: string | null;
  possible_duplicate_of?: string | null;
  confidence?: string | null;   // high | medium | low
  created_at: string;
  vendor: { name: string } | null;
  project: { name: string } | null;
}

export const DOC_TYPE_LABELS: Record<string, string> = {
  invoice:         "חשבונית מס",
  receipt:         "קבלה",
  invoice_receipt: "חשבונית-קבלה",
  bank_transfer:   "העברה בנקאית",
  payment_request: "דרישת תשלום",
  proforma:        "חשבון עסקה",
  check:           "צ'ק",
  delivery_note:   "תעודת משלוח",
  other:           "אחר",
};

export const DIRECTION_LABELS: Record<string, string> = {
  income:  "הכנסה",
  expense: "הוצאה",
};

export const CATEGORY_LABELS: Record<string, string> = {
  fuel:           "דלק",
  materials:      "חומרים",
  subcontractor:  "קבלן משנה",
  equipment:      "ציוד",
  office:         "משרד",
  salary:         "שכר",
  overhead:       "תקורה",
  client_payment: "תשלום מלקוח",
  other:          "אחר",
};

// Ordered options for the editable selects on the detail screen.
export const DOC_TYPE_OPTIONS = Object.keys(DOC_TYPE_LABELS);
export const DIRECTION_OPTIONS = Object.keys(DIRECTION_LABELS);
export const CATEGORY_OPTIONS = Object.keys(CATEGORY_LABELS);

export interface StatusChip {
  label: string;
  className: string;
  warn?: boolean;
}

// A failed extraction is surfaced first (grey + ⚠) regardless of status — the
// row needs a retry before it can be reviewed. Otherwise chip by review status.
export function statusChip(doc: Pick<DocRow, "status" | "extraction_status">): StatusChip {
  if (doc.extraction_status === "failed") {
    return { label: "חילוץ נכשל", className: "bg-gray-200 text-gray-600", warn: true };
  }
  switch (doc.status) {
    case "approved": return { label: "מאושר", className: "bg-emerald-100 text-emerald-700" };
    case "rejected": return { label: "נדחה",  className: "bg-red-100 text-red-700" };
    default:         return { label: "ממתין", className: "bg-amber-100 text-amber-700" };
  }
}

export function fmtCurrency(n: number | null | undefined, currency = "ILS"): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("he-IL", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// Best display name: matched vendor → raw extracted name → filename → fallback.
export function displayVendor(doc: DocRow): string {
  return doc.vendor?.name || doc.vendor_name_raw || doc.original_filename || "מסמך ללא שם";
}

// ── Review flags ──────────────────────────────────────────────────────────────
// Single source of truth for what needs a human's attention on a document.
// Drives the review-queue banner, the queue sort order, and the
// "approve all high-confidence" eligibility (a flagged doc is never auto-approved).
export interface DocFlag {
  key: "failed" | "missing" | "duplicate" | "low_confidence";
  label: string;
  severity: "error" | "warn";
}

// Required fields for a clean approval: vendor, total, doc_date, direction.
export function missingRequired(doc: DocRow): string[] {
  const missing: string[] = [];
  if (!doc.vendor_id) missing.push("ספק");
  if (doc.total_amount == null) missing.push("סכום");
  if (!doc.doc_date) missing.push("תאריך");
  if (!doc.direction) missing.push("כיוון");
  return missing;
}

export function documentFlags(doc: DocRow): DocFlag[] {
  const flags: DocFlag[] = [];
  if (doc.extraction_status === "failed") {
    flags.push({ key: "failed", label: "חילוץ נכשל", severity: "error" });
  }
  const missing = missingRequired(doc);
  if (missing.length > 0) {
    flags.push({ key: "missing", label: `חסר: ${missing.join(", ")}`, severity: "error" });
  }
  if (doc.possible_duplicate_of) {
    flags.push({ key: "duplicate", label: "ייתכן כפול", severity: "warn" });
  }
  if (doc.confidence === "low") {
    flags.push({ key: "low_confidence", label: "ביטחון נמוך", severity: "warn" });
  }
  return flags;
}

// Eligible for "approve all": high confidence AND no flags at all.
export function isCleanHighConfidence(doc: DocRow): boolean {
  return doc.confidence === "high" && documentFlags(doc).length === 0;
}
