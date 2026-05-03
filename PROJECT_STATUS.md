# PROJECT_STATUS.md — בניין איתן
*Last updated: 2026-05-03*

---

## 1. כל הדפים הקיימים

### אתר ציבורי — דו-לשוני (EN + HE)

| URL | תיאור |
|-----|-------|
| `/` | Root — redirect to `/he` |
| `/en` | דף הבית אנגלית |
| `/he` | דף הבית עברית |
| `/en/about` | The Firm — about page EN |
| `/he/about` | המשרד — about page HE |
| `/en/expertise` | Expertise hub EN |
| `/he/expertise` | מאמרי מומחיות HE |
| `/en/expertise/[slug]` | Dynamic expertise article EN |
| `/he/expertise/[slug]` | מאמר מומחיות דינמי HE |
| `/en/expertise/after-handover` | After handover article |
| `/he/expertise/after-handover` | |
| `/en/expertise/behind-the-walls` | Behind the walls article |
| `/he/expertise/behind-the-walls` | |
| `/en/expertise/building-from-abroad` | Building from abroad article |
| `/he/expertise/building-from-abroad` | |
| `/en/expertise/how-to-avoid-renovation-mistakes` | |
| `/he/expertise/how-to-avoid-renovation-mistakes` | |
| `/en/expertise/reading-a-professional-quote` | |
| `/he/expertise/reading-a-professional-quote` | |
| `/en/faq` | FAQ EN |
| `/he/faq` | שאלות נפוצות HE |
| `/en/projects` | Projects gallery EN |
| `/he/projects` | גלריית פרויקטים HE |
| `/en/change-order` | Change order form EN |
| `/he/change-order` | טופס הזמנת שינוי HE |
| `/en/legal` | Legal / privacy EN |
| `/he/legal` | מדיניות פרטיות HE |
| `/en/preview` | Content preview (internal use) |
| `/he/preview` | תצוגה מקדימה (שימוש פנימי) |

### דפי נחיתה (Landing Pages)

| URL | תיאור |
|-----|-------|
| `/lp/jerusalem` | Landing page — ירושלים |
| `/lp/givat-zeev` | Landing page — גבעת זאב |
| `/lp/overseas` | Landing page — לקוחות מחו"ל |

### פורטל עובדים / מנהל שטח

| URL | תיאור |
|-----|-------|
| `/attendance` | Clock-in/out עובדים (language-neutral) |
| `/en/internal` | Internal portal EN |
| `/he/internal` | פורטל פנימי HE |
| `/en/internal/attendance` | נוכחות EN |
| `/he/internal/attendance` | נוכחות HE |
| `/he/internal/admin` | ניהול admin |
| `/he/internal/admin/dashboard` | Dashboard ניהולי |

### פאנל מנהל (Admin)

| URL | תיאור |
|-----|-------|
| `/admin` | כניסה לאדמין |
| `/admin/cockpit` | לוח בקרה ראשי — משימות, פרויקטים, דוחות |
| `/admin/executive` | תצוגת הנהלה — לבעלים בלבד |
| `/admin/health` | בדיקות תקינות מערכת |
| `/admin/hub` | Hub ניווט מנהל |

### דפים עונתיים / מיוחדים

| URL | תיאור |
|-----|-------|
| `/he/purim` | קמפיין פורים (seasonal) |
| `/he/passover-quiz` | חידון פסח (seasonal) |
| `/he/independence-quiz` | חידון יום עצמאות (seasonal) |
| `/he/voucher` | מחולל שוברים |

### כלים פנימיים (Internal Tools)

| URL | תיאור |
|-----|-------|
| `/internal/content-editor` | עורך תוכן CMS (translations, projects, articles, FAQs, testimonials) |
| `/internal/binyan-eitan` | Dashboard — בניין איתן |
| `/internal/prime-steel` | Dashboard — Prime Steel |
| `/internal/banner` | ניהול באנר |
| `/maintenance` | דף תחזוקה (fallback) |

### Math App (unrelated to construction — personal project)

| URL | תיאור |
|-----|-------|
| `/math-app` | Math app home |
| `/math-app/daily` | Daily exercises |
| `/math-app/junior` | Junior mode |
| `/math-app/junior/parent` | Junior parent view |
| `/math-app/senior` | Senior mode |
| `/math-app/parent` | Parent dashboard |

---

## 2. סטאק טכני מדויק

| טכנולוגיה | גרסה |
|-----------|------|
| **Next.js** | 14.2.3 (App Router) |
| **React** | ^18 |
| **TypeScript** | ^5 |
| **Tailwind CSS** | ^3.4.1 |
| **Framer Motion** | ^10.12.16 |
| **Lucide React** | latest |
| **@supabase/supabase-js** | ^2.99.2 |
| **@vercel/blob** | ^2.3.1 |
| **@vercel/kv** | ^1.0.0 |
| **PostCSS** | ^8 |
| **Autoprefixer** | ^10 |
| Node.js types | ^20 |

**Deployment:** Vercel (assumed)
**Database:** Supabase (PostgreSQL + RLS)
**Storage:** Vercel Blob (uploads), Cloudinary (gallery images)
**Email:** Resend API
**Image formats:** AVIF + WebP (next/image)
**i18n strategy:** Manual — `/en/` and `/he/` path segments, `useLang()` from `LangContext`

---

## 3. API Routes

### ציבורי

| Method | Route | תיאור |
|--------|-------|-------|
| POST | `/api/contact` | שליחת טופס צור קשר → Resend email |
| POST | `/api/change-order` | הגשת הזמנת שינוי |
| GET | `/api/gallery` | תמונות גלריה (Cloudinary) |
| GET | `/api/cloudinary-gallery` | Cloudinary gallery endpoint חלופי |
| GET | `/api/projects` | רשימת פרויקטים |
| GET | `/api/translations` | מחרוזות תרגום (מ-Supabase) |

### עובדים / קבלן

| Method | Route | תיאור |
|--------|-------|-------|
| POST | `/api/attendance` | צ'ק-אין/אאוט עובד |
| POST | `/api/foreman-auth` | אימות מנהל שטח |
| GET | `/api/worker/history` | היסטוריית נוכחות עובד |
| POST | `/api/worker/manual-entry` | רשומת נוכחות ידנית |

### Admin

| Method | Route | תיאור |
|--------|-------|-------|
| POST | `/api/admin-auth` | כניסת מנהל |
| GET | `/api/admin/whoami` | בדיקת session |
| GET/PUT | `/api/admin/settings` | הגדרות מערכת |
| GET/POST | `/api/admin/projects` | פרויקטים CRUD |
| GET/PUT/DELETE | `/api/admin/projects/[id]` | פרויקט ספציפי |
| GET/POST | `/api/admin/staff` | עובדים CRUD |
| GET/PUT/DELETE | `/api/admin/staff/[id]` | עובד ספציפי |
| GET/POST | `/api/admin/tasks` | משימות |
| GET/PUT/DELETE | `/api/admin/tasks/[id]` | משימה ספציפית |
| GET/POST | `/api/admin/milestones` | אבני דרך |
| GET/PUT/DELETE | `/api/admin/milestones/[id]` | |
| GET/POST | `/api/admin/materials` | חומרים |
| GET/POST | `/api/admin/income` | הכנסות |
| GET/POST | `/api/admin/daily-reports` | דוחות יומיים |
| GET/PUT/DELETE | `/api/admin/daily-reports/[id]` | |
| GET/POST | `/api/admin/weekly-plan` | תכנון שבועי |
| GET/PUT/DELETE | `/api/admin/weekly-plan/[id]` | |
| GET/POST | `/api/admin/attendance/today` | נוכחות היום |
| GET | `/api/admin/attendance/pending` | ממתינים לאישור |
| POST | `/api/admin/attendance/clock-out` | יציאה ידנית |
| GET/PUT/DELETE | `/api/admin/attendance/[id]` | רשומת נוכחות |
| GET | `/api/admin/attendance/report` | דוח נוכחות מלא |
| GET | `/api/admin/health` | בדיקות תקינות |
| GET | `/api/admin/health/test-attendance` | בדיקת מודול נוכחות |
| GET | `/api/admin/maintenance` | מצב תחזוקה |
| GET/POST | `/api/admin/backup` | גיבוי נתונים |

### Executive

| Method | Route | תיאור |
|--------|-------|-------|
| POST | `/api/executive/auth` | כניסת הנהלה |
| GET/POST | `/api/executive/items` | פריטי לוח הנהלה |
| PUT/DELETE | `/api/executive/items/[id]` | |
| GET/PUT | `/api/executive/canvas` | shared canvas / notepad |

### Holding / Internal

| Method | Route | תיאור |
|--------|-------|-------|
| POST | `/api/internal-auth` | אימות פנימי |
| GET/POST | `/api/holding/tasks` | משימות holding |
| PUT/DELETE | `/api/holding/tasks/[id]` | |
| GET | `/api/holding/companies` | רשימת חברות |
| POST | `/api/holding/upload` | העלאת קבצים |
| GET/POST | `/internal/api/tasks` | משימות פנימיות (legacy route) |

### Utilities

| Method | Route | תיאור |
|--------|-------|-------|
| POST | `/api/revalidate` | ISR revalidation |
| POST | `/api/seed` | seeding מסד נתונים (protected) |
| POST | `/api/upload` | העלאת קבצים — Vercel Blob |

---

## 4. Environment Variables

### מוגדרות (קיימות ב-.env)

| שם משתנה | שימוש |
|---------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (client-side) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob storage |
| `INTERNAL_STAFF_PIN` | PIN לפורטל עובדים |
| `NEXT_PUBLIC_FORMSPREE_FORM_ID` | טופס צור קשר — Formspree (backup) |
| `ATTENDANCE_WEBHOOK_URL` | Webhook להתראות נוכחות (WhatsApp/Telegram) |

### חסרות / לא מוגדרות עדיין

| שם משתנה | נדרש ל | עדיפות |
|---------|--------|--------|
| `SUPABASE_SERVICE_ROLE_KEY` | פעולות server-side ב-Supabase | 🔴 גבוהה |
| `SUPABASE_URL` | server-side Supabase client | 🔴 גבוהה |
| `ADMIN_PASSWORD` | כניסה לפאנל מנהל | 🔴 גבוהה |
| `RESEND_API_KEY` | שליחת מיילים מטופס יצירת קשר | 🔴 גבוהה |
| `CONTACT_TO_EMAIL` | כתובת יעד לפניות | 🔴 גבוהה |
| `CONTACT_FROM_EMAIL` | שולח במיילי צור קשר | 🟡 בינונית |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | גלריית תמונות | 🟡 בינונית |
| `CLOUDINARY_API_KEY` | upload/management Cloudinary | 🟡 בינונית |
| `CLOUDINARY_API_SECRET` | Cloudinary server-side | 🟡 בינונית |
| `NEXT_PUBLIC_INTERNAL_PIN` | PIN פורטל פנימי (client-side) | 🟡 בינונית |
| `SEED_SECRET` | הגנה על route `/api/seed` | 🟢 נמוכה |

---

## 5. תלויות עיקריות (Dependencies)

```json
{
  "next": "14.2.3",
  "react": "^18",
  "typescript": "^5",
  "tailwindcss": "^3.4.1",
  "framer-motion": "^10.12.16",
  "lucide-react": "latest",
  "@supabase/supabase-js": "^2.99.2",
  "@vercel/blob": "^2.3.1",
  "@vercel/kv": "^1.0.0"
}
```

**שירותים חיצוניים:**
- Supabase — database + auth + RLS
- Vercel Blob — file/image uploads
- Cloudinary — portfolio/gallery images
- Resend — transactional email
- Formspree — backup contact form

---

## 6. TODO / FIXME בקוד

**אין הערות TODO/FIXME מפורשות בקוד** — כל הפריטים הפתוחים מוחזקים בשיחה.

פריטים שזוהו מהקוד כ"חסרים":

1. **גלריית תמונות אמיתית** — PortfolioGallery משתמשת בנתיבי `/portfolio/project-0X.jpg`. תמונות אמיתיות טרם הועלו.
2. **Cloudinary לא מוגדר** — `/api/cloudinary-gallery` ו-`/api/gallery` ידרשו env vars של Cloudinary.
3. **Resend לא מוגדר** — `/api/contact` מחזיר שגיאה אם `RESEND_API_KEY` חסר.
4. **`/api/admin/maintenance`** — endpoint קיים, לא ברור אם ה-UI מחובר.
5. **`/api/seed`** — route לזריעת DB, מוגן ב-`SEED_SECRET`. לא להשאיר פתוח בפרודקשן.
6. **next.config**: `eslint: { ignoreDuringBuilds: true }` ו-`typescript: { ignoreBuildErrors: true }` — מוגדר כהסרת חסמי בנייה, לא כ-best practice לטווח ארוך.

---

## 7. מצב כללי

### ✅ גמור / Production-ready

- **דפי הבית** — EN + HE עם כל הסקציות (Hero, About, Expertise, Portfolio, Contact)
- **About Page** — EN + HE עם Founder Story, Philosophy, Engineering Excellence
- **Expertise Articles** — 5 מאמרים סטטיים + dynamic slug routing, EN + HE
- **FAQ Page** — EN + HE, מחובר ל-Supabase via Content Editor
- **Contact Form** — UI מוכן; *דורש RESEND_API_KEY להפעלה*
- **Change Order Form** — עם חתימה דיגיטלית + צילום מסמך
- **Landing Pages** — ירושלים / גבעת זאב / מחו"ל
- **Legal Pages** — EN + HE
- **Admin Cockpit** — ניהול משימות, פרויקטים, צוות, חומרים, הכנסות, דוחות
- **Admin Executive** — תצוגת הנהלה עם canvas משותף
- **Admin Health** — בדיקות תקינות env vars + DB
- **Attendance System** — clock-in/out עובדים, פאנל ניהול, דוחות שעות
- **Supabase RLS** — כל הטבלאות מאובטחות, אנונימי חסום
- **Rate Limiting** — auth routes מוגנות מ-brute force
- **Content Editor** — עורך CMS פנימי (translations, projects, articles, FAQs, testimonials)
- **Foreman Portal** — דיווח יומי + הוצאות + משימות
- **Weekly Planner** — תכנון שבועי לצוות
- **Math App** — standalone, production-ready (פרויקט נפרד)

### 🚧 חצי גמור / In Progress

- **Portfolio Gallery** — קומפוננטה מוכנה + lightbox, אך **תמונות אמיתיות חסרות** (6 placeholders)
- **Projects Page** — גלריית פרויקטים מורחבת, Cloudinary לא מחובר עם env vars
- **Email (Contact Form)** — קוד מוכן, חסר רק `RESEND_API_KEY` + `CONTACT_TO_EMAIL` ב-env
- **Cloudinary Integration** — API route מוכן, env vars לא מוגדרים

### ❌ לא התחלנו / לא מחובר

- **SEO / Sitemap** — קובץ `sitemap.ts` קיים, צריך לבדוק תוכן
- **Analytics** — אין Google Analytics / Plausible מחובר
- **WhatsApp Floating Button** — קומפוננטה `FloatingWhatsApp.tsx` קיימת, לא ברור אם מחוברת בכל הדפים
- **Testimonials** — קומפוננטה `Testimonials.tsx` קיימת, תוכן לא מאומת
- **Before/After Slider** — קומפוננטה קיימת (`BeforeAfterSlider.tsx`), לא ברור היכן משולבת
- **Google Tag Manager / Pixel** — לא מוגדר
- **Error Monitoring** (Sentry וכו') — לא מוגדר
