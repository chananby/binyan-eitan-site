// In-memory rate limiter for auth routes.
// State resets on Vercel cold start — effective against rapid automated attacks
// within a warm serverless instance. Adequate for a private construction-company app.

interface Entry { count: number; resetAt: number; }

const store = new Map<string, Entry>();

const WINDOW_MS  = 15 * 60 * 1000; // 15 minutes
const DEFAULT_MAX_HITS = 5;        // tight default — fits unauthenticated auth routes

function pruneExpired() {
  const now = Date.now();
  for (const [k, v] of store) {
    if (now > v.resetAt) store.delete(k);
  }
}

/**
 * Check whether `key` (e.g. "IP:routeName" or "staff:<id>:routeName") has
 * exceeded the limit. Returns { allowed: true } or
 * { allowed: false, retryAfterSec: number }.
 *
 * `maxHits` defaults to 5 (tight, suits anonymous auth routes). Routes that
 * key on an authenticated identity — and may legitimately be hit many times
 * per session by the same actor — should pass a higher value (e.g. 15).
 */
export function checkRateLimit(
  key: string,
  maxHits: number = DEFAULT_MAX_HITS,
): { allowed: true } | { allowed: false; retryAfterSec: number } {
  pruneExpired();
  const now = Date.now();
  const entry = store.get(key) ?? { count: 0, resetAt: now + WINDOW_MS };

  if (now > entry.resetAt) {
    entry.count  = 0;
    entry.resetAt = now + WINDOW_MS;
  }

  entry.count += 1;
  store.set(key, entry);

  if (entry.count > maxHits) {
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
