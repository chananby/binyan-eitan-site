-- staff.language — worker's preferred UI language for the attendance flow.
--
-- Until now the picked language lived only in localStorage("att_lang"), so it
-- vanished on a new device / cleared browser and the worker fell back to
-- Hebrew. We persist it server-side so the choice follows the worker, and so
-- the admin can see at a glance which language each worker is operating in.
--
-- Allowed values mirror SUPPORTED_LANGS in src/app/components/attendance/i18n.ts
-- (he, en, ru, si, zh, hi). NOT NULL with default 'he' so existing rows light
-- up sanely. The application-level validator on /api/worker/lang-pref + the
-- admin PATCH stays the gatekeeper for new writes.
--
-- Migration was applied directly in the Supabase dashboard during the
-- staff-language PR; this file is the retroactive repo copy required by
-- DEVELOPMENT_PRINCIPLES.md §4 ("no schema only in the cloud").

ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'he';
