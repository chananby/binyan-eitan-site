-- Unify projects.status: fold the legacy 'planning' value into 'active'
-- and lock the vocabulary down at the DB layer so no future writer can
-- reintroduce the split.
--
-- Motivation (see also: unify-project-status PR):
--   The system historically supported four project statuses
--   (active / planning / completed / paused), but the UI paths that
--   actually surface projects to the admin never distinguished 'planning'
--   from 'active' in a useful way — they inconsistently either treated
--   them as identical (foreman API, ProjectSelect, triage) or as
--   different (ProjectsTab, AdminPortal.activeProjects, CollectionsTab,
--   the Twilio IVR). A 'planning' project therefore appeared as "active"
--   in some screens and "inactive" in others, which surfaced as the bug
--   report that kicked this cleanup off. Because the toggle button on
--   the projects tab only ever writes 'active' or 'inactive', and the
--   POST route hard-codes 'active' on create, the only way a 'planning'
--   row could still exist was legacy insertion via direct SQL / dashboard
--   — precisely the vector the CHECK below closes.
--
-- Backward-compatibility: at the time this migration was written the
-- production DB had zero rows with status='planning' (audited by SELECT).
-- The UPDATE below is therefore a no-op in practice, but is left in as a
-- defensive backstop so re-running this migration on a stale environment
-- still lands on a clean state.
--
-- Runs manually via the Supabase SQL Editor in the following order —
-- see the pre-push report for the exact copy-paste.

-- Step 1 — collapse any legacy 'planning' rows into 'active'.
-- Runs before the CHECK so that rows previously accepted by an unfenced
-- column don't trip the new constraint.
UPDATE projects SET status = 'active' WHERE status = 'planning';

-- Step 2 — lock the vocabulary. The two accepted values match the UI
-- toggle and every screen's filter. Any future migration that wants to
-- introduce a new status (e.g. 'archived') must DROP + re-ADD this
-- constraint so the intent is explicit rather than accidental.
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE projects ADD  CONSTRAINT projects_status_check
  CHECK (status IN ('active', 'inactive'));
