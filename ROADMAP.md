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

- **מיקום ההחתמה הקיימת בימים חסרים** — **נפרס** (4.8.26,
  `feature/location-on-incomplete-days` → main `8c8ad24`, `dpl_ESGqkzRmsh9DTXDvXFqywu6oZ7Kn`;
  אומת: `/admin` `x-matched-path` 200). ביום עם "ללא יציאה"/"ללא כניסה" יש החתמה אחת קיימת
  (הכניסה שלא נסגרה / היציאה היתומה) — המיקום שלה אומר אם העובד באמת היה באתר. מוצג בשני
  מקומות עם מיחזור `DistanceFlag`: מרכז החוסרים ([IncompletePanel](src/app/admin/_components/shared/IncompletePanel.tsx))
  והיסטוריית עובד ([WorkerHistoryPanel](src/app/admin/_components/tabs/WorkerHistoryPanel.tsx)).
  החתמות טלפון/ידני (בלי GPS) → תג ניטרלי "ללא GPS", לא כחסר. **הרחבת תגובה, לא שינוי:**
  הוספתי `lat/lng/distance_from_project_m/source` ל-selects של loadIncompleteness ושל
  ה-worker-history (שדות קיימים לא שוניתי). **מנוע האי-שלמות/סינון הרעש/לוגיקת החסימה לא
  נגעו** — ההעשרה בשכבת השרת אחרי `computeIncompleteDays`, לפי `ref_id`. הערת פריסה: ה-CLI
  `npx vercel` נכשל על repo-link (`directory:"."`); נפרס דרך env-var link
  (`VERCEL_ORG_ID`/`VERCEL_PROJECT_ID`) בלי שינוי קונפיג.
- **כפתור "הורד PDF" עליון בדוח החודשי** — **נפרס** (4.8.26,
  `fix/report-top-pdf-button` → main `af6f07d`, `dpl_2V8t5BrHqNGisxXkUu5XE7eAoLo6`;
  אומת: `/admin` `x-matched-path` 200). כפתור "הורד PDF" לצד "הורד אקסל" בשורה העליונה —
  מכבד את בורר העובד (עובד נבחר ← PDF שלו · "כל העובדים" ← כולם, כל אחד בעמוד נפרד).
  מיחזר את מנגנון ההדפסה הקיים (portal + `.report-print-root` + document.title): הכללתי
  את `printingId` היחיד ל-`printTarget` (staffId או `PRINT_ALL`) שמשרת גם את הכפתורים
  פר-כרטיס (ללא שינוי) וגם את העליון. **produce-then-print בפעולה אחת:** אם אין דוח על
  המסך — הכפתור מפיק קודם, ו-effect נדחה מדפיס כשה-data נוחת (ההדפסה דורשת DOM מרונדר).
- **"מי באתר כרגע" בלשונית נוכחות + אריחי סטטיסטיקה לחיצים** — **נפרס** (4.8.26,
  `feature/onsite-panel-clickable-tiles` → main `bb63438`, `dpl_HmM3JGeHbokXS1ZagjDw7mthuU3H`;
  אומת: `/admin` `x-matched-path` 200). (1) פאנל "מי באתר כרגע" נוסף ל-נוכחות ← live
  מעל יומן היום — מציג רק את מי שעדיין באתר (יומן "לפי אתר" מציג את כל החתמות היום כולל
  מי שיצא). מיחזר את `onSite` המחושב+foreman-scoped ואת `AttendanceBySiteGrid` — **בלי
  fetch או חישוב חדש**. הפאנל בדשבורד לא נגע. (2) כל ארבעת אריחי הסטטיסטיקה למעלה הפכו
  ללחיצים (`<button>`, מקלדת+focus-ring, hover/cursor): עובדים פעילים ← לשונית עובדים ·
  באתר כרגע ← live/פאנל on-site · כניסות היום ← live/יומן היום · פרויקטים ← לשונית פרויקטים.
  ניווט דרך `goToTab` + helper `goToAttendanceLive` (setAttendanceSubTab + scroll לעוגן) —
  בלי מנגנון ניווט שני. בלי נגיעה בלוגיקת onSite/שליפות/endpoints. הערת ממונה: בלוק
  אריחי הממונה הוא dead code (`isForeman = false`) — אין חשיפת ניווט לממונה.
- **מסך היסטוריית מיקומים לעובד (אדמין בלבד)** — **נפרס** (4.8.26,
  `feature/worker-location-history` → main `9de8ab9`, `dpl_54VueKfugixCGZJnXFw5ttwY6TG3`;
  אומת: `/admin` `x-matched-path` 200, endpoint `403` ללא auth). תת-לשונית "מיקומים"
  תחת נוכחות: בורר עובד + טווח → שורה לכל החתמה (תאריך·שעה·כניסה/יציאה·אתר·מרחק·מקור)
  + מסנן "חריגות בלבד". עונה על "מתי העובד היה איפה" ומציף החתמות רחוקות שאכיפת ה-GPS
  (כבויה) מעולם לא סימנה. **אדמין בלבד** — endpoint חדש `api/admin/attendance/locations`
  מחזיר 403 לממונה (מיקום = רגיש); הפאנל חי ב-`AttendanceTab` שהממונה לא מרנדר.
  ספי מרחק כקבועים ([`LocationHistoryPanel.tsx`](src/app/admin/_components/shared/LocationHistoryPanel.tsx)):
  ≤1ק"מ ניטרלי · 1–3ק"מ ענבר "רחוק" · >3ק"מ אדום "חריגה" (500מ' של ה-live התברר כרעש
  עירוני). מיחזר את `DistanceFlag` עם prop אופציונלי `warnThreshold` לרמת-הביניים —
  ה-live לא נגע. החתמות טלפון/ידני (תמיד ללא GPS מתוכנן) → תג ניטרלי "ללא GPS", לא כחסר.
  paginated דרך `fetchAllRows`.
- **🔴 תיקון pagination — תקרת 1000 שורות קטעה שכר ודוחות בשקט** — **נפרס**
  (3.8.26, `fix/attendance-pagination` → main `1018c46`, `dpl_6AaSjcVxPYm2L4Gw5qerigyThAPg`).
  PostgREST חוסם תשובה ב-`max_rows`=1000 **ומקצץ בשקט**. כל שאילתה שמשכה חודש
  נוכחות לכל העובדים החזירה רק ~1000 שורות → **שכר עם שעות חסרות** (הגרוע: בלי
  `.order()` כלל, לא-דטרמיניסטי), דוח חודשי ריק מאמצע החודש, ומרכז החוסרים סימן
  ימים שלמים כחסרים (פנטומים). **לא רגרסיה מקומיט — באג לטנטי שחצה סף קנה-מידה.**
  - **Helper משותף** [`lib/supabase-pagination.ts`](src/lib/supabase-pagination.ts)
    `fetchAllRows` — לולאת `.range()` עד עמוד חלקי, סדר טוטאלי (`+.order("id")`),
    **זורק על שגיאה** (בלי חצי-תוצאה). 6 unit-tests.
  - **הוחל על:** payroll, payroll/export, monthly-report, staff/export,
    attendance/report, מנוע האי-שלמות (×3 טבלאות), ו-pending/recent/today/stale-opens.
    האגרגציות לא נגעו. סדר מסלולי-הכסף `(clock_at, id)` — כרונולוגי (תיקן גם חוסר-סדר
    לטנטי ב-payroll-aggregate) + tiebreaker.
  - **אימות:** build + 429 tests. **המספרים (אג'יט 22/229.5, שכר, ספירת שורות,
    מספר חוסרים מול 89) — לאמת מול נתונים אמיתיים** (אין גישת DB מהסביבה).

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
- **דוחות נוכחות → תת-לשונית ייעודית + ייצוא ישיר** — **נפרס** (4.8.26,
  `feature/attendance-reports-subtab` → main `3aeac0e`, `dpl_8pRNKV7sMXqdvF12Zn1tciskv9AH`).
  שני פאנלי הדוחות (ReportPanel טווח + MonthlyReportPanel חודשי) ישבו תחת
  "נוכחות חיה" (שהיא על היום). הועברו ל**תת-לשונית "דוחות נוכחות"** (שם נבחר למנוע
  התנגשות עם הלשונית הראשית "דוחות" = הגשת דוח יומי). סדר: חיה · היסטוריית עובד ·
  דוחות נוכחות · כשלי החתמה · חוסרים. "חיה" נשארה ל-pending/corrections/stale-opens/
  הזנה ידנית. 4 הניווטים התכנותיים לא נגעו. **ייצוא ישיר:** בורר עובד ליד בורר החודש
  ב-MonthlyReportPanel ("כל העובדים" ברירת מחדל) → ייצוא אקסל לעובד בודד **בלי "הפק
  דוח"** (ה-endpoint כבר מקבל staff_id; כפתורי פר-כרטיס נשארו). אפס שינוי שרת/אגרגציה.
- **דוח נוכחות חודשי לכל העובדים** — בלוק גזיר לכל עובד (שם + סיווג + חודש
  → טבלת ימים → סה"כ), לצילום ושליחה לעובד לפני שכר. UI חדש ב-`/admin` →
  tab נוכחות, מתחת לדוח הקיים: month picker + "הפק דוח" + "הורד אקסל". שני
  הפורמטים נסמכים על אותו aggregator טהור (`lib/monthly-attendance-report.ts`)
  כך שהמסך וה-XLSX מציגים תמיד את אותם מספרים. Foreman scope כמו שאר
  ה-endpoints. **תיקון widening ±3 → ±35 גם ב-`attendance/report`** —
  שריד C2/C3 נסגר סופית. commit `a25d425`.
  - **הרחבה — דוח לעובד בודד (XLSX + הדפסה/PDF)** — **נפרס** (2.8.26,
    `feature/single-worker-monthly-report` → main `9377359`,
    `dpl_DJo4TsHRFTH2yQncfWL5HHh2TFbh`; אומת: `/admin` `x-matched-path`, endpoint
    `?staff_id=` → 401 auth-gated). כפתור **פר-בלוק** על כל עובד: "אקסל" (אותו
    endpoint+exporter עם `staff_id` — מסונן **אחרי** scope/inclusion, מריץ את **אותו
    `buildMonthlyReport`** על מערך בן-איבר-אחד → מספרים זהים) + "הדפס / PDF"
    (`@media print` מדפיס רק את הבלוק המסומן; `document.title`=שם·חודש·תאריך ללא
    `#`/`/` לשם קובץ תקין; שורת "הופק:" print-only). **המנוע, WorkerHistoryPanel,
    והדוח לכל העובדים לא נגעו — אפס חישוב שני.** (הערה: **`ROADMAP.docx` נכנס
    בטעות ל-`9377359` ע"י `git add -A`; הוסר והוכנס ל-`.gitignore` ב-`25fa143`.**)
    - **תיקון שני באגים** — **נפרס** (3.8.26, `fix/report-print-and-filename`
      → main `e015489`, `dpl_79gmGFuUqNTVtQwwUMPh43r95P5o`). (1) **ההדפסה הדפיסה
      את כל העובדים** — גישת ה-`visibility:hidden`+`position:absolute` שברירית
      (תלויה בהיעדר transform/overflow ב-ancestor, ומשאירה אחים בזרימה). הוחלפה
      ב-**portal של הבלוק ל-`<body>` + `display:none`** על השאר — חסין ל-ancestors,
      מסיר באמת. Ctrl+P רגיל עדיין תקין. (2) **שם קובץ ה-XLSX** חסר שם עובד+חודש —
      ההורדה היא ניווט ל-endpoint, ו-`Content-Disposition` של השרת **גובר** על
      `download` בצד הלקוח. השם נבנה עכשיו **בשרת**: "דוח נוכחות - <עובד|כל העובדים>
      - <YYYY-MM>.xlsx" עם **RFC 5987 `filename*` (UTF-8)** + fallback ASCII, בלי
      `#`/`/`. **אימות הדפסה/שם-קובץ דורש דפדפן** (CSS-print + הורדה).
      - **תיקון המשך — שם ה-PDF נעלם שוב** — **נפרס** (3.8.26,
        `fix/report-pdf-filename-afterprint` → main `b4b0472`,
        `dpl_GSjR7PmtR4JueouY4TLYqXQzNofX`). השורש: מאזין `afterprint` שיחזר את
        `document.title`, ובחלק מהדפדפנים afterprint נורה כשהדיאלוג **נפתח** → הכותרת
        אופסה לפני גזירת שם הקובץ. **לא רגרסיה** — הרכיב היה byte-identical מ-`e015489`;
        זו שבירות תזמון תלוית-דפדפן. התיקון: קובעים את הכותרת ב-`printBlock` ו**משאירים**
        אותה; afterprint מנקה רק את בידוד ההדפסה (class + printingId), לא את הכותרת.
        ה-XLSX לא נגע (היה תקין). דורש בדיקת-עשן בדפדפן.
- **מרכז החוסרים — כשלים שנפתרו מתנקים אוטומטית** — **נפרס** (4.8.26,
  `fix/incompleteness-resolved-failures` → main `0e693b2`, `dpl_6AM3G4GKSpMc1SoYvXnsBww8bwdg`).
  `attendance_failures` היא append-only (אין דגל resolved), אז כשל `worker_stuck`
  נשאר תלוי לנצח גם אחרי שהיום תוקן ידנית (דפוס Sayeg/Osnaka: אורפן-אאוט נחסם ונרשם,
  היום הושלם, הפריט נשאר). **הרחבת מסנן הרעש הקיים** (אותה לולאה + מפת `days`): כשל
  **`no_open_entry_to_close` בלבד** שהיום שלו מכיל עכשיו זוג כניסה+יציאה = נפתר → מופל
  (התיקון שלו הוא "השלם כניסה", וזוג שלם = הכניסה קיימת). מסנן ה-5-דקות, לוגיקת החסימה,
  ו-6 סוגי החוסר האחרים לא נגעו. השלמה pending מופלת אבל מופיעה כ-`pending_manual` (בלי
  אובדן שקט). +4 טסטים. **אימות מספרי (כשל 3 → כמה נשארו) — מול נתונים חיים.**
  - **המשך — פעולה מוצעת לפי מצב היום** — **נפרס** (4.8.26,
    `fix/stuck-failure-action-by-day-state` → main `b754879`, `dpl_8HvDe51UJUyNQ6pJrZEp9FejziNX`).
    כשל `no_open_entry_to_close` תמיד הציע "בדוק/השלם כניסה", אבל החתמה שנחסמה **לא
    יוצרת רשומה** — היום ריק ואין מה להשלים (נדיקה 26.07). מהמפה `days`: יום ריק →
    **`add_day`** ("הוסף יום"); רק יציאה/חלקי → `complete_entry`; זוג שלם → מסונן.
    **גילוי:** תווית הכפתור נגזרה מ-`error_code` (קבוע) ולא מ-`action` — לכן עדכנתי גם
    את `IncompletePanel` שהתווית ל-`no_open_entry_to_close` תעקוב אחרי ה-action. הכפתור
    עדיין מנווט להיסטוריה (read-only), אין יצירה אוטומטית. תוחם לקוד הזה בלבד; +2 טסטים.
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
  + טלפוני OUT — חייב לעבוד). **ממצא לטנטי שנשאר בתור [✅ שניהם טופלו 27.7.26 —
  ראו "שני הבאגים הלטנטיים" בראש הרשימה]:**
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
- **תפריט צד לפורטל האדמין — שלב 2 (בנייה מאחורי דגל)** — **נפרס**
  (30.7.26, `feature/admin-sidebar` → main `821b250`, `dpl_75zCVn4wgVTD`, אימות `x-matched-path: /admin`).
  נבנה **לצד** שורת הלשוניות הקיימת (שנשארת ועובדת);
  מתג בכותרת מחליף ביניהם. **מנגנון הדגל: `localStorage` (`admin_nav`) + מתג בכותרת** —
  ברירת מחדל `tabs`, חנן מחליף בעצמו **בלי פריסה** וחוזר אחורה מיד.
  - **[`AdminSidebar.tsx`](src/app/admin/_components/shared/AdminSidebar.tsx):** 6 קבוצות
    דומיין + דשבורד (למעלה) + חשבון (למטה), כל 17 הלשוניות בסדר שביקש חנן. **פריטים =
    `<a href>` אמיתיים שקוראים ל-`tabHref`/`onTabClick` הקיימים → `goToTab`** → hash, pushState,
    back, רענון, קישור משותף, Ctrl-click — זהים. **אין מנגנון ניווט שני.**
  - אותם 3 תגי ספירה (נוכחות/בקשות/גבייה); מכווץ (240↔60px, tooltip, נשמר); מובייל: מגירה +
    המבורגר, נסגרת בבחירה; `aria-current`; מקלדת Tab/Enter native.
  - נבנה מ-TABS המסונן → `adminOnly` נשמר; פורטל הממונה **לא נגע** (רכיב נפרד).
  - **היקף: ניווט בלבד** — השורה לא הוסרה, `max-w-7xl` נשאר (padding זמני מפנה מקום לרייל),
    אפס refactor של state / לוגיקה / שליפות. build + 423 טסטים.
  - **הקבוצות נכנסות ~ללא גלילה** (מוערך ~800px גובה בפתוח מלא; הרייל `overflow-y-auto`
    לגלילה חיננית במסכים נמוכים). **המלצה: פתוחות תמיד** (נכנסות, והקבוצה הפעילה גלויה ממילא).
  - **תיקון שלב-2 (post-review, `6eb668c` → main `f133902`, `dpl_2wW3jd3Ktn44`, נפרס 30.7.26):** (1) **הרייל עבר לצד ימין** — הבאג היה
    שימוש ב-`end`/`pe` (inline-end = **שמאל** ב-RTL) לרייל+מגירה+padding; תוקן ל-`start`/`ps`
    (ימין) + `border-e`. אותה משפחה של באג כיוון-החץ בבקשות התיקון. (2) **רוחב התוכן:**
    `max-w-7xl` (1280) → **`max-w-6xl` (1152)**. **📍 כפתור הכוונון: `max-w-6xl` ב-
    [`AdminPortal.tsx`](src/app/components/AdminPortal.tsx) על ה-`<div className="mx-auto space-y-5 …">`**
    (חל בשתי תצוגות → אין קפיצה; לצר יותר → `5xl`=1024).
  - **שלב 3א — פריסה + טיפוגרפיה — נפרס** (30.7.26, `fix/sidebar-layout-and-type`
    → main `0263853`, `dpl_4wD397VARWdsVepN7khRDA52iH5M`; אומת: `md:ps-[264px]` נוכח
    ב-chunk המוגש, `/admin` `x-matched-path`). (1) **התוכן נצמד לרייל** — במצב סיידבר
    הוסר `mx-auto` (התוכן ריחף ממורכז); עכשיו start-aligned, גּאטר ~24px (`ps-[264px]`/
    `[84px]`). קאפ `max-w-6xl` נשאר בשני המצבים; במסך רחב מאוד נעצר והרווח בצד end.
    מצב tabs (דגל כבוי) שומר `mx-auto` — לא נגע. (2) **היררכיה טיפוגרפית** — פריטים
    charcoal/70→/80 (בולטים; 15px); כותרות קבוצה `font-bold`→`font-semibold` (מפריד
    שקט); תג 0.6→0.65rem. (3) **טבלת היסטוריית עובד** — הוסר `w-full` (7 עמודות היו
    נפרשות), טקסט לרצפת 15px (`text-content`/`text-caption`). **תבנית ה-`w-full` הרוחבית
    נותרה ב-PayrollTab/QuotesList/RateManager — לא תוקנו בסיטונאות.**
  - **שלב 3ב — יישור קצה אחיד — נפרס** (3.8.26, `fix/sidebar-alignment-standards`
    → main `7f43c1b`, `dpl_9GNzunbSECPMsLVYDxd8UareWVcs`; `/admin` `x-matched-path`).
    ב-1900px הבלוקים הראשיים נגמרו ב-4 קצוות שונים ("לא מסודר"). מוסכמת פאנל-ניהול:
    (1) **container סיידבר `max-w-6xl`→`max-w-[1440px]`** — הרייל גוזל 240px, אז 1152
    השאיר ~500px ריקים; 1440 נותן קצה אחד לכל הבלוקים. tabs נשאר `max-w-6xl mx-auto`.
    (2) **אריחי סטטיסטיקה — הוסר `max-w-2xl` בסיידבר** (החריג המרכזי, ~672px מאמצע-מסך;
    שריד מסבב בלי-רייל) → grid מלא-רוחב. הכותרת כבר חלקה את הקצה (`justify-between`),
    לכן לא נגעה — רסן היה מבטל את היישור. ריווח כבר עקבי (`space-y-5`=20px). גודל/רוחב
    בלבד; טבלאות רחבות, טפסים מרוסנים, מובייל/דגל-כבוי לא נגעו.
  - **שלב 3ג — בתור:** החלפת ברירת המחדל ל-sidebar + הסרת שורת הלשוניות הישנה, אחרי
    שחנן מתרגל לכיוון.

- **דף הבית הדינמי — B-static (root סטטי, האתר הציבורי נעשה static)** — **נפרס**
  (30.7.26, `perf/static-root-layout` → main `0b761b7`, `dpl_6gQM4rsAtTkxA6MtJUyxnqKMgqtm`).
  ה-root layout קרא `headers()` (x-pathname) לבחירת lang/dir → **כל** האתר הציבורי היה
  `ƒ`. הפתרון (לא route groups — root יחיד, revert נקי):
  - **שלב 1** — `getServerRating` עטוף ב-`unstable_cache` (tag `translations`, revalidate
    60). ה-PUT של העורך כבר קורא `revalidateTag("translations")` + `revalidatePath("/he"|"/en")`
    → רעננות נשמרת. `getServerArticles` **לא** נגע (expertise force-dynamic צריך תוכן חי).
  - **שלב 2** — `dir/lang` על ה-wrappers: `en/layout` ← `dir="ltr" lang="en"` (**קריטי**);
    `he/layout` ← `rtl/he`; `LPTemplate` ← `lang` נגזר (תיקן `/lp/overseas` אנגלי).
  - **שלב 3** — root = `<html lang="he" dir="rtl">` סטטי, בלי `headers()`; `x-pathname`
    הוסר מ-`proxy.ts` (root היה הקורא היחיד). skip-link נשאר עברי ב-root.
  - **ריפל 4** — `force-dynamic` על `admin/layout.tsx` (admin ניסה prerender ונפל על
    `useSearchParams`), ועל `he/internal/admin/page.tsx` (auth-gated + שליפת פרויקטים חיה
    — כסטטי אפה redirect בלתי-מותנה). **בדיקת אבטחה:** אושר שאף עמוד סטטי לא אופה עם
    נתונים רגישים (redirect shells / client components / JSON-LD ציבורי בלבד).
  - **תמורה בפועל (44 `○` + 2 `●`):** `/he`,`/en` (`○` revalidate 1m), about/faq/legal/
    change-order/projects/lp(3)/internal/quizzes/attendance → static. **`/he` בפרודקשן:
    `x-vercel-cache: HIT` ×3.** `/en` נטען LTR (html `rtl/he` סטטי + wrapper `ltr/en`).
    נשארו `ƒ`: `/admin/*`, `/he/internal/admin`, expertise/[slug] (force-dynamic משלהם), math דינמי.
  - **פשרה ידועה:** `<html lang="he">` גם ב-`/en` (תוכן `lang="en"` ב-wrapper). זו העלות של
    root יחיד מול route groups — התצוגה נכונה, ה-hreflang/alternate מכסים SEO.
- **סולם טיפוגרפיה + תיקון Tier 1** — **נפרס** (30.7.26, `fix/typography-scale-tier1`
  → main `bd87c14`, `dpl_BPR25PBiL2FjV3oPGzGpBkwLuiAq`; אומת: `.text-micro{font-size:.75rem}`
  חי ב-CSS המוגש, `/admin` `x-matched-path`). סריקה מצאה **18 גדלים מתחת ל-15px** ו-~40%
  מהקוד עוקף טוקנים.
  - **הסולם (4 גדלים):** `text-body` 16 · `text-content` 15 (רצפת תוכן) · `text-caption`
    14 (תוויות) · `text-micro` 12 (רצפת chrome — טוקן חדש; עברית לא נקראת מתחת ל-12px).
    תועד ב-`DEVELOPMENT_PRINCIPLES` עקרון 14: **אפס `text-[…]` שרירותי בקוד חדש**.
  - **Tier 1 — 64 החלפות ב-9 קבצים** (מה שחנן פותח יומית עם כסף): RateManager (טבלת
    תעריפים 12→15, תוויות 10→14, שגיאות→14, 100% טוקנים), Collections (Tab+ItemCard),
    QuotesList (תאים 14→15, כותרות→14, badge→12), PayrollTab, Documents
    (Inbox/Card/ReviewForm — שמות ספקים+ערכי שדות→15, תוויות→14, chip→12), ותפריט הצד
    (כותרות/תגים/"ניווט"→12). **גודל+טוקן בלבד** — אפס פריסה/לוגיקה/נתונים; טבלאות לא נשברו.
  - **Tier 2 — נפרס** (3.8.26, `fix/typography-tier2` → main `f111c52`,
    `dpl_ALGfMEXq8JEo2M2dA6AFeuQndYux`; `/admin` `x-matched-path`). **138 החלפות
    ב-10 קבצים** (AttendanceTab, IncompletePanel, CorrectionRequestsPanel,
    ProjectsTab, AccountTab, StaffDocumentsSection, ProjectBudgetSection,
    MilestoneCard, ScheduleTable, AdminPortal). fan-out ל-4 סוכנים במקביל +
    ביקורת שלי: **בדיקה קפדנית אישרה שכל 143 השורות זהות פרט לטוקן הגודל** (אפס
    פריסה/לוגיקה/צבע/נתונים); יישרתי 11 הודעות סטטוס/שגיאה שסוכן אחד שם ב-content
    → caption לעקביות. **הודעות (טוען/ריק/שגיאה) → caption(14).** נשארו במכוון
    (דווח, לא בשקט): בסיס `<table>` ב-ScheduleTable (הגדלה תרסק את רשת הימים
    הצפופה `min-w-[840px]`; תא שם-האתר הראשי הוגדל בנפרד), ו-2 תוויות סטטים + pill
    בשורת הלשוניות ב-AdminPortal (מחוץ ל-scope / חשש overflow ל-"99+").
  - **Tier 3 בתור:** HistoryScreen, ForemanPortal. **Tier 4 (חידונים/שיווקי/math
    — קהל אחר) — לא נוגעים.**
- **רוחב אחיד לכל לשוניות האדמין + ריסון אלמנטים מתוחים** — **נפרס**
  (29.7.26, `fix/admin-uniform-width` → main `e85a978`, `dpl_DV32AitmYE9Q`, אימות `x-matched-path: /admin`).
  קודם רק דשבורד+board היו `max-w-7xl`, השאר
  `max-w-2xl` → שורת הלשוניות נשברה למספר שורות שונה לכל לשונית, והתוכן קפץ במעבר. **כעת כל
  16 הלשוניות `max-w-7xl`** (התקן לאפליקציות ניהול) → שבירת הלשוניות אחידה, בלי קפיצה.
  - **ריסון (תצוגה בלבד):** אריחי הסטטיסטיקה → `max-w-2xl` (מקובצים, לא נמתחים);
    שורת המאזן (`grid-cols-3`) → `max-w-2xl`; "עלויות היום" + "צפי שכר" → `max-w-md`.
  - **לא נגעו:** רשת לפי-אתר (נוכחות `md:grid-cols-2`, דשבורד 4 עמודות), לוגיקה, מובייל.
  - **✅ ריסון הטפסים — טופל** (`fix/admin-form-widths` @ `f4599e0`): סטנדרט דו-שכבתי —
    **`max-w-2xl`** לטפסים מרובי-שדות (Income/Expenses/Projects/Planning ×2/Workers add+edit)
    ו-**`max-w-md`** לצרים (AccountTab: סף/אכיפה/סיסמה, תואם למגירת WorkersTab — בלי רוחב שלישי).
    הוגבל ה-`<form>`, לא ה-Card. טבלאות/רשימות (Payroll, Attendance, Documents, Reports, Board,
    Quotes) נשארו ברוחב מלא — מרוויחות ממנו. build + 423 טסטים.
  - **תפריט צד — בתור** (פרויקט נפרד שיתוכנן; יחליף/ישלים את שורת הלשוניות הנשברת).

- **פאנל בקשות תיקון — תצוגה נכונה לכל סוג + תרגום + התראת עריכה** — **נפרס**
  (29.7.26, `fix/corrections-panel-clarity` → main `6f28a77`, `dpl_AhBTKrzLb2di`,
  אימות `x-matched-path: /admin` + endpoint התרגום מחזיר 401 לא-מאומת). ✅ **SQL ההדגמה
  הורץ ואומת ע"י חנן:** החץ מצביע נכון, "כניסה קיימת · הוסף יציאה" קריא, וכפתור התרגום
  מופיע (המקרה שהסינהלית לא הדליקה — נפתר ב-`b30b30a`, זיהוי לפי תוכן). הפאנל השתמש בתבנית אחת ("X ← Y" עם קו חוצה)
  ל-3 סוגי בקשה — נכונה רק ל-`fix_time`. **תצוגה בלבד, לוגיקת האישור לא נגעה.**
  - **כיוון החץ (`fix_time`):** ה-"←" מצביע כעת על הערך **החדש**. השורה RTL, סדר DOM
    [ישן(קו-חוצה), ←, חדש(מודגש)] → הישן נקרא ראשון (ימין), החץ פונה שמאלה לחדש. כל שעה `dir="ltr"`.
  - **`missing_exit`/`missing_entry`:** בלי קו חוצה (שום דבר לא נמחק) — "כניסה קיימת 07:26 ·
    הוסף יציאה 16:00", ה-badge מציין את ה**הוספה** ("הוספת יציאה") ומסכים עם התגית (לא עוד "כניסה" סותר).
  - **כפתור "תרגם":** on-demand ליד סיבה לא-עברית → endpoint חדש admin/foreman-gated
    `POST /api/admin/attendance/corrections/translate` → `translateToHebrew` מעל Anthropic הקיים.
    טעינה+שגיאה, מוצג **לצד** המקור, `staff.language` כרמז מקור (לא כתנאי הצגה).
  - **תנאי ההצגה לפי תוכן ה-reason, לא לפי `staff.language`** (`b30b30a`, 29.7):
    `reasonLooksForeign` סופר אותיות עבריות (`U+0590–05FF`) מול אותיות שאר-הכתבים (`\p{L}`
    שאינו עברי) ומציג רק כשהלא-עבריות **מרובות מהעבריות**. ⚠️ **ספירה יחסית בכוונה — אל
    תפשט ל"מכיל תו לא-עברי":** (1) מונע שמילה לועזית בודדת בתוך משפט עברי ("הכל בסדר OK")
    תדליק כפתור; (2) מטפל בתג עברי קצר בתוך טקסט לועזי ("[הדגמה] …סינהלית") → כן מדליק.
    שדה השפה שברירי (עובד דובר-עברית שכותב בשפה אחרת / שדה לא-מעודכן) — לכן הטקסט מכריע.
  - **התראת עריכה ממתינה:** `AttendanceRowEditor` מציג התראה ענבר (לא חוסמת) כשלרשומה יש
    בקשת תיקון פתוחה — ה-ids מוזרמים AttendanceTab→WorkerHistoryPanel→editor מהרשימה הטעונה.
    **בלי סגירה אוטומטית** (ניחוש כוונה).
  - **SQL הדגמה** (`scripts/demo_correction_requests.sql`, **לא הורץ**): בקשה מכל סוג על "ניסיון"
    (כולל reason בסינהלית), מתויג `[הדגמה]` + בלוק ניקוי. build + 423 טסטים
    (תוקן גם date-drift ב-`twilio-gate.test.ts`).
  - **המקרה שהצית את המשימה (אסנקה 5.7, "07:00 ← 07:00") — נסגר:** ה-SQL הראה
    `original_clock_at=14:16` + `edited_by='admin:חנן'` — חנן תיקן את הרשומה ידנית
    (14:16→07:00) והבקשה נשארה תלויה שבועות. **אין מה לתקן — נדחתה.** בדיוק התרחיש
    שהתראת ה"בקשה ממתינה" החדשה מונעת מעתה. (לא היה פריט ROADMAP נפרד; תועד כאן לסגירה.)

- **JSON-LD AggregateRating — דירוג/ביקורות ניתנים לעריכה** — **נפרס**
  (27.7.26, `fix/jsonld-rating-editable` → main `aadabff`, `dpl_AyBbnkGS6s6V`, אימות
  `x-matched-path: /he` + ה-JSON-LD החי מציג `ratingValue:"5.0","reviewCount":"19"`).
  ה-`AggregateRating` (5.0/19) היה **קשיח**
  ב-`en/page.tsx` + `he/page.tsx` → יתיישן ככל שיצטברו ביקורות.
  - **מיפוי** (כל המקומות עם 5.0/19): JSON-LD ×2 (**הקשיח, תוקן**); Hero ×3 keys
    (`hero.googleRatingValue`/`Count`/`Aria` — **כבר עריכים**); `home.google_rating_text`
    (Testimonials, טקסט); LP stats ×3 (`lp/{givat-zeev,jerusalem,overseas}` — "5.0★" קשיח,
    **לא נגעו** לפי scope). דווחו כולם.
  - **פתרון (מקור אמת יחיד):** ה-JSON-LD קורא כעת server-side (`getServerRating` ב-
    [`server-translations.ts`](src/lib/server-translations.ts)) מ-**אותם keys של ה-Hero**
    (`hero.googleRatingValue`/`googleRatingCount`) — עריכה אחת ב-"פתיחה (Hero)" מעדכנת גם
    את הצ'יפ הגלוי וגם את הסכימה. **אין keys חדשים, אין collision** (ה-keys חיים ומכילים 5.0/19).
  - **ולידציה:** `ratingValue`→float clamped [1,5] עם עשרון אחד; `reviewCount`→integer מוביל
    ≥0. ריק/זבל/מחוץ-לטווח → fallback 5.0/19. **JSON פגום בלתי אפשרי** (אומת מול קלטים גרועים).
  - **סעיף 7 (Google self-serve):** ה-markup ככל הנראה **דקורטיבי** — ראה דיווח. לא שונה.
    build + 423 טסטים.

- **`attendance.status` — כתיבה מפורשת בקוד + מיגרציה מתעדת** — **נפרס + מיגרציה הורצה ✅ סגור לגמרי**
  (27.7.26, `fix/attendance-status-explicit` → main `e08544b`, `dpl_9iLem4b23uYz`,
  אימות `x-matched-path: /admin`). **המיגרציה הורצה בהצלחה** — בדיקת NULL החזירה **0**,
  ו-`ALTER ... SET NOT NULL` הוחל. הקשחה בלבד, **אפס שינוי התנהגות**.
  ה-DEFAULT `'approved'` קיים ב-DB החי אך לא באף מיגרציה → rebuild היה יוצר עמודה בלי
  ברירת מחדל → החתמות כ-NULL → שכר וכל סינון status נשברים.
  - **מפת המסלולים:** 3 נשענו על ברירת המחדל (POST `/api/attendance`, `insertPhoneAttendance`,
    `clock-out`) → כעת כותבים `status:'approved'` **מפורש**. 2 כבר היו מפורשים (`manual`
    'pending'/'approved', `corrections` 'approved') — לא נגעו.
  - **מיגרציה מתעדת** (`20260727_attendance_status_default.sql`): `ALTER ... SET DEFAULT
    'approved'` אידמפוטנטית + COMMENT + בדיקת NULL + NOT NULL אופציונלי (מסומנות). **חנן
    מריץ ידנית — לא הורצה.** build + 423 טסטים. ⚠️ דורש אישור push+merge+deploy.

- **TechnicalAnatomy — חיבור הטקסט (כולל hotspots) לתרגומים** — **נפרס**
  (27.7.26, `feature/anatomy-hotspots-translations` → main `7a87502`, `dpl_Gf2RuL8cKEsw`,
  אימות `x-matched-path: /he`). הרכיב היה **קשיח לגמרי** (גם
  כותרת הסקשן וגם 3 ה-hotspots) — לא "מעורב" כפי שחשבנו. השלמה ל-ProjectsGallery.
  - **10 מפתחות חדשים (he+en)** בסקשן `engineering` עם prefix `anatomy_`:
    `anatomy_overline`/`_heading`/`_sub`/`_image_alt` + לכל hotspot
    `anatomy_hotspot_{conduit,columns,subfloor}_{label,desc}`.
  - **התנגשות שנמנעה (בדיוק כמו ProjectsGallery):** הסקשן `engineering` כבר מכיל
    `overline`/`title`/`sub` — אבל **של EngineeringExcellence** ("מאחורי הקלעים"/"מצוינות בביצוע"),
    קופי שונה. שימוש חוזר היה מושך את הטקסט הלא-נכון. ה-prefix מפריד בין שני הרכיבים באותו סקשן.
  - **`tx(key, fallback)`** — ה-fallback הוא הליטרל הקשיח המקורי. ערכי ברירת המחדל
    ב-`translations.json` **חולצו verbatim מהרכיב** (סקריפט) → העמוד **byte-for-byte זהה**.
    KV לא זמין → נופל לליטרל, זהה.
  - **עריך בעורך התוכן:** מופיע תחת לשונית **"הנדסה"** (הסקשן כבר ב-`SECTIONS`, שדות
    מרונדרים דינמית) — ללא שינוי בעורך. גיאומטריית/אינטראקציית ה-hotspots לא נגעו.
    build + 423 טסטים. **SYSTEM_MAP** עודכן (טבלת "מי עורך מה").

- **שני הבאגים הלטנטיים — טופלו** — **נפרס**
  (27.7.26, `fix/latent-bugs` → main `0ae006c`, `dpl_EHPna9Woc9jX`, אימות `x-matched-path: /admin`;
  קומיטים `c7d2d4b` + `00655c4`). שני הממצאים הלטנטיים שתועדו
  בסבב ה-Twilio dup-guard (ראו הרשומה "מרוץ כפילות בהחתמה טלפונית" למטה) נסגרו:
  - **on-site created_at → clock_at** (`c7d2d4b`): "מי באתר כרגע" סימן עובד לפי
    הרשומה **החדשה-בהזנה** (`created_at desc`, `rows[0]`), לא לפי **האירוע האחרון-בפועל**
    (`clock_at`). הזנה רטרואקטיבית/ידנית עם clock_at מוקדם ו-created_at מאוחר גרמה להצגה
    שגויה. תוקן לבחירת האירוע האחרון לפי `clock_at ?? created_at ?? recorded_at` (סמנטיקת
    last-event כמו `hasOpenRecord`, שתי אוצרות המילה). תצוגה בלבד. **grep על הדפוס** —
    כל שאר מופעי `created_at` תקינים (זמן הגשה מכוון / תור אישורים / clock_at-ראשי /
    סדר הזנה בגלריה-משימות).
  - **voice/project TOCTOU** (`00655c4`, **אפשרות B — גייט משותף**): הגייט רץ ב-`/action`
    אבל `/project` הכניס שניות אחר-כך **בלי לבדוק שוב** → חלון מרוץ לכפילות IN / יציאה
    יתומה. (ה-TOCTOU של **סטטוס הפרויקט** כבר היה מטופל.) חולץ `checkPhoneClockGate`
    ([`lib/twilio.ts`](src/lib/twilio.ts)) **verbatim** מ-`/action` (2 אוצרות מילה,
    hasOpenRecord, אותן הודעות), נקרא משני הנתיבים; `insertPhoneAttendance` מריץ אותו שוב
    ממש לפני ה-insert. **3 הגנות:** (1) **fail-open** בכשל שאילתה (log ל-attendance_failures
    `phone_gate_query_failed`/noise + ממשיך ל-insert — כמו fail-open של GPS); (2) החזרה
    **מובנית** `PhoneClockOutcome` (`inserted`/`blocked`/`insert_error` + response, לא זורק);
    (3) חילוץ ללא "שיפור". חלון-מיקרו שיורי (SELECT→INSERT) מקובל. +9 טסטים. build + 423 טסטים.
    **`/api/attendance` והחתמת האפליקציה לא נגעו.**

- **דשבורד — הרחבת רוחב + ניקוי שורות "מי באתר כרגע"** — **נפרס**
  (27.7.26, `feature/dashboard-width-and-onsite-cleanup` → main `36fcf78`, `dpl_GcvR8CLgJHpq`,
  אימות `x-matched-path: /admin`). צילום מסך ברוחב מלא (1900px)
  הראה שהדשבורד היה נעול ל-`max-w-2xl` (672px) — 3 עמודות נדחסות ושמות אתרים נחתכים.
  - **רוחב:** המכל של תוכן הלשוניות ([AdminPortal](src/app/components/AdminPortal.tsx))
    הגביל כל לשונית שאינה `board` ל-`max-w-2xl`. הדשבורד הצטרף ל-`board` ב-**`max-w-7xl`**
    (1280px). **ממוקד לדשבורד בכוונה** — לשונית הנוכחות נשארת צרה (שם 2 עמודות נכון).
    נבדקו שאר כרטיסי הדשבורד ב-1280px (P&L, עלויות היום, צפי, משימות, תפקידים,
    AttentionPanel) — כולם נפרסים בלי להישבר.
  - **שורות מי-באתר → "שם · מ-שעה":** התפקיד הגנרי "עובד" (חזר 19×) **הוסתר**; תפקיד אמיתי
    ("ממונה") נשאר. **התעריף היומי הוסר** מהדשבורד (דחק את השם; נשאר בשכר + כרטיס העובד).
  - **שם אתר:** בוטל ה-truncate הקשיח — נפרס מלא (עד 2 שורות), הכותרת מיושרת לראש.
  - **עמודות:** עם המכל הרחב — **4 עמודות ב-`2xl`** (1/2/3/4), לרוב כל האתרים בשורה אחת.
  - תצוגה בלבד; לשונית הנוכחות והמתג לא נגעו. build + 414 טסטים.

- **תצוגה לפי אתר — רשת לרוחב + שיתוף עם הדשבורד** — **נפרס**
  (27.7.26, `feature/by-site-grid-and-dashboard` → main `8cdba4a`, `dpl_BBYN1wCM32vF`,
  אימות `x-matched-path: /admin`). שתי תוספות לתצוגה לפי אתר:
  - **פריסה לרוחב:** הכרטיסים ברשת רספונסיבית במקום עמודה — **1/2/3 עמודות**
    (מובייל/`md`/`xl`), `items-start` כדי שכרטיסים בגבהים שונים יתיישרו לראש ולא
    "יישברו". לשונית נוכחות מוגבלת ל-2 עמודות (שורות רחבות עם כפתורי עריכה); הדשבורד
    בברירת מחדל 3 (שורות מצומצמות).
  - **בדשבורד:** הכרטיס "מי באתר כרגע" היה רשימה שטוחה — **הוחלף** (לא שוכפל) בתצוגה
    לפי אתר של אותם נתונים (מי-באתר-כעת), מקובצים לאתרים. שורות read-only
    (שם/תפקיד/תעריף/מ-שעה, בלי כפתורי עריכה). **למה החלפה:** אותם נתונים, קיבוץ = מבט-על
    טוב יותר, בלי כפילות.
  - **רכיב משותף** [`shared/AttendanceBySiteGrid.tsx`](src/app/admin/_components/shared/AttendanceBySiteGrid.tsx):
    grid+card-shell+grouping/sorting; generic על צורה מינימלית `{id,project,staff}` כך
    ששתי הגדרות `AttendanceRecord` מתאימות; השורה מוזרקת כ-`renderRow` prop (דפוס
    `ImageViewer`) → הדשבורד מקבל שורה מצומצמת בלי רכיב שני. אין שכפול קוד; AttendanceTab
    איבד את helper הקיבוץ המקומי. תצוגה בלבד, foreman-scope נשמר. build + 414 טסטים.

- **יומן היום — תצוגה מקובצת לפי אתר** — **נפרס**
  (27.7.26, `feature/today-log-by-site` → main `a20aa58`, `dpl_sLnGgx7DjGc7`,
  אימות `x-matched-path: /admin`). "יומן היום" (נוכחות → live) היה רשימה
  כרונולוגית שטוחה; נוסף מתג **כרונולוגי / לפי אתר** (ברירת מחדל כרונולוגי, נשמר ב-
  `localStorage: att_today_view`). תצוגת "לפי אתר" = כרטיס לאתר עם מונה עובדים ייחודיים
  ושורות העובדים; עובדים בלי אתר → כרטיס **"ללא אתר" בסוף**.
  - **סדר הכרטיסים שנבחר:** לפי מספר עובדים (הגדול קודם), tiebreak א"ב — coverage-first,
    האתרים העמוסים למעלה; "ללא אתר" תמיד אחרון.
  - **תצוגה בלבד:** מרנדר מחדש את אותן שורות דרך `TodayLogRow` (שעה/סוג/טלפון/תג-מרחק/
    צ'יפ-טלפון/כפתורי עריכה+היסטוריה/עריכה-inline — זהים בשתי התצוגות). אין fetch/endpoint/
    שאילתה; foreman-scope נשמר (אותן שורות, רק קיבוץ). build + 414 טסטים.

- **הפחתת צריכת CPU ב-Vercel (Fluid Active CPU)** — **נפרס**
  (27.7.26, `perf/reduce-cpu-usage` → main `7be0ab7`, `dpl_82jLACwg2MHK`, אימות `x-matched-path: /he`).
  **ה-cache אומת חי:** `/api/translations` מחזיר `x-vercel-cache: HIT` עם `age` עולה בבקשות
  חוזרות — כלומר ה-edge משרת מ-cache והפונקציה (deep-merge 158KB) **מדולגת**. (הערה: Vercel
  "בולע" את `s-maxage`/`swr` ב-edge ומחזיר ללקוח `cache-control: public` בלבד — התנהגות זהה
  ל-`/api/gallery`; ההוכחה היא ה-HIT+age, לא הכותרת ללקוח.) Vercel התריע על 75% מהמכסה; בחריגה
  הפרויקטים **נעצרים** (כולל פורטל עובד + החתמה). חקירה זיהתה את `/api/translations`
  כחשוד #1: deep-merge של **158KB** + serialize בכל קריאה, בלי cache, נצרך ע"י כל
  טאב ציבורי כל 90ש'. (הבחנה: Fluid מודד CPU אקטיבי בלבד — חילוץ ה-AI ממתין ל-Anthropic
  ולכן **לא** חשוד למרות `maxDuration=60`.)
  - **Cache ל-`/api/translations`** (מסלול הקריאה בלבד): `s-maxage=60, stale-while-revalidate=300`
    (זהה ל-`/api/gallery`). מכווץ N קריאות לקריאת-פונקציה אחת ל-60ש'/region. PUT וכל
    מסלולי השגיאה נשארים `NO_CACHE`. **אין רגרסיה לעורך:** התצוגה שלו היא state אופטימי
    מקומי, וה-`version` נקרא מתשובת ה-PUT (NO_CACHE) → אין 409-שווא בשמירות רצופות;
    revalidatePath ממשיך → טעינות דף טריות; טאבים ציבוריים פתוחים מתעדכנים תוך ≤60ש'.
  - **visibility guards:** loop ה-60ש' (`/today`, [AdminPortal](src/app/components/AdminPortal.tsx))
    + interval ה-translations — `if (document.hidden) return`. טאב ברקע לא יורה כלל.
  - **interval translations 90ש' → 10 דק'** (BroadcastChannel + visibilitychange כבר מכסים
    את המקרים האמיתיים; ה-interval הוא רשת ביטחון אחרונה).
  - **InternalClientLayout poll 3ש' → 30ש'** + visibility guard (‎~1,200 קריאות/שעה מיותרות).
  - **לא נגעו:** `/api/attendance` ומסלולי החתמה, שום לוגיקה. build + 414 טסטים.
  - **בתור (אם עדיין צריך אחרי מדידת ההשפעה):** cache קצר ל-`incomplete` (`s-maxage=30`)
    + חלון ברירת-מחדל של חודש במקום 3 חודשים ברענון האוטומטי.

- **פורטל עובד — מניעת לחיצה כפולה + הודעות חסימה מדויקות** — **נפרס**
  (26.7.26, `fix/worker-submit-lock` → main `2213f65`, `dpl_6UR9mnvjbFgs`,
  אימות `x-matched-path: /he`). **טיפול בשורש** של הרעש שסיננו קודם: הסינון
  הסתיר את הסימפטום, זה מייבש את המקור.
  - **נעילת in-flight ל-`submit()`** ([`AttendanceForm.tsx`](src/app/components/AttendanceForm.tsx)):
    `submittingRef` (**ref, לא state** — state לא מתעדכן מיד, שתי הקשות מהירות היו קוראות
    את ה-`false` הישן ויורות 2×POST). הדגל נדלק סינכרונית לפני ה-POST, ו-`finally`
    **תמיד** משחרר (הצלחה/שגיאה/חריגה) — עובד תקוע גרוע מלחיצה כפולה. ה-GPS רץ **לפני**
    `submit()` ולא נוגע בדגל, אז שגיאת GPS לא יכולה לתקוע את הנעילה. ה-`SubmittingScreen`
    (ספינר) הוא המשוב הוויזואלי "שולח...". `hasOpenRecord`/לוגיקת החסימה **לא נגעו**.
  - **שתי הודעות ל-`no_open_entry_to_close`** — השרת מבחין בין הסיבות (אותו אות של הסינון)
    דרך שדה **`detail` בתשובה בלבד** (לא נכתב ל-DB → הסינון במנוע לא מושפע):
    `already_exited` (יש יציאה מוצלחת ב-24ש' → לחיצה כפולה → "כבר החתמת יציאה היום", רגוע)
    מול `no_entry` ("לא נמצאה כניסה — ודא שהחתמת כניסה הבוקר"). **6 שפות** (he/en/ru/si/zh/hi).
    ⚠️ he/en/ru בטוחות; **zh/hi/si — כדאי אימות native**.
  - Twilio + הזנה-ידנית לא נגעו. build + 414 טסטים.

- **מרכז החוסרים — סינון לחיצות-כפולות מהכשלים** — **נפרס**
  (26.7.26, `fix/incompleteness-double-click-noise` → main `ed59ef2`, `dpl_4Uf5ekzF8qai`,
  אימות `x-matched-path: /admin`). **נמדד בייצור: 3 מתוך 4 כשלי `no_open_entry_to_close`
  היו לחיצות-כפולות — הקטגוריה יורדת מ-4 ל-1.** המשך ישיר של המשימה מתחת:
  חקירה גילתה שהמונה **מנופח** בלחיצות-כפולות. יצחק סייג 24.07: יציאה מוצלחת
  13:04:53, ואז 2 כשלי `no_open_entry_to_close` ב-13:04:57 וב-13:05:11 (‎+4ש'/‎+18ש')
  — לחיצות חוזרות אחרי החתמה מוצלחת, לא כשלים. המערכת חסמה **נכון**; רק הסיווג/תצוגה שגו.
  - **חוסר סימטריה שתוקן:** צד ה-**כניסה** כבר סיווג לחיצה-כפולה כ-`noise`
    (`already_clocked_in`, לא מגיע למנוע); צד ה-**יציאה** סיווג הכל כ-`worker_stuck`.
  - **התיקון (אפשרות א' — במנוע הטהור):** כשל `no_open_entry_to_close` עם **יציאה
    חיה (לא-ידנית) מוצלחת עד 5 דק' לפניו** = רעש → נזרק מהמרכז ומהמונה.
    [`hasRecentLiveExit`](src/lib/attendance-incompleteness.ts) + `DOUBLE_CLICK_EXIT_WINDOW_MS`.
  - **למה א' ולא ב':** א' מנקה גם **היסטוריה** (ה-82) וגם עתיד, בקובץ טהור ומכוסה-טסטים,
    **בלי לגעת** ב-`POST /api/attendance` (לוגיקת החסימה נשארה). ב' (סיווג במקור ל-`noise`)
    נקי אך משפיע רק על כשלים חדשים — נשאר כהמלצה עתידית להקשחת הטבלה הגולמית.
  - **בטיחות:** כשל אמיתי (orphan OUT בלי יציאה קודמת) **אין לו התאמה → נשאר מוצג**.
    יציאה ידנית/אדמין אינה מפעילה את הסינון. גם 5 סוגי החוסר האחרים לא נגעו.
  - +5 טסטים (כולל תרחיש יצחק). build + 414 טסטים.
  - **שורש (למה לוחצים פעמיים) — לא שונה, המלצה:** מסך ההצלחה **ברור ותמידי**;
    אבל `submit()` ב-`AttendanceForm.tsx` **חסר נעילת in-flight** + הודעת החסימה
    אחת גנרית ("אין כניסה פתוחה לסגירה"). מומלץ: (1) נעילת submit, (2) שתי הודעות —
    "כבר החתמת יציאה היום" (יש יציאה קודמת) מול "לא נמצאה כניסה — ודא שהחתמת בבוקר".

- **מרכז החוסרים — פעולת "כשל החתמה" מותאמת ל-error_code + תווית בממשק** — **נפרס**
  (22.7.26, `fix/failure-action-mapping` → main `fa589a5`, `dpl_8koqLSTZuu2`). המנוע מיפה **כל**
  `stuck_failure` ל-`add_day` בלי קשר לסיבה; הנתונים החיים הראו שכל 4 הכשלים
  הם `no_open_entry_to_close` (ניסיון יציאה בלי כניסה פתוחה), ששם "הוסף יום"
  עלול להכפיל יום כי הכניסה אולי נרשמה בערוץ אחר.
  - **`error_code` מוזרם מקצה לקצה:** נוסף ל-`attendance_failures` SELECT בלואודר,
    ל-`EngineFailureRow`, ול-`IncompleteItem`.
  - **הפעולה נגזרת מ-error_code** ([`actionForFailureCode`](src/lib/attendance-incompleteness.ts)):
    `no_open_entry_to_close`→`complete_entry` · `monthly_remote_exit_cap_reached`→`complete_exit`
    · `gps_out_of_range`/`location_required`/`server_error`/`account_inactive`/לא-מוכר→`add_day`
    (ברירת מחדל בטוחה = ההתנהגות הישנה, כך שקוד לא-מוכר לא מאבד פריט).
  - **תווית error_code בעברית בממשק** — תג לצד הפרויקט ("יציאה בלי כניסה פתוחה",
    "מחוץ לרדיוס", "אין מיקום"...) + **תווית כפתור מותאמת** (no_open_entry→"בדוק/
    השלם כניסה", cap→"השלם יציאה", server_error→"בדוק (ייתכן שנרשם)"...). **כל**
    הכפתורים ממשיכים לנווט ל-`onViewWorkerHistoryForDay` (מסך בטוח) — רק ההנחיה
    השתנתה, אין מסלול לפעולה אוטומטית שגויה.
  - שאר 5 סוגי החוסר, דדופ ה-stale-opens, ו-`failClock` (רישום הכשלים) **לא נגעו**.
    +טסט חדש למיפוי. build + 409 טסטים.
  - **הקשר תפעולי (לא לחקור מחדש):** אכיפת ה-GPS **כבויה** (`attendance_gps_enforce=off`,
    רדיוס 120 מוגדר אך לא פעיל). לכן המיפוי של `gps_out_of_range`/`location_required`
    הוא **תיאורטי** כרגע — כשלים כאלה לא ייווצרו עד שהאכיפה תודלק. כל 4 הכשלים
    הנוכחיים הם `no_open_entry_to_close`.
- **מחולל ההצעות — ליטוש הצעת-היקף (בלי מחירים)** — **נפרס** (30.7.26,
  `fix/quote-scope-only-polish` → main `5ef2aa1`, `dpl_DeAHaqZwFUfQjGCoKFK6nBnKCQVF`;
  אומת בייצור: הקובץ המוגש כולל `total > 0`, `grandTotal() > 0`, `section-name-input`).
  נובע מהצעה אמיתית (#499, משפחת חזן — היקף בלי מחיר לפריט). תצוגה/עיצוב בלבד —
  חישובים (`effectiveBase`/`totalOverride`/לוח תשלומים) לא נגעו.
  - **סה"כ פרק ריק** — שורת "סה"כ &lt;שם&gt;" הדפיסה ₪0.00 כשסכום הפרק 0 → נוסף
    `total > 0` (ה-guard `section.name` מסבב ב' לפרקים בלי שם נשמר).
  - **הערת מע"מ יתומה** — הופיעה גם בלי פריט מתומחר → מותנית ב-`grandTotal() > 0`.
  - **שם קובץ PDF** — הכותרת (=שם ההורדה של `window.print()` ב-iframe) כללה "#"
    שגרם לדפדפנים לקצץ את השם → עכשיו מספר נקי ("הצעת מחיר 499 - משפחת חזן");
    תווית ה-UI הדביקה שומרת "#".
  - **היררכיית טופס** — שם-הפרק היה חלש משמות הפריטים (13px/600) → `.section-name-input` (15px/700).
- **מחולל ההצעות — סבב ג': סדר הטופס** — **נפרס** (22.7.26,
  `fix/quote-form-order` → main `3fecc50`, `dpl_2VUV96vXy1p`; אומת בייצור:
  סדר הטופס בקובץ המוגש הוא בלוקים→תנאי תשלום→תמונות). **הסבב האחרון מסריקת המחולל — הסריקה הושלמה במלואה.**
  - **"תנאי תשלום" הועבר** מקבוצה #5 (רחוק) ל**מיד אחרי "בלוקים"** (שם יושב
    לוח התשלומים המובנה) — כך חנן רואה את הלוח ואת ההערה המשלימה באותו אזור,
    ואזהרת הסתירה מסבב א' מופיעה בהקשר. זה משלים את סבב א', שהעביר את ה**פלט**
    של paymentTerms מתחת ללוח; עכשיו גם ה**טופס** מיושר.
  - **העברת markup טהורה** — 0 שורות JS/לוגיקה/state בדיף (+14/-14). ה-DOM זז,
    ה-state לא; הצעות קיימות נטענות/נשמרות כרגיל, האזהרה מחווטת במיקום החדש,
    זריעת הלוח/cloudSync/ההצעה הכוללת/סבבים א'+ב' לא נגעו.
  - **"הגדרות" (מע"מ/הנחה) — הוחלט להשאיר בתחתית.** נימוק: שדה set-once
    (מע"מ=18 ברירת מחדל, הנחה נדירה) שממלאים פעם אחת; העברתו לאמצע זרם התוכן
    הייתה מכניסה שדה מספרי נדיר-שימוש לתוך זרימת המילוי, והוא כבר מקובץ עם
    "פרטי חברה" כאזור התצורה בתחתית ("תוכן קודם, תצורה אחרונה").
  - **טופס מול מסמך אחרי התיקון:** items→בלוקים(לוח)→**תנאי תשלום**→תמונות תואם
    למסמך (טבלה→לוח→הערת תשלום→תמונות); הערות/החרגות והגדרות נשארו כאזורי משנה.
  - `node --check` + build נקי + 408 טסטים.
- **גלריה שלב ב'-2 (מחיקה) — 59 קבצי גלריה הוסרו מ-/public** — **נפרס**
  (22.7.26, `chore/delete-migrated-gallery-public` → main `30f533a`,
  `dpl_GUoStpbyV8v`; **אומת בייצור:** קובץ שנמחק (amshinov-11) מחזיר 404 וה-Blob
  שלו 200; 3 דפי הנחיתה 200 ו-`lp/givat-zeev` מגיש את `/ramat-eshkol.jpg` השמור
  מ-/public — הוכחה שהבדיקה הכפולה מנעה שבירה).
  אחרי שההפניה ל-Blob נפרסה ואומתה. **בדיקת בטיחות כפולה** לכל 74 הקבצים
  שהקוד מפנה אליהם: (א) קיים על Blob (200), (ב) 0 הפניות בנתיב `/public` גולמי
  בכל ה-repo. **15 קבצים נשמרו** כי הם חולקים שם עם שימוש חי אחר —
  `TechnicalAnatomy`, דפי נחיתה (`lp/*` breakImage/og), og:image במאמרי מומחיות,
  ומפתחות `heroImage`/`proj_N_cover` ב-`translations.json`. רק **59** שמופנים
  **אך ורק דרך `img()`** (מנותב ל-Blob) נמחקו. `/public`: 28MB → 12MB. build +
  408 טסטים עברו (הוכחה שאף שימוש חי לא נשבר), + סריקה סופית שאף אחד מה-59 לא
  מופנה גולמי. **git history לא מתכווצת** — החיסכון בעץ העבודה ובפריסת Vercel.
  - **סיום סבב 3:** מ-38MB המקוריים ב-`/public` → 12MB. נשארו: 72 נכסים בשימוש
    (hero/expertise/lp), 6 favicons, ו-15 קבצי גלריה שחולקים שם עם שימוש חי.
- **גלריה שלב ב'-2 (הפניה) — 3 המקורות מצביעים ל-Blob** — **נפרס** (22.7.26,
  `feature/gallery-sources-to-blob` → main `50a906d`, `dpl_2oLDnnC62xG`;
  **אומת בייצור:** דף הבית 85 URL של Blob ו-0 נתיבי /public, דף עשיר 300 Blob/0
  public, 2 החריגים נעלמו). **המחיקה מ-/public — בקומיט/אישור נפרד.**
  - **2 תמונות חריגות הוסרו מהקוד** (הכרעת חנן, לעקביות): `ohel-avshalom-2.jpg`
    (חנן מחק מהגלריה בכוונה — `deleted_at` מלא — אך עדיין רונדרה בקוד; הוסרה
    משלושת המקומות: הדף העשיר + `GALLERY_PROJECTS` + `PortfolioGallery`),
    ו-`amshinov-23.jpg` (מעולם לא בגלריה, רק בדף העשיר — הוסר משם).
  - **שלב 0 אומת: 74/74 הקבצים על Blob** (HEAD 200 ב-`gallery/_migrated/<file>`).
  - **ההפניה דרך ה-helper:** [`img()`](src/lib/cloudinary.ts) שוכתב עם מצב
    `SERVE_FROM="blob"` → מחזיר `${BLOB_BASE}/<filename>`. זה מכסה במכה אחת את
    `GALLERY_PROJECTS` **ואת 5 הדפים העשירים** (כולם עוברים דרך `img()`).
    `PortfolioGallery` השתמש בנתיבים קשיחים — 77 מחרוזות `"/x.jpg"` הומרו
    ל-`img("x.jpg")`. מצבי `public`/`cloudinary` נשמרו ל-rollback מהיר.
  - **שיפור עמידות:** ה-fallbacks (GALLERY_PROJECTS, הדפים העשירים) עכשיו
    מצביעים ל-Blob — **שורדים נפילת Supabase** (שירות נפרד). `next.config` כבר
    מתיר את hostname של Blob (מסבב 2). אפס נתיבים מקומיים גולמיים נותרו בשלושה.
    build + 408 טסטים. **המחיקה של 74 הקבצים מ-/public — בקומיט/אישור נפרד.**
- **גלריה שלב ב'-1 — מחיקת 22 תמונות יתומות** — **נפרס** (22.7.26,
  `chore/delete-orphan-images` → main `9c0e481`, `dpl_E36XBEWEBmA`; אומת:
  יתום שנמחק מחזיר 404, הגלריה עדיין 8 פרויקטים מ-Blob 200). `/public` 38→28MB. מהחקירה: 22 קבצי תמונה ב-`/public` (10.12MB)
  שאף קוד ב-repo לא מפנה אליהם. **אימות מחדש עצמאי** (grep על כל שם קובץ בכל
  ה-repo מלבד `/public`/`.git`/`.next`/`node_modules`, + בדיקת בנייה-דינמית של
  נתיבים + og/manifest/config): כולם 0 הפניות → **0 הוצאו מהרשימה**. הגדולים:
  `jerusalem-demo-worker.jpg` (2.4MB), `jerusalem-access-panel.jpg` (2MB).
  `/public` ירד מ-38MB ל-28MB; build + 408 טסטים עברו אחרי המחיקה (הוכחה שאף
  תמונה בשימוש לא נמחקה). **לא נגעתי** ב-76 תמונות הגלריה, ב-72 הנכסים בשימוש,
  או ב-6 ה-favicons. **הערת git:** ההיסטוריה (153MB) לא מתכווצת — החיסכון בעץ
  העבודה ובפריסת Vercel בלבד.
  - **שלב ב'-2 בתור:** הפניית 3 המקורות (`GALLERY_PROJECTS`, `PORTFOLIO`,
    `src/data/projects`) ל-URLs של Blob (deterministic, `gallery/_migrated/`),
    ואז מחיקת 76 תמונות הגלריה (עוד ~19MB). שומר fallbacks שמישים (Blob עצמאי
    מ-Supabase). דורש עריכת קוד + אימות זהיר — לכן נפרד משלב ב'-1.
- **עמוד `/projects` — חובר למערכת התרגומים** — **נפרס** (22.7.26,
  `feature/projects-page-translations` → main `0cc8029`, `dpl_3zes7kN6uYo`;
  **אומת בייצור:** כל הטקסטים המקוריים בעמוד — כותרת, תת-כותרת, CTA, eyebrow —
  ו-0 קופי יתום. he+en). `ProjectsGallery` היה הרכיב היחיד באתר עם 0
  `useTranslations` (27 טרנרים קשיחים) — לכן חנן לא יכול היה לערוך את טקסטי
  העמוד, והחיפוש בעורך (התקין) לא מצא אותם כי הם לא היו ב-KV.
  - **7 בלוקי התוכן** (eyebrow/כותרת/תת-כותרת + CTA eyebrow/כותרת/גוף/כפתור)
    חוברו ל-`useTranslations("projects")` עם **fallback לטקסט הקשיח המקורי**
    לכל מפתח — KV לא-זמין או מפתח חסר לא מרוקן את העמוד. 20 הטרנרים האחרים
    (פילטרים, aria, breadcrumb) לא נגעו; גלריה/lightbox/פילטרים/תג "דף פרויקט"
    לא נגעו (0 שורות בדיף).
  - **מפתחות — prefix חדש `page_*`/`cta_*`:** לסקשן היו כבר `pageTitle`/`subtitle`/
    וכו' עם **קופי יתום שונה** מהטקסט החי. מפתח חדש מבטיח שהברירת-מחדל (=הטקסט
    הקשיח) תוגש והעמוד יישאר **זהה**, בלי סיכון שערך KV ישן ידרוס.
  - **הלשונית בעורך שוחררה חלקית:** במקום `<fieldset disabled>` על כל הטבלה +
    באנר "תוכן מת" — כעת השבתה **פר-שורה** (`PROJECTS_LIVE_KEYS` allowlist):
    7 החדשים פעילים, הישנים (`proj_N_*` + orphans) read-only ומסומנים "לא בשימוש".
    הבאנר עודכן להסביר מה חי ומה לא.
  - build נקי + 408 טסטים. **SYSTEM_MAP** עודכן (שורה בטבלת "מי עורך מה" + ריכוך
    הערת ה"תוכן מת").
- **גלריה — הסרת המספור מכרטיסי הפרויקטים** — **נפרס** (21.7.26,
  `fix/remove-project-numbering` → main `f761197`, `dpl_63eGW2n1Vt4JpQ7jDZXWSfxYuH3D`;
  אומת בייצור: `/he/projects` מחזיר 200, אפס מספרים ב-HTML, הכרטיסים מרונדרים).
  המספר הרץ (01, 02…) בפאנל ה-hover של כרטיס הפרויקט הוסר. הוא לא ייצג דבר —
  לא `sort_order`, לא מזהה, ולא סדר יציב (נגזר מהאינדקס ברשימה המרונדרת ולכן
  השתנה תחת סינון קטגוריה). חנן שאל "לפי מה זה?" — קישוט עיצובי שנקרא כמידע.
  **מבטל בפועל את "מספור רציף בכרטיסי הפרויקטים"** (`2d8d0bd`, למטה) — התיקון
  ההוא הפך את המספור לרציף, ההכרעה כאן היא שהוא מיותר לגמרי. **תצוגה בלבד** —
  `sort_order`/DB/endpoints/הסדר לא נגעו; השדה `num` ב-`api/gallery` נשאר
  (PortfolioGallery משתמש בו כ-React key). **סריקה:** PortfolioGallery בדף הבית
  מחזיק `num` ולא מציג אותו; ה-lightbox מציג "3 / 12" — מונה תמונות אמיתי, נשאר.
  **הופעה שלישית — הוכרע להשאיר:** watermark 120px באטימות 6% ב-hero של 5 הדפים
  העשירים ([`src/data/projects`](src/data/projects/) → `he|en/projects/[slug]/page.tsx`).
  הנימוק: קורא כטקסטורה ולא כמידע, ומשטח אחר מהכרטיס. build נקי, 408 טסטים.
- **חילוץ מסרטון — הצגת רזולוציה + שיפור איכות** — **נפרס** (21.7.26,
  `fix/frame-quality-and-resolution` → main `69419aa`, `dpl_35vKTkTtouR`).
  **ממתין לנתון מחנן:** מה הרזולוציה שתוצג בחילוץ הבא — היא תכריע אם ההשערה
  (וואטסאפ דחס את הסרטון) נכונה. הפריימים יצאו מפוקסלים; החקירה שללה את הקוד
  (הקנבס נבנה מ-`videoWidth` אחרי `loadedmetadata`, אין `scale` בשום מסלול),
  ונשארה מסקנה אחת: **הסרטון עצמו ברזולוציה נמוכה**.
  - **המערכת מציגה את הרזולוציה** במקום בדיקה ידנית חד-פעמית: `ExtractionResult`
    מחזיר `width/height` **משני המסלולים** — מ-`videoWidth/videoHeight` במסלול
    המהיר, ומפרסור שורת `Stream … Video: … 1920x1080` בלוג של ffmpeg.wasm.
    מוצג "חולץ מסרטון 1920×1080" מעל הרשת, ומתחת ל-1280 מופיעה **אזהרת amber**
    שמסבירה שהקלט ירוד ומפנה לכבל/AirDrop. ערך קבוע, לא רק אבחון.
  - **תיקון המלצה מזיקה:** הודעת ה-HEVC המליצה לשלוח את הסרטון בוואטסאפ —
    **וואטסאפ דוחס ומקטין ל-480p-720p**, כלומר ההמלצה שלנו גרמה בדיוק לבעיה
    שחנן חווה. הוחלפה: כבל/AirDrop + "הגדרות ← מצלמה ← פורמטים ← תאימות מרבית".
  - **ביטול קידוד כפול:** הפריים קודד ב-0.92 בחילוץ ואז שוב ב-0.8 בהעלאה.
    `resizeImageToBlob` **מדלג על ה-re-encode** כשהקובץ כבר JPEG ובגבולות
    (`w,h ≤ maxDim`) ומחזיר את המקור; `FRAME_QUALITY` עלה ל-0.95. קבצים גדולים
    מדי או בפורמט אחר (PNG/HEIC/WebP) **עדיין** עוברים בקנבס — ההמרה שם נחוצה
    כי ה-endpoint מקבל jpeg/png/webp בלבד.
  - לוגיקת הדגימה, ה-seek הסדרתי ו-fallback של ffmpeg **לא נגעו** (0 שורות בדיף);
    `ImageViewer` ללא שינוי. build + 408 טסטים.
- **מחולל ההצעות — סבב ב': תוויות ומצבי ריק** — **נפרס** (21.7.26,
  `fix/quote-labels-polish` → main `f385c08`, `dpl_CYPzsskTBEZ`; אומת בייצור:
  כותרת המע"מ מעל הטבלה, "סה"כ (מע"מ אינו חל)", "ביניים (לפני מע"מ)",
  ותאריכים מותנים — כולם חיים, וסבב א' שלם). טקסט/תצוגה בלבד — **0 שורות חישוב נגעו**
  (אומת בדיף). מטרה: שהמסמך שהלקוח מקבל יהיה עקבי לגבי מע"מ.
  - **תוויות מע"מ בטבלת הפריטים:** נבחרה **כותרת אחת מעל הטבלה**
    ("כל הסכומים בטבלה זו הם לפני מע"מ") ולא סיומת בכל עמודה — שתי כותרות
    ארוכות היו נשברות לשורות בהדפסה, והכותרת מכסה גם את תת-סיכומי הפרקים
    באותה אמירה.
  - **"סה"כ ביניים (לפני מע"מ)"** ו-**"סה"כ תוספת (לפני מע"מ)"** — סומנו.
  - **מע"מ 0:** השורה החשופה הפכה ל-**"סה"כ (מע"מ אינו חל)"** — קובע עובדה
    במקום להשאיר את הלקוח לנחש אם מע"מ כלול או עוד יתווסף. אותו ניסוח כמו
    הערת לוח התשלומים מסבב א'.
  - **תאריך ריק:** `תאריך:`/`תקף עד:` הודפסו תמיד, גם בלי ערך → מודפסים עכשיו
    רק כשיש תוכן, כמו שאר הסקשנים שנעלמים כשריקים.
  - **פרק בלי שם:** התנאי התיר תת-סיכום גם בלי שם, והפיק `"סה"כ "` יתום.
    עכשיו נדרש `section.name` — תת-סיכום לפרק אנונימי לא מוסיף מידע מעבר לסה"כ.
  - **סעיף 7 (הערת המע"מ בלוח) — כבר נפתר בסבב א'.** הנוסח "מתווסף לכל חשבון"
    הוחלף אז בנוסח שנגזר ממצב המע"מ (0 מופעים נותרו) — לא נדרשה עבודה נוספת,
    ולא הוסף שדה state מיותר.
  - `node --check` + build נקי + 408 טסטים. אומת שסבב א' שלם (ברירת מחדל ריקה,
    בסיס post-discount ×2, שתי עמודות מע"מ). **סבב ג' — סדר הטופס — בתור.**
- **חילוץ מסרטון — תצוגה מוגדלת לפריימים** — **נפרס** (20.7.26,
  `feature/frame-preview-enlarge` → main `029bb45`, `dpl_3D6fJgAXRkK`). רשת הפריימים הציגה ~10 תצוגות זעירות, שמהן אי
  אפשר לשפוט אם פריים חד או מטושטש — אותה בעיה שנפתרה ברשת התמונות.
  - **מיחזור, לא שכפול:** ה-viewer שהיה מוטבע ב-GalleryTab חולץ לרכיב משותף
    [`shared/ImageViewer.tsx`](src/app/admin/_components/shared/ImageViewer.tsx)
    שמקבל את **הפעולה כ-prop**. אומת: 0 overlays מוטבעים נותרו ב-GalleryTab,
    overlay אחד ברכיב, ו-2 שימושים. גם טיפול המקלדת עבר לרכיב (מקור אמת אחד).
  - **הפעולה שונה לפי הרשת:** תמונות → ⭐ "קבע כשער"; פריימים → ✓ "בחר / בטל
    בחירה" (`repeatable` — טוגל, בניגוד לשער שהוא חד-כיווני). מונה N/total ותג
    "נבחר"/"תמונת השער" בסרגל העליון.
  - **דפוס אחיד בשתי הרשתות:** קליק על התמונה = הגדלה, הפקד = הפעולה
    (`stopPropagation`). אריח הפריים הפך מ-button יחיד לתמונה לחיצה + כפתור
    בחירה נפרד.
  - לוגיקת החילוץ (דגימה, ffmpeg.wasm) וההעלאה **לא נגעו** —
    `lib/video-frames.ts` ללא שינוי. build + 408 טסטים.
    **ממתין להערכת חנן** אם בחירת הפריימים השתפרה מספיק.
- **גלריה סבב 3 — שלב א': העברה ל-Blob — ✅ הושלמה בפועל** (21.7.26). חנן הריץ
  את הכפתור, הריץ את ה-SQL ב-Supabase, ובדק שהאתר מוגש כרגיל.
  **אומת בייצור:** `/api/gallery` מחזיר **131/131 תמונות על Blob, אפס נתיבים
  מקומיים**; דגימה מחזירה `HTTP 200 image/jpeg`. הקוד נפרס ב-20.7.26
  (`feature/gallery-blob-button` → main `3576fe5`, `dpl_4hrvUHzUCsq`).
  הסקריפט דרש credentials שאין לקודספייס, והרצה בטרמינל נדחתה (אותו חיכוך שבגללו
  חילוץ הסרטונים נבנה לתוך המערכת). הלוגיקה נעטפה ב-endpoint שרץ בשרת Vercel,
  שכבר מחזיק את המשתנים — חנן לוחץ כפתור.
  - **הקו הבטיחותי נשמר:** ה-endpoint **מעלה ומחזיר SQL, לא כותב ל-DB**
    (אומת: 0 קריאות update/insert/delete בקוד החדש). חנן מריץ ידנית ב-Supabase.
  - **ליבה משותפת** [`lib/gallery-blob-migrate.ts`](src/lib/gallery-blob-migrate.ts)
    לשני המסלולים — הסקריפט הומר ל-TS ומייבא ממנה (0 שכפול לוגיקה). [`scripts/migrate-gallery-to-blob.mjs`](scripts/migrate-gallery-to-blob.mjs)
  — חד-פעמי, **לא חלק מה-build** (0 הפניות מ-`package.json`).
  - **מה עושה:** שולף מ-`gallery_images` שורות שה-url שלהן נתיב מקומי, קורא
    מ-`public/`, מעלה ל-Blob תחת `gallery/_migrated/`, ו**מייצר קובץ SQL** —
    **לא נוגע ב-DB**. המעבר בפועל הוא החלטה ידנית של חנן, לא תופעת לוואי.
  - **idempotent בשלוש שכבות:** נתיבי Blob דטרמיניסטיים (`addRandomSuffix:false`
    + `allowOverwrite`) → הרצה חוזרת דורסת ולא מכפילה; שורות שכבר על `http`
    מסוננות בשאילתה; ה-SQL מותנה ב-**url הישן** → הרצה שנייה היא no-op.
  - **dry-run (מקור API, בלי סודות): 74 שורות, 19.0MB, 0 כשלים** — כל הקבצים
    אותרו. שני מקורות: `--source=db` (מקור אמת, כולל לא-מפורסמים) ו-`--source=api`
    (בלי credentials, מפורסמים בלבד — לתצוגה מקדימה).
  - **מלכודת שנייה שטופלה מראש:** על Vercel קבצי `public/` **אינם** במערכת
    הקבצים של הפונקציה (מוגשים מה-CDN) — `fs.readFile` היה נכשל בייצור. הפונקציה
    מושכת כל קובץ מה-URL הציבורי של אותו deployment (`req.nextUrl.origin`), כך
    שזה עובד גם ב-preview וגם בפרודקשן.
  - **אצוות של 5 עם cursor:** 74 קבצים/19MB בבקשה אחת היו חורגים מ-maxDuration
    ומשאירים מצב חלקי. הלקוח לולאה על `nextOffset` עם מד "הועברו X מתוך Y";
    תקיעה עולה אצווה אחת, לא ריצה שלמה. כשל בקובץ בודד נאסף ומדווח בלי להפיל.
  - **UI:** Card נפרד בתחתית — "בדיקה מקדימה" (dry-run) · "העבר ל-Blob" (עם
    אישור מפורש שאין מחיקה) · מד התקדמות · פאנל כשלים · **תיבת SQL עם כפתור
    העתקה** והוראה מפורשת.
  - **הקטנה: כבויה כברירת מחדל** (`--resize` זמין). הנימוק: יעד המשימה הוא משקל
    ה-repo, שמושג בעצם ההעברה; `next/image` ממילא מייעל את ההגשה כך שהמבקר לא
    יראה הבדל; והקטנה היא הצעד ה**בלתי-הפיך היחיד** במיגרציה הפיכה לחלוטין.
  - **דיוק נתון:** הסט של הגלריה הוא **19MB**, לא 38MB — היתר ב-`/public` הם
    נכסים שאינם גלריה (hero, expertise, lp, og) ששלב ב' לא נוגע בהם.
  - **אפס מחיקות.** `/public`, `GALLERY_PROJECTS`, `PROJECTS` ו-`src/data/projects`
    לא נגעו. `next.config` כבר מתיר את hostname של Blob (מסבב 2).
  - **שלב ב' — התנאי המקדים התקיים, מוכן לביצוע.** ה-DB כבר לא מצביע לאף קובץ
    ב-`/public`, ולכן המחיקה חסומה כעת **רק** ע"י שלושת ה-fallbacks שעדיין
    קוראים משם: `GALLERY_PROJECTS` ([`lib/projects.ts`](src/lib/projects.ts)),
    `PROJECTS` ([`PortfolioGallery.tsx`](src/app/components/PortfolioGallery.tsx))
    ו-5 הדפים העשירים ([`src/data/projects`](src/data/projects/)).
    ⚠️ **מחיקה לפני הכרעה בשלושתם תשבור את הגלריה, את דף הבית ואת דפי הפרויקט.**
    צריך להכריע לכל אחד: להשאיר, להסיר, או להפנות ל-Blob.
- **מחולל ההצעות — סבב א': תיקוני כסף בתנאי תשלום** — **נפרס** (20.7.26,
  `fix/quote-payment-money` → main `7936022`, `dpl_3YrfHBps1Jg`; אומת בייצור:
  ברירת המחדל ריקה, בסיס הלוח post-discount בשני אתרי הרינדור, `showVatCol` חי). מסריקת המחולל; זה מה שהלקוח רואה.
  - **סתירת תנאי התשלום (1.1):** ברירת המחדל של `paymentTerms` הייתה
    "מקדמה 20%, היתרה לפי לוח תשלומים שיצורף" — סותרת את לוח התשלומים המובנה
    שנזרע לכל הצעה חדשה (20/20/20/25/10/5), וגם "שיצורף" שגוי כי הלוח מודפס
    במסמך. **רוקנה למחרוזת ריקה.** הטקסט הוסב ל**הערה משלימה** ומרונדר עכשיו
    **צמוד מתחת לטבלת הלוח** במקום אחרי התמונות. **השדה לא נמחק** — הצעות
    קיימות ממשיכות להציגו, ו-fallback עצמאי מדפיס אותו גם אם אין בלוק תשלומים
    כלל (אחרת היה נעלם). נוספה **אזהרת amber** בטופס כשהטקסט קיים לצד לוח
    מפורט — מתריעה, לא חוסמת.
  - **באג כספי — בסיס הלוח התעלם מהנחה (1.2):** הלוח חושב על `effectiveBase()`
    (לפני הנחה) בעוד טבלת הסה"כ מחשבת על `subtotalAfterDiscount()` → **סכום
    השלבים היה גבוה מהסה"כ לתשלום**. תוקן ב-**3 המקומות** שמחשבים את הבסיס:
    `renderPaymentBody` (טופס), `renderPaymentPreview` (פלט), ושורת ה-info.
    `effectiveBase()` נשאר במקומו בהגדרת ההנחה וב-"סה"כ ביניים" (שם הוא נכון).
    **אומת מספרית:** בהנחה של ₪10,000 הלוח הישן הגזים ב-₪10,000 בדיוק; אחרי
    התיקון סכום השלבים = הסה"כ לפני מע"מ, וסכום עמודת "כולל מע"מ" = הסה"כ לתשלום.
  - **שתי עמודות מע"מ:** "לפני מע"מ" + "כולל מע"מ" בטבלת הלוח. במע"מ 0 מוצגת
    **עמודה אחת בלבד** (שתיים היו זהות) וההערה מתחלפת ל"מע"מ אינו חל על הצעה זו".
  - `node --check` + build נקי + 408 טסטים. זריעת הלוח, `effectiveBase`/
    `totalOverride` וההצעה הכוללת לא נגעו. **סבב ב' בתור** (תוויות מע"מ בטבלת
    הפריטים, תאריך ריק, סה"כ פרק בלי שם).
- **content-editor — לשונית תוכן מת נחסמה + תיעוד "מי עורך מה"** — **נפרס**
  (20.7.26, `fix/content-editor-dead-tab` → main `650eff4`, `dpl_4Gjq1rvSgZn`). חקירת עורכי התוכן
  גילתה ש**לשונית "פרויקטים"** ב-`/internal/content-editor` עורכת מפתחות שאף רכיב
  לא צורך (`proj_N_description`, `proj_N_feature_*`, `proj_N_xray_*`; `XRaySlider`
  לא מרונדר בשום דף ציבורי) — מלכודת זמן. נוסף **באנר אזהרה** עם הפניה
  (פרויקטים ← `/admin` גלריה · טקסטי דף הבית ← לשונית "תיק עבודות"), והשדות
  **הושבתו לקריאה בלבד** באמצעות `<fieldset disabled>` יחיד שעוטף את הטבלה —
  משבית את כל הפקדים נייטיבית בלי לגעת באף input בנפרד, והפיך בשורה אחת.
  **לא נמחק שום תוכן/מפתח.** לשונית "תיק עבודות" ושאר הלשוניות לא נגעו.
  **SYSTEM_MAP:** נוספה טבלת "מי עורך מה", שתי נקודות הבלבול (דף הבית שואב את
  כותרות 5 המקוריים מ-KV ולא מהגלריה; הלשונית המתה), הפניה הדדית מאזור הפורטל
  הפנימי, ואזהרה ש-`SLUGS_WITHHELD`/`BLOCKED_PROJECT_SLUGS` מוגדרים בשני מקומות.
  בנוסף יושרו משפטים שהפכו שגויים אחרי סבבי הגלריה (מסלול `api/cloudinary-gallery`
  שהוסר). build + 408 טסטים.
- **גלריית האדמין — תצוגה מקדימה בגדול בלחיצה** — **נפרס** (20.7.26,
  `feature/gallery-admin-preview` → main `46c4391`, `dpl_E9NNebd6w8e`). התצוגות המקדימות ברשת קטנות מכדי לבחור תמונת שער
  בביטחון. לחיצה על תמונה פותחת אותה בגודל מלא, עם ניווט (חצים + ←/→), סגירה
  (X / רקע / Esc), אינדיקציה אם זו כבר השער, ו**כפתור "קבע כשער" בתוך החלונית** —
  זה עיקר הערך: בחירת שער תוך כדי צפייה בגדול. כפתורי האריח (מחיקה/⭐/חצי סדר)
  עטופים ב-`stopPropagation` כך שלחיצה עליהם לא פותחת את החלונית.
  **לא מיחזרתי את `ProjectGalleryClient`** (ה-lightbox הציבורי): הוא חושף רק
  `images/projectTitle/lang`, מרנדר רשת משלו, ואין בו נקודת חיבור לפעולה — הזרקת
  "קבע כשער" הייתה מזהמת רכיב ציבורי בלוגיקת אדמין. נבנה viewer קטן ייעודי.
  `<img>` רגיל ולא `next/image` — תמונות Blob שמוצגות פעם אחת בגודל מלא, אין מה
  לאופטם. **לקוח בלבד** — קובץ אחד, בלי endpoints/DB/העלאה. build + 408 טסטים.
- **דף פרויקט לפרויקטים מה-DB (מצומצם, אוטומטי)** — **נפרס** (20.7.26,
  `feature/db-project-page` → main `86f1dbb`, `dpl_4RBfZmbkBW3`. **אומת בייצור:**
  3 הפרויקטים מה-DB מרנדרים דף מלא (24/14/19 תמונות), en כולל, והדף העשיר של
  amshinov ללא שינוי). לפרויקטים שנוספו באדמין לא היה דף (הדפים העשירים
  ב-[`src/data/projects`](src/data/projects/) הם 5 בכתיבת יד) → 404. עכשיו
  ה-route תומך בשני מקורות: slug שקיים ב-`src/data/projects` → **הדף העשיר,
  ללא שינוי כלל**; אחרת → דף **מצומצם שנבנה אוטומטית** מ-`gallery_projects`
  ([`lib/gallery-project-page.ts`](src/lib/gallery-project-page.ts) +
  [`DbProjectPage.tsx`](src/app/components/DbProjectPage.tsx)); אין אף אחד מהם →
  404. הדף בנוי **רק ממה שכבר יש בטופס** (כותרת/קטגוריה/תיאור he-en + התמונות
  לפי `sort_order`, שער ראשון) — בלי שדות חדשים למלא. ממחזר את `ProjectGalleryClient`
  ל-lightbox ואת שפת העיצוב של הדף העשיר (hero+gradient, breadcrumb, פס גלריה כהה).
  metadata: title/description/og:image מהנתונים; **JSON-LD דולג** בדף המצומצם
  (הדפים העשירים בונים אותו משדות ייעודיים שאין ב-DB — לא שווה להמציא).
  - **`generateStaticParams` נשאר על 5 הקשיחים ו-`dynamicParams` נשאר ברירת-מחדל
    (true)** — slug שאינו ברשימה מרונדר on-demand, כך ש**פרויקט שנוסף באדמין עובד
    מיד בלי פריסה מחדש**. הוספת slugs מה-DB לרשימה הייתה מקפיאה אותם בזמן build
    ומחזירה את ה-404. `revalidate = 60`, עקבי עם `/api/gallery`.
  - כשל שליפה מה-DB → `null` → **404 נקי, בלי קריסה** (אומת מקומית ללא גישת DB).
  - **תג "דף פרויקט" מוצג עכשיו לכולם** חוץ מ-4 המוסתרים בכוונה (`SLUGS_WITHHELD`
    — תוכן בהכנה, ה-proxy מפנה אותם לבית); ה-prop `detailSlugs` מהתיקון הקודם
    התייתר והוסר. אומת: amshinov עובד, תג אחד בלבד ב-SSR.
- **גלריה — תג "דף פרויקט" מוסתר כשאין דף** — **נפרס** (20.7.26,
  `fix/project-page-link` → main `8929514`, `dpl_9qDrPE6ARVN`; אומת בייצור:
  תג אחד בלבד, אפס קישורים לחדשים, amshinov→200). אחרי מעבר הגלריה ל-DB, שלושת הפרויקטים שנוספו באדמין
  (`kiryat-noar-jerusalem`, `katamon-penthouse`, `menachem-meishiv-split`) הציגו
  תג "דף פרויקט" שהוביל ל-404: עמוד הפרויקט הבודד קורא מ-dataset **שלישי**
  ([`src/data/projects`](src/data/projects/) — תוכן עשיר בכתיבת יד, 5 ערכים),
  לא מ-DB ולא מ-`GALLERY_PROJECTS`, וההסתרה נשענה על רשימה **קשיחה** שלא יכולה
  לדעת על פרויקטים חדשים. **תוקן:** התג מוצג רק אם ה-`urlSlug` קיים ב-`PROJECT_SLUGS`
  — מקור האמת של ה-route עצמו — שמועבר כ-prop מדף השרת (כדי שהתוכן העשיר לא ייכנס
  ל-bundle של הלקוח). נשמרה גם רשימת ה-4 שמוסתרים בכוונה (תוכן בהכנה, ה-proxy מפנה
  אותם לבית), כך שהתנהגות 5 המקוריים לא השתנתה. אימות: תג אחד בלבד (amshinov),
  אפס קישורים לחדשים. `src/data/projects` לא נגע; lightbox עובד לכולם.
  **מונע חזרה של הבאג** בכל פרויקט עתידי שייווצר באדמין.
  - **soft-404 — עדיין פתוח אחרי סבב חקירה שני.** `/[he|en]/projects/<slug-לא-קיים>`
    מחזיר **HTTP 200** עם דף שגיאה. **הניסוי המכריע:** קריאה ל-`notFound()`
    כ**שורה הראשונה** בקומפוננטה עדיין מחזירה 200 — כלומר שום דבר בקוד שלנו לא
    בולע אותה; **ה-route עצמו לא מסוגל לפלוט 404**, בעוד `expertise/[slug]`
    — מבנית זהה, אותו layout, אותו `error.tsx`/`not-found.tsx` — כן מחזיר 404
    (אומת בייצור, לא רק מקומית). **נשלל:** ה-proxy (מפנה רק slugs ב-`SLUGS_WITHHELD`;
    לכל השאר אותו `return response` כמו expertise); קונפיג ה-route (שוכפל
    אחד-לאחד מ-expertise: `force-dynamic`, בלי `generateStaticParams`, בלי
    `revalidate` — עדיין 200); `generateStaticParams` לבדו; `dynamicParams=false`;
    `rewrites`/`redirects` ב-`next.config`/`vercel.json` (אין כאלה); גבולות
    boundary (משותפים לשני הנתיבים).
    **סבב 3 — ניסויי probe בודדו את זה לנתיב עצמו.** נבנו routes זמניים (הוסרו):
    `probe404` (גוף = `notFound()` בלבד) → **404**; `+generateMetadata` → 404;
    `+generateStaticParams`+`revalidate` → 404; `+כל הייבואים של projects` → 404.
    ואז **המבחן המכריע**: העתקה **מילה-במילה** של קובץ ה-route של projects לנתיב
    `/he/projectz/[slug]` (אותו עומק, אותם ייבואים, אותו קונפיג) → **404**, בעוד
    אותו קובץ בדיוק ב-`/he/projects/[slug]` → **200**. **מסקנה: תוכן הקובץ,
    הקונפיג, ה-metadata והייבואים כולם לא רלוונטיים — הנתיב `/he/projects/*` עצמו
    הוא הטריגר.** גם ניטרול זמני של בלוק `BLOCKED_PROJECT_SLUGS` ב-proxy לא שינה
    (עדיין 200), ו-`sitemap.ts` רק בונה כתובות בלי השפעת ריצה — כלומר **שום קוד
    שלנו לא מסביר את זה**, מה שמצביע על שכבת Next/Vercel (למשל ערך prerender/ISR
    תקוע לנתיב הזה). **לא בודד עד הסוף — שום תיקון לא נשלח.**
    **סבב 4 — פריסה נקייה נוסתה ונכשלה.** `npx vercel --prod --force`
    (`Skipping build cache`, `dpl_2dS6QZcZkTU`) → הנתיב עדיין **200**
    (`x-vercel-cache: MISS`). כלומר **גם השערת ה-prerender/cache התקוע נשללת**.
    אי-נסיגה אומתה אחרי הפריסה: דף DB 200 (24 תמונות), הדף העשיר 200, slug מוסתר
    307→`/he`, תג אחד בגלריה.
    **נשאר פתוח במכוון — לא משנים URL** (המחיר ב-SEO גבוה מהתועלת, במיוחד כשאין
    באתר שום קישור לנתיבים האלה).
    השפעה מעשית נמוכה: אחרי `fix/project-page-link` אין באתר קישור לנתיבים
    כאלה, אז הסיכון מצטמצם לזחילה ישירה של גוגל לכתובות ישנות.
- **דף הבית — גלריית פרויקטים מה-DB עם `is_featured`** — **נפרס** (19.7.26,
  `feature/home-gallery-db` → main `0285b50`, `dpl_emdy8XHG2Fv`; המיגרציה הורצה
  ידנית. **אומת בייצור:** `?featured=1` מחזיר בדיוק את 5 המקוריים, ו-`/api/gallery`
  הרגיל עדיין 8 פרויקטים במספור 01-08 — אין נסיגה). `PortfolioGallery` השתמשה במערך
  `PROJECTS` קשיח משלה, כך שפרויקטים שחנן מוסיף הופיעו ב-`/he/projects` אבל **לא
  בדף הבית**. **מיגרציה** [`20260719_gallery_is_featured.sql`](supabase/migrations/20260719_gallery_is_featured.sql):
  עמודת `is_featured boolean NOT NULL DEFAULT false` (false בכוונה — פרויקט חדש
  לא נכנס לדף הבית מעצמו), + back-fill ל-5 המקוריים שמוצגים שם היום כדי שדף
  הבית ייראה **זהה**. דף הבית קורא מ-`/api/gallery?featured=1` (פרמטר ל-endpoint
  הקיים, בלי חדש; `is_featured AND is_published`, לפי `sort_order`, אותו caching).
  **fallback חובה:** מתחיל מ-`PROJECTS` הקשיח ומחליף רק על מערך לא-ריק.
  **שימור קופי:** טקסטי דף הבית מגיעים מתרגומים ושונים מאלה שב-DB ("תשתיות
  ומבני ציבור" מול "תשתיות ציבוריות") — 5 המקוריים ממשיכים לקחת מהתרגומים,
  **ממופים לפי slug** (לא אינדקס, כדי לשרוד סידור מחדש), וחדשים לוקחים מה-DB.
  עיצוב/layout/next-image ו-lightbox לא נגעו; `ProjectsGallery` לא נגעה. באדמין:
  תיבת "הצג בדף הבית" + תג ברשימה + `is_featured` ב-CRUD. build + 408 טסטים.
- **מנהל גלריה — חילוץ תמונות מסרטון (בצד לקוח)** — **נפרס** (19.7.26,
  `feature/gallery-video-frames` → main `3e281fc`, `dpl_7K45xUUbFtZ`). לחנן הרבה סרטוני שטח; ffmpeg/כלים חיצוניים נדחו.
  **הסרטון לעולם לא עולה לשרת** — הדפדפן מפענח אותו מקומית
  (`URL.createObjectURL` → `<video>` → `<canvas>`) ורק הפריימים שנבחרו נשלחים.
  [`lib/video-frames.ts`](src/lib/video-frames.ts): דוגם `FRAME_COUNT=10` פריימים
  בפריסה אחידה, מדלג 5% בהתחלה/סוף, **seek סדרתי** (מקבילי לא אמין בדפדפן),
  `toBlob` לכל פריים; "חלץ עוד" מזיז חצי-מרווח כדי לדגום בין הקיימים.
  **כישלון פענוח לא שקט:** `error`/`duration` לא-סופי/`videoWidth=0`/timeout →
  `VideoFrameError` עם הודעה בעברית ("לא ניתן לקרוא את הסרטון הזה בדפדפן — נסה MP4");
  seek בודד שנכשל מדלג בלי להפיל את האצווה. **ניקוי זיכרון:** `revokeObjectURL`
  לסרטון ולתצוגות המקדימות + שחרור canvas ב-`finally`. הפריימים עוברים
  ב**מסלול ההעלאה הקיים** (`resizeImageToBlob` → `POST /api/admin/gallery/upload`)
  — **בלי endpoint חדש ובלי שינוי DB**. build + 408 טסטים.
  - **מסלול גיבוי ffmpeg.wasm** (חנן מצלם HEVC ולא מוכן לשנות הגדרות): אם
    הפענוח הדפדפני נכשל → `extractFramesAuto` נופל ל-`@ffmpeg/ffmpeg@0.12.15`
    ב-**dynamic import** (לא ב-bundle הראשי — נמדד: `.next/static` 4.4M לפני
    ואחרי), עם ליבה מ-CDN ב**גרסה נעולה** `@ffmpeg/core@0.12.10` (לא latest).
    **headers:** נבחרה הליבה ה**חד-תהליכית** — אומת אמפירית 0 התייחסויות
    ל-`SharedArrayBuffer`/`pthread` (מול 1+1 ב-`core-mt`), ולכן **לא נדרש
    COOP/COEP** ו-`next.config` לא נגע → האתר הציבורי לא מושפע. הליבה (30.7MB)
    מוגשת מ-CDN ולא מה-repo, כדי לא לנפח אותו (סבב 3 דווקא מסיר 38MB).
    הודעות נפרדות לכל כשל: קודק (עם הפתרון ב-iOS), **CDN לא זמין**, וכשל מלא
    (הצעה: לשלוח בוואטסאפ שממיר ל-MP4). ניקוי: `deleteFile` + `terminate()`
    ב-`finally`.
- **גלריה — מספור רציף בכרטיסי הפרויקטים** — **בוטל בדיעבד** (המספור הוסר
  כליל ב-21.7.26, ראו למעלה; תיקון ה-`num` ב-`api/gallery` נשאר). **נפרס** (19.7.26,
  `fix/gallery-sequential-numbering` → main `2d8d0bd`, `dpl_CTwMApKioNQ`;
  אומת בייצור: 01-08 ברצף, בלי חורים). המספור על הכרטיסים דילג (01-05 ואז 07,08).
  **שורש:** ב-[`api/gallery`](src/app/api/gallery/route.ts) ה-`num` הוקצה לפי
  אינדקס על **כל** הפרויקטים המפורסמים, ורק **אחר כך** סוננו אלה בלי תמונות —
  כך שפרויקט מפורסם-בלי-תמונות "צרך" את 06 ונעלם, והשאיר חור. תוקן ל**סינון
  ואז מספור**. בנוסף, ב-`ProjectsGallery` המספר המוצג נגזר עכשיו מ-`idx` של
  **הרשימה המרונדרת בפועל** (`String(idx+1).padStart(2,"0")`) במקום מ-`proj.num`,
  כך שהוא רציף גם תחת סינון קטגוריה וגם כשה-fallback הקשיח פעיל. **תצוגה בלבד**
  — `sort_order`/DB/endpoints/הסדר עצמו לא נגעו; תיקון ה-`indexOf` מסבב 2 אומת
  שלא נסוג. build + 408 טסטים.
- **מנהל גלריה — שדות התיאור ניתנים למתיחה** — **נפרס** (19.7.26,
  `fix/gallery-textarea-resize` → main `7ce0db3`, `dpl_DPA8WhsCWnG`).
  בטופס הפרויקט שני שדות התיאור (he/en) היו
  `rows={2}` בלי כלל `resize` מפורש — תיאור טיפוסי (3-4 שורות) לא נכנס וחנן לא
  ראה מה הוא כותב. נוספה מחלקה `txt` ייעודית: **`resize-y`** (אנכי בלבד —
  מתיחה אופקית הייתה שוברת את עמודת ה-grid), `rows={5}`, `min-h-[5.5rem]`
  (רצפה שלא תיסגר בגרירה) ו-`leading-relaxed`. **סריקה:** אלה שדות הטקסט-הארוך
  היחידים בטופס — כל השאר `input` חד-שורתיים/select/checkbox; ל-`alt_he/alt_en`
  אין שדה בטופס כלל. הטופס inline (לא מודאל) ומכלו בלי גובה/overflow קבוע, אז
  המתיחה לא חותכת דבר; מובייל `grid-cols-1` לא נפגע. **JSX/CSS בלבד** — לוגיקת
  שמירה/endpoints/טבלאות לא נגעו. build נקי.
- **מנהל גלריה — סבב 2 (מעבר האתר הציבורי ל-DB + ניהול פרויקטים)** — **נפרס**
  (19.7.26, `feature/gallery-projects-db` → main `f5c6bc7`, deploy `2g3xs9z1f`;
  2 מיגרציות הורצו ידנית בסדר projects→content; **אימות ייצור:**
  `/api/gallery` מחזיר 5 פרויקטים מה-DB — לא `[]`). משלים את סבב 1: הגלריה
  הציבורית (`/projects`) עברה מהמערך הקשיח לקריאה מ-DB, וחנן מנהל פרויקטים
  במלואם (כותרת/תיאור/קטגוריה he+en, aspect, url_slug, פרסום, סדר) — כולל
  הוספת פרויקטים חדשים בלי קוד.
  - **2 טבלאות:** `gallery_projects` (slug=`gallery_images.project_slug`) +
    ייבוא 5 פרויקטים ו-75 שורות תמונה (73 refs + 2 שערים שהיו מחוץ ל-images[])
    מ-`GALLERY_PROJECTS`; url=נתיב `/public` הנוכחי. **התמונות נשארות ב-`/public`**.
  - **קריאה ציבורית** [`GET /api/gallery`](src/app/api/gallery/route.ts)
    (force-dynamic + CDN 60ש') → `GalleryProject[]` (published, לא-מחוק, לפי
    sort_order). **fallback:** ProjectsGallery מחליף רק על מערך לא-ריק — כשל/ריק
    שומר את המערך הקשיח, האתר לא נשבר. `next/image` נשמר + hostname של Blob
    ב-`next.config`. מסלול `api/cloudinary-gallery` הרדום הוסר. תוקן באג
    `GALLERY_PROJECTS.indexOf`→`projects.indexOf` (lightbox).
  - **ניהול:** CRUD `api/admin/gallery/projects[/[id]]` (admin-gated) + GalleryTab
    מורחב (רשימה/הוסף/ערוך/פרסום/סדר/מחיקה; הבורר קורא מה-DB). `lib/projects.ts`
    נשמר כ-fallback. **סבב 3 בתור:** ניקוי `/public` (73 תמונות→Blob).
- **מנהל גלריה באדמין — סבב 1 (ניהול בלבד)** — **נפרס** (19.7.26,
  `feature/gallery-manager` → main `0868b67`, `dpl_4UzH5RoVcmoR`; מיגרציה
  `20260719_gallery_images.sql` **הורצה** ידנית; `BLOB_READ_WRITE_TOKEN`
  מאומת בפרודקשן; endpoints מחזירים 401 admin-gated). ממשק חדש להעלאת תמונות
  לגלריית אתר התדמית, במקום קובץ ב-`/public` + עריכת `lib/projects.ts` + deploy
  לכל תמונה. **סבב זה = ניהול בלבד** — הגלריה הציבורית עדיין קוראת מהמערך הקשיח
  (המעבר ל-DB בסבב 2).
  - טבלת `gallery_images` (`project_slug`=`GALLERY_PROJECTS[].id`, `url` Blob,
    `sort_order`, `is_cover`, `category`, `alt_he/en`, soft-delete; DEFAULT מפורש
    לכל עמודה — לקח `attendance.status`).
  - אחסון **Vercel Blob** (prefix `gallery/`, רוכב על `api/upload`). הקטנה בצד
    לקוח [`lib/image-resize.ts`](src/lib/image-resize.ts) (~1920px/q0.8,
    3-5MB→~200-500KB). **העלאה מרובה** קובץ-לבקשה במקביל (concurrency 3), מד
    "עלו X מתוך N", כישלון בודד לא שובר את האצווה.
  - endpoints admin-gated: `POST api/admin/gallery/upload`, `GET api/admin/gallery`,
    `PATCH/DELETE api/admin/gallery/[id]`. tab "גלריה": בורר פרויקט, drop-zone +
    `multiple`, רשת עם מחיקה/שער/חצי-סדר. `lib/projects.ts`/`ChangeOrderForm`/
    `api/upload` לא נגעו. **סבב 2 בתור** (מטה): מעבר הגלריה הציבורית ל-DB +
    מיגרציית 78 התמונות מ-`/public`.
- **מחולל ההצעות — שליטה חופשית ברוחב הפאנלים (גבולות דו-צדדיים)** — **נפרס**
  (16.7.26, `fix/quote-panel-resize` → main `3b19a31`, `dpl_7bQvuMFi9DE`).
  התיקון הקודם
  (`preview-width`) הוריד את תקרת ה-form ל-640px כדי שהתצוגה לא תיחנק — אבל
  זה מנע מחנן להרחיב את פאנל העריכה (בעיה תמורת בעיה). עכשיו הגבול נגזר
  **דינמית מרוחב ה-layout החי**: `panelBounds()` מחשב `formMax = min(1000,
  layoutInner − 6 − 400)`, כך ש-form panel יכול לגדול הרבה (עד ~1000px במסך
  רחב) ובמקביל **התצוגה שומרת רצפה של 400px** — הגבול הוא "התצוגה לא נעלמת",
  לא "העריכה לא גדלה". form min 320, max ~834–1000 לפי המסך; preview floor 400.
  אותם bounds ב-`applyPanelWidth` וב-drag; `resize` listener מרה-clamp כשחלון
  משתנה. נוסף **דאבל-קליק על ה-resizer → איפוס ל-480** (ברירת מחדל). הרוחב
  עדיין נשמר ב-`panelWidthPx` (config) ומשוחזר. `.document max-width:100%` +
  cap layout 1800 + מובייל <1100 single-column — לא נגעו. **CSS/JS-פריסה
  בלבד**, לוגיקה/lump-sum/תשלומים לא נגעו. `node --check` + build נקי.
- **מחולל ההצעות — כפתורי סידור שקופים + סריקת נראות** — **נפרס** (16.7.26,
  `fix/quote-reorder-visibility` → main `5f7cfac`, `dpl_2sbQ6vwD5Mt`).
  כפתורי החצים לשינוי מיקום פריט (`.item-reorder`
  ▲/▼) היו `opacity: 0` במנוחה — בלתי-נראים לגמרי, רק hover חשף אותם, אף אחד
  לא ידע שאפשר לסדר פריטים. תוקן ל-`opacity: 0.55` במנוחה (עדין אבל ברור),
  מתבהר ל-`1` ב-hover/focus; mobile נשאר `1`. **CSS בלבד** — לוגיקה/lump-sum/
  תשלומים לא נגעו. **סריקת נראות** של שאר האלמנטים הלחיצים: כל שאר ה-`.btn-icon`
  (מחיקה ✕/🗑, הוספה, חצי תמונות/בלוקים) משתמשים ב-`--text-muted` (#6b7280) —
  אפור נראה במנוחה, מאדים/מוריק ב-hover; החצים המושבתים בקצוות ב-`opacity:0.3`
  (תקין — מציין disabled). `.item-reorder` היה הדפוס היחיד של "בלתי-נראה עד
  hover". `node --check` נקי + build נקי.
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
  - **סבב הודעות חסימת יציאה:** `alreadyClockedOut` (חדש) + נוסח מחדש ל-
    `noOpenEntryToClose`. HE/EN/RU מלאות ומאומתות; **SI/HI/ZH best-effort → לתקף מול native.**
    (טקסט מלא בשפת האם, ללא fallback לאנגלית — לפי החלטת חנן.)

### חוב טכני ידוע
- **`ForemanPortal.tsx` (~1,344 שורות)** — מועמד ל-refactor. פירוק `site` tab
  ל-4 קומפוננטות: `SiteOnSitePanel` / `SiteStaleOpensPanel` /
  `SiteMissingTodayPanel` / `SitePendingPanel`.
- **Webhook GitHub↔Vercel שבור** — פריסה ידנית קבועה (`npx vercel --prod`).
  Reconnect לא פתר, suspend/unsuspend לא פתר. חי בהערות "עקרונות תפעוליים"
  למטה כתזכורת מבצעית.

---

## בתור (עם תלויות)

### מנהל גלריה — סבב 3 (ניקוי /public)
- **תלוי בסבב 2** (`feature/gallery-projects-db`, הקריאה מ-DB) ובאימות שהגלריה
  הציבורית יציבה מ-DB.
- העלאת 73 התמונות מ-`/public` ל-Vercel Blob + עדכון ה-`url` בשורות `gallery_images`
  מ-`/foo.jpg` ל-URL של Blob, ואז מחיקתן מה-repo (מסיר את ~38MB).
- רק אחרי שרואים שהכל מוגש נכון מה-DB — כדי לא לסכן את האתר הציבורי.

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
