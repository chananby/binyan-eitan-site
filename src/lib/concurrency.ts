// Small async utility: run an async fn over a list with a bounded number of
// promises in flight at once. Extracted so any "fan out but don't hammer the
// backend" spot (the accountant export's per-file storage downloads first)
// can share one tested implementation.

/**
 * Map `items` through `fn` with at most `limit` concurrent executions.
 * Results are returned in the SAME order as `items` (input order, not
 * completion order).
 *
 * A rejecting `fn` rejects the whole call (like Promise.all). Callers that must
 * tolerate a single item failing should catch inside `fn` and return a
 * sentinel — e.g. the export returns `null` for a file that failed to download
 * so the rest of the package still builds.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const n = items.length;
  const results = new Array<R>(n);
  if (n === 0) return results;
  const cap = Math.max(1, Math.min(Math.floor(limit) || 1, n));

  let next = 0;
  async function worker(): Promise<void> {
    while (true) {
      const i = next++;
      if (i >= n) return;
      results[i] = await fn(items[i], i);
    }
  }

  await Promise.all(Array.from({ length: cap }, () => worker()));
  return results;
}
