-- Split a single financial document across multiple projects.
-- One doc, N split rows: each row carries the project + the ILS amount
-- that project owes on the invoice. The single-project case still lives
-- in financial_documents.project_id — a document is EITHER single
-- (project_id set, no splits) OR split (project_id NULL, one or more
-- splits). The invariant is enforced at the API layer (POST /splits
-- clears project_id; PATCH document rejects setting project_id when
-- splits exist), so the rollup never has to worry about double-counting.
--
-- Why a table instead of a JSON column on financial_documents:
--   • GROUP BY project_id is trivial for the budget-actual rollup.
--   • REFERENCES projects(id) gives us integrity for free — no orphan
--     splits pointing to a deleted project.
--   • soft-delete pattern lines up with the rest of the schema
--     (financial_documents, staff, projects) — undo works by clearing
--     deleted_at rather than re-inserting.
--
-- Runs manually via the Supabase SQL Editor. The whole block is one
-- transaction so a mid-run failure leaves nothing behind.

BEGIN;

CREATE TABLE IF NOT EXISTS document_project_splits (
  id           uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Cascade the child rows when the parent doc is HARD-deleted (rare —
  -- financial_documents uses soft-delete via deleted_at, and the API
  -- honours that). If someone runs a hard DELETE from the SQL editor
  -- we still want the splits to go with it rather than dangle.
  document_id  uuid           NOT NULL REFERENCES financial_documents(id) ON DELETE CASCADE,
  -- No ON DELETE CASCADE on the project side — a project delete is a
  -- deliberate admin action and orphaning splits would silently lose
  -- money data. Postgres will refuse the delete instead, which is what
  -- we want (matches the pattern on financial_documents.project_id).
  project_id   uuid           NOT NULL REFERENCES projects(id),
  amount       numeric(12, 2) NOT NULL CHECK (amount > 0),
  -- sort_order lets the UI persist row order without depending on
  -- created_at (rows created in the same PATCH share a timestamp).
  sort_order   int            NOT NULL DEFAULT 0,
  created_at   timestamptz    NOT NULL DEFAULT now(),
  deleted_at   timestamptz
);

-- Partial indexes on the "live" rows only — the rollup queries never
-- touch deleted rows, and 90% of documents will never be split, so
-- the indexes stay small.
CREATE INDEX IF NOT EXISTS docsplit_doc_idx
  ON document_project_splits (document_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS docsplit_proj_idx
  ON document_project_splits (project_id)
  WHERE deleted_at IS NULL;

-- No RLS. Same as financial_documents — every endpoint that touches
-- this table sits behind isAdminAuthedFromRequest, and the API uses
-- the service-role client (which bypasses RLS anyway).

COMMIT;
