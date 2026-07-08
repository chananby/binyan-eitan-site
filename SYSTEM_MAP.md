<!--
מפת מערכת — שלב 1: שלד מאקרו בלבד (מעוף ציפור).
  • מטרה כפולה: (1) לחנן — מבט-על ממאקרו למיקרו לזיהוי חוסרים;
    (2) לקלוד גיט/צ'אט — מפת ניווט שנקראת בתחילת משימה כדי לחסוך חקירה.
  • שלב זה = מאקרו בלבד. פרטי כל אזור (מיקרו) יבואו בשלב 2 אחרי אישור.
  • כלל תחזוקה: כשאזור/זרימה/טבלה משתנים מהותית — עדכן כאן שורה אחת.
  • שמות קבצים/טבלאות באנגלית בסוגריים; תיאורים בעברית.
-->

# SYSTEM_MAP — בניין איתן

> מפת ניווט של המערכת. מאקרו בלבד (שלב 1). למי שמחפש עקרונות עבודה →
> [`DEVELOPMENT_PRINCIPLES.md`](DEVELOPMENT_PRINCIPLES.md); לסטטוס ותור →
> [`ROADMAP.md`](ROADMAP.md).

---

## חלק 1 — אזורי המערכת

הליבה היא **פורטל הניהול** (`/admin`, קומפוננטת [`AdminPortal.tsx`](src/app/components/AdminPortal.tsx))
עם 16 לשוניות, לצד **פורטל הממונה**, **אפליקציית החתמת העובד**, ומספר מסכים
עצמאיים. כל לשונית = קובץ תחת [`src/app/admin/_components/tabs/`](src/app/admin/_components/tabs/).

### פורטל הניהול (אדמין — לשוניות ב-AdminPortal)

- **דשבורד** — מסך הבית: סיכום היום (מי באתר, כניסות היום, פרויקטים פעילים),
  פאנל "דורש תשומת לב", מאזן חודשי. (`DashboardTab.tsx`, `AttentionPanel.tsx`)
- **נוכחות** — לב המערכת: יומן היום, 7 ימים אחרונים, אישור/עריכת החתמות,
  החתמה ידנית, כשלי החתמה, דוח חודשי. (`AttendanceTab.tsx`, `api/admin/attendance/*`)
- **עובדים** — ניהול עובדים: הוספה, סיווג, סטטוס פעיל/מושבת, פרטי בנק,
  מסמכים, והיסטוריית נוכחות פר-עובד. (`WorkersTab.tsx`, `WorkerHistoryPanel.tsx`)
- **בקשות** — עובדים חדשים שביקשו להצטרף → אישור/דחייה של אדמין. (`JoinRequestsTab.tsx`)
- **פרויקטים** — פרויקטים פעילים: כתובת/GPS, שיוך ממונה, כרטיס תקציב מול ביצוע
  פר-פרויקט. (`ProjectsTab.tsx`, `ProjectBudgetSection.tsx`)
- **שיבוץ** — לוח שיבוץ שבועי: מי עובד איפה בכל יום, העתקת שבוע, פועלים יומיים.
  (`BoardTab.tsx`, `ScheduleTab.tsx`, `ScheduleTable.tsx`)
- **הוצאות** — קליטת הוצאות שדה: חומרים, קבלני משנה, ציוד. (`ExpensesTab.tsx`)
- **תכנון** — משימות ואבני דרך פר-פרויקט + מעקב עיכובים. (`PlanningTab.tsx`)
- **מטריצה שבועית** — תצוגת משימות לפי ימי השבוע. (`ReportsAndMatrixTabs.tsx`)
- **הכנסות** — תשלומים שהתקבלו, לפי פרויקט. (`IncomeTab.tsx`)
- **גבייה** — אבני דרך תשלום (payment milestones) פר-פרויקט + סימון "שולם".
  (`CollectionsTab.tsx`, `MilestoneCard.tsx`)
- **דוחות** — דוחות נוכחות/שכר לצילום ולשליחה. (`ReportsTab.tsx`)
- **שכר** — חישוב תלוש: נוכחות × תעריף, יצוא, תחזית שכר. (`PayrollTab.tsx`, `usePayroll.ts`)
- **הצעות מחיר** — רשימת הצעות + כניסה למחולל. המחולל עצמו מסך HTML נפרד
  (`QuotesTab.tsx`, `/admin/quotes` → `quote-generator.html`)
- **אסמכתאות** — inbox מסמכים פיננסיים: חילוץ AI, שיוך לפרויקט, פיצול, קישור
  חשבונית↔העברה. (`DocumentsTab.tsx`, `/admin/documents/*`, `useDocumentSplits`)
- **חשבון** — הגדרות מערכת: אכיפת GPS, ספי מרחק, סיסמה. (`AccountTab.tsx`)

### פורטלים חיצוניים

- **פורטל ממונה** — מובייל, לממונה בשטח: מי באתר, יומן יומי, קליטת הוצאה,
  תכנון מחר, שעות, והחתמה ידנית לעובד ששכח. (`ForemanPortal.tsx` — לשוניות
  overview/site/log/expense/plan/hours)
- **אפליקציית החתמת עובד** — מובייל, לעובד: זיהוי בטלפון → כניסה/יציאה עם בדיקת
  מיקום. (`AttendanceForm.tsx`, `src/app/components/attendance/*`, `/attendance`)
- **החתמה בטלפון (Twilio)** — עובד ללא סמארטפון מתקשר ומקיש כניסה/יציאה.
  (`api/twilio/voice/*`)

### מסכים עצמאיים

- **מרכז שליטה (Hub)** — עמוד נחיתה לאדמין עם קישורים מהירים לכל האזורים.
  (`/admin/hub`)
- **אתר שיווקי** — האתר הציבורי (he/en): שער, תיק עבודות, מאמרים, יצירת קשר.
  (`src/app/[he|en]/*`, `Hero.tsx`, `PortfolioGallery.tsx`)

### אזורים היקפיים (באותו repo, מחוץ לליבת הניהול)

- **פורטל פנים-ארגוני / החזקות** — עורך תוכן + משימות לשתי חברות (Binyan Eitan,
  Prime Steel). (`/internal/*`, `api/holding/*`)
- **אפליקציית מתמטיקה** — מוצר חינוכי נפרד. (`/math-app/*`)
- **ארכיון** — Executive War Room ו-Cockpit הושבתו, מפנים ל-Hub.
  (`/admin/executive`, `/admin/cockpit`)

---

## חלק 2 — הזרימות המרכזיות

1. **עובד מחתים נוכחות** — נכנס ל-`/attendance` ← מזוהה בטלפון (`api/worker/identify`,
   cookie) ← בוחר פרויקט + כניסה/יציאה ← דפדפן שולף GPS ← `POST /api/attendance`
   בודק מיקום מול רדיוס הפרויקט ← נרשם ב-`attendance` (`action` בעברית "כניסה"/"יציאה").
   חריגות (מחוץ לרדיוס / כניסה כפולה / יציאה יתומה) → קוד שגיאה ייעודי + רישום ב-`attendance_failures`.

2. **ממונה/אדמין משלים החתמה חסרה** — עובד שכח יציאה → פונה לממונה ← הממונה
   מזין ב-tab `site` (`POST /api/admin/attendance/manual`, נעול לפרויקטים שלו) ←
   נרשם `status='pending'` ← אדמין מאשר בפאנל הנוכחות. כפתור "השלם יציאה"
   (`clock-out`) סוגר כניסה פתוחה בלי לגעת בה.

3. **אדמין מאשר בקשת תיקון** — עובד/ממונה מבקש תיקון ← `attendance_corrections` ←
   פאנל `CorrectionRequestsPanel` בלשונית נוכחות ← אישור מעדכן את `attendance` +
   audit trail (`edited_by`, `original_clock_at`).

4. **עובד חדש מצטרף** — עובד ממלא `POST /api/join-request` (בדיקת כפילות מול
   `staff`) ← `join_requests` ← לשונית "בקשות" ← אישור יוצר רשומת `staff`.

5. **הפקת שכר** — לשונית שכר ← `GET /api/admin/payroll` מסנן לפי `clock_at`
   (חודש עבודה, לא `created_at`) ← `payroll-aggregate.ts` מצליב נוכחות × `staff_rates`
   ← טבלת תלוש + יצוא Excel. תחזית דרך `payroll/forecast`.

6. **מסמך פיננסי נכנס לחשבונאות** — העלאה (`api/admin/documents`) ← חילוץ AI
   (`document-extraction.ts`, resume + cron backstop) ← טריאז' שיוך לפרויקט
   (`/admin/documents/triage`) ← אופציונלי: פיצול בין פרויקטים / קישור להעברה /
   סימון "לא כלול בחישוב" ← מזין `budget-actual` ו-P&L.

7. **יצירת הצעת מחיר** — לשונית הצעות ← מחולל HTML (`quote-generator.html`)
   נטען/נשמר דרך `api/admin/quotes` ← לוח תשלומים נזרע אוטומטית ← PDF דרך
   `window.print()` על התצוגה המקדימה.

8. **שיבוץ שבועי** — לשונית שיבוץ ← `schedule_assignments` (`api/admin/schedule`) ←
   בחירת עובד לתא (יום×פרויקט), העתקת שבוע (`copy-week`), הוספת פועל יומי זמני.

9. **גבייה** — לשונית גבייה ← `payment_milestones` פר-פרויקט ← סימון "שולם"
   (`payment-milestones/[id]/payment`) ← מוזן לתמונת ההכנסות.

10. **חלוקת תקורה + פיצול שכר לפי נוכחות** — מסמכי `project_type='overhead'`
    מתחלקים יחסית לפי עלות ישירה (`overhead`); תלוש של ספק-שהוא-עובד
    (`vendors.staff_id`) מקבל הצעת פיצול לפי שעות פר-פרויקט (`suggest-split`,
    `attendance-project-shares.ts`).

---

## חלק 3 — מבנה הנתונים (על-קצה)

**ליבת נוכחות ושכר:**
- `staff` — עובדים: זהות, טלפון, סיווג, שפה, פטור נוכחות, פעיל/מושבת, פרטי בנק.
- `attendance` — רשומת החתמה: `clock_at`, `action` (עברית), `project_id`, GPS,
  `is_manual`, `status`, audit (`edited_by`, `original_clock_at`).
- `staff_rates` — תעריף עובד לאורך זמן (מקור אמת לחישוב שכר).
- `attendance_corrections` — בקשות תיקון נוכחות ממתינות/מאושרות.
- `attendance_failures` — לוג כשלי החתמה (worker_stuck / noise / security_signal).
- `vacation_days` — ימי חופשה/היעדרות.
- `staff_documents` — מסמכים אישיים של עובד.

**פרויקטים ושיבוץ:**
- `projects` — פרויקט: כתובת + GPS, `status` (active/inactive), `foreman_id`,
  `project_type` (כולל overhead לתקורות).
- `schedule_assignments` — שיבוץ עובד ליום×פרויקט.
- `board_assignments`, `board_manual_projects` — לוח השיבוץ + פרויקטים ידניים.
- `weekly_plan`, `tasks`, `milestones` — תכנון: משימות ואבני דרך פר-פרויקט.
- `daily_reports` — דוח יומי של ממונה מהשטח.

**כספים ומסמכים:**
- `financial_documents` — מסמך פיננסי: סכום, ספק, חילוץ AI, `linked_document_id`
  (חשבונית↔העברה), `include_in_actuals`.
- `document_project_splits` — פיצול מסמך בין כמה פרויקטים.
- `vendors` — ספקים; `staff_id` מקשר ספק שהוא עובד.
- `payment_milestones` — אבני דרך גבייה פר-פרויקט + סטטוס תשלום.
- `income` — הכנסות שהתקבלו.
- `materials` — הוצאות שדה (חומרים/קבלנים/ציוד).
- `budget_items` — פריטי תקציב מתוכנן.
- `quotes` — הצעות מחיר (כולל תבנית לוח תשלומים).
- `catalog_items` — קטלוג פריטים למחולל ההצעות.

**מערכת והרשאות:**
- `admins`, `password_reset_tokens` — משתמשי אדמין ואיפוס סיסמה.
- `join_requests` — בקשות הצטרפות של עובדים חדשים.
- `settings` — הגדרות מערכת (אכיפת GPS, ספי מרחק, תקרות).
- `admin_notes` — הערות פנימיות.

**היקפי (מחוץ לליבה):** `executive_canvas`/`executive_space` (ארכיון),
`holding_tasks`/`holding_companies` (פנים-ארגוני), `math_test_attempts`/
`math_practice_progress` (אפליקציית מתמטיקה).

---

## חלק 4 — עוגנים טכניים

**מסמכי בסיס:**
- עקרונות פיתוח → [`DEVELOPMENT_PRINCIPLES.md`](DEVELOPMENT_PRINCIPLES.md)
  (קבצים <400 שורות, fetch מחוץ ל-UI, helper טהור + tests, grep על שדה משותף).
- סטטוס ותור → [`ROADMAP.md`](ROADMAP.md) (מה בייצור, מה בתור, פעולות משתמש).
- מיגרציות → [`supabase/migrations/`](supabase/migrations/) בפורמט `YYYYMMDD_*.sql`.

**Workflow (branch → build → deploy):**
- פיתוח ב-Codespaces בלבד → branch → `npm run build` נקי → commit → push ל-main.
- **Webhook GitHub↔Vercel שבור** — push לא מפרסם אוטומטית. פריסה ידנית:
  `npx vercel --prod`. תמיד לפרוס אחרי push (אחרת endpoints חדשים = 404).
- **כל DB write ידני ע"י המשתמש** — קלוד כותב SQL, חנן מריץ ב-Supabase SQL Editor.

**Gotchas מרכזיים (מלכודות חוזרות):**
- **`action` עברית מול אנגלית** — נוכחות נכתבת "כניסה"/"יציאה" (עברית) ברוב
  המסלולים, אבל Twilio/חלק מה-inserts כותבים "in"/"out". כל פילטר על action
  חייב לכסות **שתי אוצרות מילה** (ראה `isEntry`/`isExit`).
- **`clock_at` מול `created_at`** — סינון שכר/דוחות תמיד לפי `clock_at` (חודש
  עבודה בפועל), לא `created_at` (רגע ההזנה). בלבול כאן חתך שורות מתלושים.
- **soft-delete** — `deleted_at IS NULL` בכל טבלה מרכזית; מחיקה אמיתית נדירה.
- **service_role עוקף RLS** — כל ה-endpoints מוגני admin ברמת ה-API, לא ב-RLS.
- **`text-content` (15px) הוא הרצפה** לתוכן; אין `text-xs` בקוד חדש.
- **Vercel Hobby** — cron מוגבל לפעם ביום.

---

**שלב 1 (שלד מאקרו) — עודכן לאחרונה:** 8 ביולי 2026.
_שלב 2 (מיקרו לכל אזור) — ממתין לאישור השלד._
