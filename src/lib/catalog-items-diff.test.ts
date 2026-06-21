import { describe, it, expect } from "vitest";
import { normalizeName, findNewItems } from "./catalog-items-diff";

describe("normalizeName", () => {
  it("strips leading/trailing whitespace", () => {
    expect(normalizeName("  בטון  ")).toBe("בטון");
  });

  it("collapses internal whitespace runs to a single space", () => {
    expect(normalizeName("בטון  יציקה")).toBe("בטון יציקה");
    expect(normalizeName("בטון\t\nיציקה")).toBe("בטון יציקה");
  });

  it("is case-insensitive (Latin)", () => {
    expect(normalizeName("Concrete")).toBe(normalizeName("concrete"));
    expect(normalizeName("CONCRETE")).toBe("concrete");
  });

  it("returns '' for null / undefined / empty / whitespace-only", () => {
    expect(normalizeName(null)).toBe("");
    expect(normalizeName(undefined)).toBe("");
    expect(normalizeName("")).toBe("");
    expect(normalizeName("   ")).toBe("");
  });
});

describe("findNewItems", () => {
  const catalog = [
    { name: "בטון יציקה" },
    { name: "ברזל זיון 8 מ\"מ" },
  ];

  it("returns items whose name doesn't normalize-match any catalog row", () => {
    const items = [{ name: "אינסטלציה", unitPrice: 100 }];
    expect(findNewItems(items, catalog)).toEqual(items);
  });

  it("filters items that DO normalize-match the catalog (rich whitespace + case)", () => {
    const items = [
      { name: "  בטון  יציקה  ", unitPrice: 100 }, // matches "בטון יציקה" after normalize
      { name: "CONCRETE",        unitPrice: 100 }, // new
    ];
    const result = findNewItems(items, [...catalog, { name: "concrete" }]);
    expect(result).toHaveLength(0);
  });

  it("filters items without a name (null/empty/whitespace-only)", () => {
    const items = [
      { name: "",      unitPrice: 100 },
      { name: "   ",   unitPrice: 100 },
      { name: null,    unitPrice: 100 },
      { name: undefined as unknown as string, unitPrice: 100 },
    ];
    expect(findNewItems(items, catalog)).toEqual([]);
  });

  it("filters items with non-positive unitPrice (0, null, undefined, negative)", () => {
    const items = [
      { name: "פריט א", unitPrice: 0 },
      { name: "פריט ב", unitPrice: null as unknown as number },
      { name: "פריט ג" },                       // no unitPrice at all
      { name: "פריט ד", unitPrice: -10 },
    ];
    expect(findNewItems(items, catalog)).toEqual([]);
  });

  it("dedupes within the quote — same normalized name → returned once (first hit)", () => {
    const items = [
      { name: "אינסטלציה",   unitPrice: 100, unit: "מ\"א" },
      { name: " אינסטלציה ", unitPrice: 200, unit: "יח'"  }, // same after normalize
      { name: "INSTALLATION", unitPrice: 300 },               // English alias; still treated distinct
    ];
    const result = findNewItems(items, catalog);
    expect(result).toHaveLength(2);
    // First occurrence wins — the "מ"א" unit + 100 price stay.
    expect(result[0]).toEqual({ name: "אינסטלציה", unitPrice: 100, unit: "מ\"א" });
  });

  it("preserves input order for items that pass the filter", () => {
    const items = [
      { name: "פריט-ב", unitPrice: 200 },
      { name: "פריט-א", unitPrice: 100 },
      { name: "פריט-ג", unitPrice: 300 },
    ];
    const names = findNewItems(items, []).map(i => i.name);
    expect(names).toEqual(["פריט-ב", "פריט-א", "פריט-ג"]);
  });

  it("empty quote items → empty output", () => {
    expect(findNewItems([], catalog)).toEqual([]);
  });

  it("empty catalog → every valid quote item is new", () => {
    const items = [
      { name: "פריט א", unitPrice: 100 },
      { name: "פריט ב", unitPrice: 200 },
    ];
    expect(findNewItems(items, [])).toEqual(items);
  });
});
