/** Parse a money value (string from a form input).
 *  Returns null for empty / non-numeric / negative input. Zero is allowed. */
export function parseMoney(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = parseFloat(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/** Parse a positive quantity (> 0). Returns null for empty / invalid / non-positive. */
export function parsePositive(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = parseFloat(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}
