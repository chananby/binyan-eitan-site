// Pure classification guards for extracted document fields. Defence-in-depth
// behind the AI prompt: even if the model returns income/expense for a
// non-cash document (a quote describing a future amount is a classic trap),
// the direction is forced to "none" here. Kept pure + standalone so it's
// unit-testable without the extraction module or the Anthropic SDK.

// Document types that never represent an actual money movement — their
// direction is always "none" regardless of what the model returned.
export const NON_CASH_DOC_TYPES = new Set(["quote", "delivery_note"]);

/**
 * Final direction for an extracted document: non-cash doc types are pinned to
 * "none"; everything else keeps the model's value (income | expense | none |
 * null). doc_type is the authority here — a quote is never income/expense.
 */
export function resolveDirection(docType: string | null, direction: string | null): string | null {
  if (docType && NON_CASH_DOC_TYPES.has(docType)) return "none";
  return direction;
}

// ── Currency / shekel value ─────────────────────────────────────────────────
// All money rollups (budget-actual, month totals, export) sum amount_ils — the
// document's value in a single unified currency — never the raw total_amount,
// which is in the document's own currency.

/** A document is shekel when currency is ILS or unset (the historical default). */
export function isIls(currency: string | null | undefined): boolean {
  return !currency || currency === "ILS";
}

/**
 * The document's ILS value used in every money calculation:
 *   - ILS document  → mirrors total_amount (kept in sync; the admin never
 *     types a separate shekel value).
 *   - foreign doc    → the admin-entered amountIlsInput (may be null until
 *     entered — null contributes 0 to sums, never the foreign nominal).
 */
export function resolveAmountIls(
  currency: string | null,
  totalAmount: number | null,
  amountIlsInput: number | null,
): number | null {
  return isIls(currency) ? totalAmount : amountIlsInput;
}
