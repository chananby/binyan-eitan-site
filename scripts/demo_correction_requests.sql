-- ============================================================
-- Binyan Eitan — DEMO correction requests (for the "ניסיון" staff)
--
-- Seeds ONE pending correction of each of the three types so Chanan can see the
-- three redesigned panel displays side by side and confirm they read clearly:
--   • fix_time      → a real time change (strikethrough, arrow points to NEW)
--   • missing_exit  → "כניסה קיימת HH:MM · הוסף יציאה HH:MM"  (no strikethrough)
--   • missing_entry → "יציאה קיימת HH:MM · הוסף כניסה HH:MM"  (foreign-language
--                      reason, to try the "תרגם" button)
--
-- Everything created here is tagged with '[הדגמה]' (reason) / edit_note so it is
-- trivial to spot and clean up (see the CLEANUP block at the bottom).
--
-- Dates are in the current month (retro window = current + previous month), so
-- every request is genuinely approvable.
--
-- Run once in Supabase SQL Editor. DEMO DATA — not a migration.
-- Adjust the dates below if the current month is no longer July 2026.
-- ============================================================

WITH s AS (
  SELECT id AS staff_id FROM staff WHERE name = 'ניסיון' LIMIT 1
),
-- ── fix_time base: a COMPLETE day whose ENTRY time is wrong (14:16, should be 07:00)
ft_entry AS (
  INSERT INTO attendance (staff_id, action, clock_at, timestamp_label, source, status, is_manual, edit_note)
  SELECT staff_id, 'כניסה', '2026-07-28T14:16:00+03:00', '28.7.2026, 14:16', 'web', 'approved', false,
         '[הדגמה] רשומת בסיס לבקשת תיקון' FROM s
  RETURNING id
),
ft_exit AS (
  INSERT INTO attendance (staff_id, action, clock_at, timestamp_label, source, status, is_manual, edit_note)
  SELECT staff_id, 'יציאה', '2026-07-28T16:04:00+03:00', '28.7.2026, 16:04', 'web', 'approved', false,
         '[הדגמה] רשומת בסיס לבקשת תיקון' FROM s
  RETURNING id
),
-- ── missing_exit base: an OPEN entry only (07:26, no exit) → worker forgot to clock out
me_entry AS (
  INSERT INTO attendance (staff_id, action, clock_at, timestamp_label, source, status, is_manual, edit_note)
  SELECT staff_id, 'כניסה', '2026-07-26T07:26:00+03:00', '26.7.2026, 07:26', 'web', 'approved', false,
         '[הדגמה] רשומת בסיס לבקשת תיקון' FROM s
  RETURNING id
),
-- ── missing_entry base: an EXIT only (17:00, no entry) → worker forgot to clock in
mn_exit AS (
  INSERT INTO attendance (staff_id, action, clock_at, timestamp_label, source, status, is_manual, edit_note)
  SELECT staff_id, 'יציאה', '2026-07-25T17:00:00+03:00', '25.7.2026, 17:00', 'web', 'approved', false,
         '[הדגמה] רשומת בסיס לבקשת תיקון' FROM s
  RETURNING id
)
INSERT INTO attendance_corrections (attendance_id, staff_id, proposed_time, reason, request_type, status)
-- 1) fix_time — "arrived at 07:00, system logged 14:16"
SELECT (SELECT id FROM ft_entry), (SELECT staff_id FROM s), '07:00',
       '[הדגמה] הגעתי בשבע בבוקר אבל המערכת רשמה 14:16', 'fix_time', 'pending'
UNION ALL
-- 2) missing_exit — "forgot to clock out, left at 16:00"
SELECT (SELECT id FROM me_entry), (SELECT staff_id FROM s), '16:00',
       '[הדגמה] שכחתי להחתים יציאה, יצאתי בארבע אחר הצהריים', 'missing_exit', 'pending'
UNION ALL
-- 3) missing_entry — reason in SINHALA (to test the "תרגם" button):
--    "I arrived at 8 in the morning but could not clock in."
SELECT (SELECT id FROM mn_exit), (SELECT staff_id FROM s), '08:00',
       '[הדגמה] මම උදෑසන 8.00ට පැමිණියෙමි නමුත් ඔරලෝසුවේ සලකුණු කිරීමට නොහැකි විය', 'missing_entry', 'pending';

-- Sanity check — should return 3 pending rows for "ניסיון":
--   SELECT c.request_type, c.proposed_time, c.reason, a.action, a.clock_at
--   FROM attendance_corrections c JOIN attendance a ON a.id = c.attendance_id
--   WHERE c.status = 'pending' AND c.reason LIKE '[הדגמה]%';

-- ============================================================
-- CLEANUP — run this to remove ALL demo data created above.
-- (Delete the corrections FIRST — they FK-reference the attendance rows.)
-- ============================================================
-- DELETE FROM attendance_corrections WHERE reason LIKE '[הדגמה]%';
-- DELETE FROM attendance WHERE edit_note LIKE '[הדגמה]%';
