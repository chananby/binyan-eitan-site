<!--
מפת מערכת — מלאה (שלב 2: מאקרו + מיקרו).
  • מטרה כפולה: (1) לחנן — מבט-על ממאקרו למיקרו לזיהוי חוסרים;
    (2) לקלוד גיט/צ'אט — מפת ניווט שנקראת בתחילת משימה כדי לחסוך חקירה.
  • מבנה 3 רמות: חלק א' ליבה עסקית (מפורט) · חלק ב' אתר ציבורי · חלק ג' היקפי (קצר).
  • כלל תחזוקה: כשאזור/זרימה/טבלה משתנים מהותית — עדכן כאן. שורות תמציתיות, מפה לא ספר.
  • שמות קבצים/טבלאות/endpoints באנגלית; תיאורים בעברית.
  • מבוסס סריקת קוד אמיתית (יולי 2026). כשקוד סותר את המפה — הקוד צודק, עדכן כאן.
-->

# SYSTEM_MAP — בניין איתן

> מפת ניווט של המערכת. עקרונות עבודה → [`DEVELOPMENT_PRINCIPLES.md`](DEVELOPMENT_PRINCIPLES.md);
> סטטוס ותור → [`ROADMAP.md`](ROADMAP.md).
>
> **מבנה כל אזור בליבה:** מה עושה · מי משתמש · פעולות · תת-מסכים · זרימות · מחובר ל־ · קבצים.

## מפת אזורים (אינדקס)

**חלק א — הליבה העסקית (פורטל אדמין + פורטלי שטח):**
נוכחות · שיבוץ · גבייה · שכר · הצעות מחיר · עובדים · פרויקטים · דשבורד ·
מסמכים/אסמכתאות · הכנסות · הוצאות · בקשות הצטרפות · תכנון · מטריצה שבועית ·
דוחות · חשבון/הגדרות · פורטל ממונה · פורטל החתמת עובד · החתמה בטלפון (Twilio).

**חלק ב — האתר הציבורי** (binyaneitan.com — לקוחות/משקיעים/עולים).

**חלק ג — אזורים היקפיים** (אפליקציית מתמטיקה · ארכיון · פנים-ארגוני/החזקות).

**חלק ד — מבנה הנתונים** · **חלק ה — עוגנים טכניים ו-gotchas**.

הליבה חיה ב-`/admin` דרך [`AdminPortal.tsx`](src/app/components/AdminPortal.tsx) — 16 לשוניות
(`TabDef` ב-`AdminPortal.tsx:1345`). AdminPortal מחזיק את כל ה-state וה-fetch; הלשוניות
הן presentation שמקבל props (עקרון "fetch מחוץ ל-UI"). כל לשונית = קובץ ב-
[`src/app/admin/_components/tabs/`](src/app/admin/_components/tabs/).

---

# חלק א — הליבה העסקית

## א.1 — נוכחות

- **מה:** לב המערכת — צפייה חיה בהחתמות היום, אישור/עריכת רשומות ותיקונים, השלמת יציאות, דוחות שעות ויומן כשלים.
- **מי:** אדמין (ניהול מלא). המקורות שמזינים אותו: עובד (מחתים) וממונה (מגיש ידני/תיקונים).
- **פעולות:**
  - אישור/דחיית בקשת תיקון ("אשר"/"דחה", כולל "שמור ואשר" בעריכה).
  - עריכת רשומה קיימת (שעה/אתר; **הפעולה כניסה↔יציאה נעולה בכוונה** — ראה gotcha).
  - "השלם יציאה" — הוספת OUT ליום עם כניסה פתוחה (`clock-out`).
  - הוספה ידנית (רגיל/ש.נוספות/חופש/מחלה/אחר) עם שעות ואתר.
  - הפקת דוח נוכחות לפי טווח + PDF (print) + דוח חודשי.
  - פתיחת היסטוריית עובד (deep-link מיומן היום / WorkersTab / התראה).
- **תת-מסכים:** 3 sub-tabs — `live` (חי), `history` (WorkerHistoryPanel), `failures` (כשלי החתמה 24ש'). בתוך `live`: בקשות תיקון ממתינות, staleOpens (כניסות פתוחות מימים קודמים), "טרם החתימו היום", דוח, דוח חודשי, הוספה ידנית, יומן היום, רשומות אחרונות.
- **זרימות:**
  - עובד/ממונה מחתים → מופיע ביומן היום → אדמין מזהה חריגה (DistanceFlag / phone-call chip) → עורך או משלים יציאה.
  - ממונה מגיש רשומה/תיקון → תור `pending`/corrections → אדמין מאשר → נכתב ל-`attendance` + audit.
  - סוף חודש → טווח → דוח שעות מצטבר פר-עובד → הדפסה/PDF.
- **מחובר ל:** דשבורד (כרטיס "טרם החתימו" זהה), עובדים (כפתור היסטוריה), פורטל ממונה (מקור pending/corrections), שכר (אותה נוכחות), חשבון (אכיפת GPS), `/admin/health`. טבלאות: `attendance`, `attendance_corrections`, `attendance_failures`, `staff`, `projects`, `vacation_days`.
- **קבצים:** [`AttendanceTab.tsx`](src/app/admin/_components/tabs/AttendanceTab.tsx), `tabs/WorkerHistoryPanel.tsx`, `shared/{CorrectionRequestsPanel,MonthlyReportPanel,DistanceFlag,StaleRefresh,AttendanceRowEditor}.tsx`; endpoints `api/admin/attendance/{today,recent,pending,manual,clock-out,failures,report,monthly-report,corrections,corrections/[id],stale-opens,[id]}`.

## א.2 — שיבוץ

- **מה:** שני מסכי שיבוץ עובדים לאתרים — לוח "היום/עכשיו" (Board, גרירה/הקשה) ותכנון שבועי (Schedule, טבלת עובד×יום).
- **מי:** אדמין בלבד.
- **פעולות:**
  - Board: גרירת עובד (דסקטופ) או הקשה→MoveToDialog (מובייל) לשיוך; עובד אחד = אתר אחד.
  - Board: הוספת פועל ידני (שם חופשי), החזרה ל"לא משובצים", יצירת אתר ידני, הסרת כרטיס ידני.
  - Schedule: קליק על תא → AssignCellDialog → אתר / אתר-ידני / "ללא שיבוץ".
  - Schedule: "החל על כל השבוע" (5 ימים לעובד, מדלג ימי חופש), "העתק לשבוע הבא" (confirm 409 אם היעד לא ריק).
  - Schedule: הוספת פועל יומי ליום+אתר (AddTempWorkerForm), ניווט שבועות (WeekPicker), toggle תצוגה לפי עובד / לפי אתר.
- **תת-מסכים:** Board — רצועת "לא משובצים" + גריד SiteCards + BoardManualEntry + MoveToDialog. Schedule — toggle `worker`↔`site`: ScheduleTable (עריכה) / ScheduleByProjectTable (צפייה).
- **זרימות:**
  - בוקר: פותח Board → גורר עובדים לא-משובצים לאתרים → כל תזוזה = PUT אופטימי ל-`board_assignments`.
  - תכנון שבוע: בוחר שבוע → תאים / "החל על כל השבוע" → `schedule_assignments` → "העתק לשבוע הבא" משכפל.
- **מחובר ל:** עובדים (רשימת עובדים/ממונים), פרויקטים (אתרים active + type=site), נוכחות (ימי חופש משותפים). טבלאות: `board_assignments`, `board_manual_projects`, `schedule_assignments`, `staff`, `projects`, `vacation_days`.
- **קבצים:** [`BoardTab.tsx`](src/app/admin/_components/tabs/BoardTab.tsx), [`ScheduleTab.tsx`](src/app/admin/_components/tabs/ScheduleTab.tsx), `shared/{ScheduleTable,ScheduleByProjectTable,AssignCellDialog,AddTempWorkerForm,SiteCard,WorkerChip,UnassignedStrip,MoveToDialog,BoardManualEntry,WeekPicker}.tsx`; `lib/{board-state,schedule-state,israel-week}.ts`; endpoints `api/admin/board-assignments`, `board-manual-projects[/[id]]`, `schedule[/apply-week|copy-week|day]`.

## א.3 — גבייה

- **מה:** מסך גלובלי שמרכז את כל אבני-הדרך לתשלום שהבשילו לגבייה, מקובצות לפי פרויקט, עם רישום תקבולים inline.
- **מי:** אדמין / חנן (מסך "מה צריך לגבות היום").
- **פעולות:**
  - צפייה בשלבים במצב `due` שעדיין לא שולמו במלואם, ממוינים לפי בשלות (`marked_due_at` הישן קודם).
  - רישום תקבול — **סכום מצטבר** (לא דלתא), עם רמז "תוספת: +₪X".
  - הוספת אבן דרך לפרויקט (title, סכום כולל מע"מ, תאריך צפוי).
  - עריכת שלב, שינוי סטטוס `future ↔ due`, שינוי סדר (up/down), מחיקה רכה, איפוס תשלום (0 → חוזר ל-due).
- **תת-מסכים:** CollectionsTab (אקורדיון לפי פרויקט + hero "לגבייה עכשיו"), CollectionItemCard (chase מצומצם — תשלום בלבד), MilestoneCard (כרטיס מלא — עריכה/תשלום/reorder/מחיקה), ProjectMilestonesSection (בלוק per-project בכרטיס הפרויקט).
- **זרימות:** אדמין מסמן שלב `due` → מופיע כאן → מזין תקבול מצטבר → הראוט גוזר סטטוס: `paid=0`→due, `0<paid<amount`→due+partial, `paid≥amount`→paid+paid_at. **`paid` לעולם לא נקבע ידנית** — תמיד נגזר.
- **מחובר ל:** פרויקטים (ProjectMilestonesSection בכרטיס; overhead מדולג), דשבורד (כרטיס receivables), הכנסות (תמונת תקבולים). טבלה: `payment_milestones` (מקור יחיד, soft-delete) + join `projects`.
- **קבצים:** [`CollectionsTab.tsx`](src/app/admin/_components/tabs/CollectionsTab.tsx), `shared/{CollectionItemCard,MilestoneCard,ProjectMilestonesSection}.tsx`, `lib/payment-milestones.ts`; endpoints `api/admin/collections`, `payment-milestones[/[id][/payment|/transition]]`.

## א.4 — שכר

- **מה:** דוח שכר חודשי פר-עובד (ימים/שעות/חופשה/ברוטו) + ייצוא XLSX נפרד לשכירים/עצמאים + צפי שכר חודשי + ניהול היסטוריית תעריפים.
- **מי:** אדמין (מכין לרוה"ח — שכירים=תלוש, עצמאים=חשבונית).
- **פעולות:**
  - בחירת חודש (+ סינון עובד) וטעינת דוח.
  - ייצוא XLSX שכירים (פנסיה+חגים) / עצמאים (בלי).
  - התראת "חסר תעריף" — עובדים שיופיעו עם 0.
  - צפי שכר חודשי כולל + פירוט (ForecastDetailDialog) + הורדת XLSX צפי.
  - עדכון תעריף עובד (RateManager) — **INSERT שורת חודש חדשה**, לא UPDATE.
- **תת-מסכים:** PayrollTab (טופס + טבלת תוצאות + סה"כ ברוטו), ForecastDetailDialog (נפתח מכרטיס דשבורד), RateManager (בתוך עריכת עובד ב-WorkersTab).
- **זרימות:**
  - היסטורי: attendance מסונן לפי **`clock_at`** (זמן העבודה, לא created_at) → aggregate (firstIn/lastOut) + vacation (half_day=0.5) → `getRatesForMonth` → computeGross (hourly=שעות×תעריף / daily=ימים×תעריף / global=משכורת).
  - צפי: חודש תיאורטי 22 ימים × 8.5ש' = 187 × תעריף נוכחי; מתעלם מנוכחות אמיתית.
- **מחובר ל:** עובדים (RateManager, `has_rate` מזין דגל שכר), נוכחות (מקור), חופשות, דשבורד (כרטיס צפי). טבלאות: `staff` (rate legacy + national_id/pension/holiday/travel), `staff_rates` (מקור אמת per-חודש), `attendance`, `vacation_days`.
- **קבצים:** [`PayrollTab.tsx`](src/app/admin/_components/tabs/PayrollTab.tsx), `hooks/usePayroll.ts`, `shared/{RateManager,ForecastDetailDialog}.tsx`, `lib/{payroll-aggregate,payroll-forecast,staff-rates}.ts`; endpoints `api/admin/payroll[/export|/forecast|/forecast/export]`, `staff/[id]/rates`.

## א.5 — הצעות מחיר

- **מה:** מחולל ליצירה/עריכה/שמירה של הצעות מפורטות (פרקים, פריטים, לוח תשלומים) והדפסה ל-PDF, עם רשימת הצעות מנוהלת בענן.
- **מי:** אדמין בלבד (`role==='admin'` דרך `whoami`).
- **פעולות:**
  - יצירת הצעה + `quote_number` אוטומטי (MAX+1, retry על 23505).
  - עריכת פרקים ופריטים (שם/יחידה/כמות/מחיר) + חישוב סיכום/הנחה/מע"מ.
  - הוספת בלוקים: heading / options (תוספות) / payment (לוח תשלומים לפי אחוזים) / narrative / bullets / internal (לא מודפס).
  - לוח תשלומים נזרע אוטומטית מברירת המחדל של החברה (`defaultPaymentMilestones`).
  - בחירת פריטים מ"מאגר קבוע" (autocomplete מול `catalog_items`), העלאת תמונות/לוגו.
  - שמירה לענן + שינוי סטטוס (draft/sent/accepted/rejected/archived), הדפסת PDF (`window.print()`), מחיקה.
- **תת-מסכים:** QuotesTab (2 כרטיסים + 5 הצעות אחרונות), `/admin/quotes` (host שעוטף iframe + באנר "מותאם למחשב"), `/admin/quotes/list` (טבלה + חיפוש + מחיקה), המחולל `quote-generator.html` (SPA וניל ~3860 שורות).
- **זרימות:** iframe↔parent דרך `postMessage` (`quote-id-assigned`, `quote-title`, `quote-new`). טעינת הצעה: `?id=` → hydrate מ-`GET quotes/[id]`; שמירה ראשונה מקצה מספר.
- **מחובר ל:** Hub/פורטל אדמין. טבלאות: `quotes` (data jsonb + עמודות מחולצות), `catalog_items` (מאגר פריטים), `admins` (created_by). **`catalog_items` שייך כאן — לא להוצאות.**
- **קבצים:** [`QuotesTab.tsx`](src/app/admin/_components/tabs/QuotesTab.tsx), `admin/quotes/{page.tsx,QuoteGeneratorClient.tsx,list/QuotesListClient.tsx}`, [`quote-generator.html`](public/admin-tools/quote-generator.html), `lib/catalog-items-diff.ts`; endpoints `api/admin/quotes[/[id]]`, `catalog-items`.

## א.6 — עובדים

- **מה:** ניהול מלא של כרטיס עובד — פרטים אישיים, סוג העסקה ותעריפים, פרטי בנק, מסמכים, היסטוריית נוכחות וייצוא.
- **מי:** אדמין (הכל). ממונה (רק עובדים עם נוכחות בפרויקטים שלו, ללא עמודות בנק).
- **פעולות:**
  - הוספת עובד עם **אכיפת תעריף חובה** לסוג ההעסקה + זריעת `staff_rates` לחודש הנוכחי.
  - עריכה (שם/טלפון/תפקיד/ת"ז/העסקה/בנק/שפה/פנסיה/הערות).
  - ניהול תעריפים חודשיים (RateManager, upsert על staff_id+חודש).
  - הפעלה/השבתה; מחיקה רק למושבתים (הקלדת שם לאישור, soft-delete).
  - היסטוריית נוכחות: עריכה/השלמת-יציאה/הוספת-יום/מחיקה בחלון רטרו (חודש נוכחי/קודם).
  - העלאה/הורדה/מחיקת מסמכים רגישים (PDF/תמונות עד 10MB), ייצוא דוח XLSX, "צפה בתור" ממונה, דגל ⚠️ ללא תעריף.
- **תת-מסכים:** WorkersTab (accordion הוספה + פעילים + accordion מושבתים); טופס עריכה מכיל EmploymentSection / BankDetailsSection / StaffDocumentsSection / RateManager / בורר שפה; WorkerHistoryPanel (בורר עובד+טווח, טבלת ימים, AttendanceRowEditor).
- **זרימות:** הוספה → ולידציה → insert `staff` → seed `staff_rates`; ⚠️ נעלם אחרי תעריף תקף. היסטוריה: endpoint מרחיב חלון SQL ±35 יום ל-backfill, מסונן חזרה ב-aggregate.
- **מחובר ל:** שכר/נוכחות (אותו aggregator), שיבוץ (`office_only`, `foreman_id`), פורטל ממונה (view-as, שפה), בקשות (יעד האישור). טבלאות: `staff`, `staff_rates`, `staff_documents` (+Storage), `attendance`, `vacation_days`, `projects`.
- **קבצים:** [`WorkersTab.tsx`](src/app/admin/_components/tabs/WorkersTab.tsx), `tabs/WorkerHistoryPanel.tsx`, `shared/{EmploymentSection,BankDetailsSection,StaffDocumentsSection,RateManager,AttendanceRowEditor}.tsx`, `lib/{staff-rates,worker-history-aggregate,phone}.ts`; endpoints `api/admin/staff[/[id][/history|/rates|/documents[/[docId]]]|/export]`.

## א.7 — פרויקטים

- **מה:** ניהול אתרי בנייה — יצירה, כתובת+GPS, שיוך ממונה, תקציב-מול-ביצוע (כולל הקצאת תקורה), ואבני-דרך לגבייה.
- **מי:** אדמין (מלא). ממונה (רק פרויקטים משויכים אליו).
- **פעולות:**
  - הוספת פרויקט עם geocode אוטומטי לכתובת → lat/lng.
  - הפעלה/השבתה (`active`/`inactive` — **אין hard delete, DELETE תמיד 403**).
  - עריכת כתובת + "שמור + מקם" (re-geocode) + לינק Google Maps.
  - שיוך ממונה מ-dropdown.
  - הגדרת/עריכת תקציב + פס-ניצול (ירוק/כתום/אדום).
  - ניהול אבני-דרך לתשלום (הוספה/עריכה/מחיקה/סטטוס/תשלום/סידור).
- **תת-מסכים:** ProjectsTab (accordion הוספה + כרטיסי פרויקט), ProjectBudgetSection (תקציב/ביצוע ישיר/תקורה מוקצית/נשאר/ממתין-לאישור), ProjectMilestonesSection (lazy, מוסתר ל-overhead).
- **זרימות:** תקציב-מול-ביצוע: `budget-actual` — חישוב 5 שלבים (ישיר לאתר → סך ישיר → overhead pool → share יחסי → הקצאה), מבוסס `financial_documents` (amount_ils, approved/pending) + splits. חישוב טהור ב-`computeProjectBudget`.
- **מחובר ל:** עובדים (foreman_id), נוכחות/שיבוץ (project_id, GPS), מסמכים/כספים (financial_documents, splits, תקורה), גבייה (אבני-דרך). טבלאות: `projects` (status, budget, project_type site/overhead, foreman_id, lat/lng), `payment_milestones`, `financial_documents`, `document_project_splits`, `staff`.
- **קבצים:** [`ProjectsTab.tsx`](src/app/admin/_components/tabs/ProjectsTab.tsx), `shared/{ProjectBudgetSection,ProjectMilestonesSection,MilestoneCard}.tsx`, `lib/{budget-actual,document-splits}.ts`; endpoints `api/admin/projects[/[id]|/budget-actual]`, `payment-milestones`. **הערה:** `lib/projects.ts` אינו קשור — הוא גלריית האתר השיווקי.

## א.8 — דשבורד

- **מה:** מסך הבית של האדמין — נוכחות חיה, מאזן חודשי, עלויות היום, צפי שכר, משימות היום, ופאנל "דורש תשומת לב". רענון אוטומטי כל 2 דקות.
- **מי:** אדמין (מלא). ממונה (רק "מי באתר" + "משימות היום").
- **פעולות:** רענון; שינוי סטטוס משימה ("הפעל"/"סיים"); קליק על פריט תשומת-לב → ניווט; קליק "לגבייה עכשיו" → טאב גבייה; פתיחת פירוט צפי שכר; צפייה במאזן + מגמת 6 חודשים.
- **תת-מסכים/כרטיסים:** AttentionPanel · MonthlyPnlCard · "מי באתר כרגע" · "לגבייה עכשיו" (top-3) · "עלויות היום" · "צפי שכר חודשי" · "משימות היום" · "נוכחות לפי תפקיד".
- **פאנל "דורש תשומת לב"** (נבנה ב-`AdminPortal.tsx:1432-1490`, מסתתר כשריק): `attendance-failures` (high→נוכחות/failures) · `pending` (high→נוכחות) · `delayed` (medium→תכנון) · `not-clocked` (medium→נוכחות/live) · `stale-opens` (medium→נוכחות/live) · `no-gps` (info→פרויקטים).
- **זרימות:** AdminPortal מחשב את כל ה-derived values (memoized) ומזרים כ-props; DashboardTab presentation בלבד. P&L נטען בנפרד עם StaleRefresh.
- **מחובר ל:** נוכחות, תכנון, פרויקטים, גבייה, שכר. טבלאות: `financial_documents` (P&L), `income`/`materials` (עלויות), `attendance`, `payment_milestones`.
- **P&L (`computeMonthlyPnl`, טהור):** חודש לפי `doc_date`; income/expense = SUM(`amount_ils`) לפי direction, **רק `status='approved'`**; מדלג pending/rejected/direction=none/≤0 וגם `linked_document_id IS NOT NULL` (evidence לא נספר).
- **קבצים:** [`DashboardTab.tsx`](src/app/admin/_components/tabs/DashboardTab.tsx), `shared/{AttentionPanel,MonthlyPnlCard,ForecastDetailDialog}.tsx`, `AdminPortal.tsx`, `lib/finance-pnl.ts`; endpoint `api/admin/finance/pnl`.

## א.9 — מסמכים / אסמכתאות

- **מה:** תיבת מסמכים פיננסיים (חשבוניות/קבלות/העברות/משכורות) — העלאה, חילוץ AI, סקירה ואישור, שיוך לפרויקט, פיצול, קישור invoice↔payment, ייצוא לרו"ח. **מרכז שכבה 1 של החזון.**
- **מי:** אדמין בלבד.
- **פעולות:**
  - העלאה + probe כפילויות לפי `file_hash`.
  - חילוץ AI / חוזר (Anthropic; לא נוגע ב-approved).
  - אישור/דחייה בודד או גורף high-confidence (עם Undo).
  - שיוך פרויקט; פיצול בין פרויקטים (replace-all); הצעת פיצול משכורת לפי נוכחות.
  - קישור invoice↔payment (`linked_document_id`); הסמכה/הוצאה מ-actuals (`include_in_actuals`).
  - ייצוא ZIP (כללי או לפי פילטרים).
- **תת-מסכים:** DocumentsInboxClient (`/admin/documents` — uploader + status-bar + פילטרים + רשימה) · triage (walk-through לחסרי-פרויקט + Undo) · review (תור סקירה רציף) · `[id]` DocumentDetailClient + DocumentReviewForm (עריכה + link + split panel).
- **זרימות:**
  - חילוץ: `extractAndPersist` → Anthropic → parse (doc_type/direction/סכומים) → vendor match. `resolveDirection` נועל quote/delivery_note ל-`direction='none'`.
  - Resume: rows תקועים ב-`pending` מטופלים ע"י `findAndResumePending` — עם עליית העמוד + cron 10 דק'.
  - פיצול: replace-all (soft-delete ישן, insert חדש, מאפס project_id). invariant: **single OR split, never both** (409). `suggest-split` מציע לפי נוכחות מאושרת של העובד המקושר בחודש שלפני doc_date.
  - קישור: חד-כיווני — `linked_document_id` על ה-evidence מצביע על ה-primary; ה-primary לא נספר פעמיים.
- **מחובר ל:** פרויקטים (הוצאות פר-פרויקט + תקציב-מול-ביצוע), דשבורד (P&L), הכנסות/הוצאות (מקור אמת מאוחד), עובדים/ספקים (vendor↔staff ל-suggest-split), שכר. טבלאות: `financial_documents`, `document_project_splits`, `vendors`, `projects`, `attendance`, `staff`; Storage `financial-documents`.
- **קבצים:** `tabs/DocumentsTab.tsx` (link-card בלבד), [`DocumentsInboxClient.tsx`](src/app/admin/documents/DocumentsInboxClient.tsx), `admin/documents/{triage/TriageClient,review/ReviewQueueClient,[id]/DocumentDetailClient,[id]/DocumentReviewForm}.tsx`, `_components/{DocumentUploader,DocumentCard,DocumentFilters,DocumentSplitPanel,DocumentLinkSection,useDocumentSplits}`, `lib/document-{extraction,splits,classify,resume,columns,filters}.ts`, `attendance-project-shares.ts`; endpoints `api/admin/documents[/[id][/extract|/file|/splits|/suggest-split]|/bulk|/check|/export|/resume-pending|/split-doc-ids]`.

## א.10 — הכנסות

- **מה:** רישום תשלומים שהתקבלו פר-פרויקט + סיכום + יומן תשלומים.
- **מי:** אדמין בלבד.
- **פעולות:** רישום תשלום (פרויקט/תאריך/סכום/תיאור); צפייה בסיכום פר-פרויקט + סה"כ; יומן תשלומים; רענון.
- **תת-מסכים:** אקורדיון "רישום תשלום" (מקופל, נסגר ב-✓) · "סיכום לפי פרויקט" · "יומן תשלומים" (שני האחרונים רק אם יש נתונים).
- **זרימות:** `useIncomeForm` מנהל טופס; POST → ניקוי + reload. GET מחזיר רשימה מעומדת + totals מכל השורות.
- **מחובר ל:** דשבורד, פרויקטים (רווחיות), דוחות. טבלה: `income`. **הערה:** מסלול ידני/legacy — במקביל ל-`financial_documents` (direction=income) שהוא מקור האמת ל-P&L.
- **קבצים:** [`IncomeTab.tsx`](src/app/admin/_components/tabs/IncomeTab.tsx), `hooks/useIncomeForm.ts`, `lib/money.ts`; endpoint `api/admin/income`.

## א.11 — הוצאות

- **מה:** רישום הוצאות/חומרים פר-פרויקט (חומרים/קבלן משנה/הזמנות/כלי עבודה) + סיכום לפי קטגוריה + יומן עם פילטר.
- **מי:** אדמין **וממונה** (הטאב אינו adminOnly).
- **פעולות:** רישום הוצאה (פרויקט/קטגוריה/יחידה/כמות/ספק/עלות); סיכום לפי קטגוריה + סה"כ מ-budget; יומן + פילטר פרויקט; reload; רענון.
- **תת-מסכים:** "רישום הוצאה" (טופס תמידי) · "סיכום לפי קטגוריה" · "יומן הוצאות" (select פילטר + refresh).
- **זרימות:** `useExpensesForm` מחזיק state; POST → feedback + ניקוי + reload. GET מחזיר גם `budgetMap` (סיכום פר-פרויקט).
- **מחובר ל:** דשבורד (עלויות היום), פרויקטים (תקציב-מול-ביצוע), דוחות. טבלה: `materials`. **`catalog_items` שייך להצעות מחיר, לא כאן.**
- **קבצים:** [`ExpensesTab.tsx`](src/app/admin/_components/tabs/ExpensesTab.tsx), `hooks/useExpensesForm.ts`, `lib/money.ts`; endpoint `api/admin/materials`.

## א.12 — בקשות הצטרפות

- **מה:** תור אדמין לבקשות מעובדים חדשים שנשלחו מטופס ציבורי (`/he/join`); אישור יוצר `staff`, או דחייה עם הערה.
- **מי:** אדמין (התור). ה-POST הציבורי פתוח (עובד ללא PIN).
- **פעולות:** הצגת ממתינים / היסטוריה; "אשר" → ApproveWorkerDialog → יצירת עובד + קישור; "דחה" עם הערה; רענון.
- **תת-מסכים:** רשימת כרטיסי בקשה (שם/טלפון/תיאור); דיאלוג אישור (role, employment_type, rate).
- **זרימות:** submit ציבורי → ולידציה (`validateJoinRequest`, rate-limit 5/15דק) → בדיקת staff קיים לפי phoneVariants (409) → insert pending. אישור עובר דרך route העובדים (לשמר אכיפת תעריפים), לא יוצר staff ישירות.
- **מחובר ל:** עובדים (העובד החדש). טבלאות: `join_requests`, `staff`, `staff_rates`.
- **קבצים:** [`JoinRequestsTab.tsx`](src/app/admin/_components/tabs/JoinRequestsTab.tsx), `shared/ApproveWorkerDialog.tsx`, `lib/join-requests-validate.ts`; endpoints `api/admin/join-requests[/[id]]`, `api/join-request` (ציבורי).

## א.13 — תכנון

- **מה:** ניהול אבני דרך (milestones) ומשימות (tasks) פר-פרויקט, לוח שבועי (look-ahead), התראות לוגיסטיות ודוחות יומיים.
- **מי:** אדמין (מלא) + ממונה (מוגבל לפרויקטים שלו; מחיקה — אדמין בלבד).
- **פעולות:** הוספת אבן דרך/משימה; שינוי סטטוס משימה (planned/in_progress/completed/delayed+סיבה); שיוץ/ביטול יום; שינוי סטטוס אבן דרך; הגשת דוח יומי; מחיקה.
- **תת-מסכים:** לוח שבועי לפי ימים; התראות לוגיסטיות (delayed + חסר חומרים/קב"מ/ציוד); תוכנית מאקרו (אקורדיוני אבני דרך + progress bar); שני טפסי הוספה מקופלים.
- **זרימות:** `useMilestonesAndTasks(reload)` — כל mutation → reload; הצלחה "✓" סוגרת אקורדיון; יציאה מ-delayed מנקה delay_reason.
- **מחובר ל:** מטריצה שבועית (weekly_plan), פרויקטים (foreman_id), דשבורד ("משימות היום"), פורטל ממונה (tab plan). טבלאות: `tasks`, `milestones`, `weekly_plan`, `daily_reports`, `projects`.
- **קבצים:** [`PlanningTab.tsx`](src/app/admin/_components/tabs/PlanningTab.tsx), `hooks/useMilestonesAndTasks.ts`; endpoints `api/admin/{tasks,milestones,weekly-plan}[/[id]]`, `daily-reports`.

## א.14 — מטריצה שבועית

- **מה:** מטריצת תכנון משאבים/עלויות/סטטוס-הזמנות לפי שבוע (ראשון-מעוגן) ופרויקט, עם עריכת-תא inline וסה"כ תקציב מצטבר.
- **מי:** אדמין + ממונה (מאומת מול foreman_id).
- **פעולות:** טעינה לפי פרויקט; הוספת שורה לשבוע (task_name + subcontractor/workers/materials/supplier/order_status/planned_cost); עריכת תא inline (optimistic); שינוי order_status (none/ordered/in_transit/delivered); מחיקת שורה; קיפול/הרחבת שבוע.
- **תת-מסכים:** בורר פרויקט; סרגל "סה"כ תקציב מתוכנן"; אקורדיון לכל שבוע (סה"כ שבועי + מצטבר); טבלה עם EditableCell + טופס הוספה. שבועות עבר ריקים מוסתרים.
- **זרימות:** חלון 4 שבועות אחורה + 12 קדימה (`israel-week.ts`); עריכה אופטימית (state לפני PATCH); סכום מצטבר client-side.
- **מחובר ל:** תכנון (חולק `weekly_plan`, גם ScheduleTab). טבלה: `weekly_plan`, `projects`.
- **קבצים:** `tabs/ReportsAndMatrixTabs.tsx` (MatrixTabPanel), [`WeeklyPlanner.tsx`](src/app/components/WeeklyPlanner.tsx), `lib/israel-week.ts`; endpoints `api/admin/weekly-plan[/[id]]`.

## א.15 — דוחות

- **מה:** הגשת/צפייה בדוחות יומיים פר-פרויקט + דוח נוכחות חודשי "לחיתוך" (בלוק לכל עובד לצילום ואישור לפני שכר) + דוח נוכחות טווח.
- **מי:** אדמין (הכל) + ממונה (מוגבל לפרויקטים שלו).
- **פעולות:** טעינת דוחות אחרונים; הגשת דוח יומי (מזג אוויר/סיכום/אירועים); הפקת דוח חודשי (JSON) + הורדת XLSX; דוח נוכחות טווח; דוח היסטוריית עובד.
- **תת-מסכים:** ReportsTab (אקורדיון טופס + רשימה); MonthlyReportPanel (בורר חודש + "הפק"/"הורד אקסל" + WorkerBlockCard לכל עובד).
- **זרימות:** `buildMonthlyReport` — אגרגציה משותפת ל-JSON ול-XLSX (אותם מספרים); חלון ±35 יום, clamp לחודש; סטטוסים present/no-exit/vacation/sick/absent.
- **מחובר ל:** תכנון (daily_reports משותף), נוכחות, עובדים (WorkerHistoryPanel). טבלאות: `daily_reports`, `attendance`, `vacation_days`, `staff`, `projects`.
- **קבצים:** [`ReportsTab.tsx`](src/app/admin/_components/tabs/ReportsTab.tsx), `tabs/ReportsAndMatrixTabs.tsx`, `shared/MonthlyReportPanel.tsx`, `hooks/useAttendanceReport.ts`, `lib/{monthly-attendance-report,israel-time}.ts`; endpoints `api/admin/attendance/{monthly-report,report}`, `daily-reports`.

## א.16 — חשבון / הגדרות

- **מה:** זהות האדמין, שינוי סיסמה, והגדרות מערכת-נוכחות: סף מרחק ויזואלי, אכיפת GPS, תקרת יציאות-מרחוק חודשית.
- **מי:** אדמין בלבד.
- **פעולות:** הצגת שם/מייל; סף מרחק ויזואלי (`attendance_far_threshold_m`); הפעלה/כיבוי אכיפה (`attendance_gps_enforce`); רדיוס אכיפה (`attendance_gps_enforce_radius_m`); תקרת יציאות מרחוק (`attendance_remote_exit_monthly_cap`); שינוי סיסמה.
- **תת-מסכים:** "הגדרות חשבון" · "נוכחות" (סף) · "אכיפת מיקום" (checkbox+radius+cap) · "שנה סיסמה".
- **זרימות:** מודל דו-שכבתי — סף (default 500) ויזואלי בלבד; רדיוס אכיפה (default 100) חוסם כניסה מעל, יציאה נספרת מול cap (default 3); מתג `gps_enforce` (default off) מקצר את הבלוק. `loadAttendanceEnforcementSettings` נקרא ב-`POST /api/attendance`; כשל → אכיפה OFF (fail-open, מרחק עדיין נרשם).
- **מחובר ל:** נוכחות (DistanceFlag), `POST /api/attendance` (אכיפה). טבלאות: `settings`, `admins`, `attendance`.
- **קבצים:** [`AccountTab.tsx`](src/app/admin/_components/tabs/AccountTab.tsx), `hooks/useChangePassword.ts`, `lib/{attendance-settings,admin-auth}.ts`, `shared/DistanceFlag.tsx`; endpoints `api/admin/{settings,change-password}`.

## א.17 — פורטל ממונה

- **מה:** אפליקציית מובייל RTL לניהול שוטף של אתר בנייה יחיד ע"י מנהל עבודה — נוכחות, משימות, יומן, הוצאות, תכנון.
- **מי:** `staff` עם `role='ממונה'` פעיל, נכנס עם PIN. מוגבל לפרויקטים שבהם `projects.foreman_id = staffId`.
- **auth:** `POST /api/foreman-auth` `{code}` → אימות מול `staff.pin`+role+active → קוקי חתום. rate-limit לפי IP. `DELETE`=התנתקות.
- **תת-מסכים (6 לשוניות תחתונות):**
  - **overview (ראשי):** 3 סטטים (באתר/משימות היום/התראות); "המיקוד של היום"; "הכנה למחר"; quick-action ליומן/הוצאה; העלאת אסמכתא.
  - **site (באתר):** אישור/דחיית ממתינים; "באתר כעת" (מרחק GPS + יציאה ידנית); staleOpens (קריאה); "לא החתימו היום"; פאנל החתמה ידנית.
  - **log (יומן):** יצירה/עדכון יומן יומי (סטטוס normal/delay/problem, מספר עובדי קב"מ).
  - **expense (הוצאה):** רישום הוצאה → נשמר כ-material.
  - **plan (תכנון):** אבני דרך + אחוזים; גליל 14 יום — הוספת/שינוי-סטטוס משימה, toggle מוכנוּת, הזזת תאריך.
  - **hours (שעות):** דוח שעות 28 יום — סיכום פר-עובד + פירוט יומי.
- **פעולות:** לאשר/לדחות החתמות; להחתים יציאה ידנית; הוספה ידנית (נכנסת pending, `edited_by='foreman:<name>'`); לנהל משימות/אבני-דרך; יומן יומי; הוצאה; שעות; העלאת אסמכתאות (בלי כל חשיפה כספית — `{ok:true}` בלבד).
- **זרימות/endpoint-הצלבות:** `POST attendance/manual` — foreman: `project_id` חובה + שייך לו (403 אחרת), רשומה `pending`, guard כפילות `hasOpenRecord`. `POST attendance/clock-out` — guard נגד orphan-exit (409 `no_open_entry_to_close`).
- **מחובר ל:** נוכחות (מזין pending/corrections), תכנון, הוצאות, מסמכים, דוחות. טבלאות: `staff`, `projects` (foreman_id, lat/lng), `attendance`, `tasks`, `milestones`, `daily_reports`, `materials`, `financial_documents`.
- **קבצים:** [`ForemanPortal.tsx`](src/app/components/ForemanPortal.tsx), `components/attendance/ForemanManualEntryPanel.tsx`, `components/ForemanDocUpload.tsx`; endpoints `api/foreman-auth`, `foreman/documents`, `api/admin/attendance/{manual,clock-out,[id]}`, `tasks`, `daily-reports`, `materials`, וקריאות `today/pending/stale-opens/report`, `projects`, `staff`, `milestones`.

## א.18 — פורטל החתמת עובד

- **מה:** PWA רב-לשונית (6 שפות) להחתמת כניסה/יציאה באתר — זיהוי טלפון, בדיקת GPS, היסטוריה, בקשות תיקון.
- **מי:** `staff` פעיל, מזוהה לפי `phone`. הזהות בקוקי חתום httpOnly (12ש') — לא נשלח phone/staff_id בגוף בקשות מוגנות.
- **תת-מסכים (state machine `Step`):** phone → menu → locating → project → ready → submitting → success/error; ובנוסף history.
  - PhoneScreen (identify, CTA ל-`/he/join`); MenuScreen (החתמה/היסטוריה/החלף משתמש + באנר "שכחת יציאה ב-N ימים"); ProjectScreen; ReadyScreen (כניסה ירוק / יציאה אדום); StatusScreens; HistoryScreen (קיבוץ לפי יום + "דווח על טעות"); AttendanceReportMistake (שעה + סיבה חובה).
- **זרימות:**
  - זיהוי: mount → `GET worker/identify` (probe קוקי; `staff.language` דורס localStorage). קלט טלפון → `POST worker/identify` (normalizePhone+variants, rate-limit 5/15דק) → קוקי + menu.
  - GPS: `getCurrentPosition` (timeout 12s); מיפוי `err.code` 1/2/3 → הודעות נפרדות.
  - החתמה: `POST /api/attendance` עם `action` בעברית + lat/lng + project_id. השרת: haversine, אכיפת GPS (כניסה מעל רדיוס→403; יציאה מרחוק→עד cap), guards (409 already/no-open, 401 session/inactive), רישום ל-`attendance_failures`.
  - 6 שפות `he/en/ru/si/zh/hi` (`i18n.ts`); בחירה ב-localStorage `att_lang` + `POST worker/lang-pref` (מעדכן `staff.language`).
  - בקשת תיקון: `POST worker/corrections` (בעלות + חלון רטרו + אחת לרשומה 409).
  - "שכחתי יציאה": **אין flow עצמאי** — הבאנר מוביל להיסטוריה/תיקון; `worker/manual-entry` מחזיר **410 Gone**. השלמה בפועל רק דרך ממונה/אדמין.
- **מחובר ל:** נוכחות (מזין), עובדים (זהות/שפה), חשבון (אכיפת GPS), בקשות (CTA להצטרפות). טבלאות: `staff`, `attendance`, `attendance_corrections`, `attendance_failures`, `projects`, `settings`.
- **קבצים:** [`AttendanceForm.tsx`](src/app/components/AttendanceForm.tsx), `components/attendance/{PhoneScreen,MenuScreen,ProjectScreen,ReadyScreen,StatusScreens,HistoryScreen,AttendanceReportMistake,i18n}.ts(x)`; endpoints `api/worker/{identify,history,lang-pref,corrections,manual-entry(410)}`, `api/attendance`, `api/projects`.

## א.19 — החתמה בטלפון (Twilio IVR)

- **מה:** מענה קולי בעברית — עובד מתקשר, מזוהה לפי caller-ID, מקיש כניסה/יציאה ובוחר אתר. לעובד ללא סמארטפון.
- **מי:** `staff` פעיל, מזוהה לפי `From` (normalizePhone+variants). אין קוקי; state עובר ב-query string חתום HMAC.
- **זרימה (3 hops):**
  1. `POST /api/twilio/voice` — webhook, אימות `X-Twilio-Signature`; lookup לפי From; לא מזוהה → "פנו למשרד". Gather "1 כניסה / 2 יציאה".
  2. `POST .../action` — DTMF 1/2; duplicate-guard סימטרי `hasOpenRecord` (**שתי אוצרות מילה** in/out + כניסה/יציאה); שליפת פרויקטים active+site; אחד→insert מיידי, רבים→Gather שני (עד 9).
  3. `POST .../project` — בחירת אתר (אימות active בזמן) → insert.
- **פעולות:** כניסה/יציאה + בחירת אתר. **אין GPS.**
- **insert (`insertPhoneAttendance`):** `action` באנגלית (in/out), project_id, clock_at=now, source='phone-call', **ללא lat/lng**; אישור קולי + Hangup.
- **מחובר ל:** נוכחות. טבלאות: `staff`, `projects`, `attendance`.
- **gotcha:** כותב `action` באנגלית ("in"/"out") בעוד web כותב עברית — כל פילטר על action חייב לכסות את שתיהן.
- **קבצים:** `api/twilio/voice/{route,action/route,project/route}.ts`, [`lib/twilio.ts`](src/lib/twilio.ts).

---

# חלק ב — האתר הציבורי (binyaneitan.com)

- **מה:** אתר שיווקי דו-לשוני (he/en) של "בניין איתן" — קבלן רשום ג1 (רישיון 41805) לפרויקטים מורכבים, שיפוצי יוקרה ובנייה בירושלים ובנימין. מטרה כפולה: מיצוב מקצועי/הנדסי + יצירת לידים. כל CTA → טלפון/וואטסאפ/טופס. GA4 + Microsoft Clarity + JSON-LD עשיר (LocalBusiness, AggregateRating 5.0/19).
- **קהלים (נגזר מהתוכן):**
  - **לקוחות פרטיים** — שיפוצי יוקרה, גמר פרימיום, בנייה פרטית. מחפשים אמון ואיכות "מתחת לפני השטח" (`TechnicalAnatomy`, `ProcessSection`, `Pillars`).
  - **עולים / דיאספורה שבונים מרחוק** — קהל מפורש: דף נחיתה `lp/overseas` ("Building Your Dream in Israel from afar"), מאמר `building-from-abroad`, JSON-LD "Remote Project Management for Overseas Clients". מחפשים ניהול מרחוק, תקציב קבוע, שותף אמין בשטח.
  - **משקיעים / מוסדות / ציבורי** — תיק כולל תשתיות ומוסדות ציבור. מחפשים ביצוע מורכב, ניהול שלבי, לוגיסטיקה.
- **עמודים** (נתיבים כפולים `src/app/he/*` ו-`en/*`; לעברית עמודים נוספים):
  - **בית** — `he/page.tsx` → `ClientLayouts/HeHomeClient.tsx`: Navbar, Hero, Pillars, ProcessSection, TechnicalAnatomy, PortfolioGallery, EngineeringExcellence, Testimonials, FounderQuote, ContactForm, Footer.
  - **אודות** — `AboutPage.tsx` (מוטי איתן, מייסד, ג1, 20+ שנה).
  - **תיק עבודות** — `ProjectsGallery.tsx`: masonry, 15 פילטרים, lightbox, עמוד פרויקט ייעודי (חלק חסום ב-`SLUGS_WITHOUT_DETAIL_PAGE`).
  - **מאמרי מומחיות** — `ExpertiseArticle.tsx` + `he/expertise/[slug]` → `ArticleDetailPage.tsx` (~10+ מאמרים).
  - **שאלות נפוצות** — `FaqPage.tsx` (FAQPage JSON-LD).
  - **יצירת קשר** — `#contact` → `ContactForm.tsx`.
  - **משפטי** — `LegalPage.tsx` (תנאי/פרטיות/נגישות, noindex).
  - **דפי נחיתה** — `lp/{overseas,jerusalem,givat-zeev}` מ-`LPTemplate.tsx` (layout נפרד).
  - **עברית ייחודי** — `he/quizzes`, `he/voucher`, `he/join`, `he/change-order`.
- **פיצ'רים:** גלריית Cloudinary (`api/cloudinary-gallery`, ISR 60ש'; **כרגע `SERVE_FROM="public"` — מוגש מ-`/public`, לא מ-Cloudinary בפועל**); Testimonials (5.0/19); XRaySlider (before/after, RTL); TechnicalAnatomy (hotspots); חידונים עבריים (עצמאות/פסח/פורים, `data/quizzes.ts`); FloatingWhatsApp (חנן `+972585008447`); AccessibilityMenu (ניגודיות+פונט, localStorage); VoucherGenerator (כלי canvas פנימי, noindex).
- **שפות:** `page.tsx` קורא `Accept-Language` → he*→`/he`, השאר→`/en`. `LangContext` (default עברית, `he/layout` = rtl). `TranslationsProvider` טוען מ-`api/translations` (Vercel KV + deepMerge עם `lib/translations.json`), רענון כל 90ש' + `visibilitychange` + `BroadcastChannel`. חלק מהתוכן hard-coded he/en.
- **זרימות:**
  - לקוח/משקיע: כניסה → זיהוי שפה → בית → גלישה → CTA → וואטסאפ/`ContactForm` → מייל ל-`office@binyaneitan.com`.
  - עולה: פרסום → `lp/overseas` / מאמר → CTA וואטסאפ → ייעוץ.
  - עולה → חידון: `he/quizzes` → חידון → שיתוף (מיתוג/engagement).
- **מחובר ל:** Cloudinary (גלריה), Resend (`api/contact` → מייל לידים), Vercel KV (תרגומים), Supabase (`api/projects` — מקור פרויקטים למערכת הפנימית, לא לגלריה), GA4/Clarity, `api/revalidate` (flush).
- **קבצים:** `app/{page,layout}.tsx`, `he/layout.tsx`, `components/{LangContext,TranslationsProvider}.tsx`, `lib/{translations.json,server-translations,cloudinary,projects}.ts`; `ClientLayouts/HeHomeClient.tsx`; סקשנים ב-`components/` (`Hero,Navbar,Footer,Pillars,ProcessSection,TechnicalAnatomy,XRaySlider,EngineeringExcellence,Testimonials,FounderQuote`); עמודים (`AboutPage,ProjectsGallery,ExpertiseArticle,ArticleDetailPage,FaqPage,LegalPage,ContactForm`); פיצ'רים (`FloatingWhatsApp,AccessibilityMenu,IndependenceQuiz,PassoverQuiz,VoucherGenerator`); `lp/LPTemplate.tsx`; endpoints `api/{contact,cloudinary-gallery,projects,translations,revalidate}`.

---

# חלק ג — אזורים היקפיים (מחוץ לליבה העסקית)

## ג.1 — אפליקציית מתמטיקה (Math App)

- **מה:** אפליקציית תרגול מתמטיקה עצמאית לילדי יסודי. סביבות: Junior (ג'–ד'), Senior, ו-Bar-Ilan (סימולציית מבחן מחוננים בר-אילן, 24 שאלות/60 דק'). מנוע הסתגלותי, מחוללי שאלות, פרופילים, ולוח הורה (PIN).
- **מי:** ילדי המשפחה/משתמש פרטי (לא בית ספר). לא קשור ללקוחות הבנייה.
- **סטטוס:** פעיל (feature היקפי עצמאי).
- **קבצים:** `src/app/math-app/*` (`page,MathAppClient,junior/,senior/,parent/,daily/,bar-ilan/`), `math-app/lib/engines/*`, `lib/math-tests/*`. טבלאות: `math_test_attempts`, `math_practice_progress`.

## ג.2 — ארכיון (Executive War Room / Cockpit)

- **מה:** לוח מנהלים (canvas חופשי + items) שהיה בשימוש; כיום שני הדפים `redirect("/admin/hub")`.
- **סטטוס:** **ארכיון.** ה-API endpoints ותשתית `exec-auth` עדיין קיימים ובשימוש חי ע"י ג.3 (החזקות).
- **קבצים:** `admin/{executive,cockpit}/page.tsx` (redirect stubs), `api/executive/{canvas,items,auth}`, `lib/exec-auth.ts`. טבלאות: `executive_canvas`, `executive_space`.

## ג.3 — פורטל פנים-ארגוני / החזקות (Internal / Holding)

- **מה:** פורטל פנימי (noindex) לשתי חברות בקבוצה — "Binyan Eitan" ו-"Prime Steel" — עם לוח משימות משותף (concurrency אופטימי לפי `version`, 409 על התנגשות) ו-**content-editor** (עריכת `translations.json`, מדיה, מאמרים draft/published) + banner.
- **מי:** צוות פנימי (Chanan/Moti/Nachman/Akiva); אימות דרך `internal-auth`/`exec-auth` cookie.
- **סטטוס:** פעיל.
- **קבצים:** `src/app/internal/*` (`InternalClientLayout`, `binyan-eitan/`, `prime-steel/` משתפים `DashboardClient` עם prop company, `content-editor/`, `banner/`), `api/holding/{companies,tasks,upload}`, `api/internal-auth`, `lib/exec-auth.ts`. טבלאות: `holding_tasks`, `holding_companies`.

---

# חלק ד — מבנה הנתונים (על-קצה)

**ליבת נוכחות ושכר:**
- `staff` — עובדים: זהות, טלפון, PIN, סיווג, שפה, פטור נוכחות, פעיל/מושבת, בנק, פנסיה/חגים.
- `attendance` — רשומת החתמה: `clock_at`, `action` (עברית web / אנגלית phone), `project_id`, GPS, `is_manual`, `source`, `status`, audit (`edited_by`, `original_clock_at`).
- `staff_rates` — תעריף עובד per-חודש (`effective_month`) — מקור אמת לשכר.
- `attendance_corrections` — בקשות תיקון (pending/approved/rejected).
- `attendance_failures` — לוג כשלי החתמה (worker_stuck / noise / security_signal).
- `vacation_days` — חופשה/היעדרות (`half_day`).
- `staff_documents` — מסמכים אישיים (+Storage).

**פרויקטים ושיבוץ:**
- `projects` — אתר: כתובת + lat/lng, `status` (active/inactive), `foreman_id`, `project_type` (site/overhead), `budget`.
- `schedule_assignments` — שיבוץ עובד ליום×פרויקט (תכנון שבועי).
- `board_assignments`, `board_manual_projects` — לוח "היום" + אתרים ידניים.
- `weekly_plan` — מטריצת משאבים/עלויות/הזמנות פר-שבוע.
- `tasks`, `milestones` — משימות ואבני דרך תכנון פר-פרויקט.
- `daily_reports` — דוח יומי של ממונה.

**כספים ומסמכים:**
- `financial_documents` — מסמך פיננסי: סכום (`amount_ils`), ספק, direction, חילוץ AI, `status`, `linked_document_id` (invoice↔payment), `include_in_actuals`, `file_hash`.
- `document_project_splits` — פיצול מסמך בין פרויקטים.
- `vendors` — ספקים; `staff_id` מקשר ספק שהוא עובד (ל-suggest-split).
- `payment_milestones` — אבני דרך גבייה + סטטוס (future/due/paid, `paid_amount`, `marked_due_at`).
- `income` — הכנסות ידניות (legacy, במקביל ל-financial_documents).
- `materials` — הוצאות שדה (חומרים/קבלנים/ציוד).
- `budget_items` — פריטי תקציב.
- `quotes` — הצעות מחיר (`data` jsonb + עמודות מחולצות).
- `catalog_items` — מאגר פריטים למחולל ההצעות.

**מערכת והרשאות:**
- `admins`, `password_reset_tokens` — משתמשי אדמין ואיפוס.
- `join_requests` — בקשות הצטרפות (partial-unique על phone WHERE pending).
- `settings` — הגדרות (GPS enforce, ספי מרחק, cap, daily_message).
- `admin_notes` — הערות פנימיות.

**היקפי:** `executive_canvas`/`executive_space` (ארכיון), `holding_tasks`/`holding_companies` (פנים-ארגוני), `math_test_attempts`/`math_practice_progress` (מתמטיקה).

---

# חלק ה — עוגנים טכניים ו-gotchas

**מסמכי בסיס:**
- עקרונות → [`DEVELOPMENT_PRINCIPLES.md`](DEVELOPMENT_PRINCIPLES.md) (קבצים <400, fetch מחוץ ל-UI, helper טהור + tests, grep על שדה משותף).
- סטטוס ותור → [`ROADMAP.md`](ROADMAP.md).
- מיגרציות → [`supabase/migrations/`](supabase/migrations/) בפורמט `YYYYMMDD_*.sql`.

**Workflow (branch → build → deploy):**
- Codespaces בלבד → branch → `npm run build` נקי → commit → push ל-main.
- **Webhook GitHub↔Vercel שבור** — push לא מפרסם. פריסה ידנית: `npx vercel --prod`. תמיד לפרוס אחרי push (אחרת endpoints חדשים = 404).
- **כל DB write ידני** — קלוד כותב SQL, חנן מריץ ב-Supabase SQL Editor.

**Gotchas (מלכודות חוזרות):**
- **`action` עברית מול אנגלית** — web כותב "כניסה"/"יציאה", Twilio/חלק מה-inserts כותבים "in"/"out". כל פילטר על action חייב לכסות **שתי אוצרות מילה** (`isEntry`/`isExit`).
- **`clock_at` מול `created_at`** — סינון שכר/דוחות תמיד לפי `clock_at` (חודש עבודה בפועל), לא `created_at` (רגע ההזנה). חלון ה-backfill מרחיב ±35 יום ואז clamp.
- **soft-delete** — `deleted_at IS NULL` בכל טבלה מרכזית.
- **service_role עוקף RLS** — כל ה-endpoints מוגני admin ברמת ה-API, לא ב-RLS.
- **מסמך: single OR split, never both** — קישור project_id ישיר ופיצול הם בלעדיים (409).
- **קישור invoice↔payment חד-כיווני** — `linked_document_id` על ה-evidence; ה-primary לא נספר פעמיים ב-rollups/P&L.
- **`paid` בגבייה נגזר, לא נקבע ידנית** — תמיד מ-`paid_amount` מול `amount`.
- **`text-content` (15px) הוא הרצפה** לתוכן; אין `text-xs` בקוד חדש.
- **Vercel Hobby** — cron מוגבל לפעם ביום.
- **גלריה שיווקית מ-`/public`** — `SERVE_FROM="public"` ב-`lib/cloudinary.ts`, למרות ש-`api/cloudinary-gallery` מוכן.
- **שמות מטעים:** `lib/projects.ts` = גלריית האתר השיווקי, לא פרויקטי הניהול. `catalog_items` = הצעות מחיר, לא הוצאות.

---

**עודכן לאחרונה:** 8 ביולי 2026 (שלב 2 — מאקרו + מיקרו מלא).
