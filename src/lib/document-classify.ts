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
