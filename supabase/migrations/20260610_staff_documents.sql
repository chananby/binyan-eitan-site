-- ============================================================
-- Binyan Eitan — staff_documents (sensitive worker file metadata)
-- Run once in Supabase SQL Editor (Dashboard → SQL Editor).
-- ============================================================
-- Tracks per-worker uploaded documents (ID cards, contracts, certificates).
-- The file *bytes* live in the private Supabase Storage bucket
-- `staff-documents`; this table stores only metadata + the path inside
-- the bucket, so a row alone reveals nothing without service-role access.
--
-- Bucket setup (MANUAL, in Supabase Dashboard → Storage):
--   1. Create new bucket named `staff-documents`
--   2. Public toggle = OFF (private — only service_role can read/write)
--   3. No allowed MIME types restriction (the API enforces a whitelist)
--   4. File size limit: leave default; API enforces 10 MB cap
--
-- Bucket folder layout written by the upload route:
--   <staff_id>/<random-uuid>.<ext>
-- So deleting a worker (soft or hard) collocates their files under one
-- prefix for easy cleanup if ever needed.
--
-- Access model:
--   • All four endpoints (POST list, GET list, GET download, DELETE) are
--     gated by isAdminAuthedFromRequest. No foreman / worker path ever
--     touches this table or bucket.
--   • Download is server-proxy (route streams the file body back). NO
--     signed URLs are issued, so a URL cannot leak past the admin session.
--
-- RLS posture matches every other table in the project: enabled with no
-- policies, so anon & authenticated roles get zero access; the API
-- queries via the service_role key, which bypasses RLS.
-- ============================================================

CREATE TABLE IF NOT EXISTS staff_documents (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id     uuid        NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  file_path    text        NOT NULL,   -- <staff_id>/<uuid>.<ext> within the staff-documents bucket
  file_name    text        NOT NULL,   -- human-supplied display name (e.g. "ת.ז. — קדמי")
  mime_type    text        NULL,       -- captured at upload, used by download for Content-Type
  file_size    integer     NULL,       -- bytes; informational only
  uploaded_by  text        NULL,       -- "admin:<name>" — populated at upload time
  uploaded_at  timestamptz NOT NULL DEFAULT now()
);

-- Single hot path: list all documents for one worker, newest first.
CREATE INDEX IF NOT EXISTS staff_documents_staff_id_idx
  ON staff_documents (staff_id, uploaded_at DESC);

-- No GRANTs needed: RLS enabled with no policies → anon/authenticated
-- get nothing, the API uses service_role which bypasses RLS. Pattern
-- follows 20260608_attendance_corrections.sql and 20260608_staff_rates.sql.
ALTER TABLE staff_documents ENABLE ROW LEVEL SECURITY;
