// Single source of truth for the financial_documents column selection used by
// the list / detail / extraction / check routes — including the dedup columns
// (file_hash, possible_duplicate_of) so every response carries them.
export const DOCUMENT_COLUMNS =
  "id, original_filename, mime_type, file_size, status, extraction_status, " +
  "doc_type, direction, vendor_id, vendor_name_raw, doc_number, doc_date, " +
  "amount_before_vat, vat_amount, total_amount, currency, amount_ils, category, " +
  "project_id, description, notes, reviewed_at, reviewed_by, uploaded_by, " +
  "file_hash, possible_duplicate_of, confidence, " +
  "created_at, vendor:vendor_id(name), project:project_id(name)";
