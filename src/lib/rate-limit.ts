// In-memory rate limiter for auth routes.
// State resets on Vercel cold start — effective against rapid automated attacks
// within a warm serverless instance. Adequate for a private construction-company app.

interface Entry { count: number; resetAt: number; }

const store = new Map<string, Entry>();

const WINDOW_MS  = 15 * 60 * 1000; // 15 minutes
const MAX_HITS   = 5;               // attempts per window per key

function pruneExpired() {
  const now = Date.now();
  for (const [k, v] of store) {
    if (now > v.resetAt) store.delete(k);
  }
}

/**
 * Check whether `key` (e.g. "IP:routeName") has exceeded the limit.
 * Returns { allowed: true } or { allowed: false, retryAfterSec: number }.
 */
export function checkRateLimit(key: string): { allowed: true } | { allowed: false; retryAfterSec: number } {
  pruneExpired();
  const now = Date.now();
  const entry = store.get(key) ?? { count: 0, resetAt: now + WINDOW_MS };

  if (now > entry.resetAt) {
    entry.count  = 0;
    entry.resetAt = now + WINDOW_MS;
  }

  entry.count += 1;
  store.set(key, entry);

  if (entry.count > MAX_HITS) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfterSec };
  }
  return { allowed: true };
}

/** Extract the best available client IP from Next.js request headers. */
export function clientIp(req: { headers: { get(name: string): string | null } }): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}
