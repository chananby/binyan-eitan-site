import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

export interface UIRoute {
  type: "ui";
  url: string;
  label: string;
  category: string;
}
export interface APIRoute {
  type: "api";
  url: string;
  label: string;
  category: string;
  methods: string[];
}
export type InternalRoute = UIRoute | APIRoute;

const APP = join(process.cwd(), "src", "app");

function collectFiles(dir: string, filename: string): string[] {
  const found: string[] = [];
  if (!existsSync(dir)) return found;
  const scan = (d: string) => {
    try {
      for (const entry of readdirSync(d)) {
        const full = join(d, entry);
        try {
          if (statSync(full).isDirectory()) scan(full);
          else if (entry === filename) found.push(full);
        } catch { /* skip unreadable */ }
      }
    } catch { /* skip unreadable dir */ }
  };
  scan(dir);
  return found;
}

// Normalize abs path → URL string (forward slashes, strip /page.tsx or /route.ts)
function toUrl(absPath: string): string {
  return absPath
    .replace(APP, "")
    .replace(/\\/g, "/")
    .replace(/\/(page\.tsx|route\.ts)$/, "");
}

// Try to extract the page title from a .tsx file — checks page.tsx then layout.tsx
function extractTitle(file: string): string | null {
  try {
    const src = readFileSync(file, "utf-8");
    const m = src.match(/title:\s*["'`]([^"'`\n]+)["'`]/);
    if (!m) return null;
    return m[1].trim().split(" | ")[0].split(" — ")[0].trim();
  } catch { return null; }
}

function extractTitleForDir(dir: string): string | null {
  return extractTitle(join(dir, "page.tsx")) ?? extractTitle(join(dir, "layout.tsx"));
}

function extractMethods(routeFile: string): string[] {
  try {
    const src = readFileSync(routeFile, "utf-8");
    return ["GET", "POST", "PUT", "DELETE", "PATCH"].filter(m =>
      new RegExp(`export\\s+(?:async\\s+)?function\\s+${m}\\b`).test(src)
    );
  } catch { return []; }
}

function dirToLabel(name: string): string {
  return name.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

const URL_LABEL_OVERRIDES: Record<string, string> = {
  // ── Admin / internal (existing) ──────────────────────────────────────────
  "/admin":                          "פורטל ניהול",
  "/admin/health":                   "בריאות מערכת",
  "/admin/hub":                      "מרכז שליטה",
  "/admin/quotes":                   "מחולל הצעות מחיר",
  "/admin/quotes/list":              "רשימת הצעות מחיר",
  "/en/internal":                    "פורטל עובדים (EN)",
  "/he/internal":                    "פורטל עובדים",
  "/he/internal/attendance":         "שעון נוכחות",
  "/he/internal/admin":              "ניהול פרויקטים",
  "/he/internal/admin/dashboard":    "לוח בקרה",
  "/internal/banner":                "באנר להדפסה",
  "/internal/content-editor":        "עורך תוכן",

  // ── Operational tools ────────────────────────────────────────────────────
  "/attendance":                     "שעון נוכחות (ציבורי)",

  // ── Public site — Hebrew ─────────────────────────────────────────────────
  "/he":                             "דף בית",
  "/he/about":                       "אודות",
  "/he/change-order":                "טופס שינויים",
  "/he/projects":                    "פרויקטים",
  "/he/expertise":                   "תחומי מומחיות",
  "/he/expertise/after-handover":              "מומחיות — אחרי המסירה",
  "/he/expertise/behind-the-walls":            "מומחיות — מאחורי הקירות",
  "/he/expertise/building-from-abroad":        "מומחיות — בנייה מחו\"ל",
  "/he/expertise/how-to-avoid-renovation-mistakes": "מומחיות — הימנעות מטעויות שיפוץ",
  "/he/expertise/reading-a-professional-quote": "מומחיות — קריאת הצעת מחיר",
  "/he/faq":                         "שאלות נפוצות",
  "/he/voucher":                     "שובר מתנה",
  "/he/quizzes":                     "חידונים",
  "/he/quizzes/independence":        "חידון יום העצמאות",
  "/he/quizzes/passover":            "חידון פסח",
  "/he/quizzes/purim":               "חידון פורים",

  // ── Public site — English ────────────────────────────────────────────────
  "/en":                             "דף בית (EN)",
  "/en/about":                       "אודות (EN)",
  "/en/change-order":                "טופס שינויים (EN)",
  "/en/projects":                    "פרויקטים (EN)",
  "/en/expertise":                   "תחומי מומחיות (EN)",
  "/en/expertise/after-handover":              "מומחיות — אחרי המסירה (EN)",
  "/en/expertise/behind-the-walls":            "מומחיות — מאחורי הקירות (EN)",
  "/en/expertise/building-from-abroad":        "מומחיות — בנייה מחו\"ל (EN)",
  "/en/expertise/how-to-avoid-renovation-mistakes": "מומחיות — הימנעות מטעויות שיפוץ (EN)",
  "/en/expertise/reading-a-professional-quote": "מומחיות — קריאת הצעת מחיר (EN)",
  "/en/faq":                         "שאלות נפוצות (EN)",

  // ── Landing pages ────────────────────────────────────────────────────────
  "/lp/givat-zeev":                  "דף נחיתה — גבעת זאב",
  "/lp/jerusalem":                   "דף נחיתה — ירושלים",
  "/lp/overseas":                    "דף נחיתה — חו\"ל",
};

// ── UI route discovery ────────────────────────────────────────────────────────

// Order matters: more specific roots (admin, *internal) come FIRST so that
// when the broad public roots (he, en) recurse over the same files, the
// per-URL dedup in discoverUIRoutes keeps the specific category/label. The
// broad he/en roots therefore only contribute the *public* pages — their
// /internal subtrees are already claimed above.
const UI_ROOTS: { dir: string; category: string }[] = [
  { dir: join(APP, "admin"),              category: "ניהול" },
  { dir: join(APP, "he", "internal"),     category: "פורטל פנימי" },
  { dir: join(APP, "en", "internal"),     category: "פורטל פנימי" },
  { dir: join(APP, "internal"),           category: "כלים פנימיים" },
  { dir: join(APP, "he"),                 category: "אתר ציבורי" },
  { dir: join(APP, "en"),                 category: "אתר ציבורי (EN)" },
  { dir: join(APP, "lp"),                 category: "דפי נחיתה" },
  { dir: join(APP, "attendance"),         category: "כלים תפעוליים" },
];

const EXCLUDED_UI_URLS = new Set([
  // archived / placeholder (existing)
  "/admin/cockpit",              // archived — redirects to hub
  "/admin/executive",            // archived — redirects to hub
  "/internal/binyan-eitan",      // placeholder Kanban, no DB data
  "/internal/prime-steel",       // placeholder Kanban, no DB data
  "/en/internal/attendance",     // identical to /he/internal/attendance
  // auth utility pages — not hub destinations
  "/admin/forgot-password",
  "/admin/reset-password",
  // legal / maintenance — not operational, no value in the hub
  "/maintenance",
  "/he/legal",
  "/en/legal",
]);

export function discoverUIRoutes(): UIRoute[] {
  const routes: UIRoute[] = [];
  const seen = new Set<string>(); // dedup by URL — first (most specific) root wins
  for (const { dir, category } of UI_ROOTS) {
    for (const pagePath of collectFiles(dir, "page.tsx")) {
      const url = toUrl(pagePath);
      if (url.includes("[")) continue; // skip dynamic [slug] routes
      if (EXCLUDED_UI_URLS.has(url)) continue;
      if (seen.has(url)) continue;     // already claimed by an earlier root (e.g. he/internal vs he)
      seen.add(url);
      const pageDir = pagePath.replace(/\/page\.tsx$/, "");
      const segments = pageDir.split("/");
      const dirName = segments[segments.length - 1] || "page";
      const label = URL_LABEL_OVERRIDES[url] ?? extractTitleForDir(pageDir) ?? dirToLabel(dirName);
      routes.push({ type: "ui", url, label, category });
    }
  }
  return routes.sort((a, b) => a.url.localeCompare(b.url));
}

// ── API route discovery ───────────────────────────────────────────────────────

const API_ROOTS: { dir: string; category: string }[] = [
  { dir: join(APP, "api", "admin"),        category: "ניהול" },
  { dir: join(APP, "api", "executive"),    category: "הנהלה" },
  { dir: join(APP, "api", "holding"),      category: "חברת האם" },
  { dir: join(APP, "api", "worker"),       category: "עובדים" },
  { dir: join(APP, "api", "foreman-auth"), category: "עובדים" },
  { dir: join(APP, "api", "attendance"),   category: "עובדים" },
  { dir: join(APP, "api", "internal-auth"),category: "פנימי" },
  { dir: join(APP, "api", "admin-auth"),   category: "פנימי" },
  { dir: join(APP, "api", "revalidate"),   category: "כלים" },
  { dir: join(APP, "api", "seed"),         category: "כלים" },
  { dir: join(APP, "api", "upload"),       category: "כלים" },
];

export function discoverAPIRoutes(): APIRoute[] {
  const routes: APIRoute[] = [];
  for (const { dir, category } of API_ROOTS) {
    for (const routePath of collectFiles(dir, "route.ts")) {
      const url = toUrl(routePath);
      const segments = url.split("/").filter(Boolean);
      const last = segments[segments.length - 1] ?? "route";
      const parentDir = segments[segments.length - 2] ?? last;
      const label = last.startsWith("[")
        ? dirToLabel(parentDir) + " [id]"
        : dirToLabel(last);
      const methods = extractMethods(routePath);
      routes.push({ type: "api", url, label, category, methods });
    }
  }
  return routes.sort((a, b) => a.url.localeCompare(b.url));
}
