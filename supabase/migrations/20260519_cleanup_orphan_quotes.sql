-- ============================================================
-- Binyan Eitan — Cleanup of orphan quotes (no customer name)
-- Run once in Supabase SQL Editor after the fix deploys.
-- ============================================================
-- Six orphan rows were created by the previous behavior where
-- render() would trigger a cloud save on iframe init, allocating
-- a quote_number for a quote the user never edited. The fix
-- (dirty flag in quote-generator.html) prevents this going forward.
--
-- Affected rows (verified before cleanup):
--   quote_number 466, 468, 469, 470, 471, 477 with empty customer_name
--   and identical created_at / updated_at.
-- ============================================================

DELETE FROM public.quotes
WHERE quote_number IN ('466', '468', '469', '470', '471', '477')
  AND (customer_name IS NULL OR customer_name = '')
  AND created_at = updated_at;
