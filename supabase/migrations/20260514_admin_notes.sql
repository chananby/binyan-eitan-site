-- ============================================================
-- Binyan Eitan — Admin personal notes
-- A per-admin scratchpad surfaced inside /admin/hub for capturing
-- service-access hints (account names, where 2FA codes live, etc.)
-- DO NOT store secrets here — only hints/pointers.
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_notes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    uuid        NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  title       text        NOT NULL,
  body        text        NOT NULL DEFAULT '',
  pinned      boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Hot-path: list notes for the logged-in admin, pinned first then newest
CREATE INDEX IF NOT EXISTS admin_notes_admin_idx
  ON admin_notes (admin_id, pinned DESC, updated_at DESC);

-- Reuse the set_updated_at() trigger function created in 20260513_quotes_table.sql
DROP TRIGGER IF EXISTS admin_notes_set_updated_at ON admin_notes;
CREATE TRIGGER admin_notes_set_updated_at
  BEFORE UPDATE ON admin_notes
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- RLS: deny-all anon/authenticated; service_role bypasses (server enforces auth)
ALTER TABLE admin_notes ENABLE ROW LEVEL SECURITY;
