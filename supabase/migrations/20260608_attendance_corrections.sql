-- ============================================================
-- Binyan Eitan — Worker correction requests
-- Run once in Supabase SQL Editor (Dashboard → SQL Editor).
-- ============================================================
-- A worker can now flag an existing attendance row as incorrect and
-- suggest a corrected time + reason. Admin reviews from the attendance
-- tab and either approves (which updates the underlying attendance row
-- with full audit) or rejects.
--
-- Replaces the previous workaround where workers added a new "missed
-- report" row whenever an existing row was wrong — which left the wrong
-- row in place and the admin had to manually pair the two.
--
-- One pending correction per attendance_id at a time (UI-enforced via
-- the workflow; we don't add a partial unique because rejected/approved
-- rows can stack while the next pending is created).
-- ============================================================

CREATE TABLE IF NOT EXISTS attendance_corrections (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_id  uuid        NOT NULL REFERENCES attendance(id),
  staff_id       uuid        NOT NULL REFERENCES staff(id),
  proposed_time  text        NULL,   -- "HH:MM" the worker says is correct
  reason         text        NOT NULL,
  status         text        NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'approved', 'rejected')),
  resolved_by    text        NULL,   -- "admin:<name>" once the admin acts
  resolved_at    timestamptz NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Hot path: admin polls for outstanding requests. Partial index keeps
-- this index tiny and writes cheap once a request leaves "pending".
CREATE INDEX IF NOT EXISTS attendance_corrections_pending_idx
  ON attendance_corrections (status)
  WHERE status = 'pending';

-- Look-up by attendance row — used by /api/worker/history to decorate the
-- worker's records with their current correction status.
CREATE INDEX IF NOT EXISTS attendance_corrections_attendance_id_idx
  ON attendance_corrections (attendance_id);

-- RLS: enabled with no policies. Same defense-in-depth posture as the rest
-- of the app — anon/authenticated roles get zero access; service_role
-- (used by every API route) bypasses RLS.
ALTER TABLE attendance_corrections ENABLE ROW LEVEL SECURITY;
