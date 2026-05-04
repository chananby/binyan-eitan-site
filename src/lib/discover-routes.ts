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
  "/admin":                          "כניסת ניהול",
  "/admin/health":                   "בריאות מערכת",
  "/admin/hub":                      "מרכז שליטה",
  "/en/internal":                    "פורטל צוות",
  "/en/internal/attendance":         "שעון נוכחות",
  "/internal/banner":                "מעצב באנר להדפסה",
  "/internal/binyan-eitan":          "בניין איתן — דשבורד",
  "/internal/content-editor":        "עורך תוכן",
  "/internal/prime-steel":           "Prime Steel — דשבורד",
};

// ── UI route discovery ────────────────────────────────────────────────────────

const UI_ROOTS: { dir: string; category: string }[] = [
  { dir: join(APP, "admin"),              category: "ניהול" },
  { dir: join(APP, "he", "internal"),     category: "פורטל פנימי" },
  { dir: join(APP, "en", "internal"),     category: "פורטל פנימי" },
  { dir: join(APP, "internal"),           category: "כלים פנימיים" },
];

const EXCLUDED_UI_URLS = new Set([
  "/admin/cockpit",           // archived — redirects to hub
  "/admin/executive",         // archived — redirects to hub
  "/internal/binyan-eitan",   // placeholder Kanban, no DB data
  "/internal/prime-steel",    // placeholder Kanban, no DB data
]);

export function discoverUIRoutes(): UIRoute[] {
  const routes: UIRoute[] = [];
  for (const { dir, category } of UI_ROOTS) {
    for (const pagePath of collectFiles(dir, "page.tsx")) {
      const url = toUrl(pagePath);
      if (url.includes("[")) continue; // skip dynamic [slug] routes
      if (EXCLUDED_UI_URLS.has(url)) continue;
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
