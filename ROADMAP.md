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
- **"מי לא הגיע היום" — העשרה + הסרת מגבלת השעות** — **נפרס** (16.7.26,
  `feature/absent-today` → main `0f7f37a`, `dpl_ABgjxfgwsLbG`). (1) הוסרה
  מגבלת 09:00–14:00 מפריט ה-"לא הגיע" ב-AttentionPanel — רץ כל היום ומתנקה
  אוטומטית כשכולם החתימו כניסה. (2) הספירה עברה ל-**כניסה-בלבד** (`isEntry` —
  "כניסה"/"in"), תואם לפורטל המנהל: עובד עם יציאה יתומה בלבד עדיין נספר
  "לא הגיע"; `attendance_exempt` מוחרג. (3) **AbsentTodayPanel הועשר**
  מ-chips-של-שמות לרשימה: שם + **וואטסאפ** (`wa.me`, נרמול 05→9725) + **חייג**
  (`tel:`) בולטים + פרויקט אחרון (📍) + דגל שפה כמשניים; בלי טלפון → שם בלבד.
  פרויקט אחרון נגזר מ-endpoint חדש
  [`/api/admin/attendance/last-projects`](src/app/api/admin/attendance/last-projects/route.ts)
  (שורת נוכחות אחרונה לפי `clock_at`, חלון 120 יום, admin-only). פורטל המנהל
  לא נגע. 408 טסטים.
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
- **B3 — תיקון לוגיקת "רשומה פתוחה" ל-last-event.** 2026-07-06:
  15+ עובדים אקטיביים נחסמו מיציאה בבוקר. השורש: `openEntryCount`
  ב-`lib/attendance-logic.ts` ספר `ins − outs` בחלון 24h, בלי לזווג
  כרונולוגית. אצל עובד שעשה אתמול IN→OUT ואז היום IN, יציאת אתמול
  (עדיין בחלון) קוזזה מול כניסת היום — count=0 → B3 חסם למרות שכניסת
  היום פתוחה. תוקן ל-**"האירוע האחרון בחלון הוא כניסה"**: מוצאים את
  ה-max `clock_at` עבור entries ו-exits, מחזירים `true` אם ה-entry
  האחרון מאוחר מה-exit האחרון (או שאין exit כלל). B2 (guard כניסה
  כפולה) עובד עם אותה סמנטיקה — האחרון = IN → חסום שני, האחרון = OUT
  → אפשר שיפט חדש. `openEntryCount` הוסר; ה-route משתמש ב-`!hasOpenRecord`.
  5 tests חדשים כולל BUG REPRO של המקרה מהפרודקשן. אימות ב-SELECT מול
  5 עובדים מהדוח (פייסירי, נילנגה, ננדיקה, פזלי, עלי) — כולם עברו מ-BLOCK
  ל-ALLOW. אין שינוי schema. **נפרס בייצור** (commit `a63b826`, אימות:
  `x-matched-path: /admin`) — העובדים החסומים יכולים לצאת עכשיו.
- **4 guards במנגנון ההשלמה הידנית.** אחרי B3, כפילות של ישראל מאיר וייס
  (2026-07-06) חשפה שהזרימה עצמה שגויה: `ManualEntryForm` יצר כניסה חדשה
  אף שהעובד כבר החתים לייב, כי `WorkerHistoryPanel` לא הראה כפתור "השלם
  יציאה" ליום היום (סטטוס `in-progress`), ו-`/api/admin/attendance/manual`
  לא בדק כפילות לפני INSERT. חוקר החקירה מצא 4 באגים ותוקנו:
  (1) `WorkerHistoryPanel.DayActions` קיבל case ל-`in-progress` שמציג
  "השלם יציאה" (mode=`complete` הקיים) — פותח את המסלול הנכון של יציאה
  בלבד. (2) `/api/admin/attendance/manual` בודק לפני INSERT של `type=regular`
  אם `hasOpenRecord` על היום שהוזן — אם כן, `409 already_has_open_entry`.
  (3) `/api/admin/attendance/clock-out` בודק לפני INSERT של יציאה שיש
  כניסה פתוחה — אם לא, `409 no_open_entry_to_close` (בסגנון B3, מונע
  יציאה יתומה שמעוותת דוח חודשי). (4) שני ה-endpoints מכתבים
  `edited_by=admin:<name>` דרך `resolveActorLabel` הקיים (במקום ה-null
  שהיה בפועל למסלול admin), משלים audit trail. 5 tests חדשים ב-
  attendance-logic.test.ts שמתקפים את שני ה-guards עם BUG REPRO של וייס
  ב-clock_at האמיתי. **נפרס בייצור** (commit `a21e41c`, אימות:
  `x-matched-path: /admin`) — הכפילות של וייס לא תוכל להיווצר עוד,
  ולחנן יש כפתור "השלם יציאה" ליום היום. **הפיצ'ר הגדול "תמונת מה יש
  ומה חסר נגישה מכל מקום" נשאר בתור** — הסבב הזה נותן guards + כפתור
  חסר, לא UX חדש.
- **Twilio OUT — פילטר vocabulary + guard נגד יציאה יתומה.** החיפוש
  היזום הבא מצא ש-`api/twilio/voice/action/route.ts` היה חשוף לאותה
  מחלה של וייס בטלפוני: בדיקת הכפילות של OUT השתמשה ב-
  `.eq("action", "out")` — אנגלית בלבד. עובד שחנן החתים לו יציאה ידנית
  (`יציאה` עברית) יכול היה להקיש 2 בטלפון, לא להיתפס ככפילות, וליצור
  יציאה שנייה שמעוותת שעות. בנוסף, ה-branch של OUT לא הפעיל
  `hasOpenRecord` — הקשת 2 בלי כניסה פתוחה יצרה יציאה יתומה (משמרת
  פנטום שלילית בדוח החודשי). הגייטים אוחדו עכשיו לגישה סימטרית של
  IN ו-OUT: שאילתה אחת ב-2 אוצרות מילה + `hasOpenRecord` על יום ישראל.
  OUT ב-`hasOpenRecord=false` מפצל תגובה: יש exit קיים היום → "כבר
  רשומה יציאה בשעה X"; אין כלום → "אין כניסה פתוחה לסגירה, פנה למנהל
  העבודה". `insertPhoneAttendance` עצמו אומת — כותב תמיד `action` באנגלית,
  עקבי עם עצמו. 4 tests חדשים ב-`attendance-logic.test.ts` עם BUG REPRO
  של "prior manual יציאה + Twilio OUT" ועם הכיוון הפוך (manual כניסה
  + טלפוני OUT — חייב לעבוד). **ממצא לטנטי שנשאר בתור:**
  `AdminPortal.tsx:553` מסמן "מי על האתר" לפי newest-by-`created_at`,
  לא לפי `last-event-by-clock_at` — סיכון בינוני (תצוגה בלבד, לא כסף),
  נדחה לפיצ'ר "תמונת חוסרים" שממילא ידרוש רה-לוגיקה. ממצא לטנטי שני
  ב-`voice/project/route.ts` — לא מריץ שוב את הגייט אחרי הפיק של
  הפרויקט (race window של שניות בין `/action` ל-`/project`); כדאי
  להעביר את הגייט לתוך `insertPhoneAttendance` בסבב עתידי.
  **נפרס בייצור** (commit `db9eebe`, אימות: `x-matched-path: /admin`) —
  התבנית הפוני של הכפילות של וייס לא תוכל להתקיים עוד, וגם יציאה יתומה
  דרך הטלפון נחסמת.
- **נעילת שינוי action בעריכה + "השלם יציאה" ב-RecentLogs.** 2026-07-08:
  ישראל שם טוב שכח יציאה אתמול; חנן פתח את שורת הכניסה שלו ב-RecentLogs
  ושינה את ה-dropdown "פעולה" מ-`כניסה` ל-`יציאה` כדי "להשלים" את היום.
  ה-live IN של 08:12 נכתב-על על ידי OUT של 17:04. `original_clock_at`
  שמר את החותם המקורי, אבל **אין `original_action`** בסכימה — האיבוד
  לא-הפיך. תיקון דו-חלקי, בלי שינויי endpoint/schema:
  (א) `EditAttRow` הפך את dropdown הפעולה ל-`disabled`+`aria-disabled`
  עם הסבר: "לא ניתן לשנות כניסה↔יציאה בעריכה. להשלמת יציאה חסרה —
  סגור והשתמש בכפתור 'השלם יציאה' ליד הרשומה." `handleEditAtt` +
  `handleEditAndApproveAtt` הפסיקו לשלוח `action` ב-PATCH body (זמן
  + פרויקט + סטטוס נשארו — הם מזיזים נתון, לא מוחקים אותו). ה-endpoint
  `/api/admin/attendance/[id]` נשאר מקבל `action` תאימות אחורה — הלקוח
  הוא זה שלא ישלח יותר.
  (ב) `RecentLogs` מחשב `staffDayHasExit: Set<staff.id|YMD>` על הרשימה
  הטעונה, בשתי אוצרות מילה (`isEntry`/`isExit`) כך שיציאה עברית ידנית
  סוגרת IN אנגלי לייב ולהיפך. כל שורת כניסה שאין לה OUT תואם ליום
  מציגה chip אמבר "השלם יציאה" ליד תגית "כניסה"; קליק פותח טופס inline
  (HH:MM + אישור/ביטול) שעושה POST ל-`/api/admin/attendance/clock-out`
  עם `{staff_id, project_id, date, time}` — בדיוק כמו mode=complete של
  WorkerHistoryPanel. ה-guard `hasOpenRecord` בשרת עדיין רץ, אז UI
  מיושן לא יכול ליצור יציאה יתומה גם אם טאב מקביל כבר סגר את המשמרת.
  **נפרס בייצור** (commit `65a1c2f`, אימות: `x-matched-path: /admin`) —
  המסלול שכשל אצל ישראל שם טוב סגור פיזית, ולחנן יש כפתור נכון להשלמת
  יציאה ישירות מ-RecentLogs (בנוסף לזה שכבר קיים ב-WorkerHistoryPanel).
- **C1 — payroll routes** (`/api/admin/payroll` + `/api/admin/payroll/export`)
  סוננו לפי `created_at` → 32 שורות backfill חודשי נחתכו מהתלוש. תוקן: סינון
  לפי `clock_at` (workDate) — commit `4e2200b`. אימות ייצור: ~₪4,897 חוב אמיתי
  נחשף לתשלום + 3 עובדים עם תלוש שגוי-חודש (zero-sum, דורש תלוש מתקן).
- **C2/C3 — display reports** (`/api/admin/staff/[id]/history` + `/api/admin/staff/export`)
  אותה משפחה, גישה אחרת: הרחבת ה-widening על `created_at` ל-±35 יום, הישענות
  על סינון workDate שכבר בקוד. commit `e98083c`. אימות: י.ח.ברמן, מאי 2026
  עלה מ-0 שורות → 12 שורות (6 משמרות מלאות).

### תשתית וחוויית משתמש
- **מחולל ההצעות — שורות ₪0.00 + קפיצת עמודות תוקנו.** שני תיקונים קוסמטיים
  ב-`renderPreview`: (1) `isDescriptionOnly` הורחב מ-`qty===0` ל-`qty===0 ||
  unitPrice===0` — פריט בלי מחיר מוצג כשורת תיאור נקייה, בלי "₪0.00" מכוער
  (נפוץ בהצעה כוללת). (2) **ניתוק נראות העמודות מ-lump-sum** — `showQty`/
  `showPrices` חזרו להיות תלויים אך ורק בטוגלים היציבים (`showQuantity`/
  `showItemPrices`), במקום ב-`isLumpSum` שנגזר מ-`grandTotal()` החי; זה עצר
  את הבהוב העמודות בכל הקלדה כשה-grandTotal חוצה 0 עם `totalOverride` מולא
  (רגרסיה מ-`feature/quote-lump-sum`). `effectiveBase`/הסה"כ לא נגעו —
  lump-sum עדיין מזין את הסה"כ, רק לא מסתיר עמודות דינמית; הסתרת מחירים דרך
  הטוגל היציב. `node --check` + build נקי. commit `423bdeb` — **נפרס** לפרודקשן
  (16.7.26, `fix/quote-display-polish` → main, merge ff-only).
- **רוחב התצוגה המקדימה במחולל ההצעות — תוקן.** ה-A4 (`.document`) הוא
  `width:210mm` קבוע, בעוד ה-form panel יכל להימתח עד 900px (`panelWidthPx`
  נשמר ב-config) וה-`.layout` חסום ב-1600px — כך שפאנל התצוגה ירד מתחת
  ל-793px וה-A4 נחתך/נדחס. תיקון CSS/פריסה: `.layout` max-width 1600→1800,
  `.document` קיבל `max-width:100%` (מוקטן בהדרגה במקום להיחתך; print לא
  מושפעת — כבר דורסת ל-`width:100%`), ותקרת ה-form panel 900→640 (applyPanelWidth
  + drag) כדי שלא ירעיב את התצוגה. מובייל נשאר single-column. לא נגעתי
  בלוגיקה/הצעה-כוללת/זריעת-תשלומים. `node --check` + build נקי. **נפרס
  בייצור** (commit `9094811`, deploy `derdqwo8`, אימות `x-matched-path:
  /admin/quotes`).
- **הצעה "כוללת" — מחיר כולל ידני (לפני מע"מ).** חנן רצה הצעות שמפרטות
  תכולה מלאה בלי מחיר/כמות לסעיפים — מחיר אחד כולל. הסתרת המחירים כבר
  הייתה (`showItemPrices`); נוסף שדה `totalOverride` + `effectiveBase() =
  grandTotal()>0 ? grandTotal() : totalOverride` שמחליף את `grandTotal()`
  בכל שרשרת הסה"כ (הנחה, מע"מ, בלוק ה-totals, ולוח התשלומים — מלכודת 48f91f5
  נשמרה). **או-או:** הצעה מפורטת (grandTotal>0) אינה מושפעת כלל. תצוגת
  lump-sum כופה הסתרת עמודות מחיר/כמות. **תיקון שרת קריטי:** `computeTotal`
  (ב-`quotes/route.ts` + `[id]`) קיבל fallback ל-`totalOverride` — אחרת הצעה
  כוללת נראתה ₪0 ברשימה. תואם אחורה (`defaultState.totalOverride=0`), לא נגע
  ב-cloudSync/דליפת-localStorage. `node --check` + build נקי, 408 tests.
  **נפרס בייצור** (commit `ee3432f`, deploy `cbcrpm7n`, אימות
  `x-matched-path: /admin/quotes`).
- **שיפורי נוחות במחולל ההצעות (4 תיקונים).** סריקת נוחות ב-
  [`quote-generator.html`](public/admin-tools/quote-generator.html) מצאה
  חיכוכים חוזרים: (1) "הוסף פרק" היה רק בכותרת (גלילה לראש) ובלי משוב →
  נוסף כפתור תחתון קבוע + `focus()`/`scrollIntoView` לפרק החדש; (2) `focus()`
  גם ב"הוסף פריט" לעקביות; (3) **קיפול פרקים** — chevron בכותרת (▾/◂ RTL)
  שמקפל את גוף הפרק ומשאיר כותרת+סכום; מצב הקיפול **UI-only** (Set במודול,
  לא נשמר) — אפס נגיעה ב-cloudSync / דליפת-localStorage (`caebae0`) /
  זריעת-התשלומים (`48f91f5`); (4) הגדלת אזורי לחיצה (`.btn-icon`, `.btn-small`,
  חצי סידור). HTML/CSS/JS בלבד, `node --check` + build נקי. **נפרס בייצור**
  (commit `725aa0f`, deploy `q1w02r48`, אימות `x-matched-path: /admin/quotes`).
- **מנוע שלמות נוכחות — סבב 3 (פאנל + 2 כלים) — הפיצ'ר הגדול סגור.** נראות
  שוטפת + סגירת הפערים. (א) **פאנל היברידי** ב-AttentionPanel: כשל חי נשאר
  פריט נפרד high, שאר ה-issues מאוחדים לפריט medium אחד "ימים לא שלמים"
  (distinct staff×יום ללא stuck); הוסרו הפריטים stale-opens (≡no_exit) ו-
  pending → אין כפילות. (ב) **מסך ייעודי "מרכז החוסרים"** — sub-tab חדש
  "חוסרים" ב-tab נוכחות, [`IncompletePanel`](src/app/admin/_components/shared/IncompletePanel.tsx)
  קורא ל-`GET .../incomplete` (3 חודשים), מקבץ לפי סוג עם סיכום, כל שורה
  מנווטת לתיקון. (ג) **שיוך פרויקט** ל-no_project (46) — בורר inline → PATCH
  `attendance/[id]` (endpoint קיים, לא נבנה חדש). (ד) **"הוסף יום"** לכשלים —
  ניווט להיסטוריה שם "הוסף יום" הקיים ממתין. foreman-scoped. build נקי, 408
  tests. **נפרס בייצור** (commit `1796d0e`, deploy `6aod3eo1`, אימות
  `x-matched-path: /admin`). **הפיצ'ר הגדול "תמונת מה יש ומה חסר" סגור
  במלואו:** מנוע (`a27e125`) + שער שכר (`63ootmbr`) + פאנל היברידי + מסך
  מרכז החוסרים + שיוך פרויקט + הוסף יום (`6aod3eo1`).
- **מנוע שלמות נוכחות — סבב 1 (מנוע בלבד).** הפיצ'ר הגדול "תמונת מה יש ומה
  חסר, נגישה מכל מקום". helper טהור [`attendance-incompleteness.ts`](src/lib/attendance-incompleteness.ts)
  (`computeIncompleteDays` + `summarizeIncomplete`) + endpoint
  `GET /api/admin/attendance/incomplete?from&to&staff_id?` → `{items, summary}`.
  **6 סוגי חוסר:** no_exit, no_entry, **no_project (חדש — 46 בייצור, הכי נפוץ)**,
  stuck_failure, pending_correction, pending_manual. כל item נושא issue+action+
  ref_id לתיקון. מאחד את הכפילות stale-opens≡no_exit (מקור אמת יחיד); יום יכול
  לשאת כמה issues (day_count = distinct staff×date). רוכב על אותם פרימיטיבים
  של ה-aggregators (2 אוצרות מילה ממקור אחד), בלי לרפקטר את worker-history/
  monthly-report (timeline שונה, monthly קריטי-כספית). foreman-scoped. 10 tests,
  build נקי, 408. commit `43271f3` (מקומי — ממתין ל-push+deploy).
  **סבב 2 (שער השכר) — הושלם:** server helper משותף `loadIncompleteness`
  (fetch+flatten+engine, נצרך ע"י ה-endpoint וה-XLSX export); PayrollTab מציג
  באנר מאוחד אחד "N ימים לא שלמים בחודש — עלולים להשפיע על התלוש" עם פירוט
  לפי 6 סוגים ורשימה מתקפלת שכל שורה מנווטת לתיקון (מחליף את אזהרת ה-pending
  הבודדת מ-24828e1). **מזהיר, לא חוסם.** הערת XLSX לרו"ח. **נפרס בייצור**
  (commit `f8e86e2`, deploy `63ootmbr`, אימות `x-matched-path: /admin`).
  **סבב 3 בתור:** פאנל נראות היברידי (כשל חי
  נפרד/high, שאר ה-issues מאוחד "N ימים לא שלמים"/medium) + סגירת הפער
  `stuck_failure` → כפתור "הוסף יום" + כלי `assign_project` ל-no_project.
- **רגרסיית גלילה אופקית בטבלאות (מ-`ea6bcc9`) — תוקנה.** סעיפים 13+15 של
  סבב תיקוני ה-UI הוסיפו `min-w-[720px]` ל-WorkerHistoryPanel (7 עמ') ו-
  PayrollTab (9 עמ') כדי למנוע דחיסה במובייל — אבל בדסקטופ הפאנל צר מ-720px,
  אז הרוחב הכפוי יצר סרגל גלילה אופקי מיותר (חנן נתקל בזה שוב ושוב). תיקון
  CSS בלבד: `min-w-[720px]` → `min-w-[720px] sm:min-w-0` — נשמר במובייל
  (<640px, מונע דחיסה), מבוטל מ-`sm` ומעלה (טבלה מתכווצת ל-`w-full`, בלי
  גלילה בדסקטופ). המטריצות הרחבות (`ScheduleTable` 840px, `ScheduleByProjectTable`
  940px) לא נגעו — רוחב מוצדק. build נקי. **נפרס בייצור** (commit `26f0a3b`,
  deploy `8wqcng4u`, אימות `x-matched-path: /admin`).
- **בקשות תיקון מובנות — יציאה/כניסה חסרה + רשת ביטחון + מונה מודעות.**
  עובד ששכח יציאה לא יכל לבקש הוספתה — רק "תיקון שעה" של רשומה קיימת, ואישור
  כזה משכתב את `clock_at` של הכניסה לשעת ערב → 0 שעות והמשמרת נעלמת מהשכר
  (4 מ-5 הבקשות הממתינות היו בדיוק זה). התיקון: **סוג בקשה מובנה**
  (`request_type`: fix_time / missing_exit / missing_entry). מיגרציה
  [`20260714_correction_request_type.sql`](supabase/migrations/20260714_correction_request_type.sql)
  (DEFAULT 'fix_time' מפורש — לקח מ-attendance.status; **חנן מריץ ידנית לפני
  הפריסה**). טופס העובד בוחר סוג קודם, סיבה אופציונלית. אישור מפוצל: fix_time
  משכתב (כמו היום), missing_exit/entry **מוסיפים** רשומה (רוכב על `hasOpenRecord`,
  בלי endpoint חדש). רשת ביטחון: helper [`correction-danger.ts`](src/lib/correction-danger.ts)
  מסמן fix_time שמזיז כניסה ל->=12:00 או >4ש' → באנר אדום + "אשר בכל זאת"
  (window.confirm) בפאנל, מגן גם על 5 הקיימות. **מונה מודעות (בלי חסימה):**
  פאנל מציג "בקשה N החודש" (amber ב-N>=3); העובד רואה "זו הבקשה ה-N שלך
  החודש" (עידוד מ-N>=3, לא נזיפה), מחושב בשאילתה בלי עמודה. i18n: 11 מפתחות
  חדשים × 6 שפות (SI/HI/ZH best-effort → **בתור לאימות native**). build נקי,
  398 tests (+5). **נפרס בייצור** (commits `e56a82a` + `cc9515a`, מיגרציה
  הורצה ידנית, deploy `h69xll6er`, אימות `x-matched-path: /admin` + `/he`).
  **5 הבקשות הממתינות: חנן מטפל דרך המנגנון החדש** (4 ידלקו אדום; הטיפול
  הנכון להן — missing_exit / "השלם יציאה").
- **דליפת localStorage בטעינת הצעה קיימת — תוקן.** בפתיחת `?id=` מחולל
  ההצעות צבע את הטופס מיד מ-localStorage (ההצעה הקודמת שנפתחה במכשיר)
  ורק אז `cloudSync.init()` דרס מהענן. כשהמשיכה לגגה/נכשלה, התוכן הישן
  נשאר — חנן פתח #495 וראה תוכן של #481 (רענון קשה פתר). הסכנה: עריכה+
  שמירה לפני הדריסה → כתיבת state שגוי להצעה. **אומת שה-DB תקין** (#495
  שמורה נכון) — בעיית טעינה בלבד. התיקון ב-[`quote-generator.html`](public/admin-tools/quote-generator.html):
  מסלול `?id=` מאתחל ל-defaultState נקי (לא מ-localStorage) + דגל
  `loadPending`; overlay "טוען הצעה…" חוסם אינטראקציה עד שהענן מחזיר;
  שמירה חסומה (`scheduleSave`+`doSave`) בזמן טעינה; כשל → overlay שגיאה
  עם רענון/חזרה-לרשימה ושמירה נשארת חסומה. מסלול הצעה חדשה (בלי `?id=`)
  לא נגע — localStorage לשחזור טיוטה וזריעת לוח התשלומים נשמרים. `node
  --check` עובר, build נקי. **נפרס בייצור** (commit `caebae0`, deploy
  `pfm7p3ip`, אימות `x-matched-path: /admin/quotes`).
- **דוח שכר סופר approved בלבד + אזהרת pending.** הדוח סָפַר כל attendance
  לא-מחוק, כולל `status='pending'` (הזנות מנהל עבודה שממתינות לאישור) ו-
  `rejected`. הכרעת חנן: רק approved ייספר — האישור שער אמיתי. **יישר סתירה**
  מול פיצול-השכר-לפי-נוכחות שכבר סָפַר approved בלבד. **אימות לפני שינוי:**
  מופו כל מסלולי הכתיבה; החתמה חיה/Twilio/clock-out לא כותבים status ויורשים
  ברירת מחדל של העמודה (**לא מוגדרת באף מיגרציה** — הטבלה קדמה למיגרציות).
  SQL אבחון אישר שכולם `approved` (957 web + 76 phone + 3 clock-out) → ההחמרה
  בטוחה. helper טהור [`payroll-attendance.ts`](src/lib/payroll-attendance.ts)
  (`filterApprovedForPay`+`countPendingStatus`) — מקור אמת אחד ל-3 ה-routes,
  סינון ב-JS (שאילתה אחת). אזהרה: `pendingCount` מוחזר; PayrollTab מציג באנר
  amber + כפתור "לתור האישורים", אותו באנר ב-MonthlyReportPanel, ושורת הערה
  ב-XLSX של שני הדוחות (לרו"ח). בונוס: 8 רשומות `rejected` שנספרו בטעות יצאו.
  לא נגעתי ב-`forecast`, בתור הממתינים, ובתיקון המושבתים. build נקי, 393 tests
  (+5). **נפרס בייצור** (commit `24828e1`, deploy `pfm7p3ip`, אימות
  `x-matched-path: /admin`).
- **דוח שכר כולל עובדים מושבתים שעבדו בחודש.** 3 routes סיננו
  `.eq("active", true)` בשאילתת ה-staff ומנו את השורות מרשימת ה-staff —
  עובד שהושבת אחרי שעבד חודש נעלם מהדוח, **כולל מה-XLSX שהולך לרו"ח**. זה
  כסף: עובד עבד ולא קיבל תלוש (8 עובדים לא-פעילים, ~747 שעות ב-3 חודשים
  אחרונים אומתו ב-DB). באג **backend** (הפוך מבאג היסטוריית העובד, שם
  ה-backend היה נקי ורק ה-UI חסם). הכלל החדש: **נוכחות קובעת, לא סטטוס** —
  helper טהור [`payroll-include.ts`](src/lib/payroll-include.ts)
  (`active || workedThisMonth`, מקור אמת אחד ל-3 ה-routes). staff נשלף
  בלי פילטר active אבל **עם `deleted_at IS NULL`** (מחוק ≠ מושבת); מושבת
  נכלל רק אם יש לו נוכחות בחודש — 21 המושבתים הרדומים נשארים בחוץ. שלושת
  ה-routes: `payroll`, `payroll/export` (XLSX לרו"ח), `attendance/monthly-report`.
  UI: PayrollTab (שורות + dropdown) ו-MonthlyReportPanel מסמנים "(לא פעיל)";
  ה-XLSX מוסיף "(לא פעיל)" בשם. לא נגעתי ב-`forecast` (active-only נכון שם)
  ולא ב-`payroll-aggregate.ts`. build נקי, 388 tests (+3). **נפרס בייצור**
  (commit `15eb4fb`, deploy `HxcxnE1N`, אימות `x-matched-path: /admin`).
  **8 העובדים ההיסטוריים: חנן מטפל אחד-אחד — תלושים מתקנים לחודשים שנמצאו
  ב-SQL (רלוונטי לביטוח לאומי/מס/פנסיה).**
- **סטטוס "ללא כניסה" ליציאה יתומה + כפתור "השלם כניסה".** יציאה יתומה
  (exit בלי entry — 8 ימים היסטוריים בייצור, כולם לפני חבילת ה-guards,
  0 חדשים) נפלה בטעות לסטטוס `no-exit` וקיבלה כפתור "השלם יציאה" שתמיד
  נכשל ב-409 (`hasOpenRecord=false`) — call-to-action למסלול מת, הפרת
  עיקרון #12. השורש ב-[`worker-history-aggregate.ts`](src/lib/worker-history-aggregate.ts):
  הטרנרי דחס entry-without-exit ו-exit-without-entry לאותו `no-exit`.
  התיקון: `DayStatus` חדש **`no-entry`** מופרד; DayActions מציג "השלם
  כניסה" (אייקון LogIn); `AttendanceRowEditor` mode חדש `complete-entry`
  שמבקש שעת כניסה בלבד ו-POST ל-`api/admin/attendance/manual` entry-only
  (**אין endpoint חדש** — ה-guard הקיים מחזיר 409 `already_has_open_entry`
  אם כבר יש כניסה). דוח חודשי: מונה `noEntryDays` נפרד מ-`noExitDays`,
  היתומה כבר לא נספרת כ-no-exit ולא כיום עבודה. **אין נזק כספי** (יתומה
  מדולגת בשכר). 4 בדיקות חדשות, build נקי, 385 tests. **נפרס בייצור**
  (commit `5682a3a`, deploy `6t3wyVhV`, אימות `x-matched-path: /admin`).
  **8 היציאות היתומות ההיסטוריות: חנן משלים ידנית מול כל עובד דרך הכפתור
  "השלם כניסה".** לא נגעתי ב-guards הקיימים.
- **הודעת GPS מעצימה לעובד — הוראה ספציפית לאנדרואיד.** כשעובד נחסם על
  הרשאת מיקום (`geoPermissionDenied`, code 1), ההודעה הישנה הייתה מעורפלת
  ("אפשר GPS בהגדרות הדפדפן") ומפנה למנהל כפתרון שווה-ערך. רוב העובדים על
  אנדרואיד. נוסח חדש: הוראה פרקטית ראשונה ובולטת — לחץ על 🔒 (או ⓘ) ליד
  כתובת האתר ← מיקום ← אפשר ← נסה שוב; ההפניה למנהל ירדה לשורה אחרונה
  כמוצא-אחרון. האייקון 🔒/ⓘ מכסה Chrome וגם Samsung Internet. `code 2`
  (`geoPositionUnavailable`) ו-`code 3` (`geoTimeout`) היו כבר ספציפיים
  ומעצימים — רק רסטרוקטורה קלה שמעבירה את "פנה למנהל" לשורה נפרדת, בלי
  שינוי מהות. שבירת שורות `\n` מרונדרת ע"י `whitespace-pre-line` הקיים
  ב-`MenuScreen` (שם `geoError` מוצג) — ללא שינוי הצגה. worker-facing →
  6 שפות (HE/EN/RU מלאות, SI/HI/ZH best-effort → **בתור לאימות native**).
  אין נגיעה בלוגיקת ה-GPS. build נקי, 381 tests. **נפרס בייצור**
  (commit `1f45b42`, deploy `pnu7qclas`, alias binyaneitan.com). **הערה:**
  הנקודה העיוורת נשארת — כשל הרשאת-מיקום עדיין client-side ולא נרשם
  ב-`attendance_failures`; אם עובד לא יתקן לבד, חנן לא יראה זאת בפאנל.
- **`SYSTEM_MAP.md` נוצר — מפת מערכת מלאה (שלב 1+2).** מפת ניווט ממאקרו
  למיקרו לצד `ROADMAP` ו-`DEVELOPMENT_PRINCIPLES`, לשתי מטרות: (1) לחנן —
  מבט-על לזיהוי חוסרים; (2) לסוכני AI — נקראת בתחילת משימה במקום חקירה חוזרת.
  מבנה 3 רמות: חלק א' ליבה עסקית מפורטת (19 אזורים כולל פורטלי ממונה/עובד/Twilio,
  כל אחד: מה/מי/פעולות/תת-מסכים/זרימות/חיבורים/קבצים), חלק ב' האתר הציבורי
  (קהלים/עמודים/שפות/לידים), חלק ג' היקפי (מתמטיקה/ארכיון/החזקות), חלק ד'
  ~30 טבלאות, חלק ה' עוגנים + gotchas. מבוסס סריקת קוד של 8 סוכני חקירה
  מקבילים, לא הנחות. `DEVELOPMENT_PRINCIPLES.md` עודכן להפנות לקריאתו בתחילת
  משימה. שלב 1 (שלד מאקרו) commit `087c184`, שלב 2 (מיקרו) commit `7ef9c99`.
  **שלב תרשימים — 4 תרשימי Mermaid נוספו** (GitHub מרנדר אוטומטית): תרשים
  אזורים (מבט-על) + 3 זרימות (החתמת נוכחות · מסמך פיננסי · נוכחות←שכר),
  כל אחד ליד הטקסט שהוא מתאר; אומתו דרך הפרסר של mermaid (4/4). commit `8b233f6`.
  מסמך תיעוד בלבד — לא נדרשת פריסה. **שלב 3 (איך/מתי להשתמש במפה) בתור.**
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
- **תיקון קפיצת todayLogs בנוכחות** — `TodayLog` השתמש ב-
  `{!dataLoading && ...}` gate שהחליף את הרשימה ב-"טוען..." על כל
  reload (עריכת רשומה / edit+approve / הוספה ידנית → `useAdminAttendance`
  קוראים `reload()` → `setDataLoading(true)` באדמין → הרשימה נופלת מהעץ →
  הגובה קורס → הגלילה מתאפסת). עטוף עכשיו ב-`<StaleRefresh>` (אותו דפוס
  שקיים בתור האישורים ובבורד) — הרשימה הישנה נשארת + spinner קטן בזמן
  הרענון, בלי קפיצה. שינוי תצוגה בלבד — reload/loadData לא נגעו.
  **נפרס בייצור** (commit `be4bdbe`, אימות: `x-matched-path: /admin`).
  **מוקדים נותרים לסבב הבא:** ScheduleTab (הוספת פועל יומי) + CollectionsTab.
- **הודעות שגיאה בזרימת העובד — גל 1 (ניקוי + הבחנה + קידוד).**
  שלוש בעיות תוקנו בסבב הזה: (1) 5 מפתחות i18n מאובנים
  (`manualBtn`/`manualTitle`/`manualSentTitle`/`manualSentBody`/`manualHint`)
  שרדו את סבב מחיקת "דיווח חסר" — נמחקו מהממשק `ScreenStrings`
  ומ-6 השפות (30 מחרוזות). (2) `geoRequired` פוצל ל-4 מפתחות
  ספציפיים: `geoPermissionDenied` / `geoPositionUnavailable` /
  `geoTimeout` / `geoUnsupported`, וב-`AttendanceForm.tsx:227` ה-callback
  של `getCurrentPosition` מקבל עכשיו את `GeolocationPositionError.code`
  ומאתר את המפתח (1/2/3). כל 4 עברו ל-`bilingualForForeman`. (3) 8
  מסלולי fallback שנפלו ל-`unknownError` קודדו מחדש ב-backend
  (`invalid_body`/`missing_action`/`invalid_action`/`location_required`/
  `access_denied`/`server_error`/`session_expired`) — הודעות עובד
  ספציפיות ב-`i18n.ts`, פרטים טכניים ב-`console.error` בלבד.
  Build נקי, 367 tests. **נפרס בייצור** (commit `9146fb9`, אימות:
  `x-matched-path: /admin`).
- **ניקוי מפתחות i18n מאובנים — הושלם.** 8 מפתחות `manual*` נוספים
  שזוהו בגל 1 (`manualNoSite` / `manualSubmit` / `manualBackToHistory` /
  `manualDateLabel` / `manualTimeIn` / `manualTimeOut` / `manualProjectLabel` /
  `manualValidation`) אומתו 0-referenced ונמחקו מה-interface
  `ScreenStrings` ומכל 6 השפות (48 מחרוזות + 6 שורות interface).
  Build נקי, 367 tests. **נפרס בייצור** (commit `c697e8d`, אימות:
  `x-matched-path: /admin`).
- **עקרונות טיפול בשגיאות ב-DEVELOPMENT_PRINCIPLES.md — גל 3.**
  מקטע חדש #12–13 + הנחיה, בסגנון התמציתי של העקרונות הקיימים:
  (12) call-to-action מצביע על קוד חי — `git grep` את שם הפיצ'ר
  ואת טקסט הכפתור בכל שפות ה-i18n כשמוחקים; (13) קוד אחד, הודעה
  אחת — כשל משתמש → קוד ברור, כשל טכני → הודעה ידידותית + log
  מפורט בשרת; והנחיה: שגיאה שמשביתה עובד ראויה לנראות אדמין
  (לא חוק גורף). commit `72ae674`.
- **פאנל נראות כשלי החתמה — גל 2.** האירוע של 2026-07-06 (15+
  עובדים שנחסמו מ-B3 וחנן גילה רק כי עובד היה לידו) הוכיח שכשלי
  החתמה שקטים = בעיה קלאסית. המנגנון:
  - טבלה חדשה `attendance_failures` (מיגרציה `20260706_attendance_failures.sql`)
    עם 3 קטגוריות: `worker_stuck` (מוצג), `noise` (נשמר, לא מוצג —
    session_expired/rate_limit/invalid_body), `security_signal`
    (access_denied — נשמר, לא מוצג). Partial index על worker_stuck.
    RLS enabled ללא policies (זהה ל-attendance_corrections).
  - Helper `failClock()` ב-`/api/attendance/route.ts` שעוטף את
    **כל 13 error returns** — כותב לטבלה fire-and-forget (INSERT
    שנכשל לא חוסם את התשובה לעובד) ומחזיר את ה-NextResponse
    הסטנדרטי. עקרון #13 ("קוד אחד, הודעה אחת") מקבל אכיפה טכנית —
    קשה להוסיף return בלי לכתוב ללוג.
  - Endpoint `GET /api/admin/attendance/failures` — מחזיר
    `worker_stuck` מ-24h עם JOIN לשם עובד + פרויקט, מוגבל 500.
  - Panel: פריט חדש ב-`AttentionPanel` (severity: high,
    icon: XCircle) עם count של worker_stuck 24h. onClick →
    תת-לשונית חדשה `"failures"` ב-AttendanceTab (לצד live/history)
    שמראה את הפירוט: שם + "לפני X דק'" + סיבה בעברית + פרויקט.
    server_error מודגש אדום כתקלה שדורשת התייחסות. עטוף
    ב-`<StaleRefresh>` לפי עקרון "לא לקפוץ ברענון".
  - הטבלה מוחלטת — לא מזינה כסף, לא נוגעת ב-payroll.
  - **נפרס בייצור** (commit `4457794`, אימות: `x-matched-path: /admin`);
    המיגרציה `20260706_attendance_failures.sql` הורצה ידנית ב-Supabase.
    מכשל ההחתמה הבא ואילך — חנן יראה שם + זמן + סיבה בעברית ברגע
    שהעובד נתקע, במקום להסתמך על צילום מסך.
    **Follow-up:** cron ניקוי אם הטבלה תגדל מעבר לגודל נוח
    (v1 בלי, ~50-150 שורות/חודש צפוי).
- **גישה להיסטוריית עובד לא-פעיל.** חנן השבית עובד ורצה לראות את
  ההיסטוריה שלו, לא מצא איפה. החקירה מצאה שהנתונים במלואם ב-DB
  (`staff.active=false`, לא נמחק — 21 עובדים לא-פעילים, 6 עם היסטוריה
  שמורה של עשרות שורות `attendance`), וה-endpoint
  `staff/[id]/history` לא מסנן `active`. שני שערים ב-UI בלבד חסמו:
  (1) [`WorkersTab.tsx:600`](src/app/admin/_components/tabs/WorkersTab.tsx#L600)
  הסתיר את כפתור "היסטוריה" ב-`!isInactive`; (2)
  [`WorkerHistoryPanel.tsx:63`](src/app/admin/_components/tabs/WorkerHistoryPanel.tsx#L63)
  סינן את ה-picker ל-`s.active` בלבד (עם קומנט "keep inactive optionally
  available later if needed" — מישהו ידע שזו מגבלה זמנית). תיקון UI-only:
  כפתור "היסטוריה" מוצג גם למושבתים; ה-picker כולל את כולם, פעילים
  ראשונים ואז מושבתים עם סיומת "(לא פעיל)" ליד השם + בכותרת הבחירה
  הנוכחית. **"צפה בתור" (view-as-foreman) נשאר חסום למושבתים** —
  הבחנה מכוונת: היסטוריה = צפייה בעבר (מותר); צפה-בתור = פעולה בהווה
  (לא). אין נגיעה ב-backend/schema/endpoint. Build נקי, 381 tests.
- **בורר תאריכים מותאם בפאנל היסטוריית עובד.** `<input type="date">`
  של הדפדפן מגיע עם spinner אנכי (↑=קדימה, ↓=אחורה) שנוגד את קריאת
  הזמן בעברית ולא ניתן לשנות. הוחלף ב-DateField חדש (
  [`shared/DateField.tsx`](src/app/admin/_components/shared/DateField.tsx))
  שמקבילה ל-MonthField/WeekPicker: חיצים אופקיים ב-RTL
  (`ChevronRight`=יום קודם, `ChevronLeft`=יום הבא), input טקסט
  editable ל-YYYY-MM-DD, commit-on-blur כדי שלא ייגרם fetch על כל
  אות. הוסף strip "טווח מהיר" עם `החודש הזה` / `החודש הקודם` שממלאים
  from+to בלחיצה — 90% ממקרי השימוש (מחלוקת שכר על חודש מסוים).
  בנוסף: תרגמנו לעברית את שגיאות ה-validation ב-
  `/api/admin/staff/[id]/history` ("תאריך ההתחלה חייב להיות לפני
  תאריך הסיום" ו-"תאריך לא תקין — נדרש פורמט YYYY-MM-DD") שהיו
  אנגלית וזלגו ישירות לבאנר האדום. שינוי UI + הודעות שרת בלבד,
  אין נגיעה בלוגיקת שליפת ההיסטוריה. Build נקי.
  **נפרס בייצור** (commit `39f9346`, אימות: `x-matched-path: /admin`) —
  חיצים אנכיים ההפוכים של הדפדפן נעלמו מהמסך, וטווח חודש מלא הוא
  שתי לחיצות במקום ריקוד בורר.
- **StaleRefresh** — רענון חלק, ללא spinner-flash (5 מסכים).
- **קריאות** — tokens (`text-content`/`text-caption`/`text-muted`), Card depth,
  ניגודיות AA, שלושה סבבי refactor (dashboard, admin tabs, ForemanPortal).
- **i18n עובד** — 6 שפות בפורטל, שפה נשמרת ב-DB פר-עובד.
- **שפת סימון** — Overline tags, badge language, chip flags.
- **Auth ממונה/עובד** — טלפון בלבד (הוסר PIN gate).
- **זריעת לוח תשלומים אוטומטית במחולל הצעות מחיר.** התווית ליד
  התבנית הגלובלית ("ברירת מחדל ללוח תשלומים — תכנס אוטומטית להצעות
  חדשות", `quote-generator.html:1751`) הבטיחה זריעה אוטומטית כבר
  מהקומיט הראשון של המחולל (`8d98050`), אבל הקוד שיזרע *מעולם*
  לא נכתב. אימות DB ב-10 הצעות אחרונות: 0 מתוכן כללו בלוק payment,
  אף ש-7 מהן שמרו תבנית 6-שלבים ב-`defaultPaymentMilestones`. חנן
  ניצל פעם אחר פעם את התבנית השמורה, יצר "הצעה חדשה", וגילה שהלוח
  חסר גם בתצוגה המקדימה וגם ב-PDF (המנגנון היחיד — `window.print()`
  על אותה תצוגה). תוקן על ענף ה-init של הצעה חדשה (`!urlHasQuoteId()`),
  אחרי ש-`COMPANY_CONFIG_KEYS` העביר את `defaultPaymentMilestones`
  מהמצב הקודם: אם המערך קיים ולא ריק → `createBlock('payment')` +
  מיפוי של `defaultPaymentMilestones` לתוך `block.milestones` (כל
  שלב מקבל `uid()` טרי, description ו-percentage מהתבנית) + push
  ל-`state.blocks`. תבנית ריקה → אין זריעה (בלי בלוק ריק). הצעות
  קיימות נטענות דרך `cloudSync.init()` מ-`result.quote.data` בלי
  שינוי — לא נגענו רטרואקטיבית. הכפתור הידני "💰 לוח תשלומים" ו-
  `renderPaymentPreview` לא נגעו בהם (רק לא היה להם בלוק לרנדר).
  17 שורות ב-`public/admin-tools/quote-generator.html`, שינוי HTML
  סטטי. `node --check` על ה-inline JS עובר; next build נקי.
  **נפרס בייצור** (commit `48f91f5`, אימות: `x-matched-path: /admin/quotes`) —
  הצעה חדשה מקבלת עכשיו את הלוח מיד בטופס ובתצוגה, בלי קליק נוסף.
- **6 תיקוני ממשק HIGH — ניגודיות + טאץ' + empty states.** סריקה
  שיטתית של פורטלי אדמין+ממונה מצאה 20 פגמים; 6 מהם דורגו HIGH
  ("מידע שאי אפשר לקרוא / פעולה שאי אפשר להקיש עליה"). כולם תוקנו
  בסבב אחד — CSS-only, בלי שינויי לוגיקה/state/זרימה:
  (1) [`ForemanPortal.tsx:693-717`](src/app/components/ForemanPortal.tsx#L693) — הדר הממונה: 5 מופעים
  של `text-white/25` / `text-white/30` על `bg-charcoal` → `text-white/70`
  (הוברי כפתורים `/50` → white). שם ממונה, "הוצאות שבועיות", "רענן",
  "החלף פרויקט", "יציאה" עלו מ-~2.4:1 ל-~7:1.
  (2) [`ForemanPortal.tsx:1355`](src/app/components/ForemanPortal.tsx#L1355) — טאב לא-פעיל בניווט
  התחתון: `text-charcoal/30` → `/60`. 6 טאבים ראשיים ברורים.
  (3) [`AttendanceTab.tsx:1044,1262`](src/app/admin/_components/tabs/AttendanceTab.tsx#L1044) — טלפוני עובד
  ב-TodayLog + RecentLogs: `text-charcoal/35` → `/70`. זה המספר
  שחנן מחייג אליו בפועל.
  (4) [`AttendanceTab.tsx:1054-1064,1271-1272`](src/app/admin/_components/tabs/AttendanceTab.tsx#L1054) — 3 כפתורי-אייקון
  (Pencil של יומן, History, Pencil של Recent): `size={11}` → `{14}`
  + `p-0.5` → `p-1.5`. שטח מגע מ-~12×12 ל-~28×28 (מעל סף 24px של
  WCAG 2.2). ה-Pencil בשורות pending-approval (line 774) נשאר —
  לא סומן HIGH.
  (5) [`PlanningTab.tsx:272,406`](src/app/admin/_components/tabs/PlanningTab.tsx#L272) — empty states: `text-charcoal/20`
  ו-`/25` → `/60`. באבן דרך ריקה נוספה שורת רמז — *"אין משימות תחת
  אבן דרך זו — הוסף מ'הוספת משימה שבועית' למעלה"* — בסגנון "אין
  דיווחים היום — לחץ 'רענן עכשיו'". ב-"ריק" היומי (line 272)
  ההודעה נשארה תמציתית כדי לא לשכפל את הרמז 7 פעמים.
  (6) [`AttendanceReportMistake.tsx:66,76`](src/app/components/attendance/AttendanceReportMistake.tsx#L66) — תוויות טופס תיקון
  worker-facing (6 שפות): `text-[0.65rem]` → `text-caption` (10.4px→14px).
  `uppercase tracking-wider` נשמר כי הוא עדיין תקף ב-RU/EN. 6 המחרוזות
  אומתו — כולן קצרות (עד ~30 תווים), לא נשברות ב-14px.
  4 קבצים, +18/-18 שורות, npm run build נקי.
  **נפרס בייצור** (commit `69bbccb`, אימות: `x-matched-path: /admin`) —
  6 מכשולי שמישות שחזרו יום-יום נגמרו. **14 בעיות Medium/Low נותרו
  בתור לסבב הבא + `responsive-quick-wins` (2 קונפליקטים טריוויאליים
  ב-`IncomeTab`/`WorkersTab`).**
- **responsive-quick-wins — מוזג ונפרס.** ענף `responsive-quick-wins`
  היה מגובה על origin משנת יוני 2026 עם 2 קומיטים (`32b7fc3`,
  `c9094d0`) של שיפורי רספונסיביות למובייל. הבדיקה הקודמת אימתה
  שהם עדיין רלוונטיים עם 2 קונפליקטים טריוויאליים; הובאו עכשיו ל-main
  ב-3 קומיטים (2 cherry-picks + הרחבה אחת):
  (א) **טפסי אדמין למובייל** — [`ExpensesTab`](src/app/admin/_components/tabs/ExpensesTab.tsx) (3 שורות),
  [`IncomeTab`](src/app/admin/_components/tabs/IncomeTab.tsx) (1 שורה), [`WorkersTab`](src/app/admin/_components/tabs/WorkersTab.tsx) (11 שורות —
  9 מ-branch המקורי + 2 שדרוגי אחידות לזוג "שיבוץ ללוח"/"תווית"
  שנוסף על main משני צידי הטופס). כל שורות ה-grid עברו מ-
  `grid-cols-2/3` ל-`grid-cols-1 sm:grid-cols-2/3` — במובייל <640px
  שדה תופס רוחב מלא במקום ~163px/108px דחוסים; ב-`sm+` המראה זהה.
  (ב) **טבלת ההצעות** — [`QuotesListClient`](src/app/admin/quotes/list/QuotesListClient.tsx): טבלת 7 עמודות
  נעטפה ב-`overflow-x-auto -mx-4 px-4`. הגלישה האופקית מוכלת בכרטיס
  במקום לגרור scrollbar לכל העמוד. אותו דפוס `PayrollTab`/`AttendanceTab`
  כבר משתמשים בו.
  (ג) **בנר יעצי במחולל הצעות** — [`QuoteGeneratorClient`](src/app/admin/quotes/QuoteGeneratorClient.tsx): `lg:hidden`
  bronze banner "מחולל ההצעות מותאם למחשב — לפתיחה ופעולה מיטבית,
  פתח ממחשב." יעצי, לא חוסם; ה-iframe נשאר לרשות המשתמש מתחת.
  המחולל עצמו נשאר HTML של 3,843 שורות עם `A4 210mm` preview —
  רה-ריט רספונסיבי אמיתי הוא פרויקט נפרד.
  פתרון הקונפליקטים: main העביר את IncomeTab לתוך אקורדיון + הוסיף
  שדה "שיבוץ ללוח" ב-WorkersTab בשני מקומות. שמרנו את כל התוספות
  של main והחלנו `grid-cols-1 sm:grid-cols-2` על ה-divs הרלוונטיים
  (כולל אלה שנוספו על main) — סימטריה בין טופס הוספה לעריכה.
  5 קבצים, +27/-17 שורות, npm run build נקי.
  **נפרס בייצור** (commit `144ff9d`, אימות: `x-matched-path: /admin`) —
  4 טפסי אדמין וטבלת הצעות במובייל נקיים; מחולל ההצעות מציב ציפייה
  נכונה במקום להיראות שבור. **14 בעיות Medium/Low מהסריקה נותרו
  בתור לסבב הבא.**
- **14 תיקוני ממשק Medium/Low — סריקת הממשק נסגרה (20/20).**
  סבב שלישי ואחרון של סריקת ה-UI: 12 Medium + 2 Low. CSS/גדלים/
  tooltip/aria-label בלבד, בלי שינויי לוגיקה. **10 קבצים, +39/-38.**
  **נוכחות ותיקוני עובד:**
  (8) [`AttendanceTab.tsx:1265`](src/app/admin/_components/tabs/AttendanceTab.tsx#L1265) — `title={r.project.name}` על
  שם פרויקט מוקטע.
  (11) [`CorrectionRequestsPanel.tsx:137-169`](src/app/admin/_components/shared/CorrectionRequestsPanel.tsx#L137) — 6 שדות קריטיים
  (שפה/פעולה/תאריך/זמן/סיבה/חותם) מ-`text-[0.65rem]`/`text-[0.75rem]`
  → `text-caption` (14px). כפתורי approve/reject לא נגעו.
  (12) [`WorkerHistoryPanel.tsx:321,325,392`](src/app/admin/_components/tabs/WorkerHistoryPanel.tsx#L321) — סמן ½-יום,
  "ממתין" chip (Clock `size=9→12`), placeholder חופש → `text-caption`.
  (13) [`WorkerHistoryPanel.tsx:288`](src/app/admin/_components/tabs/WorkerHistoryPanel.tsx#L288) — נוסף `min-w-[720px]`
  על טבלת 7 עמודות; אותו דפוס `ScheduleTable` כבר משתמש בו.
  (18) [`AttendanceRowEditor.tsx:154,166,178`](src/app/admin/_components/shared/AttendanceRowEditor.tsx#L154) — 3 תוויות
  "שעת כניסה/יציאה/סיבת תיקון": `text-[0.65rem] uppercase tracking-wider`
  → `text-caption`. אומת admin-only Hebrew (נקרא רק מ-
  `WorkerHistoryPanel.tsx:346`), אין שפות לטיניות שהעברה תשבור.
  (19) [`AttendanceTab.tsx:79`](src/app/admin/_components/tabs/AttendanceTab.tsx#L79) — PhoneCallChip: Phone
  `size=9→12` + `aria-label` (התווית עצמה `hidden sm:inline`, screen
  reader היה חסר הקשר במובייל).
  (20) [`AttendanceTab.tsx:1119`](src/app/admin/_components/tabs/AttendanceTab.tsx#L1119) — empty state "אין רשומות
  ב-7 הימים האחרונים" קיבל רמז *"— לחץ 'רענן עכשיו' אם עובדים
  דיווחו בינתיים"* (בסגנון "אין דיווחים היום").
  **תכנון + שיבוץ:**
  (7) [`PlanningTab.tsx:283-288`](src/app/admin/_components/tabs/PlanningTab.tsx#L283) — 3 כפתורי סטטוס `▶ ✓ ✕`
  קיבלו `title` + `aria-label` ("הפעל משימה" / "סמן כהושלמה" /
  "בטל שיוץ ליום"). ✕ בונוס: `text-charcoal/20`→`/60` (היה בלתי-
  נראה למרות שזו פעולה, לא עיטור).
  (9) [`WorkerChip.tsx:87-92`](src/app/admin/_components/shared/WorkerChip.tsx#L87) — תג פרופסיה
  `text-[0.6rem]` (9.6px) → `text-caption` + `title` על שם עובד
  ותג פרופסיה (שניהם `truncate max-w-[…]`); "ידני" marker גם
  ל-`text-caption`.
  (10) [`AssignCellDialog.tsx:108,130,133`](src/app/admin/_components/shared/AssignCellDialog.tsx#L108) — 3 סימני
  "נוכחי"/"ידני" `text-[0.6rem]` → `text-caption`.
  **מסמכים + שכר:**
  (14) [`StaffDocumentsSection.tsx:237`](src/app/admin/_components/shared/StaffDocumentsSection.tsx#L237) — כלל ההעלאה
  "PDF/JPG/… עד 10MB" מ-`text-[0.6rem] text-charcoal/35` →
  `text-caption text-charcoal/70`.
  (15) [`PayrollTab.tsx:136,156,160`](src/app/admin/_components/tabs/PayrollTab.tsx#L136) — טבלת שכר 9 עמודות:
  `text-xs`→`text-caption` + `min-w-[720px]`; תג "עצמאי" ו-"מחוק"
  → `text-caption`. מספרים ותגיות ההשפעה-על-תלוש קריאים.
  **פורטל ממונה:**
  (16) [`ForemanPortal.tsx:671,673,677`](src/app/components/ForemanPortal.tsx#L671) — hints של מסך בחירת
  פרויקט: "לחץ לכניסה" `/35`→`/70`; ChevronRight `/25`→`/60`;
  "יציאה מהמערכת" `/25`→`/70`.
  (17) [`ForemanPortal.tsx:698,792-794,1141`](src/app/components/ForemanPortal.tsx#L698) — 5 אייקוני צ'יפ
  Lucide `size={9}`→`{12}`: Flame (הוצאות שבועיות), Package/Users/
  Wrench (חומרים/קבלן/ציוד ב-"מחר דרוש טיפול"), AlertTriangle
  (ספירת red count יומית).
  **נפרס בייצור** (commit `ea6bcc9`, אימות: `x-matched-path: /admin`) —
  **סריקת הממשק (20 ממצאים) נסגרה במלואה** על פני 3 סבבים: 6 HIGH
  (`69bbccb`), `responsive-quick-wins` (`144ff9d`), 14 Medium/Low
  (`ea6bcc9`). מסכי היום-יום של חנן (נוכחות/תכנון/שכר) והפורטלים
  של ממונה ועובד עברו ניקיון קונטרסט + טאץ' + תוויות מקצה לקצה.
- **התראת "כניסות פתוחות מימים קודמים" הפכה למסלול טיפול מלא.**
  הפריט בפאנל "דורש תשומת לב" של הדשבורד קיים מאז חבילת האכיפה
  (`43c711e`, B1 signal path) והספירה שלו נכונה — אבל ה-onClick
  עשה רק `goToTab("attendance")` והנחית על sub-tab `"live"` שאין
  בו שום פאנל שמציג את `staleOpens`. חנן היה לוחץ על ההתראה
  ורואה אותו מסך שלא היה מזכיר את יוסף חיים ברמן שנתקע פתוח מ-06.07
  09:04 באגסי 52 ירושלים. הממונה כן ראה פאנל מקביל
  ([`ForemanPortal.tsx:927`](src/app/components/ForemanPortal.tsx#L927)); לאדמין
  לא היה מקבילה. תוקן:
  (א) [`AttendanceTab`](src/app/admin/_components/tabs/AttendanceTab.tsx) קיבל
  `staleOpensPanel` amber ב-sub-tab `"live"`, בין `correctionsPanel`
  ל-`ReportPanel`. סגנון מקביל לפאנל הממונה — `AlertTriangle` + כותרת
  amber + כרטיס `bg-amber-50 border-amber-200` עם שורה לכל יתום:
  שם עובד + זמן כניסה (DD.MM HH:MM ישראל, דרך `fmtStaleWhen`
  מקומי) + שם פרויקט. כל שורה `<button>` מלא רוחב עם hover אמבר
  עמוק יותר, קורא ל-`onOpenStaleDay(staff_id, day_ymd)`.
  (ב) [`AdminPortal.viewWorkerHistoryForDay(staffId, ymd)`](src/app/components/AdminPortal.tsx#L1160) —
  helper חדש שמאמץ את הדפוס של `viewWorkerHistory` הקיים וגם קובע
  `historyFrom = historyTo = ymd`, כדי ש-WorkerHistoryPanel ייפתח
  ממוקד ליום היתום. עם commit `a21e41c` כפתור "השלם יציאה"
  ([`WorkerHistoryPanel.tsx:392`](src/app/admin/_components/tabs/WorkerHistoryPanel.tsx#L392))
  כבר מחכה שם — קליק אחד → טופס HH:MM → יוצר יציאה בלי לגעת בכניסה.
  (ג) onClick של הפריט `stale-opens` בפאנל התשומת-לב
  ([`AdminPortal.tsx:1466`](src/app/components/AdminPortal.tsx#L1466)) עודכן
  ל-`setAttendanceSubTab("live"); goToTab("attendance");` — אותו דפוס
  שהפריט `not-clocked` כבר משתמש בו — כדי להבטיח שהפאנל האמבר
  יהיה גלוי בעת נחיתה, גם אם הביקור הקודם השאיר את המשתמש
  ב-sub-tab אחר.
  לא נגעו: ה-endpoint `/api/admin/attendance/stale-opens` (נכון,
  אומת מול הרשומה החיה), ה-פאנל של הממונה, וכפתור "השלם יציאה"
  עצמו. 2 קבצים, +73/-1 שורות, `npm run build` נקי.
  **נפרס בייצור** (commit `3b87006`, אימות: `x-matched-path: /admin`) —
  מסלול "התראה → פאנל → פעולה" סגור סופית; אחת ההתראות שנשארה
  אילמת מאז 2026-07-06 (הרישום הראשון שנתפס) מעבירה עכשיו את חנן
  ישירות למקום שבו הוא סוגר את היום. הפריט התאם עצמו לדפוס של
  שאר הפריטים בפאנל.
- **2 מוקדי קפיצה נוספים — ScheduleTab + CollectionsTab — נסגרו.**
  שני מוקדים נותרו מסבב האנטי-קפיצה: שניהם השתמשו באנטי-דפוס
  הקלאסי `{loading && <Spinner/>}` + `{!loading && data && <Content/>}`,
  שמוריד את כל אזור התוכן מ-DOM על כל reload, מאפס גלילה, ומאבד
  את המקום שהמשתמש היה בו. אותו פתרון שכבר החיל על BoardTab,
  JoinRequestsTab ו-pending-queue: עטיפה ב-`<StaleRefresh loading=...
  hasContent=!!data>` שמשמר את הפריים הקודם עם dim + badge "מתעדכן…"
  עד שהנתונים החדשים מגיעים.
  (א) [`ScheduleTab.tsx`](src/app/admin/_components/tabs/ScheduleTab.tsx) — הקפיצה
  התרחשה אחרי `handleAddTemp` ([`:360`](src/app/admin/_components/tabs/ScheduleTab.tsx#L360),
  POST של עובד יומי → `await load(sunday)`), כפתור "רענן" בסרגל
  ([`:429`](src/app/admin/_components/tabs/ScheduleTab.tsx#L429)), ו-"נסה שוב"
  במסך שגיאה. שינויי שיבוץ (`applyPick`) לא קפצו כי היו כבר optimistic
  (`setData`, [`:150,164,169`](src/app/admin/_components/tabs/ScheduleTab.tsx#L150))
  — לא נגעו. הפתרון: עטיפה של ה-`worker`/`site` views ב-StaleRefresh
  עם `spinner` override שמשמר את הודעת "טוען תכנון…" בטעינה ראשונה.
  Error banner נשאר מחוץ (אין מה להשאיר על המסך אם ה-reload עצמו
  נכשל).
  (ב) [`CollectionsTab.tsx`](src/app/admin/_components/tabs/CollectionsTab.tsx) —
  הקפיצה התרחשה אחרי כפתור "רענן" ידני ([`:141`](src/app/admin/_components/tabs/CollectionsTab.tsx#L141))
  ואחרי `onPayment` שגורם ל-parent להריץ reload. `paying` state
  מקומי (line 117) חסם inputs אבל לא היה זה שהפיל את ה-DOM. הפתרון:
  עטיפה זהה סביב hero + empty-state + project-groups; הוספת
  `<div className="space-y-4">` פנימי כדי לשחזר את המרווח בין
  כרטיסי פרויקטים שהגיע מ-`space-y-4` של ההורה.
  **סריקת רוחב:** [`QuotesTab.tsx:87-98`](src/app/admin/_components/tabs/QuotesTab.tsx#L87)
  מציג אותו אנטי-דפוס לכרטיס "הצעות אחרונות" בדשבורד, אבל אין שם
  auto-refresh (`useEffect` פעם אחת ב-mount), והכרטיס below-the-fold —
  לא דחוף, נדחה. שאר הלשוניות (AttendanceTab עם 3 StaleRefresh,
  BoardTab, JoinRequestsTab, PayrollTab עם empty-state בלבד)
  נקיות.
  2 קבצים, +109/-79 שורות, `npm run build` נקי.
  **נפרס בייצור** (commit `78f5372`, אימות: `x-matched-path: /admin`) —
  הוספת עובד יומי + רענון גבייה + סימון תשלום → הרשימות
  נשארות על המסך, badge "מתעדכן…", בלי קפיצה. **QuotesTab
  נותר במוקד יחיד ולא-דחוף בתור.**

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
  - **סבב הודעות שגיאה גל 1:** `geoPermissionDenied` (הישן של
    `geoRequired`) + 3 חדשים לפי `GeolocationPositionError.code`
    (`geoPositionUnavailable`, `geoTimeout`, `geoUnsupported`), וכן
    4 מפתחות fallback שהוציאו מסלולים מ-`unknownError`
    (`errClientBadRequest`, `errLocationRequired`, `errAccessDenied`,
    `errServerBusy`). 7 חדשים × 4 שפות non-HE = 28 מחרוזות
    best-effort לתקף מול native.
  - **סבב הודעת GPS מעצימה:** נוסח חדש ל-`geoPermissionDenied` (הוראה
    ספציפית לאנדרואיד — 🔒/ⓘ ליד כתובת האתר ← מיקום ← אפשר, הפניה למנהל
    כמוצא אחרון) + רסטרוקטורה קלה ל-`geoPositionUnavailable`/`geoTimeout`.
    SI/HI/ZH best-effort → **לתקף מול native.**
  - **סבב בקשות תיקון מובנות:** 11 מפתחות חדשים — `corrTypeTitle`,
    `corrTypeMissingExit`/`MissingEntry`/`FixTime`, `corrTimeExitLabel`/
    `EntryLabel`, `corrTimeRequired`, `corrDayHasExit`/`DayHasEntry`,
    `corrCountNormal`/`corrCountHigh`. SI/HI/ZH best-effort → **לתקף מול native.**

### חוב טכני ידוע
- **`attendance.status` — ברירת המחדל (`'approved'`) אינה מוגדרת באף מיגרציה.**
  הטבלה קדמה למשטר המיגרציות; רק `ALTER`-ים קיימים. 3 מסלולי כתיבה (החתמה
  חיה / Twilio / clock-out) מסתמכים על ברירת המחדל הזו בלי לכתוב `status`
  מפורש. אומת ב-SQL שהיא `'approved'` ושאין NULL-ים, אבל היא לא מתועדת בקוד.
  שווה מיגרציה שמתעדת אותה (`DEFAULT 'approved'` מפורש) + כתיבת `status`
  מפורשת ב-3 המסלולים.
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
- **סטטוס פרויקט: `active` / `inactive` בלבד.** legacy `planning` בוטל.
- **soft-delete כברירת מחדל** — `deleted_at IS NULL` בכל טבלה מרכזית.
- **service_role bypasses RLS** — כל ה-endpoints שלנו admin-gated ב-API, לא ב-RLS.

### פיתוח
- **DEVELOPMENT_PRINCIPLES.md** — 13 עקרונות. קבצים < 400, fetch מחוץ ל-UI,
  helper טהור + tests, grep על שדה משותף לפני שינוי; (12) call-to-action
  מצביע על קוד חי; (13) קוד אחד, הודעה אחת.
- **`text-content` (15px) הוא הרצפה** לתוכן; `text-caption` (14px) לצפוף;
  `text-muted` למשני. אין `text-xs` בקוד חדש.
- **UI חדש עם Card depth** — border-charcoal/10, rounded-md, shadow עדין.
- **Card < 400 שורות** — אחרת לחלק לתת-קומפוננטות.

### תקשורת (עם המשתמש)
- דיאלוג בעברית, קצר ומעשי.
- כשמסיים משימה: מדווח על ההיקף + hash + ענף נמחק + לינקים לייצור.
- כשמתחיל משימה: קורא ROADMAP, מאמת עם ה-DB אם צריך.
- לפני push: מציג דוח סיכום ומחכה לאישור.
