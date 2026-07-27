/**
 * Server-side translations reader — same merge logic as /api/translations GET,
 * but called directly from server components (no HTTP round-trip).
 *
 * Used by the article slug pages so generateMetadata and the page itself can
 * see live KV content (e.g. articles added through the editor) instead of
 * relying on the static translations.json shipped with the build.
 */
import { kv } from "@vercel/kv";
import defaultTranslations from "@/src/lib/translations.json";

const KV_KEY = "site_translations";

function deepMerge(
  defaults: Record<string, unknown>,
  overrides: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...defaults };
  for (const key of Object.keys(overrides)) {
    const dv = defaults[key];
    const ov = overrides[key];
    if (Array.isArray(ov) && Array.isArray(dv)) {
      result[key] = dv.length > ov.length ? dv : ov;
    } else if (
      ov && typeof ov === "object" && !Array.isArray(ov) &&
      dv && typeof dv === "object" && !Array.isArray(dv)
    ) {
      result[key] = deepMerge(
        dv as Record<string, unknown>,
        ov as Record<string, unknown>
      );
    } else {
      result[key] = ov;
    }
  }
  return result;
}

interface MinimalArticle {
  slug: string;
  title_en?: string;
  title_he?: string;
  intro_en?: string;
  intro_he?: string;
  heroImage?: string;
  archived?: boolean;
  published?: boolean;
  [k: string]: unknown;
}

export async function getServerArticles(): Promise<MinimalArticle[]> {
  try {
    const stored = await kv.get(KV_KEY);
    const merged = stored
      ? deepMerge(
          defaultTranslations as unknown as Record<string, unknown>,
          stored as Record<string, unknown>,
        )
      : (defaultTranslations as unknown as Record<string, unknown>);
    const list = (merged as { articles?: unknown }).articles;
    return Array.isArray(list) ? (list as MinimalArticle[]) : [];
  } catch {
    return Array.isArray((defaultTranslations as { articles?: unknown }).articles)
      ? ((defaultTranslations as { articles: MinimalArticle[] }).articles)
      : [];
  }
}

export async function getServerArticleBySlug(slug: string): Promise<MinimalArticle | null> {
  const list = await getServerArticles();
  return list.find((a) => a.slug === slug) ?? null;
}

/** ratingValue: clamped to [1,5] and formatted to one decimal. Empty/garbage
 *  → "5.0". Guarantees a schema-valid number so the JSON-LD never breaks. */
function normalizeRatingValue(raw: unknown): string {
  const n = parseFloat(String(raw ?? "").trim());
  if (!Number.isFinite(n)) return "5.0";
  return Math.min(5, Math.max(1, n)).toFixed(1);
}

/** reviewCount: the leading integer of the count string (≥ 0). Empty/garbage
 *  → "19". So "19 Google Reviews" / "19 ביקורות בגוגל" → "19". */
function normalizeReviewCount(raw: unknown): string {
  const n = parseInt(String(raw ?? "").trim(), 10);
  if (!Number.isFinite(n) || n < 0) return "19";
  return String(n);
}

/**
 * Rating + review count for the home-page JSON-LD AggregateRating. Sourced from
 * the SAME editable Hero keys (hero.googleRatingValue / hero.googleRatingCount)
 * that render the visible Google chip — Google requires the schema rating to be
 * visible on the page, so one source keeps them in lock-step. Both values are
 * validated/normalized: a bad or empty editor entry can NEVER emit invalid
 * JSON — it falls back to the current 5.0 / 19.
 */
export async function getServerRating(
  lang: "he" | "en",
): Promise<{ ratingValue: string; reviewCount: string }> {
  try {
    const stored = await kv.get(KV_KEY);
    const merged = stored
      ? deepMerge(
          defaultTranslations as unknown as Record<string, unknown>,
          stored as Record<string, unknown>,
        )
      : (defaultTranslations as unknown as Record<string, unknown>);
    const hero =
      (merged as { hero?: Record<string, Record<string, unknown>> }).hero?.[lang] ?? {};
    return {
      ratingValue: normalizeRatingValue(hero.googleRatingValue),
      reviewCount: normalizeReviewCount(hero.googleRatingCount),
    };
  } catch {
    // KV unavailable → the shipped defaults (5.0 / 19).
    return { ratingValue: "5.0", reviewCount: "19" };
  }
}

/** True iff the article should be visible to the public.
 *  - `published === false` → draft, not public
 *  - `archived === true`   → hidden, not public
 *  - everything else (including missing `published` field) → public */
export function isArticlePublic(a: MinimalArticle | null | undefined): boolean {
  if (!a) return false;
  if (a.published === false) return false;
  if (a.archived === true) return false;
  return true;
}
