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

// ── UI route discovery ────────────────────────────────────────────────────────

const UI_ROOTS: { dir: string; category: string }[] = [
  { dir: join(APP, "admin"),              category: "Admin" },
  { dir: join(APP, "he", "internal"),     category: "Internal Portal" },
  { dir: join(APP, "en", "internal"),     category: "Internal Portal" },
  { dir: join(APP, "internal"),           category: "Internal Tools" },
];

export function discoverUIRoutes(): UIRoute[] {
  const routes: UIRoute[] = [];
  for (const { dir, category } of UI_ROOTS) {
    for (const pagePath of collectFiles(dir, "page.tsx")) {
      const url = toUrl(pagePath);
      if (url.includes("[")) continue; // skip dynamic [slug] routes
      const pageDir = pagePath.replace(/\/page\.tsx$/, "");
      const segments = pageDir.split("/");
      const dirName = segments[segments.length - 1] || "page";
      const label = extractTitleForDir(pageDir) ?? dirToLabel(dirName);
      routes.push({ type: "ui", url, label, category });
    }
  }
  return routes.sort((a, b) => a.url.localeCompare(b.url));
}

// ── API route discovery ───────────────────────────────────────────────────────

const API_ROOTS: { dir: string; category: string }[] = [
  { dir: join(APP, "api", "admin"),        category: "Admin API" },
  { dir: join(APP, "api", "executive"),    category: "Executive API" },
  { dir: join(APP, "api", "holding"),      category: "Holding API" },
  { dir: join(APP, "api", "worker"),       category: "Worker API" },
  { dir: join(APP, "api", "foreman-auth"), category: "Worker API" },
  { dir: join(APP, "api", "attendance"),   category: "Worker API" },
  { dir: join(APP, "api", "internal-auth"),category: "Internal API" },
  { dir: join(APP, "api", "admin-auth"),   category: "Internal API" },
  { dir: join(APP, "api", "revalidate"),   category: "Utilities API" },
  { dir: join(APP, "api", "seed"),         category: "Utilities API" },
  { dir: join(APP, "api", "upload"),       category: "Utilities API" },
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
