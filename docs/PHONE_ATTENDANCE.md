# החתמת נוכחות טלפונית (Phone Attendance / IVR)

מסמך תחזוקה למערכת ה-IVR הקולית של בניין איתן. נכון ל-2026-05-25 (סוף שלב 2).

---

## 1. סקירה

מערכת **גיבוי** להחתמת נוכחות לעובדים שאין להם גישה ל-portal האינטרנטי, או כשה-GPS / המכשיר לא זמינים. עובד מחייג למספר Twilio של החברה, מזוהה אוטומטית לפי caller ID, בוחר כניסה/יציאה ואת האתר דרך לחיצות במקלדת (DTMF), ומקבל אישור קולי.

**עיקרון חשוב:** המסלול הטלפוני לא דורס את ההחתמה הרגילה דרך הפורטל (web + GPS). הוא חי במקביל. רשומות שמגיעות דרך טלפון מסומנות ב-`source='phone-call'` כדי שהאדמין ידע מיד שאין להן אימות מיקום.

**שפת ה-IVR:** עברית בלבד, בקול Google.he-IL-Standard-A.

---

## 2. ארכיטקטורה

### זרימת השיחה

```
            עובד מחייג
                │
                ▼
   Twilio (מספר החברה)
                │  webhook POST + X-Twilio-Signature
                ▼
   ┌────────────────────────────────────────────┐
   │ /api/twilio/voice                          │
   │  ─ אימות חתימת Twilio                       │
   │  ─ caller-ID lookup ב-staff (phoneVariants) │
   │  ─ אם לא מזוהה: "המספר לא מזוהה" + Hangup   │
   │  ─ אם מזוהה: <Gather> "הקש 1/2"            │
   └────────────────────────────────────────────┘
                │ DTMF 1 או 2
                ▼
   ┌────────────────────────────────────────────┐
   │ /api/twilio/voice/action?staffId=X         │
   │  ─ אימות חתימה                              │
   │  ─ duplicate guard (כניסה/יציאה כפולה היום) │
   │  ─ fetch projects WHERE status='active'    │
   │  ─ 1 אתר → insert + אישור + Hangup         │
   │  ─ ≥2 אתרים → <Gather> רשימת אתרים          │
   └────────────────────────────────────────────┘
                │ DTMF 1..N
                ▼
   ┌────────────────────────────────────────────┐
   │ /api/twilio/voice/project                  │
   │   ?staffId=X&action=in&projectIds=A,B,C    │
   │  ─ אימות חתימה                              │
   │  ─ ולידציה: Digits בטווח, פרויקט עדיין פעיל │
   │  ─ insertPhoneAttendance(source='phone-call│
   │  ─ אישור + Hangup                          │
   └────────────────────────────────────────────┘
                │
                ▼
        attendance row ב-Supabase
```

### State בין שלבי שיחה

Twilio stateless — לא שומר שום context בין webhook calls. ה-state עובר דרך **query string** ב-`action` URL של ה-`<Gather>`:

* `staffId` — UUID של המתקשר (נקבע ב-`/voice`)
* `action` — `"in"` או `"out"` (נקבע ב-`/voice/action` אחרי DTMF)
* `projectIds` — רשימת UUIDs מופרדת בפסיקים, בסדר שהוקראה ב-prompt (נקבע ב-`/voice/action`)

**אבטחה:** ה-URL כולו (path + query) חלק מ-`X-Twilio-Signature`. כל עוד `TWILIO_AUTH_TOKEN` מוגדר ב-Vercel, לא ניתן לזייף בקשה עם staffId אחר.

### זיהוי לפי caller ID

* `From` מ-Twilio מגיע ב-E.164 (`+972...`)
* `normalizePhone` הופך ל-`0...` 10-ספרות
* `phoneVariants` מייצר 4 פורמטים אפשריים (`058X`, `58X`, `972...`, `+972...`)
* lookup ב-`staff` עם `.in("phone", variants).is("deleted_at", null)`

### Duplicate guard

* בודק רשומה קיימת עם אותו `staff_id` + `action` ב-24 שעות אחרונות (בשעון ישראל, מאפס לאפס)
* אם נמצאה → "כבר רשומה [כניסה/יציאה] היום בשעה HH:MM. להתראות." + Hangup
* **הרחבה לעומת המסלול web:** ה-web חוסם רק כניסה כפולה. הטלפון חוסם **גם** יציאה כפולה — בקשת המשתמש, כי המתקשר לא רואה את היומן.

---

## 3. קבצים מעורבים

### Backend

| קובץ | תפקיד |
|---|---|
| [src/lib/twilio.ts](../src/lib/twilio.ts) | Helpers משותפים: `twimlResponse`, `say`, `gatherDigits`, `escapeXml`, `verifyTwilioSignature`, `readVerifiedForm`, `israelHHMM`, `israelTodayYMD`, `insertPhoneAttendance`. כל מה ש-3 ה-routes משתפים. |
| [src/app/api/twilio/voice/route.ts](../src/app/api/twilio/voice/route.ts) | נקודת כניסה לכל שיחה. מזהה לפי caller-ID, מציע IN/OUT. |
| [src/app/api/twilio/voice/action/route.ts](../src/app/api/twilio/voice/action/route.ts) | מקבל DTMF של 1/2, מטפל ב-duplicate guard, שולף פרויקטים, מקצר במקרה של אתר יחיד. |
| [src/app/api/twilio/voice/project/route.ts](../src/app/api/twilio/voice/project/route.ts) | מקבל DTMF של מספר האתר, מבצע insert עם `source='phone-call'`. |

### Frontend (admin)

| קובץ | תפקיד |
|---|---|
| [src/app/admin/_components/tabs/AttendanceTab.tsx](../src/app/admin/_components/tabs/AttendanceTab.tsx) | קומפוננטה `PhoneCallChip` — תווית כתומה "ללא אימות מיקום" שמופיעה ליד רשומות עם `source='phone-call'` בכל 3 הפאנלים (יומן היום, ממתינות לאישור, רשומות 7 ימים). |
| [src/app/api/admin/attendance/today/route.ts](../src/app/api/admin/attendance/today/route.ts) | מחזיר `source` ב-SELECT (כדי שה-chip יקבל ערך). |
| [src/app/api/admin/attendance/recent/route.ts](../src/app/api/admin/attendance/recent/route.ts) | אותו דבר. |
| [src/app/api/admin/attendance/pending/route.ts](../src/app/api/admin/attendance/pending/route.ts) | אותו דבר. |

### DB

| migration | תוכן |
|---|---|
| [supabase/migrations/20260525_attendance_source.sql](../supabase/migrations/20260525_attendance_source.sql) | מוסיף עמודה `attendance.source TEXT NOT NULL DEFAULT 'web'`. ערכים בשימוש: `'web'`, `'phone-call'`, `'manual'`. אין constraint כדי לאפשר ערכים נוספים בעתיד. רץ ידנית ב-Supabase Dashboard (כבר רץ). |

### בלי שינויים

* לוגיקת ההחתמה הקיימת ב-`/api/attendance` (web + GPS) — לא נגענו.
* חישובי שכר ודוחות — לא נגענו.
* מנגנון normalizePhone / phoneVariants — לא נגענו.

---

## 4. הגדרות Twilio + Vercel

### Twilio Console

**Phone Numbers → Manage → Active Numbers → [המספר] → Voice Configuration:**

| הגדרה | ערך |
|---|---|
| A call comes in | Webhook |
| URL | `https://binyaneitan.com/api/twilio/voice` |
| HTTP Method | `HTTP POST` |

זה הכל. שני ה-endpoints הנוספים (`/action`, `/project`) נקראים מ-action URL של `<Gather>` שמוחזר ב-TwiML — לא צריך להגדיר אותם בנפרד.

### Vercel — Environment Variables

| משתנה | חובה? | תיאור |
|---|---|---|
| `TWILIO_AUTH_TOKEN` | חובה לפרודקשן | Twilio Console → Account → API keys & tokens → Auth Token. משמש לאימות `X-Twilio-Signature`. אם לא מוגדר — ה-endpoints יקבלו בקשות לא חתומות עם warning ברורה ב-logs (מצב dev). |
| `SUPABASE_URL` (או `NEXT_PUBLIC_SUPABASE_URL`) | חובה | קיים כבר. |
| `SUPABASE_SERVICE_ROLE_KEY` | חובה | קיים כבר. נדרש ל-insert + lookup. |

---

## 5. מצב נוכחי (2026-05-25)

### עובד

* כל לוגיקת ה-IVR — בנויה, deployed, ועברה curl smoke tests מקיף (זיהוי, duplicate, picker, insert).
* בדיקה חיה ראשונה — בוצעה עם **מספר אמריקאי trial** של Twilio (יוצא מארה"ב, מהדהד באקסס לעובד שמספרו נוסף זמנית). השיחה התחברה, ה-IVR קרא הכל בעברית, הקשות עבדו, וה-row נכתב.
* `TWILIO_AUTH_TOKEN` מוגדר ב-Vercel — אימות חתימה פעיל בפרודקשן.

### לא הושלם

**מספר ישראלי תקוע באימות זהות מול Twilio.** Twilio דורש Identity Verification לחשבונות שרוצים לרכוש מספר ישראלי (חוקי 077). הוגש **טיקט #27192058** למחלקת התמיכה. המספר Trial האמריקאי עובד אבל לא מתאים לעובדים בארץ (חיוג בינלאומי יקר, אין שיתוף "מספר ישראלי מוכר").

---

## 6. השלמה לפרודקשן

צעדים שנותרו ברגע שאישור הזהות מ-Twilio יחזור:

1. **שדרוג חשבון Twilio מ-Trial ל-Pay-as-you-go**
   * Console → Billing → Upgrade
   * שיטת תשלום: כרטיס אשראי על שם החברה
   * עלות צפויה: ~$1-2 לחודש למספר + מספר סנט לכל שיחה

2. **רכישת מספר ישראלי**
   * Phone Numbers → Buy a Number
   * Country: Israel
   * Type: Local (077) — עדיף, מספרים אלה זוהים על ידי עובדים כקווי עסקים
   * עלות: ~$1/חודש למספר עצמו

3. **הצבעת המספר על אותו webhook**
   * Phone Numbers → Manage → [המספר החדש] → Voice Configuration
   * URL: `https://binyaneitan.com/api/twilio/voice`
   * Method: `HTTP POST`
   * **שום שינוי בקוד נדרש** — אותו endpoint מטפל בכל מספר שמצביע אליו.

4. **בדיקה חיה**
   * חייג מטלפון של עובד אמיתי
   * וודא: זיהוי לפי caller ID, IN/OUT prompt, project picker (4 אתרים פעילים כרגע), אישור עברי, רישום ב-attendance עם `source='phone-call'`
   * וודא שהtchip "ללא אימות מיקום" מופיע ב-AttendanceTab באדמין

5. **לטרל המספר ה-Trial האמריקאי** (אופציונלי) — אפשר להשאיר לצורך בדיקות עתידיות בלי לשלם נוסף.

---

## 7. הערות תחזוקה

### קול ה-TTS

כרגע: **Google.he-IL-Standard-A** (נשי, סטנדרטי, חינמי).

**לשדרוג איכות** (אופציונלי):
1. Twilio Console → Voice → Marketplace → Add-ons → "Amazon Polly Neural"
2. הפעל את ה-add-on על ה-Voice product
3. ב-[src/app/api/twilio/voice/route.ts](../src/app/api/twilio/voice/route.ts), בפונקציית `say` ב-[src/lib/twilio.ts](../src/lib/twilio.ts), החלף `Google.he-IL-Standard-A` ב-`Polly.Carmit-Neural`
4. הערה ארוכה בקוד מתעדת את ההיסטוריה והאלטרנטיבות.

**חשוב:** לא לנסות `Polly.Carmit` הסטנדרטי — AWS הוציאה אותו משירות, Twilio זורקת error 13520 "Say: Invalid text" בלי הסבר ברור.

### גבול 9 פרויקטים פעילים

DTMF תומך בספרה אחת בלבד. אם יהיו 10+ פרויקטים פעילים בו-זמנית, ה-IVR יציע רק את **9 הראשונים אלפביתית**. כרגע יש 4. אם מספר הפרויקטים הפעילים גדל משמעותית, להוסיף לוגיקת "הקש שלוש ספרות..." או לסנן לפי foreman/site assignment.

### duplicate guard

* חוסם **גם** כניסה כפולה **וגם** יציאה כפולה באותו יום (24 שעות בשעון ישראל)
* החלון: `created_at >= israelDayStartISO(today)` — מאפס לאפס שעון מקומי
* ההודעה כוללת את שעת הרשומה הקודמת ("בשעה 08:47") — נגזרת מ-`clock_at`

### timestamp_label

רשומות שנוצרו דרך IVR שומרות `timestamp_label = "HH:MM"` (שעון ישראל). זה בניגוד לחלק מרשומות web ישנות שמכילות פורמט מעורבב ("DD.MM.YYYY, HH:MM"). תצוגת האדמין גוזרת את השעה מ-`clock_at` (תמיד אמין) דרך `attendanceTimeHHMM` / `attendanceDayTimeShort` ב-[src/lib/attendance-time.ts](../src/lib/attendance-time.ts), כך שהפורמט אחיד בכל הפאנלים.

---

## 8. בדיקה ידנית עתידית

**הוסף עובד בדיקה זמני** (כשהמספר הישראלי יהיה זמין):

1. WorkersTab באדמין → "הוסף עובד" → שם: "בדיקה", phone: המספר שתחייגי ממנו, active: true
2. חייג למספר Twilio
3. עבור את הזרימה: IN/OUT → בחר אתר → קבל אישור
4. בדוק שיש chip "ללא אימות מיקום" באדמין → AttendanceTab → יומן היום
5. בדוק שהשיחה לא יוצרת רשומה כפולה (חייג שוב, וודא ש"כבר רשומה" משמיע)

**ניקוי אחרי בדיקה:**

```sql
-- מחק רשומות בדיקה (רק phone-call, רק staff_id ספציפי)
DELETE FROM attendance
WHERE staff_id = '<test-staff-id>'
  AND source = 'phone-call';

-- השבת/מחק את עובד הבדיקה
UPDATE staff SET active = false WHERE id = '<test-staff-id>';
-- או soft-delete: UPDATE staff SET deleted_at = now() WHERE id = '<test-staff-id>';
```

**להריץ ב-Supabase Dashboard → SQL Editor.**

---

## 9. הפניות

* Twilio Voice Webhooks: <https://www.twilio.com/docs/voice/twiml>
* Twilio TTS voice list: <https://www.twilio.com/docs/voice/twiml/say/text-speech>
* Twilio signature validation: <https://www.twilio.com/docs/usage/security#validating-requests>
* Project conventions: [DEVELOPMENT_PRINCIPLES.md](../DEVELOPMENT_PRINCIPLES.md)
