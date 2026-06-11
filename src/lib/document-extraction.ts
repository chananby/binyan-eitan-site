/**
 * Financial-document AI extraction + vendor matching.
 *
 * extractDocumentData() sends the raw bytes of an uploaded document to the
 * Anthropic API and parses a fixed JSON shape back. matchVendor() reconciles
 * the extracted vendor against the existing `vendors` table (tax-id match →
 * AI-suggested id → name/alias similarity → create new), enriching aliases
 * on partial matches. extractAndPersist() ties both together against one
 * financial_documents row and writes the result back.
 *
 * Server-only: imports the Anthropic SDK and uses ANTHROPIC_API_KEY. The
 * client is constructed lazily inside getClient() so the build passes when
 * the key is absent (e.g. in Codespaces); a missing key surfaces as a clear
 * runtime error that is caught and recorded as extraction_status='failed'.
 */

import Anthropic from "@anthropic-ai/sdk";
import { matchVendor, type VendorListItem } from "./vendor-matching";

// User-pinned model for this module (do not silently upgrade).
const MODEL = "claude-sonnet-4-20250514";
const BUCKET = "financial-documents";

// Columns returned to the caller after an update (mirrors the documents routes,
// including the vendor/project name joins).
const RETURN_COLUMNS =
  "id, original_filename, mime_type, file_size, status, extraction_status, " +
  "doc_type, direction, vendor_id, vendor_name_raw, doc_number, doc_date, " +
  "amount_before_vat, vat_amount, total_amount, currency, category, " +
  "project_id, description, notes, reviewed_at, reviewed_by, uploaded_by, " +
  "created_at, vendor:vendor_id(name), project:project_id(name)";

// API media types accepted as `image` blocks (HEIC/HEIF are NOT supported by
// the API directly — handled as a clear failure below).
const IMAGE_MEDIA_TYPE: Record<string, "image/jpeg" | "image/png" | "image/webp"> = {
  "image/jpeg": "image/jpeg",
  "image/jpg":  "image/jpeg",
  "image/png":  "image/png",
  "image/webp": "image/webp",
};

export interface ExtractedFields {
  doc_type: string | null;
  direction: string | null;
  vendor_name_raw: string | null;
  vendor_tax_id: string | null;
  matched_vendor_id: string | null;
  doc_number: string | null;
  doc_date: string | null;
  amount_before_vat: number | null;
  vat_amount: number | null;
  total_amount: number | null;
  currency: string | null;
  category: string | null;
  description: string | null;
  confidence: string | null;
}

export interface ExtractionResult {
  status: "done" | "failed";
  fields: ExtractedFields | null;
  raw: unknown;        // stored verbatim in extraction_raw
  error?: string;
}

const SYSTEM_PROMPT =
`אתה מחלץ נתונים ממסמכים פיננסיים ישראליים (חשבוניות מס, קבלות, חשבוניות-קבלה, אישורי העברה בנקאית/זה"ב, דרישות תשלום, חשבונות עסקה, צ'קים, תעודות משלוח). החזר JSON בלבד, ללא טקסט נוסף וללא backticks, במבנה:
{
  "doc_type": "invoice|receipt|invoice_receipt|bank_transfer|payment_request|proforma|check|delivery_note|other",
  "direction": "income|expense",
  "vendor_name_raw": "השם כפי שמופיע במסמך",
  "vendor_tax_id": "ח.פ./עוסק מורשה אם מופיע, אחרת null",
  "matched_vendor_id": "id מהרשימה אם זוהתה התאמה ודאית, אחרת null",
  "doc_number": "...", "doc_date": "YYYY-MM-DD",
  "amount_before_vat": 0, "vat_amount": 0, "total_amount": 0,
  "currency": "ILS",
  "category": "fuel|materials|subcontractor|equipment|office|salary|client_payment|other",
  "description": "תקציר בעברית במשפט אחד",
  "confidence": "high|medium|low"
}
כללי direction: מסמך שבו בניין איתן בע"מ היא המשלמת/המקבלת שירות → expense; מסמך שבניין איתן הפיקה ללקוח או אישור כסף נכנס → income.
שדה לא ברור → null, אל תנחש סכומים.`;

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY חסר — הגדר אותו בסביבה כדי להפעיל חילוץ מסמכים");
  }
  return new Anthropic({ apiKey });
}

function toNumberOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v.replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function strOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" || t.toLowerCase() === "null" ? null : t;
}

// Parse the model's reply: strip ``` fences if present, JSON.parse, and
// coerce every field to its declared type (amounts numeric-or-null, dates to
// a strict YYYY-MM-DD or null). Throws on unparseable JSON.
function parseFields(text: string): ExtractedFields {
  let body = text.trim();
  if (body.startsWith("```")) {
    body = body.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }
  const raw = JSON.parse(body) as Record<string, unknown>;

  const date = strOrNull(raw.doc_date);
  return {
    doc_type:          strOrNull(raw.doc_type),
    direction:         strOrNull(raw.direction),
    vendor_name_raw:   strOrNull(raw.vendor_name_raw),
    vendor_tax_id:     strOrNull(raw.vendor_tax_id),
    matched_vendor_id: strOrNull(raw.matched_vendor_id),
    doc_number:        strOrNull(raw.doc_number),
    doc_date:          date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
    amount_before_vat: toNumberOrNull(raw.amount_before_vat),
    vat_amount:        toNumberOrNull(raw.vat_amount),
    total_amount:      toNumberOrNull(raw.total_amount),
    currency:          strOrNull(raw.currency) ?? "ILS",
    category:          strOrNull(raw.category),
    description:       strOrNull(raw.description),
    confidence:        strOrNull(raw.confidence),
  };
}

export async function extractDocumentData(
  bytes: ArrayBuffer,
  mimeType: string | null,
  vendorList: VendorListItem[],
): Promise<ExtractionResult> {
  const mime = (mimeType ?? "").toLowerCase();

  // HEIC/HEIF can't be sent to the API directly — server-side conversion is a
  // future improvement. Fail clearly rather than sending garbage.
  if (mime === "image/heic" || mime === "image/heif") {
    return {
      status: "failed",
      fields: null,
      raw: { error: "HEIC/HEIF אינו נתמך ישירות ב-API — נדרשת המרה (שיפור עתידי)", mime_type: mime },
      error: "פורמט HEIC/HEIF אינו נתמך לחילוץ אוטומטי",
    };
  }

  const isPdf = mime === "application/pdf";
  const imageType = IMAGE_MEDIA_TYPE[mime];
  if (!isPdf && !imageType) {
    return {
      status: "failed",
      fields: null,
      raw: { error: "סוג קובץ לא נתמך לחילוץ", mime_type: mime },
      error: "סוג קובץ לא נתמך לחילוץ",
    };
  }

  try {
    const data = Buffer.from(bytes).toString("base64");
    const docBlock = isPdf
      ? { type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf" as const, data } }
      : { type: "image" as const, source: { type: "base64" as const, media_type: imageType!, data } };

    const vendorsForPrompt = vendorList.map(v => ({
      id: v.id, name: v.name, tax_id: v.tax_id, aliases: v.aliases ?? [],
    }));
    const userText =
      "רשימת ספקים קיימים (השתמש ב-id רק אם ההתאמה ודאית, אחרת matched_vendor_id=null):\n" +
      JSON.stringify(vendorsForPrompt) +
      "\n\nחלץ את הנתונים מהמסמך המצורף והחזר אך ורק את ה-JSON לפי המבנה שהוגדר.";

    const client = getClient();
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: [docBlock, { type: "text", text: userText }] }],
    });

    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map(b => b.text)
      .join("")
      .trim();

    let fields: ExtractedFields;
    try {
      fields = parseFields(text);
    } catch (parseErr) {
      return {
        status: "failed",
        fields: null,
        raw: { error: "פרסור תשובת ה-AI נכשל", detail: String(parseErr), model_text: text },
        error: "תשובת ה-AI אינה JSON תקין",
      };
    }

    return { status: "done", fields, raw: msg };
  } catch (err) {
    return {
      status: "failed",
      fields: null,
      raw: { error: "קריאת ה-AI נכשלה", detail: String(err) },
      error: String(err),
    };
  }
}

export interface PersistResult {
  ok: boolean;
  status: "done" | "failed";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  document?: any;
  error?: string;
  httpStatus?: number;
}

// Run extraction + vendor matching against one document row and write the
// result back. Used by both the upload route (inline) and the retry endpoint.
export async function extractAndPersist(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  documentId: string,
): Promise<PersistResult> {
  const { data: doc, error: fetchErr } = await supabase
    .from("financial_documents")
    .select("id, storage_path, mime_type, status")
    .eq("id", documentId)
    .is("deleted_at", null)
    .maybeSingle();
  if (fetchErr) return { ok: false, status: "failed", error: fetchErr.message, httpStatus: 500 };
  if (!doc) return { ok: false, status: "failed", error: "מסמך לא נמצא", httpStatus: 404 };
  // Don't overwrite a document the admin already approved.
  if (doc.status === "approved") {
    return { ok: false, status: "failed", error: "מסמך כבר אושר — לא ניתן לחלץ מחדש", httpStatus: 409 };
  }

  const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(doc.storage_path);
  if (dlErr || !blob) {
    const { data: updated } = await supabase
      .from("financial_documents")
      .update({ extraction_status: "failed", extraction_raw: { error: "שליפת הקובץ מהאחסון נכשלה", detail: dlErr?.message ?? null } })
      .eq("id", documentId)
      .select(RETURN_COLUMNS)
      .single();
    return { ok: false, status: "failed", document: updated, error: "שליפת הקובץ נכשלה" };
  }

  const { data: vendors } = await supabase
    .from("vendors")
    .select("id, name, tax_id, aliases")
    .is("deleted_at", null);
  const vendorList: VendorListItem[] = vendors ?? [];

  const bytes = await blob.arrayBuffer();
  const result = await extractDocumentData(bytes, doc.mime_type, vendorList);

  if (result.status === "failed" || !result.fields) {
    const { data: updated } = await supabase
      .from("financial_documents")
      .update({ extraction_status: "failed", extraction_raw: result.raw })
      .eq("id", documentId)
      .select(RETURN_COLUMNS)
      .single();
    return { ok: false, status: "failed", document: updated, error: result.error };
  }

  const f = result.fields;
  const vendor_id = await matchVendor(supabase, f, vendorList);

  const { data: updated, error: updErr } = await supabase
    .from("financial_documents")
    .update({
      doc_type:          f.doc_type,
      direction:         f.direction,
      vendor_id,
      vendor_name_raw:   f.vendor_name_raw,
      doc_number:        f.doc_number,
      doc_date:          f.doc_date,
      amount_before_vat: f.amount_before_vat,
      vat_amount:        f.vat_amount,
      total_amount:      f.total_amount,
      currency:          f.currency,
      category:          f.category,
      description:       f.description,
      extraction_raw:    result.raw,
      extraction_status: "done",
    })
    .eq("id", documentId)
    .select(RETURN_COLUMNS)
    .single();
  if (updErr) return { ok: false, status: "failed", error: updErr.message, httpStatus: 500 };

  return { ok: true, status: "done", document: updated };
}
