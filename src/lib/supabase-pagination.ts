/**
 * Paginated fetch — one source of truth for "get ALL rows".
 *
 * WHY: Supabase/PostgREST caps a single response at `max_rows` (1000 on this
 * project) and truncates **silently** — no error. Any query that pulls a whole
 * month of attendance across every worker therefore returned only the first
 * 1000 rows, so payroll under-counted hours and the monthly report went blank
 * from mid-month. This helper walks the result set in pages until a short page
 * proves the end, so callers get the complete set.
 *
 * CORRECTNESS RULES (all enforced/relied-on here):
 *  1. `makeQuery` MUST apply a STABLE, TOTAL order — end every query with a
 *     unique tiebreaker (`.order("id")`). Without it, rows sharing the sort key
 *     can reshuffle between pages → duplicates or GAPS (missing rows).
 *  2. A FULL page means "there may be more" — keep going. Stop ONLY on a short
 *     page (`rows.length < pageSize`). Never assume the first page is complete.
 *  3. On ANY page error → THROW. Never return a partial set silently: half the
 *     data is worse than none — a payslip missing hours still looks like a real
 *     number, and no one would know to distrust it.
 *
 * `pageSize` defaults to 1000 = the observed server cap. It must be <= the
 * server's `max_rows`, or a truncated full page would be mistaken for the end.
 * Leave it at the default unless the project's max_rows is raised.
 */
export async function fetchAllRows<T>(
  // A factory that returns a FRESH Supabase query builder each call (a builder
  // can't be re-awaited). It must already carry select + filters + a stable
  // `.order(...).order("id")`. Typed loose because call sites use varied
  // (and often `any`) builders; the row type comes from the caller's <T>.
  makeQuery: () => { range(from: number, to: number): PromiseLike<unknown> },
  pageSize = 1000,
): Promise<T[]> {
  const out: T[] = [];
  for (let start = 0; ; start += pageSize) {
    const res = (await makeQuery().range(start, start + pageSize - 1)) as {
      data: T[] | null;
      error: { message: string } | null;
    };
    if (res.error) {
      throw new Error(`fetchAllRows: page at offset ${start} failed: ${res.error.message}`);
    }
    const rows = res.data ?? [];
    out.push(...rows);
    if (rows.length < pageSize) break; // short page = last page
    // Defensive stop: a bug that keeps returning full pages must not loop forever.
    if (start >= 500_000) {
      throw new Error(`fetchAllRows: exceeded ${start + pageSize} rows — aborting (likely unstable order)`);
    }
  }
  return out;
}
