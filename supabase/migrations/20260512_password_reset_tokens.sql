-- Single-use, time-limited password reset tokens for /admin forgot-password flow.
-- Token text is never stored — only its sha256 hash. The plaintext token lives
-- only in the email link delivered to the admin's inbox.

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    uuid        NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  token_hash  text        UNIQUE NOT NULL,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Hot-path lookup: verify a presented token by its hash
CREATE INDEX IF NOT EXISTS password_reset_tokens_hash_idx
  ON password_reset_tokens (token_hash);

-- Admin-scoped lookup: count outstanding requests for rate limiting
CREATE INDEX IF NOT EXISTS password_reset_tokens_admin_idx
  ON password_reset_tokens (admin_id, created_at DESC);

-- RLS: deny-all to anon/authenticated. service_role bypasses.
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
