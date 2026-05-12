-- Admin accounts table for /admin (password tab).
-- Replaces single ADMIN_PASSWORD env var with per-user email/password auth.
-- Foreman PIN flow (staff.pin) is unaffected by this migration.

CREATE TABLE IF NOT EXISTS admins (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email           text        UNIQUE NOT NULL,
  name            text        NOT NULL,
  password_hash   text        NOT NULL,
  active          boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  last_login_at   timestamptz
);

-- Email lookup must be fast (it's on the auth hot path)
CREATE INDEX IF NOT EXISTS admins_email_active_idx
  ON admins (email) WHERE active = true;

-- RLS: no policies. With RLS enabled and no permissive policy,
-- anon and authenticated roles get zero access. The service_role
-- key (used by our server) bypasses RLS, so server-side queries
-- continue to work.
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
