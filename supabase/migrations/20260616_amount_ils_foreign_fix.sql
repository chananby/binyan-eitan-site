-- 20260616_amount_ils_foreign_fix.sql
-- ============================================================
-- Binyan Eitan — fix the amount_ils backfill for foreign-currency docs
-- Run once in Supabase SQL Editor (Dashboard → SQL Editor).
-- ============================================================
-- The initial backfill in 20260616_amount_ils.sql copied total_amount into
-- amount_ils for EVERY row (it assumed all existing docs were shekel). That
-- assumption was wrong for documents the AI had already tagged as foreign
-- currency (currency <> 'ILS'): their amount_ils got the FOREIGN nominal
-- (e.g. a 51.84 EUR invoice ended up with amount_ils = 51.84, which is not
-- its shekel value), so money rollups would treat €51.84 as ₪51.84.
--
-- Reset amount_ils back to NULL for those documents so the admin re-enters the
-- real shekel value. We only touch rows where amount_ils still EQUALS
-- total_amount — the backfill's signature — so any shekel value an admin has
-- already typed (which would differ from total_amount) is left untouched.
--
-- NULL currency = shekel (the default) and is intentionally NOT matched:
-- `currency <> 'ILS'` is NULL (not true) for those rows, so they are skipped.
--
-- After this runs, each foreign doc shows an empty "ערך בשקל" field and is
-- flagged "חסר: ערך בשקל" (missingRequired) until the value is entered.
-- ============================================================

UPDATE financial_documents
  SET amount_ils = NULL
  WHERE currency IS NOT NULL
    AND currency <> 'ILS'
    AND deleted_at IS NULL
    AND amount_ils = total_amount;
