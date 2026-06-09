-- ============================================================
-- Binyan Eitan — staff: bank details (admin-only) + employment_end_date
-- Run once in Supabase SQL Editor (Dashboard → SQL Editor).
-- ============================================================
-- 6 nullable columns added to staff:
--
--   bank_name, bank_branch, bank_account, bank_account_owner, bank_iban
--     → sensitive payroll info. The application code SELECTs them only on
--       admin-authed routes (admin/staff GET admin path, POST, PATCH,
--       export). The foreman path in /api/admin/staff uses a narrow
--       SELECT that does NOT include these columns, and every non-admin
--       staff lookup (worker portal, attendance, twilio, foreman-auth,
--       seed) selects only basic identity fields.
--
--   employment_end_date
--     → informational date a worker stopped working with the company.
--       Independent of `active` — a worker can be active=true with an
--       end date in the past (admin not yet flipped the toggle) or
--       active=false with no end date. Neither implies the other; do
--       not derive one from the other in code.
--
-- No GRANTs needed: staff has RLS enabled with no policies, so anon &
-- authenticated roles get zero access; the server queries via the
-- service_role key (bypasses RLS) and inherits column-level access from
-- the table grant. Pattern follows 20260607_attendance_edit_audit_soft_delete.sql
-- which documented the same posture.
-- ============================================================

ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS bank_name           TEXT,
  ADD COLUMN IF NOT EXISTS bank_branch         TEXT,
  ADD COLUMN IF NOT EXISTS bank_account        TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_owner  TEXT,
  ADD COLUMN IF NOT EXISTS bank_iban           TEXT,
  ADD COLUMN IF NOT EXISTS employment_end_date DATE;
