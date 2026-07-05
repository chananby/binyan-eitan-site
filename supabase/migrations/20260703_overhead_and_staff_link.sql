-- ============================================================
-- Binyan Eitan — Overhead allocation + vendor↔staff link (STEP A)
--
-- Two independent additions bundled because both feed the salary-split /
-- overhead-allocation feature family and it's cleaner to run one migration
-- than two:
--
--   1. financial_documents.include_in_actuals
--        Some docs (archived paperwork, informational uploads) belong in
--        the inbox for the paper trail but shouldn't count against any
--        project's actual expense. Default TRUE so the current data
--        keeps behaving exactly as it does today; only newly-flagged
--        rows drop out of the rollup.
--
--   2. vendors.staff_id
--        Nullable FK from vendors → staff, used later by the auto-split
--        of salary docs (route 2 = split by attendance). This migration
--        only creates the column; the mapping UI + auto-split ships in
--        a later round. External vendors (suppliers, subcontractors,
--        one-off payees) keep staff_id=NULL forever, which is normal.
--
-- Run once in Supabase SQL Editor (Dashboard → SQL Editor).
-- Idempotent: every statement is guarded by IF NOT EXISTS.
-- ============================================================

-- ── 1. include_in_actuals on financial_documents ────────────────────────
ALTER TABLE public.financial_documents
  ADD COLUMN IF NOT EXISTS include_in_actuals boolean NOT NULL DEFAULT true;

-- Partial index — the "exclude" case is expected to be rare, so a partial
-- index on FALSE keeps it tiny and speeds up the "which docs are excluded"
-- audit query without paying for the common (TRUE) case.
CREATE INDEX IF NOT EXISTS findocs_excluded_idx
  ON public.financial_documents (id)
  WHERE include_in_actuals = false AND deleted_at IS NULL;

-- ── 2. staff_id on vendors ──────────────────────────────────────────────
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id);

-- Partial index — most vendors will stay staff_id=NULL (external suppliers).
-- Only the ~10 vendors that turn out to be workers need to be looked up
-- reverse; a partial index skips the majority.
CREATE INDEX IF NOT EXISTS vendors_staff_id_idx
  ON public.vendors (staff_id)
  WHERE staff_id IS NOT NULL AND deleted_at IS NULL;
