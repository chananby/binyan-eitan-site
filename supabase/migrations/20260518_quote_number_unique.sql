-- ============================================================
-- Binyan Eitan — Quote-number uniqueness
-- Run once in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================
-- Existing state (pre-migration audit):
--   • 11 rows total
--   • quote_number "466" appears 5 times
--   • quote_number "467" appears 5 times
--   • 8 rows beyond the first per group need renumbering
--   • Max numeric quote_number: 467
-- ============================================================

-- 1. Backfill duplicates
-- For every group of rows sharing a quote_number, keep the OLDEST row
-- (lowest created_at) on the existing number; renumber the rest with
-- sequentially increasing values starting at (current max + 1).
DO $$
DECLARE
  next_num int;
  r        record;
BEGIN
  -- Seed allocator with the current numeric maximum + 1 (or 1 if empty).
  SELECT COALESCE(MAX(NULLIF(quote_number, '')::int), 0) + 1
    INTO next_num
    FROM quotes
   WHERE quote_number ~ '^\d+$';

  -- Walk every row that is the 2nd/3rd/… copy of its quote_number,
  -- ordered globally by (quote_number, created_at) so the renumbering
  -- is deterministic and reproducible.
  FOR r IN
    SELECT id
      FROM (
        SELECT id,
               quote_number,
               created_at,
               row_number() OVER (
                 PARTITION BY quote_number
                 ORDER BY created_at ASC, id ASC
               ) AS rn
          FROM quotes
         WHERE quote_number IS NOT NULL
           AND quote_number <> ''
      ) sub
     WHERE sub.rn > 1
     ORDER BY sub.quote_number, sub.created_at, sub.id
  LOOP
    UPDATE quotes
       SET quote_number = next_num::text
     WHERE id = r.id;
    next_num := next_num + 1;
  END LOOP;
END $$;

-- 2. UNIQUE index
-- Partial: ignores NULL/empty quote_numbers so drafts (if any ever exist
-- transiently) can coexist. In the new server-allocation flow nothing
-- should ever be inserted with an empty quote_number, but the partial
-- form keeps us safe against backwards-compat edge cases.
CREATE UNIQUE INDEX IF NOT EXISTS quotes_quote_number_unique
  ON quotes (quote_number)
  WHERE quote_number IS NOT NULL AND quote_number <> '';

-- 3. (Drop the old non-unique lookup index — superseded by the unique one,
--     which can serve the same lookups.)
DROP INDEX IF EXISTS quotes_quote_number_idx;
