/**
 * catalog-items-diff — pure helpers around the "fixed items" catalog.
 *
 * Two responsibilities:
 *   - normalizeName: collapse trivial typing differences ("  בטון  " vs
 *     "בטון", "Concrete" vs "concrete") into a single canonical form
 *     used everywhere a name needs to be compared (DB unique index,
 *     client autocomplete, server diff).
 *   - findNewItems: given the items in a quote and the catalog, return
 *     the items worth offering for adoption — real name, positive price,
 *     not already in the catalog, and not a duplicate of another
 *     freshly-typed line in the same quote.
 *
 * Pure JS only. No DB, no fetch — the API route and the client both
 * import the same module so the "what counts as new" rule lives in one
 * place, and the test suite catches drift before either side ships.
 */

export interface QuoteItemInput {
  name: string | null | undefined;
  /** camelCase to match the quote-generator's JSONB shape (item.unitPrice). */
  unitPrice?: number | null;
  /** Carried through unchanged — useful when the route adopts the item
   *  and needs to preserve the unit (e.g. "מ"ר") and the price. */
  unit?: string | null;
}

export interface CatalogItemRef {
  name: string;
}

/**
 * Canonical form used for matching: trim, collapse runs of whitespace to
 * a single space, then lowercase. Mirrors the DB unique index, which is
 * partial on `LOWER(TRIM(name)) WHERE deleted_at IS NULL`. The collapse
 * step protects against double-space typing — the index alone wouldn't
 * catch "בטון  יציקה" vs "בטון יציקה" — so we do it here on both sides.
 */
export function normalizeName(s: string | null | undefined): string {
  if (!s) return "";
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Returns the subset of `quoteItems` that should be offered to the user
 * for catalog adoption. Filters applied (in order):
 *   1. Name must normalize to something non-empty.
 *   2. unitPrice must be a positive number — items priced 0 (or null)
 *      are placeholders, not catalog material.
 *   3. The normalized name must not already exist in `catalog`.
 *   4. The same normalized name can be offered at most once even if the
 *      user typed it twice in the quote — both lines map to the same
 *      catalog row, so we offer the first occurrence.
 *
 * Item ordering matches input order so the dialog feels predictable.
 */
export function findNewItems<T extends QuoteItemInput>(
  quoteItems: T[],
  catalog: CatalogItemRef[],
): T[] {
  const inCatalog = new Set<string>();
  for (const c of catalog) inCatalog.add(normalizeName(c.name));

  const offered = new Set<string>();
  const out: T[] = [];
  for (const item of quoteItems) {
    const key = normalizeName(item.name);
    if (!key) continue;                                       // (1) empty name
    if (!(typeof item.unitPrice === "number" && item.unitPrice > 0)) continue; // (2) no positive price
    if (inCatalog.has(key)) continue;                         // (3) already in catalog
    if (offered.has(key)) continue;                           // (4) deduped within the quote
    offered.add(key);
    out.push(item);
  }
  return out;
}
