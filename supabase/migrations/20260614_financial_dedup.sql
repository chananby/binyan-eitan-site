-- 20260614_financial_dedup.sql
-- ============================================================
-- Binyan Eitan — financial-documents duplicate detection
-- Run once in Supabase SQL Editor (Dashboard → SQL Editor).
-- ============================================================
-- Adds the two columns the dedup feature relies on:
--
--   file_hash             — SHA-256 of the uploaded file bytes (hex). Computed
--                           server-side on every upload (admin + foreman) and
--                           used for the hard, blocking duplicate check before
--                           an upload is accepted.
--   possible_duplicate_of — soft content-match flag set AFTER AI extraction
--                           when another live document shares the same
--                           vendor_id + total_amount + doc_date. Non-blocking;
--                           surfaced as a "⚠ ייתכן כפול" chip in the inbox.
--
-- NOT to be confused with the existing `linked_document_id` column, which is
-- reserved for future cross-referencing ("הצלבות") and is intentionally left
-- untouched here.
--
-- The partial index on file_hash (deleted_at IS NULL) backs the hard
-- duplicate lookup — only live documents participate, so re-uploading a file
-- whose prior copy was soft-deleted (e.g. via "החלף") is allowed.
-- ============================================================

ALTER TABLE financial_documents ADD COLUMN file_hash text;

ALTER TABLE financial_documents ADD COLUMN possible_duplicate_of uuid
  REFERENCES financial_documents(id);

CREATE INDEX findocs_hash_idx ON financial_documents(file_hash)
  WHERE deleted_at IS NULL;
