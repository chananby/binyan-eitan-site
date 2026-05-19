-- ============================================================
-- Binyan Eitan — Cleanup of broken empty-quote_number rows
-- Run once in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================
-- Cleanup of 6 broken test quotes from the regression introduced in de36893.
-- These rows have quote_number = '' due to a bug in the PATCH handler that
-- overwrote the server-allocated number when the client's JSON blob was empty.
-- The fix is shipped in this same commit; these rows are pre-existing test
-- data (customer names: 'בדיקה', 'vcxcxv', or empty) with no business value.
-- Safe to delete.
--
-- After this migration runs, the partial UNIQUE index on quote_number
-- (created by 20260518_quote_number_unique.sql) is unchanged — it already
-- ignored empty/null values, so the cleanup just removes orphans.
-- ============================================================

DELETE FROM public.quotes
WHERE quote_number = '' OR quote_number IS NULL;
