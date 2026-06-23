// Normalize an Israeli phone number to 10-digit leading-0 format.
// "058-500-8447"  → "0585008447"
// "+972585008447" → "0585008447"
// "972585008447"  → "0585008447"
//
// Foreign numbers fall through to slice(-10). For 11-digit foreign
// numbers (e.g. "+94712789240" → digits "94712789240") this DOES drop
// the first digit of the country code — historically that bug stored
// Sri Lankan workers as "4XXXXXXXXX" instead of "94XXXXXXXXX". The bug
// is no longer load-bearing because phoneVariants now compensates with
// last-9-digit expansion, but we keep normalize as-is so existing
// callers (admin/staff POST + PATCH, twilio voice, join-requests) keep
// writing the same canonical form they always have.
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("972") && digits.length >= 12) {
    return "0" + digits.slice(3);
  }
  return digits.slice(-10);
}

// Return all plausible formats a phone might be stored as in the DB.
//
// Two layers:
//
//   1. Israeli legacy expansion — kept for back-compat. Any number
//      normalized to leading-0 form generates the (no-0, 972*, +972*)
//      siblings. This is what every previous caller has relied on; we
//      add to it, never remove from it.
//
//   2. Last-9-digits expansion (the new agnostic layer) — generates
//      "every plausible stored form a phone with this suffix could
//      take", regardless of which country code applies. With 40
//      workers and 0 last-9 collisions in the data, exact-match on
//      ANY of the 8 variants below is unambiguous identification.
//
//   Why suffix-9: every national format we care about (Israel 10
//   digits leading 0, Sri Lanka 9 mobile digits after country code 94)
//   shares its last 9 digits across all surface forms — local, with
//   country code, with leading +, with international-dial 00 prefix.
//   So a Sri Lankan worker typing the local "0712789240" and an admin
//   storing "+94712789240" both have suffix "712789240", and lookup
//   reconciles them automatically.
export function phoneVariants(normalized: string): string[] {
  const v = new Set<string>([normalized]);

  // Layer 1 — Israeli legacy variants. Preserved exactly.
  if (normalized.startsWith("0")) {
    v.add(normalized.slice(1));
    v.add("972" + normalized.slice(1));
    v.add("+972" + normalized.slice(1));
  }

  // Layer 2 — agnostic last-9-digits expansion. Only kicks in when
  // there's enough material to extract a suffix; below 9 digits we
  // can't safely identify any country format.
  if (normalized.length >= 9) {
    const suffix9 = normalized.slice(-9);
    v.add(suffix9);
    v.add("0" + suffix9);                        // local 10-digit (Israel, Sri Lanka local)
    v.add("972" + suffix9);
    v.add("+972" + suffix9);
    v.add("94" + suffix9);                       // Sri Lanka intl
    v.add("+94" + suffix9);
    v.add("0094" + suffix9);                     // IDD-dialled from Israel
  }

  return [...v];
}
