// Normalize an Israeli phone number to 10-digit leading-0 format.
// "058-500-8447"  → "0585008447"
// "+972585008447" → "0585008447"
// "972585008447"  → "0585008447"
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("972") && digits.length >= 12) {
    return "0" + digits.slice(3);
  }
  return digits.slice(-10);
}

// Return all plausible formats a phone might be stored as in the DB.
// Covers: with leading 0, without leading 0, with 972 prefix.
export function phoneVariants(normalized: string): string[] {
  const v = new Set<string>();
  v.add(normalized);
  if (normalized.startsWith("0")) {
    v.add(normalized.slice(1));
    v.add("972" + normalized.slice(1));
    v.add("+972" + normalized.slice(1));
  }
  return [...v];
}
