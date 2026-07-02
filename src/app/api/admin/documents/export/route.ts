/**
 * GET /api/admin/documents/export — monthly accountant package.
 *
 * Streams a ZIP containing every matching document file (named
 * <date>_<vendor>_<amount>_<docnum>.<ext>) plus a summary.csv (UTF-8 with
 * BOM so Excel renders Hebrew). Admin only.
 *
 * Params: date_from, date_to (required, YYYY-MM-DD, on doc_date). Documents
 * with no doc_date are matched by created_at instead, so nothing is dropped.
 * status defaults to approved-only; ?status=all also includes pending.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../../lib/admin-auth";
import { israelDayStartISO, israelDayEndISO } from "../../../../../lib/israel-time";
import { applyDocContentFilters, readDocContentFilters } from "../../../../../lib/document-filters";
import { mapWithConcurrency } from "../../../../../lib/concurrency";
import { DOC_TYPE_LABELS, DIRECTION_LABELS, CATEGORY_LABELS } from "../../../../admin/documents/_components/labels";
import JSZip from "jszip";

export const runtime = "nodejs";
export const maxDuration = 60;

const BUCKET = "financial-documents";
const SELECT =
  "id, storage_path, mime_type, status, doc_type, direction, vendor_name_raw, " +
  "doc_number, doc_date, amount_before_vat, vat_amount, total_amount, currency, amount_ils, " +
  "category, linked_document_id, created_at, vendor:vendor_id(name), project:project_id(name)";

interface ExportDoc {
  id: string; storage_path: string; mime_type: string | null; status: string;
  doc_type: string | null; direction: string | null; vendor_name_raw: string | null;
  doc_number: string | null; doc_date: string | null;
  amount_before_vat: number | null; vat_amount: number | null; total_amount: number | null;
  currency: string | null; amount_ils: number | null; category: string | null;
  linked_document_id: string | null; created_at: string;
  vendor: { name: string } | null; project: { name: string } | null;
}

const STATUS_LABELS: Record<string, string> = { approved: "מאושר", pending: "ממתין", rejected: "נדחה" };

function createdYMD(iso: string): string {
  return new Date(iso).toLocaleDateString("sv", { timeZone: "Asia/Jerusalem" });
}
function effDate(d: ExportDoc): string {
  return d.doc_date ?? createdYMD(d.created_at);
}

// Strip filesystem-illegal chars, collapse whitespace to "-", keep Hebrew.
function sanitize(s: string): string {
  return s
    .replace(/[\/\\:*?"<>|]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function buildName(d: ExportDoc, ext: string): string {
  const parts: string[] = [];
  parts.push(effDate(d));                              // always present (doc_date or created)
  const vendor = d.vendor?.name || d.vendor_name_raw;  // skip if missing
  if (vendor) parts.push(sanitize(vendor));
  if (d.total_amount != null) parts.push(String(Math.round(d.total_amount)));
  if (d.doc_number) parts.push(sanitize(d.doc_number));
  const base = parts.filter(Boolean).join("_") || `doc-${d.id.slice(0, 8)}`;
  return `${base}.${ext}`;
}

// Ensure unique names within the ZIP (-2, -3, … before the extension).
function uniqueName(name: string, used: Set<string>): string {
  if (!used.has(name)) { used.add(name); return name; }
  const dot = name.lastIndexOf(".");
  const base = dot >= 0 ? name.slice(0, dot) : name;
  const ext = dot >= 0 ? name.slice(dot) : "";
  let i = 2;
  while (used.has(`${base}-${i}${ext}`)) i++;
  const u = `${base}-${i}${ext}`;
  used.add(u);
  return u;
}

function csvCell(v: string | number | null | undefined): string {
  if (v == null) return "";
  if (typeof v === "number") return String(v);
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export async function GET(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("date_from")?.trim() ?? "";
  const to   = searchParams.get("date_to")?.trim() ?? "";
  // Date range is OPTIONAL now: the accountant package sends a month; the Inbox
  // "download filtered" path may send none → export the whole filtered set.
  const hasRange = /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to);

  // status: absent → approved-only (accountant default, unchanged);
  //   "all" → approved+pending (accountant "include pending");
  //   "any" → every status (Inbox "all statuses" filtered download);
  //   a specific value (approved|pending|rejected) → just that one.
  const statusParam = searchParams.get("status");
  const statuses: string[] | null =
    statusParam === "any" ? null
    : statusParam === "all" ? ["approved", "pending"]
    : statusParam ? [statusParam]
    : ["approved"];

  const content = readDocContentFilters(searchParams);
  const supabase = createServerClient();

  // Base query: status + the shared content filters (same chain as the list).
  const base = () => {
    let q = supabase.from("financial_documents").select(SELECT).is("deleted_at", null);
    if (statuses) q = q.in("status", statuses);
    return applyDocContentFilters(q, content);
  };

  let docs: ExportDoc[];
  if (hasRange) {
    // A: doc_date in range. B: no doc_date → matched by created_at so none drop.
    const { data: dated }   = await base().not("doc_date", "is", null).gte("doc_date", from).lte("doc_date", to);
    const { data: undated } = await base().is("doc_date", null)
      .gte("created_at", israelDayStartISO(from)).lte("created_at", israelDayEndISO(to));
    docs = [...((dated ?? []) as unknown as ExportDoc[]), ...((undated ?? []) as unknown as ExportDoc[])];
  } else {
    const { data } = await base();
    docs = (data ?? []) as unknown as ExportDoc[];
  }

  if (docs.length === 0) {
    return NextResponse.json({ error: "לא נמצאו מסמכים בטווח שנבחר" }, { status: 404 });
  }
  docs.sort((a, b) => effDate(a).localeCompare(effDate(b)));

  const zip = new JSZip();
  const used = new Set<string>();
  const header = ["תאריך", "סוג מסמך", "כיוון", "ספק", "מס' מסמך", 'סכום לפני מע"מ', 'מע"מ', 'סה"כ', "קטגוריה", "פרויקט", "שם קובץ ב-ZIP", "סטטוס"];
  const rows: (string | number | null)[][] = [header];
  let expenses = 0, income = 0;

  // Phase 1 — download all file bytes in parallel (bounded), preserving order.
  // The bottleneck was a serial round-trip per file; this overlaps them. A
  // failed download yields null (no rejection) so one bad file never sinks the
  // whole package — it's simply skipped from the ZIP (still listed in the CSV).
  const blobs = await mapWithConcurrency(docs, 6, async (d) => {
    const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(d.storage_path);
    if (dlErr || !blob) return null;
    try { return new Uint8Array(await blob.arrayBuffer()); }
    catch { return null; }
  });

  // Phase 2 — name + zip + CSV strictly in doc order (unchanged logic): the
  // unique-name reservation and zip insertion order must stay deterministic.
  for (let i = 0; i < docs.length; i++) {
    const d = docs[i];
    const ext = (d.storage_path.split(".").pop() || "bin").toLowerCase();
    const name = uniqueName(buildName(d, ext), used);

    const bytes = blobs[i];
    let storedName = "";
    if (bytes) {
      zip.file(name, bytes);
      storedName = name;
    }

    // Totals sum amount_ils (unified shekel), not the raw total_amount which
    // may be in a foreign currency. Per-row columns still show the original.
    // Evidence rows (linked_document_id set) are excluded from the totals
    // so an invoice + its bank-transfer receipt don't count as ₪X twice —
    // but they DO still ship in the ZIP + CSV as their own rows for the
    // accountant's paper trail.
    if (d.linked_document_id == null) {
      if (d.direction === "expense") expenses += d.amount_ils ?? 0;
      if (d.direction === "income")  income   += d.amount_ils ?? 0;
    }

    rows.push([
      effDate(d),
      d.doc_type ? (DOC_TYPE_LABELS[d.doc_type] ?? d.doc_type) : "",
      d.direction ? (DIRECTION_LABELS[d.direction] ?? d.direction) : "",
      d.vendor?.name || d.vendor_name_raw || "",
      d.doc_number ?? "",
      d.amount_before_vat,
      d.vat_amount,
      d.total_amount,
      d.category ? (CATEGORY_LABELS[d.category] ?? d.category) : "",
      d.project?.name ?? "",
      storedName,
      STATUS_LABELS[d.status] ?? d.status,
    ]);
  }

  rows.push([]);
  rows.push(['סה"כ הוצאות (₪)', expenses, 'סה"כ הכנסות (₪)', income]);

  const csv = "\uFEFF" + rows.map(r => r.map(csvCell).join(",")).join("\r\n");
  zip.file("summary.csv", csv);

  const zipData = await zip.generateAsync({ type: "arraybuffer" });
  return new NextResponse(zipData, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="binyan-eitan-docs_${hasRange ? `${from}_${to}` : "filtered"}.zip"`,
      "Content-Length": String(zipData.byteLength),
      "Cache-Control": "private, no-store",
    },
  });
}
