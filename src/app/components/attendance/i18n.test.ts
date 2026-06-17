import { describe, it, expect } from "vitest";
import {
  T,
  SUPPORTED_LANGS,
  LANG_AUTONYMS,
  RTL_LANGS,
  langDir,
  detectInitialLang,
  type Lang,
  type ScreenStrings,
} from "./i18n";

// The Hebrew dictionary is the source of truth — every key it defines
// must be present in every other language, including the placeholder
// ones. This is the regression catcher for "added a key, forgot to fill
// it in one language" which would otherwise render `undefined` in the UI.
describe("i18n — dictionary key completeness", () => {
  const heKeys = Object.keys(T.he).sort();

  for (const lang of SUPPORTED_LANGS) {
    it(`T.${lang} has the same keys as T.he`, () => {
      const langKeys = Object.keys(T[lang]).sort();
      expect(langKeys).toEqual(heKeys);
    });

    it(`T.${lang} — every value is a non-empty string (weekdays = 7 strings)`, () => {
      const dict = T[lang];
      for (const key of heKeys) {
        const v = dict[key as keyof ScreenStrings];
        if (key === "weekdays") {
          expect(Array.isArray(v)).toBe(true);
          expect((v as string[]).length).toBe(7);
          for (const w of v as string[]) {
            expect(typeof w).toBe("string");
            expect(w.length).toBeGreaterThan(0);
          }
        } else if (key === "dayPrefix") {
          // dayPrefix is allowed to be empty ("" for languages that don't
          // prefix the weekday — Russian, English, …) so only require a string.
          expect(typeof v).toBe("string");
        } else {
          expect(typeof v).toBe("string");
          expect((v as string).length).toBeGreaterThan(0);
        }
      }
    });
  }
});

// Stage 2 inverted this guard: every language must now be fully
// translated. Any value containing "[TODO" — anywhere, scalar or inside
// `weekdays` — fails the build before it can ship to a worker.
describe("i18n — no [TODO] markers left in any language", () => {
  for (const lang of SUPPORTED_LANGS) {
    it(`T.${lang} contains no "[TODO" marker`, () => {
      const dict = T[lang];
      for (const key of Object.keys(dict) as (keyof ScreenStrings)[]) {
        const v = dict[key];
        if (Array.isArray(v)) {
          for (const item of v) {
            expect(item.includes("[TODO"), `T.${lang}.${String(key)} entry "${item}"`).toBe(false);
          }
        } else {
          expect(v.includes("[TODO"), `T.${lang}.${String(key)} = "${v}"`).toBe(false);
        }
      }
    });
  }
});

describe("i18n — every language has an autonym", () => {
  for (const lang of SUPPORTED_LANGS) {
    it(`LANG_AUTONYMS["${lang}"] is a non-empty string`, () => {
      expect(typeof LANG_AUTONYMS[lang]).toBe("string");
      expect(LANG_AUTONYMS[lang].length).toBeGreaterThan(0);
    });
  }
});

describe("i18n — langDir / RTL_LANGS", () => {
  it("Hebrew is the only RTL language", () => {
    expect(RTL_LANGS.has("he")).toBe(true);
    expect(RTL_LANGS.size).toBe(1);
  });

  it("langDir('he') === 'rtl'", () => {
    expect(langDir("he")).toBe("rtl");
  });

  it.each(["en", "ru", "si", "zh", "hi"] as const)("langDir('%s') === 'ltr'", (l: Lang) => {
    expect(langDir(l)).toBe("ltr");
  });
});

describe("i18n — detectInitialLang", () => {
  it("maps a bare BCP-47 code to its 2-letter prefix", () => {
    expect(detectInitialLang("en-US")).toBe("en");
    expect(detectInitialLang("ru-RU")).toBe("ru");
    expect(detectInitialLang("si-LK")).toBe("si");
    expect(detectInitialLang("zh-CN")).toBe("zh");
    expect(detectInitialLang("zh-Hant-TW")).toBe("zh");
    expect(detectInitialLang("hi-IN")).toBe("hi");
    expect(detectInitialLang("he-IL")).toBe("he");
  });

  it("accepts the bare 2-letter code without a region", () => {
    expect(detectInitialLang("en")).toBe("en");
    expect(detectInitialLang("HE")).toBe("he"); // case-insensitive
  });

  it("accepts underscore separator (POSIX locale form, e.g. en_US)", () => {
    expect(detectInitialLang("en_US")).toBe("en");
  });

  it("falls back to 'he' for unknown or missing input", () => {
    expect(detectInitialLang("ar-EG")).toBe("he"); // Arabic not supported
    expect(detectInitialLang("")).toBe("he");
    expect(detectInitialLang(undefined)).toBe("he");
  });
});
