-- ============================================================
-- Binyan Eitan — attendance.source field (telephony stage 1)
-- Run once in Supabase SQL Editor (Dashboard → SQL Editor).
-- ============================================================
-- Marks where an attendance row came from so admin views can show
-- a "no location verification" badge for phone-based check-ins and
-- distinguish them from GPS-verified web clocks.
--
-- Values used by code (no DB constraint — keep flexible while we add
-- channels):
--   'web'         — existing clock from the worker portal (default)
--   'phone-call'  — IVR via Twilio (added in stage 2)
--   'manual'      — admin-created from AttendanceTab manual form
--
-- Backfill: NOT NULL DEFAULT 'web' covers all existing rows in one go.
-- ============================================================

ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'web';
