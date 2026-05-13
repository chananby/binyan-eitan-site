-- ============================================================
-- Binyan Eitan — Quotes table
-- Run once in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. First enable the extension that gin_trgm_ops needs
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Now create the table (idempotent — skips if exists)
CREATE TABLE IF NOT EXISTS quotes (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number    text,
  customer_name   text,
  issue_date      date,
  total_before_vat numeric,
  status          text        NOT NULL DEFAULT 'draft',
  data            jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_by      uuid        REFERENCES admins(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS quotes_updated_at_idx      ON quotes (updated_at DESC);
CREATE INDEX IF NOT EXISTS quotes_status_idx          ON quotes (status);
CREATE INDEX IF NOT EXISTS quotes_quote_number_idx    ON quotes (quote_number);
CREATE INDEX IF NOT EXISTS quotes_customer_trgm_idx   ON quotes USING gin (customer_name gin_trgm_ops);

-- 4. Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS quotes_set_updated_at ON quotes;
CREATE TRIGGER quotes_set_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
