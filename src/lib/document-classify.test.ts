import { describe, it, expect } from "vitest";
import { resolveDirection, NON_CASH_DOC_TYPES } from "./document-classify";

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
