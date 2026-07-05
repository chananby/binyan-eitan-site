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

**שכבה 1 מקיפה** — טריאז' פעיל, שיוך אינטראקטיבי, פיצול חשבוניות בין
פרויקטים, פיצול במסך הפרטים, וקישור invoice↔payment (מונע כפילות ספירה).
כל המיגרציות שהיו ממתינות הורצו.

**שכבה 2 בהתחלה** — כרטיס P&L חודשי בדשבורד, budget-actual מודע-splits.
עדיין חסרים: עלות עבודה פר-פרויקט, חתכי קטגוריה/ספק, הצלבת הכנסות מ-milestones.

**שכבה 3 טרם התחילה.**

**תשתית נוכחות מהימנה** — כל משפחת A/B/C סגורה + חבילת אכיפת הנוכחות במלואה
(זיהוי ייחודי, אכיפת מיקום פעילה, הפרדת ידני). זה הפותח את פיצול השכר לפי
נוכחות (מסלול 2), שהיה חסום על התלות הזאת.

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
- **חלוקת תקורה יחסית — שלב א'** (5-STEP direct-cost basis). `project_type='overhead'`
  = תקורה (לא הקטגוריה). ההקצאה מחושבת על `direct[site]/total_direct`, כלומר
  אין לולאה (STEP 4 קודם ל-STEP 5). מיגרציה `20260703_overhead_and_staff_link.sql`
  הורצה: הוספה של `financial_documents.include_in_actuals` (default true) +
  `vendors.staff_id` (nullable, לשלב ג'). ה-UI מציג "ביצוע ישיר" + "תקורה מוקצית"
  + "סה"כ עלות" בשורות נפרדות. אימות מול יוני 2026 תואם לשקל: total_direct=₪114,995,
  pool=₪62,901, מנחם משיב alloc=₪32,370. commit `fecf2dd`.
- **חלוקת תקורה — שלב ב' (UI ל-`include_in_actuals`).** טוגל במסך פרטי המסמך
  ("כלול בחישוב הרווחיות", מסומן כברירת מחדל) עם PATCH מיידי + optimistic
  update + revert-on-error. הסבר מפורש: unchecked → ארכיון בלבד, לא נספר
  ברווחיות/P&L/סיכומי ייצוא, אבל עדיין ב-inbox ובחבילה לרו"ח. Chip שקט
  "🗄 לא נכלל בחישוב" מופיע ב-DocumentCard כשהמצב false. אין רשימת מסמכים
  פר-פרויקט במערכת היום — אם תיווסף בעתיד, ה-badge כבר במקום המשותף.
  commit `399b40c`.
- **פיצול שכר לפי נוכחות — שלב ג' (auto-suggestion).** משפחת התקורה סגורה
  לגמרי. Aggregator טהור [`attendance-project-shares.ts`](src/lib/attendance-project-shares.ts)
  (12 tests) מקבץ שעות פר-פרויקט לחודש; endpoint
  `GET /api/admin/documents/[id]/suggest-split` מציע פיצול read-only,
  קודי שגיאה מובנים (`no_vendor`/`vendor_not_linked`/`no_doc_date`/
  `no_amount`/`no_attendance`/`bad_month`). `PATCH /api/admin/vendors/[id]`
  לקישור vendor↔staff; widget "עובד מקושר" inline ב-DocumentReviewForm;
  פס הצעה ב-DocumentSplitPanel עם "החל הצעה". שני עקרונות שנעולים:
  **`status='approved'`** — pending של מנהל עבודה לא נכנס עד אישור;
  **חודש ברירת מחדל = `monthBefore(doc_date)`** — התלוש של יולי מתפרסם
  5-10 באוגוסט, וה-MonthField picker מאפשר override לחריגים. אין שינוי
  schema (רוכב על `vendors.staff_id` משלב א'). אימות פרודקשן: נריה
  שמעוני 2026-06-11 → 2026-05 בברירת מחדל, 7.63h מאושרות על מנחם משיב 12
  → ₪847 מדויקים. commits `cc0b05b` + `6a7bc63`.

### מערכת גבייה (Layer 2 חלקי)
- **payment_milestones** — schema + CRUD + accordion פר-פרויקט + כרטיס גבייה גלובלי.

### נוכחות + שכר (משפחת A/B/C)
- **דוח נוכחות חודשי לכל העובדים** — בלוק גזיר לכל עובד (שם + סיווג + חודש
  → טבלת ימים → סה"כ), לצילום ושליחה לעובד לפני שכר. UI חדש ב-`/admin` →
  tab נוכחות, מתחת לדוח הקיים: month picker + "הפק דוח" + "הורד אקסל". שני
  הפורמטים נסמכים על אותו aggregator טהור (`lib/monthly-attendance-report.ts`)
  כך שהמסך וה-XLSX מציגים תמיד את אותם מספרים. Foreman scope כמו שאר
  ה-endpoints. **תיקון widening ±3 → ±35 גם ב-`attendance/report`** —
  שריד C2/C3 נסגר סופית. commit `a25d425`.
- **חבילת אכיפת נוכחות — הושלמה במלואה.** שלוש הכרעות התכנון שנעלה
  בסבב האכיפה כולן בייצור:
  - ✅ **זיהוי עובד ייחודי** — A1 (למטה) חסם רישום כפול דרך join-request.
  - ✅ **אכיפת מיקום** — כניסה מעל רדיוס נחסמת קשה, יציאה נספרת מול תקרה
    חודשית. פעיל בייצור.
  - ✅ **הפרדת החתמה ידנית** — עובד לא מדווח ידני; תיקונים דרך מנהל העבודה.
- **הפרדת החתמה ידנית** — העובד כבר לא מזין ידנית בעצמו. מסלול חדש:
  עובד שוכח → פונה בעל-פה למנהל העבודה → מנהל העבודה מזין דרך פאנל חדש
  ב-`site` tab של הפורטל שלו (POST `/api/admin/attendance/manual` שהורחב
  לקבל foreman עם `project_id` נעול לפרויקטים שלו) → הרשומה נכנסת כ-
  `status='pending' + edited_by='foreman:<name>'` → אדמין מאשר/דוחה
  בפאנל הקיים (שם המנהל מוצג "מנהל: X" מתחת לתאריך). endpoint
  `/api/worker/manual-entry` מחזיר `410 manual_entry_disabled`; ManualScreen
  נמחק; כפתור "+ דיווח חסר" הוחלף בהודעת "פנה למנהל העבודה" בכל 6 השפות.
  **59 רשומות היסטוריות של עובדים במסלול הישן לא מושפעות; 2 pending נותרו
  לאישור אדמין כרגיל.** commit `dd5e8ff`.
- **מנגנון חריגת GPS דרך מנהל העבודה + תיקון `geoRequired`** — רוכב על
  ה-panel של מנהל העבודה שכבר קיים (בלי endpoint חדש, בלי מסך חדש, בלי
  שינוי סכימה). ForemanManualEntryPanel קיבל textarea אופציונלי
  "סיבה/הערה" (max 300) שנשלח כ-`notes` ונכתב ל-`edit_note` (העמודה כבר
  קיימת מ-`20260607_attendance_edit_audit_soft_delete`) על כל שורה שהבקשה
  מייצרת (גם כניסה וגם יציאה — פילטר לא מפספס חצי משמרת). בפאנל האישור
  המתינ באדמין נוסף רנדור "הערה: …" מתחת ל-"הוגש: מנהל: …", כדי לזהות
  תבניות (חריגות GPS, שכחות) בלי לפתוח שורות. הודעות שהעובד יראה למנהל
  העבודה — `gpsOutOfRange` ו-`geoRequired` — הפכו לדו-לשוניות ב-runtime
  (worker language + `\n\n` + עברית) דרך `bilingualForForeman()` חדש
  ב-`i18n.ts`. `whitespace-pre-line` הוסף ב-`ErrorScreen` וב-banner של
  `MenuScreen`. הנוסחים העדכניים בכל 6 השפות: "פנה למנהל העבודה שיזין
  את ההחתמה שלך מהפורטל שלו." אימות ייצור: `x-matched-path: /admin`.
  commit `dce5e5a`.
- **אכיפת מיקום בהחתמה** — מודל 2-tier נפרד מהחיווי הוויזואלי הקיים:
  `attendance_gps_enforce_radius_m=100` (אכיפה) + `attendance_far_threshold_m=50`
  (chip אדום, נשמר כפי שהיה). כניסה מעל הרדיוס → 403 `gps_out_of_range`. יציאה
  מעל הרדיוס → נספרת מול תקרה חודשית `attendance_remote_exit_monthly_cap=3`;
  מעל התקרה → 409 `monthly_remote_exit_cap_reached`. מתג חירום
  `attendance_gps_enforce="on"/"off"` — כשמכובה, המרחק עדיין נרשם על השורה.
  Twilio + admin manual entry על endpoints נפרדים → פטורים ארכיטקטונית. UI
  להגדרות ב-`/admin` → tab חשבון. **פעיל בייצור** — המתג דלוק ואומת. commit `e6fe113`.
- **i18n cleanup** במסגרת אותו סבב — 5 מפתחות חדשים × 6 שפות:
  `noOpenEntryToClose` (B3 retro-fix — הקוד היה בייצור כבר, אבל frontend הציג
  קוד גולמי), `gpsOutOfRange`, `monthlyRemoteExitCap`, `corrRecordNotFound`,
  `corrRecordDeleted`. שני fallback errors הוקשחו לא לחשוף עברית מ-backend
  לעובדים לא-עבריים. commit `e6fe113`.
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
- **MonthField משותף RTL** — הוצף באג ויזואלי בבורר החודש של דוח נוכחות חודשי:
  ה-widget הנייטיב של הדפדפן מציג את החודשים LTR ואת חצי השנה בכיוון LTR
  שלא ניתן לתקן ב-CSS. פתרון: קומפוננטת [`MonthField`](src/app/admin/_components/shared/MonthField.tsx)
  משותפת שעוטפת את `<input type="month">` עם 2 חצים משלנו בכיווניות עברית
  (`ChevronRight` = חודש קודם, `ChevronLeft` = חודש הבא — עקבי עם `WeekPicker`).
  הוחלף בכל 4 המופעים: MonthlyReportPanel, PayrollTab, RateManager,
  DocumentExportModal. **בדיקת חצים אנכיים במערכת נערכה במקביל — 14 מופעים,
  כולם תקינים** (10 accordion + 2 reorder, אין הפוכים). commit `7e34c61`.
- **תיקון גלילה בלשונית שיבוץ** — `scroll-behavior: smooth` על `html`
  ב-`globals.css` הפך את שחזור-הפוקוס אחרי סגירת `AssignCellDialog`
  לאנימציה איטית שהמפעיל חווה כ"הדף גולל לבד אחרי כל שיבוץ" —
  חוזר על עצמו על כל שיבוץ. Override צר: wrapper `<div class="admin-portal">`
  ב-`admin/layout.tsx` + `html:has(.admin-portal) { scroll-behavior: auto; }`
  ב-`globals.css`. הדף השיווקי נשאר smooth (עוגנים ל-Portfolio/Firm/Inquiry),
  כל `/admin/*` כבר snap-מיידי. `prefers-reduced-motion` נשאר. commit `ec9ba2d`.
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

## פעולות משתמש (בידי חנן)

- **קישור 3 הזוגות הידועים** — הבסיס פרוס וקישור ידני זמין. 3 זוגות
  invoice↔payment שזוהו באודיט (`ef6ce094` ₪1,010, `bd36dfb5` ₪50,
  `86f9f6b5` ₪2,950) — **~₪4,010 סה"כ ירדו מהחשבון של פרויקטים** ברגע
  שיקושרו. פעולה ידנית: פתח את מסמך ההעברה → "+ קשר למסמך אחר" →
  בחר את החשבונית.
- **C1 — תשלום חוב היסטורי** — קוד תוקן וצפויים ~₪4,897 חוב אמיתי לתשלום
  לעובדים (חלוקה מפורטת דווחה בסבב C1). בנוסף, 3 עובדים עם תלוש שגוי-חודש
  (zero-sum, סה"כ שנתי זהה, אבל תלוש חייב לשקף חודש עבודה) → דורש
  **תלושים מתקנים** (רלוונטי לביטוח לאומי, מס הכנסה, פנסיה).
- **מיפוי vendor↔staff לספקים שהם עובדים** — Stage-C בייצור, אבל
  אף `vendor` עדיין לא סומן עם `staff_id`. פעולה ידנית: פתח מסמך שכר של
  ספק שהוא עובד → תחת בורר הספק יש dropdown "עובד מקושר" → בחר את העובד →
  נשמר אוטומטית. מכיוון שיש ~10 ספקים שהם עובדים, זה משהו כמו רבע שעה
  עבודה. **בלי המיפוי, כפתור "הצע פיצול לפי נוכחות" לא יופיע.**

---

## החלטות שננעלו — בתור לבנייה

### קישור מסמכים — matcher אוטומטי (שלב 3)
- **הבסיס** (`linked_document_id` + role גזור + סינון aggregation) פרוס בייצור.
- **מה חסר:** matcher אוטומטי שמזהה זוגות invoice ↔ payment (same vendor,
  |Δamount|≤X, |Δdate|≤Y) ומציע לאדמין באצבע לחיצה. היום הקישור ידני בלבד.
- **סטטוס:** דחוי, הכרעה עתידית מתי לבנות.

### אימות תרגומים SI/HI/ZH
- 21+ מחרוזות שהוספו במסגרת סבבי ה-i18n האחרונים הן best-effort מאוצר-מילים
  קיים בכל שפה. **מומלץ מעבר native-speaker לפני** שעובד לא-עברי ייתקל
  בהודעה בפועל.
- הפריטים ב-i18n.ts:
  - סבב אכיפה: `noOpenEntryToClose` / `gpsOutOfRange` /
    `monthlyRemoteExitCap` / `corrRecordNotFound` / `corrRecordDeleted`.
  - סבב הפרדת ידני: `askForemanForFix` / `manualEntryDisabled`.
  - סבב GPS-override: נוסח מעודכן ל-`gpsOutOfRange` (הפניה למנהל
    העבודה) + `geoRequired` (אותו דפוס). כרגע דו-לשוני ב-runtime עם
    fallback לעברית, אז fix ה-native הוא איכות ולא תקלה חוסמת.

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
