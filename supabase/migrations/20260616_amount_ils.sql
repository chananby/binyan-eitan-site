-- 20260616_amount_ils.sql
-- ============================================================
-- Binyan Eitan — foreign-currency support for financial documents
-- Run once in Supabase SQL Editor (Dashboard → SQL Editor).
-- ============================================================
-- Adds amount_ils: the document's value in ILS, used for ALL money rollups
-- (budget-actual, month totals, accountant export) so mixed-currency docs
-- sum on one unified shekel figure instead of raw total_amount (which is in
-- the document's own currency).
--
--   currency = ILS  → amount_ils = total_amount (kept in sync by the app).
--   currency ≠ ILS  → amount_ils is entered manually by the admin (the AI
--                     extracts the original currency + total_amount only).
--
-- IMPORTANT — backfill: every existing row predates the currency field being
-- exposed, so all existing documents are effectively shekel. We backfill
-- amount_ils = total_amount for them; without this, every historical rollup
-- would drop to 0 the moment the code starts summing amount_ils.
-- ============================================================

ALTER TABLE financial_documents ADD COLUMN amount_ils numeric(12,2);

UPDATE financial_documents
  SET amount_ils = total_amount
  WHERE amount_ils IS NULL;
