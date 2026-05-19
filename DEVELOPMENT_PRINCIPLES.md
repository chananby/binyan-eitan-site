# עקרונות פיתוח - בניין איתן

> **🛑 הוראה לכל סוכן AI (קלוד גיט, סוכנים אחרים):**
> קרא את הקובץ הזה לפני כל משימה. אם משימה סותרת עקרון כאן - לדווח ולשאול את המשתמש לפני ביצוע.

---

## עקרונות מבנה

### 1. גודל קבצים - עד 400 שורות
קומפוננטה אחת = עד 400 שורות. מעל - להציע פיצול לפני שמוסיפים עוד.

- **דוגמה רעה:** AdminPortal.tsx הגיע ל-3,441 שורות. דרש refactoring של 3 שלבים.
- **דוגמה טובה:** WorkersTab.tsx (243 שורות), ProjectsTab.tsx (191 שורות).

### 2. קומפוננטה חדשה = קובץ חדש
פיצ'ר חדש = קובץ חדש בתיקייה המתאימה. לא להוסיף לקובץ קיים שמטרתו שונה.

- **דוגמה:** אם בעתיד יבוא "ניהול ספקים" - ייווצר `SuppliersTab.tsx` חדש, לא תוספת ל-AdminPortal.

### 3. fetch מחוץ ל-UI
קומפוננטות UI לא קוראות ל-API ישירות. ה-fetch קורה ב-parent דרך handler/callback שעובר כ-prop.

- **דוגמה טובה:** WorkersTab מקבל `onAddWorker` כ-prop. ה-fetch ב-AdminPortal.
- **דוגמה חריגה (לא לשכפל):** ProjectsTab עושה fetch inline לשיוך ממונה. נשאר כי עובד, אבל לא להוסיף עוד כאלה.

---

## עקרונות נתונים

### 4. שינויי DB דרך מיגרציה
כל שינוי schema (CREATE/ALTER/DROP) → קובץ ב-`supabase/migrations/` בפורמט `YYYYMMDD_<תיאור>.sql`.

**גמישות:** מותר תיקון זריז ב-Supabase Dashboard במקרי חירום, אבל **חובה לכתוב מיגרציה דיעבד ולדחוף ל-repo**. אסור שיהיו שינויי schema "רק בענן".

- **דוגמה למה זה חשוב:** טבלת tasks נוצרה ידנית ב-Dashboard עם schema שגוי. הבאג חי חודשיים בלי שמישהו ידע.

### 5. אחידות שמות בין קוד ל-DB
שם עמודה ב-DB = השם שהקוד שולח. בלי הפתעות.

- **דוגמה:** קוד שולח `task_name` → עמודה ב-DB נקראת בדיוק `task_name`. לא `name`, לא `title`.

---

## עקרונות תהליך

### 6. לפני commit
- `npm run build` חייב לעבור נקי, ללא warnings/errors.
- אם המשימה נגעה בפיצ'ר UI - להציע למשתמש בדיקת עשן ידנית (3-5 צעדים ספציפיים).

### 7. commit message מפורט
פורמט: `type(scope): short description`

- **דוגמה רעה:** `fix bug`
- **דוגמה טובה:** `fix(quotes): persist custom unit selection across reloads`

ב-body של ה-commit (כשנדרש): מה הייתה הבעיה, מה התיקון, למה התיקון הזה ולא אחר.

### 8. שמירה על מה שעובד
לפני שינוי בקוד שמשרת כמה מקומות - לבדוק את כל המקומות.

- **דוגמה:** `setTaskStatus` callback משותף בין Planning ל-Dashboard. שינוי בו דורש לבדוק את שניהם.

---

## הקשר טכני

- **Hosting:** Vercel (auto-deploy מ-main).
- **DB:** Supabase (Postgres + RLS + service_role API key).
- **Workflow:** GitHub Codespaces → git push to main → Vercel auto-deploys.
- **משתמש עובד רק ב-Codespaces** (cloud), לא במחשב מקומי.
- **תקשורת:** עברית, קצרה ומעשית.

---

**עדכון אחרון:** 19 במאי 2026
