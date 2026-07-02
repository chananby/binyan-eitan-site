<!--
כללי תחזוקה — קרא אותם בכל פעם:
  1. בתחילת כל משימה — קרא את הקובץ הזה במלואו לפני שאתה מתחיל.
  2. בסוף כל משימה — עדכן אותו. הזז פריטים בין הסקציות ("בתור" → "בתהליך"
     → "הושלם"). מחק פריטים שהפכו לא-רלוונטיים. עדכן את "איפה אנחנו עכשיו".
  3. השאר תמציתי — מפה, לא תיעוד מלא. שורה אחת פר פריט + תלויות.
     תיעוד עמוק שייך ל-commit messages ול-code comments.
  4. אם משהו לא בטוח בייצור — סמן [?] ובדוק (git log / curl / grep).
     אל תמציא פיצ'רים שלא ראית.
-->

# ROADMAP — בניין איתן

## החזון: אסמכתאות כמרכז כספי
לכל שקל יש סיפור. שלוש שכבות:

- **שכבה 1 — לחבר:** כל מסמך מקושר (פרויקט/קטגוריה/ספק).
- **שכבה 2 — להראות:** הנתונים מתאגדים לתמונה (רווחיות, P&L, חתכים).
- **שכבה 3 — לאמת:** הצלבת דפי בנק מול הכל, גילוי פערים.

## איפה אנחנו עכשיו

**שכבה 1 עומדת ברוב היקפה** — טריאז' פעיל, שיוך אינטראקטיבי, פיצול חשבוניות
בין פרויקטים נכתב ונפרס לקוד (ממתין למיגרציה ידנית). שיוך מפוצל מחוץ לטריאז'
נחקר, ההצעה מוכנה, לא נבנה.

**שכבה 2 בהתחלה** — כרטיס P&L חודשי בדשבורד, budget-actual מודע-splits.
עדיין חסרים: עלות עבודה פר-פרויקט, חתכי קטגוריה/ספק, הצלבת הכנסות מ-milestones.

**שכבה 3 טרם התחילה.**

---

## הושלם (בייצור)

### שכבה 1 — חיבור מסמכים
- **טריאז' שיוך פרויקט** (`/admin/documents/triage`) — walkthrough אופטימי,
  chips פרויקטים פעילים + תקורות, undo toast.
- **גישה קבועה לטריאז'** — כניסה מ-Hub, מ-baner באינבוקס, ובמצב מסונן.
- **פיצול חשבונית בין פרויקטים** — endpoint + UI טריאז' + rollup מודע-splits.
  מיגרציה `20260701_document_project_splits.sql` הורצה (אומת: הטבלה קיימת).
- **פיצול מסמך במסך הפרטים המלא** (`/admin/documents/[id]`) — גישה א' ננעלה:
  טוגל שמחליף את בורר הפרויקט הקיים. הלוגיקה המשותפת לשלושת המקומות (טריאז',
  דיאלוג האינבוקס, מסך הפרטים) חולצה ל-hook `useDocumentSplits`. עובד על **כל
  סוג מסמך כולל שכר** — budget-actual אגנוסטי לסוג המסמך. commit `acd5f1e`.
- **קישור מסמכים חשבונית ↔ העברה** — שלבים 1+2. השדה `linked_document_id`
  שהיה שמור בסכמה מיום ראשון (0 בשימוש) מופעל: אם מלא → המסמך evidence, לא
  נספר; ריק → primary, נספר. תוקנו כל 3 הצרכנים (budget-actual, finance/pnl,
  documents/export). UI חדש במסך הפרטים: dialog חיפוש (same-vendor default,
  ±30 יום) + section 3-מצבי (evidence chip / primary-with-inbound / unlinked
  trigger). האימות בייצור הראה שהמימוש מסיר בדיוק ₪4,010 של כפילות שזוהתה
  ב-3 פרויקטים. **הדפוס generic ומוכן להעברה ל-SaaS** (invoice matching /
  payment reconciliation סטנדרטי בענף). commit `5a0c9f3`.
- **סוגי מסמכים "תקורות"** — `project_type='overhead'` שכולל את "בניין איתן" כיעד.
- **AI חילוץ מסמך + resume-on-load + cron backstop יומי** — חסינות להעלאה.
- **DocumentsInbox** — סינון, יצוא ZIP, תצוגה מקדימה inline, בורר פרויקט inline.
- **סטטוס פרויקט אחיד — active/inactive בלבד.** מיגרציה
  `20260701_projects_status_unify.sql` הורצה (אומת: `projects_status_check`
  קיים ב-`pg_constraint`).

### שכבה 2 — הצגה כספית
- **📊 מאזן חודשי** בדשבורד — הכנסות/הוצאות/יתרה + מגמת 6 חודשים.
  helper טהור (`lib/finance-pnl.ts`) + endpoint `/api/admin/finance/pnl`.
- **budget-actual פר-פרויקט** — כרטיס בכל פרויקט ב-ProjectsTab, כולל splits.

### מערכת גבייה (Layer 2 חלקי)
- **payment_milestones** — schema + CRUD + accordion פר-פרויקט + כרטיס גבייה גלובלי.

### נוכחות + שכר (משפחת A/B/C)
- **B2 — race condition בכניסה כפולה** נסגר ברמת ה-DB. UNIQUE partial index
  על `(staff_id, action, clock_at) WHERE deleted_at IS NULL` (`20260702_attendance_race_unique.sql`).
  התיקון הצריך ניקוי מקדים של 6 שורות כפולות היסטוריות (5 קבוצות התנגשות,
  כולן `is_manual=true` — למעשה double-submit של טופס האדמין, לא race של
  עובד) דרך `20260702_attendance_race_dedup.sql` — soft-delete עם audit trail
  (`edited_by='system:B2-race-dedup'`). ה-endpoint מזהה `23505` על ה-INSERT
  ומחזיר `409 already_clocked_in` באותה חתימה כמו ה-guard של אפליקציה. commit `3e79c47`.
- **A1 — join-request** (`/api/join-request`) בדקה רק כפילות ב-`join_requests`
  אך לא ב-`staff`, כך שעובד קיים היה יכול לשלוח בקשה חדשה שתגיע לתור האדמין.
  תוקן: SELECT ל-staff עם `phoneVariants` (אותו דפוס של `worker/identify`)
  לפני ה-INSERT; אם קיים → `409` עם הודעה "המספר כבר רשום במערכת". commit `0c09faf`.
- **B1 — כניסות פתוחות מימים קודמים** צפו כאנומליה בשני הפורטלים במקום לחסום
  את העובד. endpoint חדש `GET /api/admin/attendance/stale-opens` (חלון קפדני
  `[now-72h, todayStart)`, אגרגציה שרתית פר-(staff × YMD), foreman-scoped
  ל-`projects.foreman_id`). ה-guard של `in` לא נגעו — כפילות באותו יום עדיין
  נחסמת. AttentionPanel חדש באדמין (severity medium) + פאנל amber ב-`site`
  tab של מנהל העבודה. commit `43c711e`.
- **B3 — יציאה בלי כניסה פתוחה** מוחזרת עם `409 no_open_entry_to_close`
  והודעה "אין כניסה פתוחה לסגירה. אם צריך תיקון, פנה למנהל." cutoff 24h —
  מספיק לסגירת night shift ו"בוקר-אחרי", לא מאפשר סגירה מקרית של יתום ישן
  שיפגע בתלוש. commit `43c711e`.

### נוכחות + שכר (משפחת C1)
- **C1 — payroll routes** (`/api/admin/payroll` + `/api/admin/payroll/export`)
  סוננו לפי `created_at` → 32 שורות backfill חודשי נחתכו מהתלוש. תוקן: סינון
  לפי `clock_at` (workDate) — commit `4e2200b`. אימות ייצור: ~₪4,897 חוב אמיתי
  נחשף לתשלום + 3 עובדים עם תלוש שגוי-חודש (zero-sum, דורש תלוש מתקן).
- **C2/C3 — display reports** (`/api/admin/staff/[id]/history` + `/api/admin/staff/export`)
  אותה משפחה, גישה אחרת: הרחבת ה-widening על `created_at` ל-±35 יום, הישענות
  על סינון workDate שכבר בקוד. commit `e98083c`. אימות: י.ח.ברמן, מאי 2026
  עלה מ-0 שורות → 12 שורות (6 משמרות מלאות).

### תשתית וחוויית משתמש
- **StaleRefresh** — רענון חלק, ללא spinner-flash (5 מסכים).
- **קריאות** — tokens (`text-content`/`text-caption`/`text-muted`), Card depth,
  ניגודיות AA, שלושה סבבי refactor (dashboard, admin tabs, ForemanPortal).
- **i18n עובד** — 6 שפות בפורטל, שפה נשמרת ב-DB פר-עובד.
- **שפת סימון** — Overline tags, badge language, chip flags.
- **Auth ממונה/עובד** — טלפון בלבד (הוסר PIN gate).

### שאר תשתית פעילה
- שיבוץ שבועי + copy-week + by-project view + temporary day-laborers.
- Board unification (יום אחד).
- Join-requests לעובדים חדשים + admin review.
- ChangeOrderForm.

---

## בתהליך / פתוח

_(ריק — כל המיגרציות הידניות שהיו ממתינות אומתו כמוחלות. פריטי החלטה עתידית
עברו ל"החלטות שננעלו — בתור לבנייה" למטה.)_

---

## החלטות שננעלו — בתור לבנייה

### קישור מסמכים — matcher אוטומטי (שלב 3)
- **הבסיס** (`linked_document_id` + role גזור + סינון aggregation) פרוס בייצור.
- **מה חסר:** matcher אוטומטי שמזהה זוגות invoice ↔ payment (same vendor,
  |Δamount|≤X, |Δdate|≤Y) ומציע לאדמין באצבע לחיצה. היום הקישור ידני בלבד.
- **סטטוס:** דחוי, הכרעה עתידית מתי לבנות.

### פיצול שכר לפי נוכחות (מסלול 2)
- **הכוונה:** פיצול שכר של פועל בין אתרים לפי `attendance.project_id` של דיווחי
  הנוכחות בפועל — לא ידנית פר-מסמך שכר.
- **תלוי ב:** נוכחות מהימנה (ראה "חבילת אכיפת נוכחות" למטה).
- **סטטוס:** הכרעת עיקרון התקבלה, טרם תוכנן לפרטים.

### חבילת אכיפת נוכחות
- **זיהוי עובד ייחודי** על טלפון מנורמל — חלקית קיים (A1 סגר בקשות הצטרפות
  כפולות; אכיפה מלאה עוד לא נבנתה — למשל UNIQUE על `staff.phone_normalized`).
- **אכיפת מיקום:**
  - **כניסה** = חסימה קשה — לא באתר, לא נכנס.
  - **יציאה** = חסימה רכה — עוברת אבל מסומנת "יציאה מרחוק", נספרת מול תקרה
    חודשית הניתנת לשינוי בהגדרות.
- **הפרדת החתמה ידנית:** העובד לא מדווח ידני בעצמו; תיקונים עוברים דרך
  מנהל העבודה בשטח (עקבי עם עיקרון "תיקונים דרך מנהל").
- **סטטוס:** הכרעות התקבלו, טרם נבנה.

### חוב טכני ידוע
- **`ForemanPortal.tsx` (~1,344 שורות)** — מועמד ל-refactor. פירוק `site` tab
  ל-4 קומפוננטות: `SiteOnSitePanel` / `SiteStaleOpensPanel` /
  `SiteMissingTodayPanel` / `SitePendingPanel`.
- **Webhook GitHub↔Vercel שבור** — פריסה ידנית קבועה (`npx vercel --prod`).
  Reconnect לא פתר, suspend/unsuspend לא פתר. חי בהערות "עקרונות תפעוליים"
  למטה כתזכורת מבצעית.

---

## בתור (עם תלויות)

### שכבה 2 — השלמות רווחיות פר-פרויקט
- **עלות עבודה פר-פרויקט** — סיכום `attendance × rates` לפי project_id.
  קיים helper `today-labor-cost.ts` (יומי, ללא project). דורש הרחבה + endpoint.
- **הכנסה פר-פרויקט** — הצלבת `payment_milestones (paid)` עם income docs.
  דורש הכרעת עיצוב: מקור אמת ← מסמכים או milestones.
- **חתך 4-קטגוריות ב-budget-actual** — הרחבת `computeProjectBudget` +
  פירוט ב-`ProjectBudgetSection` (materials / subcontractor / salary / overhead).

### שכבה 2 — חתכים גלובליים
- **חתך הוצאה לפי קטגוריה** — donut/bars בדשבורד. Endpoint + UI.
- **Top vendors** — טבלת 20 הספקים בשנה.
- **קטגוריות נוספות** — לפי החקירה, קטגוריית "other" חטופה 27% (37 מסמכים).
  להוסיף: `professional_services`, `food_hosting`. לתקן: `client_payment`
  מוקצה בטעות ל-quotes.

### שכבה 3 — אימות בנק
- **התאמה בנקאית** — העלאת דפי בנק, matching אוטומטי מול financial_documents.
  Endpoint + UI. עוד לא תוכנן.

### לא-בשכבה
- **קישור הצעות מחיר ← אבני דרך** — קווית מתוכננת בין `quotes` ל-`payment_milestones`,
  כדי שברגע שהצעת מחיר מאושרת, אבני הדרך שלה נוצרות אוטומטית.
- **שדרוג Vercel ל-Pro** — יאפשר cron כל 10 דקות (חזרה למצב שלפני downgrade).

---

## עקרונות תפעוליים (לקחים מוצטבים)

### Vercel + Deploy
- **חשבון Hobby** — cron מוגבל לפעם ביום. אל תעלה תדירות מעל יומי עד שדרוג ל-Pro.
- **webhook GitHub↔Vercel שבור** — push לא מפרסם אוטומטית. Reconnect לא פתר,
  suspend/unsuspend לא פתר. פריסה עובדת: `npx vercel --prod` (המשתמש מחובר).
- **תמיד לפרוס אחרי push** — אחרת ה-endpoints החדשים מחזירים 404 ואצלנו נופל.

### DB
- **מיגרציות + כל DB write ← ידני ע"י המשתמש ב-Supabase.** אני כותב את ה-SQL,
  המשתמש מריץ ב-SQL Editor.
- **אין CHECK על projects.status** — בוצע ידנית עכשיו (או ממתין להרצה).
- **סטטוס פרויקט: `active` / `inactive` בלבד.** legacy `planning` בוטל.
- **soft-delete כברירת מחדל** — `deleted_at IS NULL` בכל טבלה מרכזית.
- **service_role bypasses RLS** — כל ה-endpoints שלנו admin-gated ב-API, לא ב-RLS.

### פיתוח
- **DEVELOPMENT_PRINCIPLES.md** — 11 עקרונות. קבצים < 400, fetch מחוץ ל-UI,
  helper טהור + tests, grep על שדה משותף לפני שינוי.
- **`text-content` (15px) הוא הרצפה** לתוכן; `text-caption` (14px) לצפוף;
  `text-muted` למשני. אין `text-xs` בקוד חדש.
- **UI חדש עם Card depth** — border-charcoal/10, rounded-md, shadow עדין.
- **Card < 400 שורות** — אחרת לחלק לתת-קומפוננטות.

### תקשורת (עם המשתמש)
- דיאלוג בעברית, קצר ומעשי.
- כשמסיים משימה: מדווח על ההיקף + hash + ענף נמחק + לינקים לייצור.
- כשמתחיל משימה: קורא ROADMAP, מאמת עם ה-DB אם צריך.
- לפני push: מציג דוח סיכום ומחכה לאישור.
