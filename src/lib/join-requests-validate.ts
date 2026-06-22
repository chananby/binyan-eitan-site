/**
 * join-requests-validate — pure validation + normalization for the
 * "new worker wants to join" public flow.
 *
 * Used by both the API route (server-side enforcement) AND the public
 * form (client-side hints before submit) so the "what counts as a
 * valid request" rule lives in exactly one place. Returns either the
 * normalized payload ready to insert, or a field-keyed error map the
 * form can render next to each input.
 *
 * Pure JS only — no DB, no fetch. Phone normalization reuses
 * src/lib/phone.ts so the format the request gets stored as matches
 * what /api/worker/identify's phoneVariants() looks up later.
 */

import { normalizePhone } from "./phone";

export const MAX_NAME_CHARS = 80;
export const MAX_DESCRIPTION_CHARS = 500;
const MIN_PHONE_DIGITS = 9;

export interface JoinRequestInput {
  full_name?: unknown;
  phone?: unknown;
  description?: unknown;
}

export interface JoinRequestValid {
  ok: true;
  /** Cleaned values, ready to insert. description is null when empty. */
  data: {
    full_name: string;
    phone: string;             // normalized 10-digit form
    description: string | null;
  };
}

export interface JoinRequestInvalid {
  ok: false;
  /** field → human-readable Hebrew message. Multiple fields possible. */
  errors: Partial<Record<"full_name" | "phone" | "description", string>>;
}

export type JoinRequestResult = JoinRequestValid | JoinRequestInvalid;

/** Collapse whitespace runs to single spaces + trim. Keeps Hebrew. */
function tidy(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export function validateJoinRequest(input: JoinRequestInput): JoinRequestResult {
  const errors: JoinRequestInvalid["errors"] = {};

  // ── full_name ─────────────────────────────────────────────────────────
  const rawName = typeof input.full_name === "string" ? tidy(input.full_name) : "";
  if (!rawName) {
    errors.full_name = "שם מלא הוא שדה חובה";
  } else if (rawName.length > MAX_NAME_CHARS) {
    errors.full_name = `שם ארוך מדי (מקסימום ${MAX_NAME_CHARS} תווים)`;
  }

  // ── phone ─────────────────────────────────────────────────────────────
  // Normalize first so "0585008447" / "058-500-8447" / "+972585008447"
  // all collapse to the same canonical 10-digit form. The minimum
  // digit count is enforced AFTER normalize — the user can paste any
  // format as long as enough digits survive.
  const rawPhone = typeof input.phone === "string" ? input.phone : "";
  const normalizedPhone = normalizePhone(rawPhone);
  const phoneDigitCount = normalizedPhone.replace(/\D/g, "").length;
  if (!rawPhone.trim()) {
    errors.phone = "טלפון הוא שדה חובה";
  } else if (phoneDigitCount < MIN_PHONE_DIGITS) {
    errors.phone = "מספר טלפון לא תקין";
  }

  // ── description ───────────────────────────────────────────────────────
  // Optional, capped. Empty string is valid; it becomes NULL in the row
  // so the admin can tell "no info supplied" from "user typed something
  // and then deleted it" (a few blanks don't matter — both look empty).
  const rawDesc = typeof input.description === "string" ? tidy(input.description) : "";
  if (rawDesc.length > MAX_DESCRIPTION_CHARS) {
    errors.description = `תיאור ארוך מדי (מקסימום ${MAX_DESCRIPTION_CHARS} תווים)`;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      full_name: rawName,
      phone: normalizedPhone,
      description: rawDesc || null,
    },
  };
}
