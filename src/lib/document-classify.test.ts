import { describe, it, expect } from "vitest";
import { resolveDirection, NON_CASH_DOC_TYPES, isIls, resolveAmountIls } from "./document-classify";

describe("resolveDirection — non-cash doc types are pinned to 'none'", () => {
  it("forces a quote to 'none' even when the model says income (the real bug)", () => {
    expect(resolveDirection("quote", "income")).toBe("none");
  });

  it("forces a quote to 'none' regardless of the returned direction", () => {
    expect(resolveDirection("quote", "expense")).toBe("none");
    expect(resolveDirection("quote", "none")).toBe("none");
    expect(resolveDirection("quote", null)).toBe("none");
  });

  it("forces a delivery note to 'none'", () => {
    expect(resolveDirection("delivery_note", "income")).toBe("none");
  });

  it("leaves real money-movement docs untouched", () => {
    expect(resolveDirection("invoice", "expense")).toBe("expense");
    expect(resolveDirection("receipt", "income")).toBe("income");
    expect(resolveDirection("bank_transfer", "expense")).toBe("expense");
    expect(resolveDirection("payment_request", "expense")).toBe("expense");
  });

  it("passes through null doc_type and preserves a null direction", () => {
    expect(resolveDirection(null, "expense")).toBe("expense");
    expect(resolveDirection("invoice", null)).toBeNull();
  });

  it("the non-cash set is exactly quote + delivery_note", () => {
    expect([...NON_CASH_DOC_TYPES].sort()).toEqual(["delivery_note", "quote"]);
  });
});

describe("isIls", () => {
  it("treats ILS, null and empty as shekel; foreign codes as not", () => {
    expect(isIls("ILS")).toBe(true);
    expect(isIls(null)).toBe(true);
    expect(isIls(undefined)).toBe(true);
    expect(isIls("")).toBe(true);
    expect(isIls("USD")).toBe(false);
    expect(isIls("EUR")).toBe(false);
  });
});

describe("resolveAmountIls — the unified shekel value for money rollups", () => {
  it("ILS doc mirrors total_amount (ignores any stray amount_ils input)", () => {
    expect(resolveAmountIls("ILS", 1200, null)).toBe(1200);
    expect(resolveAmountIls("ILS", 1200, 999)).toBe(1200);
    expect(resolveAmountIls(null, 500, null)).toBe(500); // unset currency = ILS
  });

  it("foreign doc uses the admin-entered shekel value, NOT the foreign nominal", () => {
    // $100 invoice, admin entered ₪370 — sums must use 370, never 100.
    expect(resolveAmountIls("USD", 100, 370)).toBe(370);
    expect(resolveAmountIls("EUR", 50, 200)).toBe(200);
  });

  it("foreign doc without an entered value → null (contributes 0, never the nominal)", () => {
    expect(resolveAmountIls("USD", 100, null)).toBeNull();
  });
});
